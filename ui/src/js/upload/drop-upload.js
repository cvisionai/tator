import { UploadElement } from "../components/upload-element.js";
import { store } from "./store.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class DropUpload extends UploadElement {
	constructor() {
		super();

		this._setEmptyVariables();
		this._allSelectedText = "Select all";
		this._noneSelectedText = "Deselect all";


		const main = document.createElement("div");
		main.setAttribute("class", "px-3 py-3 rounded-3");
		main.setAttribute("style", "border: 1px solid #ccc;");
		this._shadow.appendChild(main);

		this._summary = document.createElement("div");
		this._summary.setAttribute("class", "d-flex flex-justify-between flex-items-center");
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
			`Running an idempotency check to see if files exist in ${this._chosenSection?.name !== "" ? this._chosenSection.name : "this project"}...`;
		this._checkIdem.setAttribute("class", "py-2 text-gray f2 text-purple");
		this._checkIdem.style.display = "none";
		this._summaryTitle.appendChild(this._checkIdem);

		this.selectionOptions = document.createElement("enum-input");
		this.selectionOptions.setAttribute("class", "f2 d-block pr-2");
		this.selectionOptions.choices = [
			{ value: "all", label: "All" },
			{ value: "files", label: "Files" },
			{ value: "folders", label: "Folders" },
			{ value: "skipped", label: "Skipped" },
			{ value: "invalid", label: "Invalid" },
		];
		this.selectionOptions.setValue("all");
		this.selectionOptions.setAttribute("name", "Show:");
		this.selectionOptions.style.width = "250px";
		this.selectionOptions.addEventListener("change", this._updateShowing.bind(this));
		this._summary.appendChild(this.selectionOptions);

		this._removeButton = document.createElement("button");
		this._removeButton.setAttribute(
			"class",
			"btn btn-clear btn-charcoal f3 mr-3 btn-small"
		);
		this._removeButton.disabled = true;
		this._removeButton.textContent = "Remove";
		this._removeButton.addEventListener("click", this._removeSelection.bind(this));
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



		const topOfTable = document.createElement("div");
		topOfTable.setAttribute("class", "d-flex flex-justify-between flew-wrap");
		main.appendChild(topOfTable);

		this._destination = document.createElement("div");
		this._destination.setAttribute("class", "col-6");
		topOfTable.appendChild(this._destination);


		this._destinationPicker = document.createElement("enum-input");
		this._destinationPicker.setAttribute("class","d-block f2 my-3 pt-3");
		this._destinationPicker.setAttribute("name", "Destination");
		this._destination.appendChild(this._destinationPicker);
		this._destinationPicker.addEventListener("change", this.updateDestination.bind(this));


		const selectSection = document.createElement("div");
		selectSection.setAttribute("class", "col-3");
		topOfTable.appendChild(selectSection);



		const topRight = document.createElement("div");
		topRight.setAttribute("class", "py-2 f3 text-gray d-flex flex-wrap col-3");
		topOfTable.appendChild(topRight);
		
		this._paginatorSummary = document.createElement("div");
		this._paginatorSummary.setAttribute("class", "py-2 f3 text-gray text-right clickable col-12");
		this._paginatorSummary.innerHTML = `Page: <span>1</span> of <span>1</span>`
		topRight.appendChild(this._paginatorSummary);
		
		this._paginatorPrev = document.createElement("div");
		this._paginatorPrev.setAttribute("class", "py-2 f3 text-gray text-right clickable col-6");
		this._paginatorPrev.innerHTML = `Prev`;
		this._paginatorPrev.addEventListener("click", this._prevPage.bind(this));
		topRight.appendChild(this._paginatorPrev);

		this._paginatorNext = document.createElement("div");
		this._paginatorNext.setAttribute("class", "py-2 f3 text-gray text-right clickable col-6");
		this._paginatorNext.innerHTML = `Next`
		this._paginatorNext.addEventListener("click", this._nextPage.bind(this));
		topRight.appendChild(this._paginatorNext);



		this._summaryTable = document.createElement("table");
		this._summaryTable.setAttribute(
			"class",
			"col-12 file-table upload-table pb-6 mb-6"
		);
		main.appendChild(this._summaryTable);

		this._headerMap = new Map();
		this._headerMap
			.set("select", this._allSelectedText)
			.set("name", "Path")
			.set("note", "Note")
			// .set("parent", "Path")
			.set("size", "Size")
			.set("type", "Type");

		this._createTable([]);

		this._uploads = [];
		this._newSections = [];

		store.subscribe((state) => state.mediaTypeSettings, this._updateFileOptions.bind(this));
	}

	connectedCallback() {
		this.init(store);
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
		let parent = `${this._chosenSection.name}`;

		if (fileHandles.kind == "directory") {
			parent = fileHandles.name;
			this._newSections.push(parent);
		} else if (!fileHandles || !fileHandles.length) {
			return;
		}

		await this._recursiveDirectoryUpload(fileHandles, gid, parent);
		const data = this.formatTableData();
		this._textSummaryUpdate();
		this._createTable(data);

		// Big Upload is Total Size > 60000000000
		if (data.length > 0) {
			this._checkIdem.style.display = "block";
			this._checkIdem.textContent =
				"Running an idempotency check to see if files or folders exist in this project already...";
			this._checkIdempotency();
		}
	}

	async filePicker(directory = false) {
		// open file picker, destructure the one element returned array
		// Set a group ID on the upload.
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
					console.log("File not added", file);
					this._skippedFiles.push(file);
					this._totalSkipped++;
					this._skippedReason = "File type not allowed";
				}
			} else if (entry.kind === "directory") {
				const newParent = `${parent}${entry.name}`;
				// const newSection = await this._createSection(entry.name);
				this._newSections.push(newParent);
				await this._recursiveDirectoryUpload(entry, gid, newParent);
			}
		}
	};

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
		this._destinationPicker.choices = [{
			value: this._noneText,
			label: this._noneText,
		}, ...this._sections.map((section) => {
			return {
				value: section.id,
				label: section.name,
			};
		})];

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
					this._sectionName = json.name;
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


	/**
	 * Creates upload summary from newly added files
	 * 
	 * 
	 * */
	formatTableData() {
		let data = [],
		files = [];		

		for (let s of this._newSections) {
			data.push({
				name: s,
				size: 0,
				type: "folder",
				parent: "",
				exists: false,
				duplicate: false,
				note: `<span class="text-green">New folder</span>`,
			});
		}

		for (let u of this._uploads) {
			files.push({
				name: u.file?.name ? u.file.name : u.name ? u.name : "",
				size: u.file?.size ? u.file.size : u.size ? u.size : 0,
				type: u.file?.type ? u.file.type : u.type ? u.type : "",
				parent: `${u.parent === "" ? "" : u.parent}`,
				duplicate: false,
				exists: false,
				note: "",
			});
		}

		data = [...data, ...files];

		return data;
	}

	_textSummaryUpdate() {
		this._summaryText.innerHTML = `
			<div class="pb-1">
				${this._uploads.length} files
			</div>
			<div class="pb-1">
				${this._newSections.length} folders
			</div>
			<div class="pb-1">${this._totalSize} bytes</div>
				<div class="pb-1">
					${this._totalSkipped} skipped ${(this._skippedReason !== "" && this._skippedFiles.length > 0) ? `(${this._skippedReason} <a href="#" id="skipped-details">Details</a>)` : ''}
				</div>
			<div>`;
		
		if (this._skippedReason !== "" && this._skippedFiles.length > 0) {
			this._shadow.getElementById("skipped-details")?.addEventListener("click", (evt) => {
				evt.preventDefault();
				window.alert(this._skippedFiles.map((f) => f.name).join("\n"));
			});
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
		this._checkIdem.textContent = `Idempotency check complete. ${totalExisting} existing matches found in ${this._chosenSection?.name ? this._chosenSection.name : "this project"}.`;
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
		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: data,
					ok: true, // TODO: Check if there are any errors
				},
			})
		);
		
		this._checkboxMap = new Map();
		this._data = data;
		console.log("Data", this._data);

		this._summaryTable.innerHTML = "";
		const header = this._summaryTable.createTHead();
		const headerRow = header.insertRow();
		this._headerMap.forEach((value, key) => {
			const cell = headerRow.insertCell();
			cell.textContent = value;
			if (key == "select") {
				cell.classList.add("text-center", "text-underline", "clickable", "f3");
				cell.addEventListener("click", (evt) => {
					let checkCell = false;
					if (cell.textContent === this._allSelectedText) {
						cell.textContent = this._noneSelectedText;
						checkCell = true;
					} else {
						cell.textContent = this._allSelectedText;
						checkCell = false;
					}
					for (let [index, input] of this._checkboxMap) {
						input._checked = checkCell;
					}
					this._calculateSelected();
				});
			}
		});

		const body = this._summaryTable.createTBody();

		const start = (this._currentPage - 1) * this._pageSize;
		const end = start + this._pageSize;
		const pageData = this._data.slice(start, end);

		this._paginatorSummary.innerHTML = `Page: <span>${this._currentPage}</span> of <span>${Math.ceil(this._data.length / this._pageSize)}</span>`

		if (pageData && pageData.length > 0) {
			pageData.forEach((row, index) => {
				const tr = body.insertRow();
				if (row.duplicate || row.exists) tr.classList.add("text-red");
				this._headerMap.forEach((value, key) => {
					const cell = tr.insertCell();
					if (key == "name") {
						const path = (row.parent !== "" ? "/" + row.parent + "/" : "/") + row.name;
						if (row.type === "folder") {
							cell.innerHTML = `<span><svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 19h-7a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v3.5"></path><path d="M16 19h6"></path><path d="M19 16v6"></path>
    </svg></span> ${path}`;
						} else {
							cell.textContent = path;
						}
					} else if (key == "select") {
						const input = document.createElement("checkbox-input");
						// input.setAttribute("type", "checkbox");
						this._checkboxMap.set(index, input);
						cell.appendChild(input);
						// input.addEventListener("change", (evt) => {
						// 	evt.stopPropagation();
						// });
						cell.addEventListener("click", (evt) => {
							// if (evt.target.tagName !== "INPUT") {
							input.click();
							// }
						});
						input.addEventListener(
							"change",
							this._calculateSelected.bind(this)
						);
					} else if (key == "size" && row.type === "folder") {
						cell.textContent = "--";
						
					} else {
						cell.innerHTML = row[key];

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
		let checked = 0;
		for (let [index, input] of this._checkboxMap) {
			if(input.getChecked()) checked++
		}

		this._removeButton.disabled = checked === 0;
		this._removeButton.textContent = `Remove (${checked})`;
	}

	_removeSelection(evt) {
		const selected = [];
		const removedParent = [];
		for (let [index, input] of this._checkboxMap) {
			if (input.getChecked()) {
				selected.push(index);
				if(this._data[index].type === "folder") {
					removedParent.push(this._data[index].name.replaceAll("/", ""));
				}
			}
		}

		console.log("Selected", selected, "data", this._data);

		const data = this._data.filter((d, index) => {
			return !selected.includes(index);
		});

		this._newSections = data.filter((s) => s.type === "folder");
		this._uploads = data.filter((u) => u.type !== "folder");
		
		this._totalSize = 0;
		for (let f of this._uploads) {
			this._totalSize += f.size;
			console.log("Eval", f.parent, removedParent, removedParent.includes(f.parent));
			if (removedParent.includes(f.parent.replaceAll("/", "").trim())) {
				f.parent = this._chosenSection?.name ? this._chosenSection.name : "";
			}
		}
		
		this._createTable(data);
		this._textSummaryUpdate();
		this._calculateSelected();
	}

	updateDestination(evt) {
		const sectionId = this._destinationPicker.getValue() !== this._noneText ? Number(this._destinationPicker.getValue()) : null;
		const notEqual = sectionId !== this._chosenSection.id

		if (notEqual) {
			this._checkIdempotency(notEqual);
		}

		if (sectionId == null) {
			this._chosenSection = {
				id: null,
				name: ""
			}
		} else {
			this._chosenSection =
				sectionId && this._sectionData?._sectionIdMap?.[sectionId]
					? this._sectionData._sectionIdMap[sectionId]
					: { id: null, name: "" };
			
			
		}
	}

	_setEmptyVariables() {
		this._totalSize = 0;
		this._totalSkipped = 0;
		this._skippedFiles = [];
		this._skippedReason = "";
		this._currentPage = 1;
		this._pageSize = 50;
		this._data = [];
		this._uploads = [];
		this._newSections = [];
		this._noneText = "-- None --";
		this._duplicateMap = new Map();
		this._chosenSection = {
			id: null,
			name: ""
		};
	}

	_resetUpload() {
		this._setEmptyVariables();
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

	_updateShowing(evt) {
		this._currentPage = 1;
		this._pageSize = 10;
		this._createTable(this._data);
	}

	_updatePage() {
		this._createTable(this._data);
	}

	_nextPage() {
		this._currentPage++;
		this._updatePage();
	}

	_prevPage() {
		this._currentPage--;
		this._updatePage();
	}

	_firstPage() {
		this._currentPage = 1;
		this._updatePage();
	}


	_sortTable(evt) {
		const key = evt.target.textContent.toLowerCase();
		const data = this._data.sort((a, b) => {
			if (a[key] < b[key]) {
				return -1;
			}
			if (a[key] > b[key]) {
				return 1;
			}
			return 0;
		});
		this._createTable(data);
	}

}

customElements.define("drop-upload", DropUpload);
