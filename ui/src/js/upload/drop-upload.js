import { UploadElement } from "../components/upload-element.js";
import { store } from "./store.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { uploadMedia } from "../../../../scripts/packages/tator-js/src/utils/upload-media.js";
import { reducePathUtil, growPathByNameUtil } from "../util/path-formatter.js";
import { formatBytesOutput } from "../util/bytes-formatter.js";

export class DropUpload extends UploadElement {
	constructor() {
		super();
		this._direction = 1;

		this._setEmptyVariables();
		this._uploads = [];
		this._newSections = [];
		this._allSelectedText = "Select all";
		this._noneSelectedText = "Deselect all";
		this._specifiedTypes = {
			description: "Media Files",
			acceptList: [],
			allowDirectories: true,
		};

		const main = document.createElement("div");
		main.setAttribute("class", "px-3 py-3 rounded-3");
		main.setAttribute("style", "border: 1px solid #ccc;");
		this._shadow.appendChild(main);

		this._summary = document.createElement("div");
		this._summary.setAttribute(
			"class",
			"d-flex flex-justify-between flex-items-center"
		);
		main.appendChild(this._summary);

		this._summaryTitle = document.createElement("div");
		this._summaryTitle.innerHTML = `<span class="h3 mr-3">Summary</span>`;
		this._summaryTitle.setAttribute("class", "col-8");
		this._summary.appendChild(this._summaryTitle);

		this._summaryText = document.createElement("div");
		this._summaryText.textContent = "No files, or folders added.";
		this._summaryText.setAttribute("class", "py-2 text-gray f2");
		this._summaryTitle.appendChild(this._summaryText);

		this._checkIdemDiv = document.createElement("div");
		this._checkIdemDiv.setAttribute(
			"class",
			"upload-idem-notification py-2 f2 "
		);
		this._checkIdemDiv.style.display = "none";
		main.appendChild(this._checkIdemDiv);

		this._checkIdemDismiss = document.createElement("div");
		this._checkIdemDismiss.textContent = `Dismiss`;
		this._checkIdemDismiss.style.visibility = "hidden";
		this._checkIdemDismiss.setAttribute(
			"class",
			"text-underline text-right clickable"
		);
		this._checkIdemDismiss.addEventListener("click", (evt) => {
			this._checkIdemDiv.style.display = "none";
		});
		this._checkIdemDiv.appendChild(this._checkIdemDismiss);

		this._checkIdem = document.createElement("div");
		this._checkIdem.setAttribute("class", "col-12 d-flex flex-justify-between");
		this._checkIdem.textContent = `Running an idempotency check to see if files exist in ${
			this._chosenSection?.name !== ""
				? this._chosenSection.name
				: "this folder"
		}...`;
		this._checkIdemDiv.appendChild(this._checkIdem);

		this.selectionOptions = document.createElement("enum-input");
		this.selectionOptions.setAttribute("class", "f2 d-block pr-2");
		this.selectionOptions.choices = [
			{ value: "all", label: "All" },
			{ value: "files", label: "Files" },
			{ value: "folders", label: "Folders" },
			{ value: "invalid", label: "Invalid" },
		];
		this.selectionOptions.setValue("all");
		this.selectionOptions.setAttribute("name", "Show:");
		this.selectionOptions.style.width = "250px";
		this.selectionOptions.addEventListener(
			"change",
			this._updateShowing.bind(this)
		);
		// this._summary.appendChild(this.selectionOptions);

		this._removeButton = document.createElement("button");
		this._removeButton.setAttribute(
			"class",
			"btn btn-clear btn-charcoal f3 mr-3 btn-small"
		);
		this._removeButton.disabled = true;
		this._removeButton.textContent = "Remove";
		this._removeButton.addEventListener(
			"click",
			this._removeSelection.bind(this)
		);
		this._summary.appendChild(this._removeButton);

		this._chooseFileButton = document.createElement("button");
		this._chooseFileButton.setAttribute(
			"class",
			"btn btn-clear btn-charcoal f3 mr-3 btn-small"
		);
		this._chooseFileButton.setAttribute(
			"tooltip",
			"Choose files from your local machine."
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
		this._chooseFolderButton.setAttribute(
			"tooltip",
			"Choose folder to add recursively from your local machine."
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
		this._destination.setAttribute(
			"class",
			"col-12 d-flex flex-wrap my-3 pt-3 flex-items-center"
		);
		topOfTable.appendChild(this._destination);

		this._destinationPicker = document.createElement("enum-input");
		this._destinationPicker.setAttribute(
			"class",
			"d-block f2 col-md-9 col-lg-6"
		);
		this._destinationPicker.setAttribute("name", "Destination");
		this._destination.appendChild(this._destinationPicker);
		this._destinationPicker.addEventListener(
			"change",
			this.updateDestination.bind(this)
		);

		this._destinationApply = document.createElement("button");
		this._destinationApply.setAttribute(
			"class",
			"btn btn-small btn-charcoal f3 btn-clear text-white ml-3 clickable"
		);
		this._destinationApply.innerHTML = "Apply";
		this._destinationApply.addEventListener(
			"click",
			this._destinationApplySelected.bind(this)
		);
		this._destination.appendChild(this._destinationApply);

		this._clearAllInvalid = document.createElement("a");
		this._clearAllInvalid.setAttribute(
			"class",
			"text-underlined text-gray clickable f3 ml-3"
		);
		this._clearAllInvalid.textContent = "Clear All Invalid";
		this._clearAllInvalid.addEventListener(
			"click",
			this._clearAllInvalidEntries.bind(this)
		);
		this._destination.appendChild(this._clearAllInvalid);

		const selectSection = document.createElement("div");
		selectSection.setAttribute("class", "col-3");
		// topOfTable.appendChild(selectSection);

		const topRight = document.createElement("div");
		topRight.setAttribute(
			"class",
			"py-2 f3 text-gray d-flex flex-wrap col-3 hidden"
		);
		topOfTable.appendChild(topRight);

		this._paginatorSummary = document.createElement("div");
		this._paginatorSummary.setAttribute(
			"class",
			"py-2 f3 text-gray text-right clickable col-12"
		);
		this._paginatorSummary.innerHTML = `Page: <span>1</span> of <span>1</span>`;
		topRight.appendChild(this._paginatorSummary);

		this._paginatorPrev = document.createElement("div");
		this._paginatorPrev.setAttribute(
			"class",
			"py-2 f3 text-gray text-right clickable col-6"
		);
		this._paginatorPrev.innerHTML = `Prev`;
		this._paginatorPrev.addEventListener("click", this._prevPage.bind(this));
		topRight.appendChild(this._paginatorPrev);

		this._paginatorNext = document.createElement("div");
		this._paginatorNext.setAttribute(
			"class",
			"py-2 f3 text-gray text-right clickable col-6"
		);
		this._paginatorNext.innerHTML = `Next`;
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
			.set("type", "Type")
			.set("lastrow", "");

		this._createTable([]);

		store.subscribe(
			(state) => state.mediaTypeSettings,
			this._updateFileOptions.bind(this)
		);
	}

	connectedCallback() {
		this._projectId = Number(window.location.pathname.split("/")[1]);
		this.init(store);
	}

	dropHandler(list) {
		this.fileHandleHandler(list);
	}

	_updateFileOptions(mediaTypeSettings) {
		let specList = [],
			allowDirectories = false;

		// TODO: Set this or just get from store?
		this._mediaTypeSettings = mediaTypeSettings;

		for (let entry of mediaTypeSettings) {
			if (entry.dtype == "image") {
				specList.push(...this._acceptedImageExt);
			} else if (entry.dtype == "video") {
				specList.push(...this._acceptedVideoExt);
			} else if (entry.dtype == "folder") {
				allowDirectories = true;
			}
		}

		this._specifiedTypes = {
			description: "Media Files",
			acceptList: specList,
			allowDirectories: allowDirectories,
		};
	}

	async fileHandleHandler(fileHandles) {
		const gid = uuidv1();
		let parent = `${
			this._chosenSection?.path === "None"
				? this._chosenSection.name.replaceAll(" ", "_").replaceAll(".", "_")
				: this._chosenSection?.path
				? this._chosenSection.path
				: "New_Files"
		}`;

		if (fileHandles.kind == "directory") {
			this._newSections.push({
				name: entry.name,
				parent: parent, // PATH
				type: "folder",
				skip: this._specifiedTypes.allowDirectories ? false : true,
				note: this._specifiedTypes.allowDirectories
					? `<span class="text-purple">Checking...</span>`
					: "Folder upload disabled",
			});
			if (
				parent &&
				parent == "New_Files" &&
				this._specifiedTypes.allowDirectories
			) {
				parent = ``;
			} else {
				parent = this._specifiedTypes.allowDirectories
					? `${growPathByNameUtil(parent, entry.name)}`
					: parent;
			}
		} else if (!fileHandles || !fileHandles.length) {
			return;
		}

		await this._recursiveDirectoryUpload(fileHandles, gid, parent);
		const data = this.formatTableData();

		this._createTable(data);
		this._textSummaryUpdate();

		// Big Upload is Total Size > 60000000000
		if (data.filter((a) => !a.skip).length > 0) {
			await this._checkIdempotency();
		} else {
			this._checkIdemDiv.classList.remove("checking-files");
		}

		this._textSummaryUpdate();
	}

	async filePicker(directory = false) {
		// open file picker, destructure the one element returned array
		// Set a group ID on the upload.
		try {
			const fileHandles = !directory
				? await window.showOpenFilePicker({
						types: [
							{
								description: this._specifiedTypes.description,
								accept: {
									"*/*": [...this._specifiedTypes.acceptList],
								},
							},
						],
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
		for await (let entry of entries) {
			if (entry.kind === "file") {
				const file = await entry.getFile();
				const added = this._checkFile(file, gid);
				if (added.ok) {
					this._uploads.push({ ...added, parent });
					this._totalSize += file.size;
				} else {
					console.log("File not added", file);
					this._skippedEntries.push(file);
					// this._skippedReason = "File type not allowed";
					this._uploads.push({
						...added,
						parent,
						skip: true,
						note: "Invalid file type",
					});
				}
			} else if (entry.kind === "directory") {
				if (
					parent &&
					parent == "New_Files" &&
					this._specifiedTypes.allowDirectories
				) {
					parent = "";
				}

				this._newSections.push({
					name: entry.name,
					parent: parent,
					type: "folder",
					skip: this._specifiedTypes.allowDirectories ? false : true,
					note: this._specifiedTypes.allowDirectories
						? `<span class="text-purple">Checking...</span>`
						: "Folder upload disabled",
				});

				let newParent = this._specifiedTypes.allowDirectories
					? `${growPathByNameUtil(parent, entry.name)}`
					: parent;

				if (
					parent &&
					parent == "New_Files" &&
					this._specifiedTypes.allowDirectories &&
					entry.kind === "directory"
				) {
					newParent = "";
				}

				await this._recursiveDirectoryUpload(entry, gid, newParent);
			}
		}
	};

	set sectionData(val) {
		this._sectionData = val;
	}

	set sections(val) {
		this._sections = val;
		// Fill in the left panel area with section information
	}

	set mediaTypes(val) {
		this._mediaTypes = val;
		const choices = [
			{
				value: "None",
				label: this._noneText,
			},
			...this._sections.map((section) => {
				return {
					value: section.id,
					label: reducePathUtil(section.path),
				};
			}),
		];
		this._destinationPicker.choices = choices;

		const acceptList = [];
		let foundImg = false,
			foundVid = false;
		for (let m of val) {
			if (m.dtype === "image" && !foundImg) {
				acceptList.push(...this._acceptedImageExt);
				foundImg = true;
			} else if (m.dtype === "video" && !foundVid) {
				acceptList.push(...this._acceptedVideoExt);
				foundVid = true;
			}
		}

		this._specifiedTypes = {
			description: "Media Files",
			acceptList: acceptList,
			allowDirectories: true,
		};

		const params = new URLSearchParams(window.location.search);
		if (params.has("section")) {
			const sectionId = params.get("section");
			const section = this._sections.find((s) => s.id == sectionId);
			if (section) {
				this._chosenSection = section;
				this._lastSection = section;
				this._destinationPicker.setValue(sectionId);
				this.dispatchEvent(
					new CustomEvent("section-change", {
						detail: {
							section: this._chosenSection,
						},
					})
				);
			}
		} else {
			this._lastSection = {
				path: "None",
				name: "New Files",
			};
			this._chosenSection = {
				path: "None",
				name: "New Files",
			};
		}
	}

	static get observedAttributes() {
		return ["section"].concat(UploadElement.observedAttributes);
	}

	set project(val) {
		this._project = val;
		this._pageLink.setAttribute("href", `/${this._project.id}/upload`);
	}

	/**
	 * Creates upload summary from newly added files
	 * TODO: this isn't totally necessary could be merged with initial data creation?
	 *
	 * */
	formatTableData() {
		let data = [],
			files = [];

		for (let s of this._newSections) {
			data.push({
				name: s.name,
				size: 0,
				type: "folder",
				parent: s.parent,
				exists: false,
				duplicate: false,
				skip: this._specifiedTypes.allowDirectories ? false : true,
				note: this._specifiedTypes.allowDirectories
					? `<span class="text-purple">Checking...</span>`
					: "Folder upload disabled",
			});
		}

		for (let u of this._uploads) {
			files.push({
				...u,
				name: u.file?.name ? u.file.name : u.name ? u.name : "",
				size: u.file?.size ? u.file.size : u.size ? u.size : 0,
				type: u.file?.type ? u.file.type : u.type ? u.type : "file",
				parent: `${u.parent === "" ? "" : u.parent}`,
				duplicate: u.duplicate ? u.duplicate : false,
				exists: u.exists ? u.exists : false,
				note: u.note ? u.note : `<span class="text-purple">Checking...</span>`,
				skip: u.skip ? u.skip : false,
			});
		}

		data = [...data, ...files];

		return data;
	}

	_textSummaryUpdate() {
		const validSections = this._data.filter(
				(u) => !u.skip && u.type == "folder"
			),
			validFiles = this._data.filter((u) => !u.skip && u.type !== "folder"),
			invalidEntries = this._data.filter((u) => u.skip);

		this._summaryText.innerHTML = `
			<div class="pb-1">
				${validFiles.length} file${validFiles.length === 1 ? "" : "s"}
			</div>
			<div class="pb-1">
				${validSections.length} folder${validSections.length === 1 ? "" : "s"}
			</div>
							<div class="pb-1">
					${invalidEntries.length} invalid (will be skipped)
				</div>
			<div class="pb-1">${formatBytesOutput(this._totalSize)} total</div>
			${
				this._totalSize > 60000000000 || validFiles.length > 5000
					? `<div class="text-red bg-gray py-3 px-3">Warning: Recommended max browser upload size is 60GB or 5000 files.\n For larger uploads try tator-py.</div>`
					: ""
			}
			<div>`;

		if (this._skippedReason !== "" && this._skippedEntries.length > 0) {
			this._shadow
				.getElementById("skipped-details")
				?.addEventListener("click", (evt) => {
					evt.preventDefault();
					window.alert(this._skippedEntries.map((f) => f.name).join("\n"));
				});
		}
	}

	async _abortIdemCheck(evt) {
		evt.preventDefault();
		evt.currentTarget.innerText = "Cancelling...";

		if (this._idemCheckAbort && !this._cancelling) {
			this._cancelling = true;
			this._idemCheckAbort.abort("Idempotency check cancelled.");
			this._cancelledCheck = true;
			// this._checkIdemDiv.style.display = "none";
			this._data = this._data.map((d) => {
				if (d.note.includes("Checking")) {
					d.note = `<span class="text-gray">Idempotency check cancelled</span>`;
				}
				return d;
			});
			this._createTable(this._data);
			await asyncTimeout(1000);
			this._cancelling = false;
		}
	}

	async _checkIdempotency() {
		this._idemCheckAbort = new AbortController();
		this._cancelledCheck = false;
		this._checkIdemDiv.style.display = "block";
		this._checkIdemDiv.classList.add("checking-files");
		this._checkIdem.innerHTML = `<div class="f1 col-9">
		<div>Checking selection for duplicate files... This may take a few moments.</div>`;

		this._abortButton = document.createElement("a");
		this._abortButton.setAttribute("href", "#");
		this._abortButton.setAttribute(
			"class",
			"text-white text-underline clickable"
		);
		this._abortButton.textContent = "Cancel idempotency check";
		this._checkIdem.appendChild(this._abortButton);

		this._abortButton.addEventListener(
			"click",
			this._abortIdemCheck.bind(this)
		);

		// If we have a new base, check them all -- Otherwise, just the unmarked items
		this._data = this._data.map((d, i) => {
			return { ...d, index: i };
		});

		const files = this._data.filter(
				(d) => d.type !== "folder" && d.skip !== true
			),
			folders = this._data.filter(
				(d) => d.type === "folder" && d.skip !== true
			),
			remainingFiles = this._data.filter((d) => d.skip);

		const checkedFolders =
			folders.length > 0 ? await this._folderIdempotencyCheck(folders) : [];
		const checkedFiles =
			files.length > 0 ? await this._fileIdempotencyCheck(files) : [];

		this._createTable([...checkedFolders, ...checkedFiles, ...remainingFiles]);
		const totalExisting = this._data.filter((d) => d.exists).length;
		const totalDuplicates = this._data.filter((d) => d.duplicate).length;
		this._checkIdemDiv.style.display = "block";
		this._checkIdem.innerHTML = "Idempotency check complete!";
		// `<div class="h3">${
		// 	totalDuplicates > 0 || totalExisting > 0
		// 		? "Please review: "
		// 		: "Idempotency check complete!"
		// }</div><div class="py-2">${
		// 	totalExisting == 0
		// 		? ""
		// 		: `${totalExisting}  match${totalExisting == 1 ? "" : "es"} exist${
		// 				totalExisting == 1 ? "s" : ""
		// 		  }.`
		// }; ${totalDuplicates} duplicate${
		// 	totalDuplicates === 1 ? "" : "s"
		// } found in selected folder.</div>`;
		this._checkIdemDiv.classList.remove("checking-files");

		// if (!(totalDuplicates > 0 || totalExisting > 0)) {
		setTimeout(() => {
			this._checkIdemDiv.style.display = "none";
		}, 1000);
		// }
		return;
	}

	async _fileIdempotencyCheck(files) {
		return new Promise(async (resolve, reject) => {
			const newSectNames = this._newSections.map((u) => u.name);

			if (files && files.length > 0) {
				// Goes through and checks if media exists in the location
				for (let f of files) {
					try {
						if (this._cancelledCheck) {
							resolve(folders);
						}
						await this.asyncTimeout(300);
						let mySection = this._sections.find((s) => s.path == f.parent);

						// If the parent is set to root, we need to check all sections
						if (
							(!mySection && f.parent == "") ||
							!f.parent ||
							f.parent == "/"
						) {
							mySection = null;
						} else {
							// See if we can narrow down the matching section
							// Is it a new folder?
							if (newSectNames && newSectNames.length > 0) {
								for (let path of newSectNames) {
									if (!f.parent === path) {
										mySection = "new"; // This is a new folder
									}
								}
							}
						}

						const knownSection =
							mySection !== null &&
							mySection !== "new" &&
							mySection?.id &&
							mySection?.id !== null;

						const url = `/rest/Medias/${this._projectId}?name=${encodeURI(
							f.name
						)}${knownSection ? `&section=${mySection.id}` : ""}`;

						const resp = await fetchCredentials(url, {
							signal: this._idemCheckAbort.signal,
						});
						const data = await resp.json();
						console.log("Idemopotency check, URL + Data: " + url, data);

						f.exists = data.length !== 0;
						f.duplicate = f.exists && knownSection;
						let sizeMatch = null;

						// TODO check size of video?
						if (f.exists && f?.mediaType?.dtype == "image") {
							sizeMatch = data[0].media_files?.image?.[0]?.size === f.size;
						}

						if (f.exists) {
							const otherFolderCount = !knownSection
								? data.length
								: data.length - 1;
							f.note = `<div class="py-2">Warning: File exists in ${
								knownSection ? "this location" : ""
							} ${
								data.length === 1
									? "1 folder"
									: `${
											knownSection ? "and" : ""
									  } ${otherFolderCount} other folder${
											otherFolderCount === 1 ? "" : "s"
									  }`
							};</div><div class="py-1">Match: Name ${
								sizeMatch ? "and Size" : "only"
							}</div><div class="py-2">${
								data && data.length > 0
									? data
											.map((d, i) => {
												return `<a target="blank" href="/${this._projectId}/annotation/${d.id}" class="text-white text-underline clickable my-3">View media</a>`;
											})
											.join("<br/>")
									: ""
							}</div>`;
						} else if (!f.skip) {
							f.note = "<span class=''>Valid file</span>";
						}

						this._data[f.index] = f;
						this._createTable(this._data);
					} catch (err) {
						if (err !== "Idempotency check cancelled")
							console.error("Error checking idem. for file", err);
					}
				}
				resolve(files);
			}
		});
	}

	asyncTimeout(ms) {
		return new Promise((resolve) => {
			console.log("Async timeout", ms);
			setTimeout(resolve, ms);
		});
	}

	async _folderIdempotencyCheck(folders) {
		return new Promise(async (resolve, reject) => {
			if (folders && folders.length > 0) {
				for (let folder of folders) {
					try {
						if (this._cancelledCheck) {
							return resolve(folders);
						}

						await this.asyncTimeout(300);
						// Check if the folder exists in the section
						const newPath = growPathByNameUtil(folder.parent, folder.name),
							url = `/rest/Sections/${this._projectId}?match=${newPath}`;
						const resp = await fetchCredentials(url, {
							signal: this._idemCheckAbort.signal,
						});
						const data = await resp.json();
						console.log("Idemopotency check, URL + Data: " + url, data);
						if (data.length > 0) {
							this._skippedEntries.push(folder);
							folder.exists = true;
							folder.skip = true;
							folder.note = "Exists: Folder paths cannot be duplicated";

							this._removeParentPath(folder.name);
						} else if (!folder.skip) {
							folder.note = "<span class=''>Valid folder</span>";
						}

						this._data[folder.index] = folder;

						this._createTable(this._data);
					} catch (err) {
						if (err !== "Idempotency check cancelled")
							console.error("Error checking idem. for file", err);
					}
				}
				resolve(folders);
			}
		});
	}

	_createHeader() {
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
						if (input !== null) input._checked = checkCell;
					}
					this._calculateSelected();
				});
			} else {
				cell.addEventListener("click", (evt) => {
					this._sortTable(key, this._direction);
				});
			}
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

		this._summaryTable.innerHTML = "";
		this._createHeader();
		const body = this._summaryTable.createTBody();

		const start = (this._currentPage - 1) * this._pageSize;
		const end = start + this._pageSize;
		const pageData = this._data.slice(start, end);

		const pageText = `Page: <span>${
			this._currentPage
		}</span> of <span>${Math.ceil(this._data.length / this._pageSize)}</span>`;

		this._paginatorSummary.innerHTML = pageText;

		if (pageData && pageData.length > 0) {
			pageData.forEach((row, index) => {
				const tr = body.insertRow();
				tr.dataset.info = JSON.stringify(row);
				this._headerMap.forEach((value, key) => {
					const cell = tr.insertCell();

					if (key == "name") {
						if (row.type === "folder") {
							cell.innerHTML = `<span><svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
							<path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 19h-7a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v3.5"></path><path d="M16 19h6"></path><path d="M19 16v6"></path>
						</svg></span> ${
							row.parent !== "" ? reducePathUtil(row.parent) + " > " : ""
						}<span class="text-bold">${row.name}</span>`;
						} else {
							cell.innerHTML = `${reducePathUtil(
								row.parent
							)} > <span class="text-bold">${row.name}</span>`;
						}
					} else if (key == "select") {
						if (row.skip) {
							cell.classList.add("text-center", "f3", "clickable");
							cell.addEventListener("click", (evt) => {
								tr.remove();
								this._removeEntry(row);
							});
							cell.textContent = "X";
							this._checkboxMap.set(index, null);
						} else {
							const input = document.createElement("checkbox-input");
							input.label.setAttribute("class", "text-center");

							cell.addEventListener("click", (evt) => {
								input.click();
							});
							input.addEventListener(
								"change",
								this._calculateSelected.bind(this)
							);
							cell.appendChild(input);
							this._checkboxMap.set(index, input);
						}
					} else if (key == "size" && row.type === "folder") {
						cell.textContent = "--";
					} else if (key == "size") {
						cell.textContent = formatBytesOutput(row.size);
					} else if (key == "lastrow") {
						cell.classList.add("text-center", "f3", "clickable", "text-gray");
						cell.addEventListener("click", (evt) => {
							tr.remove();
							this._removeEntry(row);
						});
						cell.textContent = "Remove";
					} else {
						cell.innerHTML = row[key];

						if (key == "note") {
							if (row.skip) tr.classList.add("text-gray");
						}
					}
				});
			});
		}
	}

	_calculateSelected(evt) {
		let checked = 0;
		for (let [index, input] of this._checkboxMap) {
			if (input !== null && input.getChecked()) checked++;
		}

		this._removeButton.disabled = checked === 0;
		this._removeButton.textContent = `Remove (${checked})`;
	}

	_removeEntry(row) {
		const index = this._data.findIndex((d) => d.name === row.name);
		if (index > -1) {
			this._skippedEntries = this._skippedEntries.filter(
				(f) => f.name !== row.name
			);

			for (let f of this._data) {
				this._totalSize += f.size;
			}

			if (this._data[index].type === "folder") {
				let removedParent = this._data[index].name
					.replaceAll(" ", "_")
					.replaceAll(".", "_");
				this._data = this._removeParentPath(removedParent);
			}

			this._data.splice(index, 1);
			this._newSections = this._data.filter((s) => s.type === "folder");
			this._uploads = this._data.filter((u) => u.type !== "folder");

			this._createTable(this._data);
			this._calculateSelected();
			this._textSummaryUpdate();
		}
	}

	_removeParentPath(removedParent) {
		for (let f of this._data) {
			console.log(
				`Removing parent *${removedParent}* from current *${f.parent}*`
			);

			// File paths are the parent path + destination at the end, or just destination if it is 1 directory
			// File paths like "" or "New_Files" are the same
			// New folder additions store the path as really just the parent, and the name is the new folder (destination at end)

			if (f.parent.indexOf("." + removedParent) > -1) {
				console.log("Rem 1");
				// it is inside a path like "Folder.RemoveMe.Folder2"
				// - Replace ".RemoveMe" with ""
				f.parent = f.parent.replace("." + removedParent, "");
			} else if (f.parent.indexOf(removedParent + ".") > -1) {
				// it is at the top of a path like "RemoveMe.Folder2"
				// - Replace "RemoveMe." with ""
				f.parent = f.parent.replace("." + removedParent, "");
			} else if (f.parent === removedParent) {
				// If equal
				// - This file is in the folder we are removing
				// - This is the folder we're removing
				// So we do something slightly different for folders
				f.parent = f.type === "folder" ? "" : "New_Files";
			} else {
				// If none of these cases are met, it is unrelated to the removed folder path
			}
		}

		return this._data;
	}

	_destinationApplySelected(evt) {
		console.log(
			"DEST APPLY this._chosenSection",
			this._chosenSection,
			"this._lastSection",
			this._lastSection
		);

		const oldPath =
			this._lastSection === null
				? ""
				: this._lastSection?.path !== "None"
				? this._lastSection.path
				: this._lastSection.name.replaceAll(" ", "_").replaceAll(".", "_");
		const newPath =
			this._chosenSection.path !== "None"
				? this._chosenSection.path
				: this._chosenSection.name.replaceAll(" ", "_").replaceAll(".", "_");

		// If the destination has changed
		if (oldPath !== newPath) {
			const data = [];
			for (let ind in this._data) {
				const d = this._data[ind];

				console.log(
					`${d.parent == oldPath} current:${
						d.parent
					} old:${oldPath} combo:${growPathByNameUtil(d.parent, newPath)}`,
					d
				);

				if (d.type == "folder" && d.parent.indexOf(oldPath) > -1) {
					d.parent = d.parent.replace(oldPath, newPath);
				} else if (d.parent == oldPath || d.parent.indexOf(oldPath) === -1) {
					d.parent = newPath;
				} else if (d.parent.indexOf(oldPath) > -1) {
					d.parent = d.parent.replace(oldPath, newPath);
				}

				console.log("Data updated", { ...d });

				data.push(d);
			}

			this._lastSection = this._chosenSection;
			this._createTable(data);
			this._checkIdempotency();
			this._calculateSelected();
			this._textSummaryUpdate();
		}
	}

	_removeSelection(evt) {
		const selected = [];
		let removedParent = [];
		for (let [index, input] of this._checkboxMap) {
			if (input.getChecked()) {
				selected.push(index);
				if (this._data[index].type === "folder") {
					removedParent.push(this._data[index].parent);
				}
			}
		}

		const data = this._data.filter((d, index) => {
			return !selected.includes(index);
		});

		this._newSections = data.filter((s) => s.type === "folder");
		this._uploads = data.filter((u) => u.type !== "folder");

		this._totalSize = 0;
		for (let f of this._uploads) {
			this._totalSize += f.size;

			if (f.parent.indexOf(removedParent) > -1) {
				f.parent = f.parent.replace(removedParent, "");
			}
		}

		this._createTable(data);
		this._textSummaryUpdate();
		this._calculateSelected();
	}

	updateDestination(evt) {
		this._lastSection = this._chosenSection;
		const sectionId =
			this._destinationPicker.getValue() !== this._noneText
				? Number(this._destinationPicker.getValue())
				: null;

		if (sectionId == null) {
			this._chosenSection = {
				id: null,
				name: "",
				path: "",
			};
		} else {
			this._chosenSection =
				sectionId && this._sectionData?._sectionIdMap?.[sectionId]
					? this._sectionData._sectionIdMap[sectionId]
					: { id: null, name: "", path: "" };
		}

		if (this._chosenSection.id !== null) {
			window.history.replaceState(
				{},
				"",
				`/${this._projectId}/upload?section=${this._chosenSection.id}`
			);
		}

		console.log(
			"DEST UPDATE this._chosenSection",
			this._chosenSection,
			"this._lastSection",
			this._lastSection
		);

		this.dispatchEvent(
			new CustomEvent("section-change", {
				detail: {
					section: this._chosenSection,
				},
			})
		);
	}

	_setEmptyVariables() {
		this._totalSize = 0;
		this._skippedEntries = [];
		this._skippedReason = "";
		this._currentPage = 1;
		this._pageSize = 50000000000000000;
		this._data = [];
		this._uploads = [];
		this._newSections = [];
		this._noneText = "-- None --";
		this._duplicateMap = new Map();
		this._chosenSection = {
			id: null,
			name: "",
			path: "",
		};
	}

	_resetUpload() {
		this._setEmptyVariables();
		this._createTable([]);
		this._checkIdemDiv.style.display = "none";
		this._checkIdem.innerHTML = "";
		this._removeButton.textContent = "Remove";
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

		const validSections = this._data.filter(
			(u) => !u.skip && u.type == "folder"
		);
		const validFiles = this._uploads.filter(
			(u) => !u.skip && u.type !== "folder"
		);

		const allValid = [...validFiles, ...validSections],
			uploadInfo = allValid.map((f) => {
				return {
					...f,
					status: "Pending...",
				};
			});

		this._store.setState({
			uploadTotalFolders: validSections.length,
			uploadTotalFiles: validFiles.length,
			uploadCancelled: false,
			uploadInformation: uploadInfo,
		});

		if (uploadInfo.length > 0) {
			for (const [idx, msg] of [...validSections, ...validFiles].entries()) {
				promise = promise
					.then(() => {
						console.log("Folder MSG", msg);
						if (this._cancel) {
							throw `Creation of '${msg.name}' cancelled!`;
						}
						if (!msg.file) {
							this._store.setState({
								uploadCurrentFile: msg.name,
							});
							msg.abortController = this._abortController;
							console.log("Creating folder with these opts", msg);
							// msg.progressCallback = () => {};

							return this._createFolder(msg);
						} else {
							this._store.setState({
								uploadChunkProgress: 0,
								uploadCurrentFile: msg.file.name,
							});

							const info = {
								...msg,
								section: null,
								section_id: null,
								name: msg.file.name,
							};
							const section = this._sections.find((s) => s.path == info.parent);
							console.log("Section", this._sections, section, info.parent);
							if (section) {
								info.section = section.name;
								info.section_id = section.id;
							}

							console.log("Uploading media with this opts", info);
							return uploadMedia(info.mediaType, info.file, info);
						}
					})
					.then(() => {
						if (!msg.file) {
							const completed = store.getState().uploadFoldersCompleted + 1;
							this._store.setState({
								uploadFoldersCompleted: completed,
							});
						} else {
							const completed = store.getState().uploadFilesCompleted + 1;
							this._store.setState({
								uploadFilesCompleted: completed,
							});
						}

						const updated = [...store.getState().uploadInformation];

						updated[idx].status = "Success!";

						this._store.setState({
							uploadInformation: [...updated],
						});

						return true;
					});
			}
		}

		// promise.catch((error) => {
		// 	this._store.setState({ uploadError: error.message });
		// });
	}

	_updateShowing(evt) {
		this._currentPage = 1;
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

	_sortTable(key) {
		const data = this._data.sort((a, b) => {
			if (a[key] < b[key]) {
				return this._direction * -1;
			}
			if (a[key] > b[key]) {
				return this._direction * 1;
			}
			return 0;
		});

		this._direction = this._direction * -1;
		this._createTable(data);
	}

	async _createFolder(msg) {
		try {
			var spec = {
				name: msg.name,
				path: growPathByNameUtil(msg.parent, msg.name),
				tator_user_sections: uuidv1(),
				visible: true,
			};
			var response = await fetchCredentials(
				`/rest/Sections/${this._projectId}`,
				{
					method: "POST",
					body: JSON.stringify(spec),
				}
			);

			if (response.status == 201) {
				var data = await response.json();

				// Add the new section to the section list

				const sections = await fetchCredentials(
					`/rest/Sections/${this._projectId}`
				);
				const sectionData = await sections.json();
				this.sections = sectionData;
			} else {
				var data = await response.json();
				console.error(data.message);
				store.setState({ uploadError: data.message });
			}
			return msg;
		} catch (err) {
			console.error(err);
			store.setState({ uploadError: err.message });
			return msg;
		}
	}

	_clearAllInvalidEntries(evt) {
		evt.preventDefault();
		this._data = this._data.filter((d) => !d.skip);
		this._skippedEntries = [];
		this._createTable(this._data);
		this._textSummaryUpdate();
		this._calculateSelected();
	}
}

customElements.define("drop-upload", DropUpload);
