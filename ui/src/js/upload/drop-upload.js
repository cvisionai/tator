import { UploadElement } from "../components/upload-element.js";
import "../components/upload-dialog-init.js";
import { store } from "./store.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class DropUpload extends UploadElement {
	constructor() {
		super();

		this._totalSize = 0;
		this._totalSkipped = 0;
		this._skippedReason = "";
		this._currentPage = 1;
		this._pageSize = 10;
		this._data = [];
		this._uploads = [];
		this._newSections = [];
		this._noneText = "-- None --";
		this._duplicateMap = new Map();
		this._chosenSection = {
			name: "All Media"
		};

		
		const main = document.createElement("div");
		main.setAttribute("class", "px-3 py-3 rounded-3");
		main.setAttribute("style", "border: 1px solid #ccc;");
		this._shadow.appendChild(main);

		this._summary = document.createElement("div");
		this._summary.setAttribute("class", "d-flex flex-justify-between");
		main.appendChild(this._summary);

		this._summaryTitle = document.createElement("div");
		this._summaryTitle.innerHTML = `<span class="h3 mr-3">Summary</span>`;
		this._summaryTitle.setAttribute("class", "col-8");
		this._summary.appendChild(this._summaryTitle);

		this._summaryText = document.createElement("div");
		this._summaryText.textContent = "No files, or folders added.";
		this._summaryText.setAttribute("class", "py-2 text-gray f2");
		this._summaryTitle.appendChild(this._summaryText);

		this._checkIdem = document.createElement("div");
		this._checkIdem.textContent =
			`Running an idempotency check to see if files exist in ${this._chosenSection?.name ? this._chosenSection.name : "this project"}...`;
		this._checkIdem.setAttribute("class", "py-2 text-gray f2 text-purple");
		this._checkIdem.style.display = "none";
		this._summaryTitle.appendChild(this._checkIdem);

		this._removeButton = document.createElement("button");
		this._removeButton.setAttribute(
			"class",
			"btn btn-clear btn-charcoal f3 mr-3 btn-small"
		);
		this._removeButton.disabled = true;
		this._removeButton.textContent = "Remove";
		// this._removeButton.addEventListener("click", this.getImageFiles.bind(this));
		this._summary.appendChild(this._removeButton);

		this._chooseFileButton = document.createElement("button");
		this._chooseFileButton.setAttribute(
			"class",
			"btn btn-clear btn-charcoal f3 mr-3 btn-small"
		);
		this._chooseFileButton.textContent = "Add Files";
		this._chooseFileButton.addEventListener(
			"click",
			this.filePicker.bind(this, false)
		);
		this._summary.appendChild(this._chooseFileButton);

		this._chooseFolderButton = document.createElement("button");
		this._chooseFolderButton.setAttribute(
			"class",
			"btn btn-clear btn-charcoal f3 btn-small"
		);
		this._chooseFolderButton.textContent = "Add Folders";
		this._chooseFolderButton.addEventListener(
			"click",
			this.filePicker.bind(this, true)
		);
		this._summary.appendChild(this._chooseFolderButton);

		this._tablePaginator = document.createElement("div");
		this._tablePaginator.setAttribute("class", "py-2 f3 text-gray text-right");
		this._tablePaginator.innerHTML = `Page: <span>1</span> of <span>1</span>`
		main.appendChild(this._tablePaginator);



		this._summaryTable = document.createElement("table");
		this._summaryTable.setAttribute(
			"class",
			"col-12 file-table upload-table pb-6 mb-6"
		);
		main.appendChild(this._summaryTable);

		this._headerMap = new Map();
		this._headerMap
			.set("select", "")
			.set("name", "Name")
			.set("parent", "Relative Path")
			.set("size", "Size")
			.set("type", "Type")
			.set("note", "Note");

		this._createTable([]);

		// this._videoPickerOpts = {
		// 	description: "Videos",
		// 	accept: {
		// 		"*/*": [...this._acceptedVideoExt],
		// 	},
		// };

		// this._imagePickerOpts = {
		// 	description: "Images",
		// 	accept: {
		// 		"image/*": [...this._acceptedImageExt],
		// 	},
		// };

		this._uploads = [];
		this._newSections = [];
	}

	connectedCallback() {
		this.init(store);

		store.subscribe((state) => state.mediaTypeSettings, this._updateFileOptions.bind(this));
	}

	dropHandler(list) {
		this.fileHandleHandler(list);
	}

	_updateFileOptions(mediaTypeSettings) {
		const specList = []

		// TODO: Set this or just get from store?
		this._mediaTypeSettings = mediaTypeSettings;

		for (let entry of mediaTypeSettings) {
			console.log(entry);
			if (entry.dtype == "image") {
				specList.push(...this._acceptedImageExt);
			} else if(entry.dtype == "video") {
				specList.push(...this._acceptedVideoExt);
			}
		}
	
		this._specifiedTypes = {
			description: "Media Files",
			acceptList: specList,
		};
	}

	async fileHandleHandler(fileHandles) {
		const gid = uuidv1();
		let parent = "";

		if (fileHandles.kind == "directory") {
			parent = fileHandles.name;
			this._newSections.push(parent);
		} else if (!fileHandles || !fileHandles.length) {
			return;
		}

		await this._recursiveDirectoryUpload(fileHandles, gid, parent);
		this.showSummary();
	}

	async filePicker(directory = false) {
		// open file picker, destructure the one element returned array
		// Set a group ID on the upload.

		console.log(this._specifiedTypes);
		try {
			const fileHandles = !directory
				? await window.showOpenFilePicker({
					types: [{
							description: this._specifiedTypes.description,
							accept: {
								"*/*": [...this._specifiedTypes.acceptList],
							},
						}],
					excludeAcceptAllOption: true,
					multiple: true,
				})
				: await window.showDirectoryPicker();

			this.fileHandleHandler(fileHandles);
		} catch (err) {
			console.error(err);
		}
	}

	_recursiveDirectoryUpload = async (handle, gid, parent) => {
		const entries = await handle.values();
		console.log("Entries", entries);
		for await (let entry of entries) {
			if (entry.kind === "file") {
				const file = await entry.getFile();
				const added = this._checkFile(file, gid);
				if (added) {
					this._uploads.push({ ...added, parent });
					this._totalSize += file.size;
				} else {
					// console.log("File not added", file);
					this._totalSkipped++;
				}
			} else if (entry.kind === "directory") {
				const newParent = `${parent}/${entry.name}`;
				// const newSection = await this._createSection(entry.name);
				this._newSections.push(newParent);
				await this._recursiveDirectoryUpload(entry, gid, newParent);
			}
		}
	};

	_handleDirectoryUpload() {
		this._allowDirectoryUpload =
			this.uploadDialogInit._directoryUpload.getChecked();
		if (this._allowDirectoryUpload) {
			this._fileInput.setAttribute("webkitdirectory", "");
			this._fileInput.setAttribute("directory", "");
		} else {
			this._fileInput.removeAttribute("webkitdirectory");
			this._fileInput.removeAttribute("directory");
		}
	}

	_handleMediaType(evt) {
		console.log("Media type changed", evt.target.getValue());
		if (evt.target.getValue() == this.uploadDialogInit._anyMediaType) {
			this._chosenMediaType = null;
			this._uploadAttributes = {};
			this._fileInput.removeAttribute("accept");
			this.uploadDialogInit._mediaAttributes.dataType = null;
			this.uploadDialogInit._mediaAttributes.reset();
			return;
		}

		this._chosenMediaType = this._mediaTypes.find(
			(type) => type.id === Number(evt.target.getValue())
		);

		this.uploadDialogInit._mediaAttributes.dataType = this._chosenMediaType;

		if (this._chosenMediaType.dtype === "image") {
			this._fileInput.setAttribute("accept", this._acceptedImageExt.join(","));
		} else if (this._chosenMediaType.dtype === "video") {
			this._fileInput.setAttribute("accept", this._acceptedVideoExt.join(","));
		}
	}

	_handleUpdateVars(event) {
		this._fileInput.click();

		const sectionId = Number(this.uploadDialogInit._parentFolders?.getValue());
		if (sectionId !== this.uploadDialogInit._noParentName) {
			this._chosenSection =
				sectionId && this._sectionData?._sectionIdMap?.[sectionId]?.name
					? this._sectionData._sectionIdMap[sectionId].name
					: null;

			this.section = this._chosenSection;
		}

		const mediaType = this.uploadDialogInit._mediaType.getValue();
		this._chosenMediaType = this._mediaTypes.find(
			(type) => type.id === Number(mediaType)
		);

		this._uploadAttributes = event.detail.attributes;
		
	}

	set sectionData(val) {
		this._sectionData = val;
		this.uploadDialogInit._sectionData = val;
	}

	set sections(val) {
		this._sections = val;
		// Fill in the left panel area with section information
		
		
	}

	set mediaTypes(val) {
		this._mediaTypes = val;

		// this.uploadDialogInit.mediaTypes = val;

		const acceptList = [];
		let foundImg = false, foundVid = false;
		for (let m of val) {
			if (m.dtype === "image" && !foundImg) {
				acceptList.push(...this._acceptedImageExt);
				foundImg = true;
			} else if (m.dtype === "video" && !foundVid) {
				acceptList.push(...this._acceptedVideoExt);
				foundVid = true;
			}
		}

		this._specifiedTypes = {description: "Media Files", acceptList:acceptList};
	}

	static get observedAttributes() {
		return ["section"].concat(UploadElement.observedAttributes);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case "section":
				if (newValue && newValue.indexOf("{") > -1) {
					const json = JSON.parse(newValue);
					this._section = json.name;
					this._pageLink.setAttribute(
						"href",
						`/${this._project.id}/upload?section=${json.id}`
					);
					this._uploadSection = async () => {
						return json.name;
					};
				} else {
					this._section = newValue;

					this._pageLink.setAttribute(
						"href",
						`/${this._project.id}/upload?section=${newValue}`
					);
					this._uploadSection = async () => {
						return newValue;
					};
				}
				break;
		}
	}

	set project(val) {
		this._project = val;
		this._pageLink.setAttribute("href", `/${this._project.id}/upload`);
	}

	showSummary() {
		let data = [];

		this._summaryText.innerHTML = `
		<div class="pb-1">${this._uploads.length} files</div><div class="pb-1">${this._newSections.length} folders</div><div class="pb-1">${this._totalSize} bytes</div><div class="pb-1">${this._totalSkipped} skipped </div><div>`;
		
		if (this._skippedReason !== "") {
			this._summaryText.innerHTML += `Skipped Reason: ${this._skippedReason}`;
		}
		

		for (let s of this._newSections) {
			data.push({
				name: s,
				size: 0,
				type: "folder",
				parent: "/",
				exists: false,
				duplicate: false,
			});
		}
		const files = [];
		for (let u of this._uploads) {
			let dupe = false;

			if (this._duplicateMap.has(u.file.name)) {
				dupe = true;
			}

			if (this._data.findIndex((d) => d.name === u.file.name) !== -1) {
				this._duplicateMap.set(u.file.name, u);
			}

			files.push({
				name: u.file.name,
				size: u.file.size,
				type: u.file.type,
				parent: `${u.parent === "" ? "/" : u.parent}`,
				duplicate: dupe,
				exists: false,
				note: dupe ? "Duplicate" : "",
			});
		}

		data = [...data, ...files];

		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: data,
					ok: true, // TODO: Check if there are any errors
				},
			})
		);

		this._createTable(data);

		// TODO
		// Big Upload is Total Size > 60000000000
		if (data.length > 0) {
			this._checkIdem.style.display = "block";
			this._checkIdem.textContent =
				"Running an idempotency check to see if files or folders exist in this project already...";
			this._checkIdempotency();
		}

	}

	async _checkIdempotency(destinationChanged = false) {
		// If we have a new base, check them all -- Otherwise, just the unmarked items
	const files = destinationChanged ? this._data.filter((d) => d.type !== "folder") : this._data
		.filter((d) => (!d.exists && d.type !== "folder")),
	folders = destinationChanged ? this._data.filter((d) => d.type === "folder") : this._data
		.filter((d) => (!d.exists && d.type === "folder"));

		await this._fileIdempotencyCheck(files);
		await this._folderIdempotencyCheck(folders);

		this._checkIdem.style.textColor = "green";
		this._createTable(this._data);
		const totalExisting = this._data.filter((d) => d.exists).length;
		this._checkIdem.textContent = `Idempotency check complete. ${totalExisting} existing matches found in ${this._chosenSection?.name ? this._chosenSection.name : "All Media"}.`;
		return;
	}

	async _fileIdempotencyCheck(files) {
		return new Promise(async (resolve, reject) => {
			const filenames = files.map((u) => u.name);
			if (filenames && filenames.length > 0) {
				let duplicated = [];
				const projectId = window.location.pathname.split("/")[1];
				for (let f of filenames) {
					const resp = await fetchCredentials(
						`/rest/Medias/${projectId}?name=${encodeURI(f)}`
					);
					const data = await resp.json();
					if (data.length > 0) {
						duplicated.push(data[0].name);
					}
				}

				for (let d of this._data) {
					if (!d.exists && duplicated.includes(d.name)) {
						d.exists = true;
						d.note = (d.note !== "" ? d.note + "; " : "") + "Exists";
					}
				}
			}
			resolve('Success!');
		});
	}

	async _folderIdempotencyCheck(folders) {
		return new Promise(async (resolve, reject) => {
			
			const foldernames = folders.map((u) => u.name);
			console.log("foldernames", foldernames, folders);

		if (foldernames && foldernames.length > 0) {
			let duplicated = [];
			const projectId = window.location.pathname.split("/")[1];
			for (let f of foldernames) {
				const folderName = f.split("/").pop().trim();
				const resp = await fetchCredentials(
					`/rest/Sections/${projectId}?name=${folderName}`
				);
				const data = await resp.json();
				if (data.length > 0) {
					duplicated.push(f);
				}
			}

			for (let d of this._data) {
				if (!d.exists && duplicated.includes(d.name)) {
					d.exists = true;
					d.note = (d.note && d.note !== "") ? d.note + "; Exists" : "Exists";
				}
			}
		}
		resolve('Success!');
	});
	}

	_createTable(data) {
		this._checkboxMap = new Map();
		this._data = data;
		console.log("Data", this._data);

		this._summaryTable.innerHTML = "";
		const header = this._summaryTable.createTHead();
		const headerRow = header.insertRow();
		this._headerMap.forEach((value, key) => {
			const cell = headerRow.insertCell();
			cell.textContent = value;
		});

		const body = this._summaryTable.createTBody();

		if (this._data && this._data.length > 0) {
			this._data.forEach((row, index) => {
				const tr = body.insertRow();
				if (row.duplicate || row.exists) tr.classList.add("text-red");
				this._headerMap.forEach((value, key) => {
					const cell = tr.insertCell();
					if (key == "select") {
						const input = document.createElement("input");
						input.setAttribute("type", "checkbox");
						this._checkboxMap.set(index, input);
						cell.appendChild(input);
						input.addEventListener("click", (evt) => {
							evt.stopPropagation();
						});
						cell.addEventListener("click", (evt) => {
							// if (evt.target.tagName !== "INPUT") {
							input.click();
							// }
						});
						input.addEventListener(
							"change",
							this._calculateSelected.bind(this)
						);
					} else {
						cell.textContent = row[key];

						// if (key == "parent") {
						// 	cell.addEventListener("dblclick", (evt) => {
						// 		cell.innerHTML = `<select><option>Test</option></select>`;
						// 	});
						// }
					}
				});
			});
		}
	}

	_calculateSelected(evt) {
		const checked = this._data.filter((d, i) => {
			return this._checkboxMap.get(i).checked;
		});

		this._removeButton.disabled = checked.length === 0;
	}

	updateDestination(evt) {
		const notEqual = sectionId !== this._chosenSection.id

		if (notEqual) {
			this._checkIdempotency(notEqual);
		}

		if (this.uploadDialogInit._parentFolders?.getValue() == this._noneText) {
			this._chosenSection = {
				name: "All Media"
			}
		} else {
			const sectionId = Number(this.uploadDialogInit._parentFolders?.getValue());

			this._chosenSection =
				sectionId && this._sectionData?._sectionIdMap?.[sectionId]
					? this._sectionData._sectionIdMap[sectionId]
					: { name: "All Media" };
		}
	}

	_resetUpload() {
		this._uploads = [];
		this._duplicateMap = new Map();
		this._newSections = [];
		this._totalSize = 0;
		this._createTable([]);
		this._removeButton.disabled = true;
		this._summaryText.textContent = "No files, or folders added.";

		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: [],
					ok: false,
				},
			})
		);
	}

	upload() {
		this._abortController = new AbortController();
		let promise = new Promise((resolve) => resolve(true));
			this._store.setState({
				uploadTotalFiles: this._uploads.length,
				uploadCancelled: false,
			});
			for (const [idx, msg] of this._uploads.entries()) {
				promise = promise
					.then(() => {
						if (this._cancel) {
							throw `Upload of ${msg.file.name} cancelled!`;
						}
						this._store.setState({
							uploadFilesComplete: idx,
							uploadChunkProgress: 0,
							uploadFilename: msg.file.name,
						});
						return uploadMedia(msg.mediaType, msg.file, msg);
					})
					.then(() => {
						this._store.setState({
							uploadFilesComplete: idx + 1,
						});
					});
			}
			promise.catch((error) => {
				this._store.setState({ uploadError: error.message });
			});
	}
}

customElements.define("drop-upload", DropUpload);
