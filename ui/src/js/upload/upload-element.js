import { store } from "./store.js";
import { v1 as uuidv1 } from "uuid";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

import { formatBytesOutput } from "../util/bytes-formatter.js";
import { TatorElement } from "../components/tator-element.js";

import Upload from "./classes/Upload.js";

/**
 * User is assembling a new Upload which consists of files and folders
 * that will be uploaded to the server.
 *
 * This component is responsible for:
 * 1. Displaying the files and folders that have been added
 * 2. Displaying the destination section
 * 3. Displaying the media type settings
 * 4. Displaying the upload summary
 * 5. Displaying the upload status and progress
 * 6. Displaying the success or failures of the upload
 *
 */

export class UploadElement extends TatorElement {
	constructor() {
		super();

		this._currentUpload = null;
		this._activeUploads = [];

		this._setEmptyVariables();

		// Destination section
		this._destination = document.createElement("div");
		this._destination.setAttribute(
			"class",
			"px-3 py-2 rounded-3 my-3 d-flex flex-wrap"
		);
		this._destination.setAttribute(
			"style",
			"border: 1px solid var(--color-charcoal--light);"
		);
		this._shadow.appendChild(this._destination);

		this._destinationTitle = document.createElement("div");
		this._destinationTitle.innerHTML = `
		
		<span class="text-gray">Specify the destination, and optionally choose the data type you are uploading, and apply metadata to uploaded media.</span>`;
		this._destinationTitle.setAttribute("class", "col-9 my-3 pb-2");
		this._destination.appendChild(this._destinationTitle);

		this._resetToDefault = document.createElement("a");
		this._resetToDefault.setAttribute(
			"class",
			"col-3 text-underline text-gray clickable f1 hover-text-white text-right"
		);
		this._resetToDefault.textContent = "Reset to default values";
		this._resetToDefault.addEventListener("click", () => {
			window.dispatchEvent(new Event("reset-to-default"));
		});
		this._destination.appendChild(this._resetToDefault);

		this._destinationPicker = document.createElement("enum-input");
		this._destinationPicker.setAttribute(
			"class",
			"d-block f1 col-lg-4 col-sm-8 pr-3 pl-6"
		);
		this._destinationPicker.label.setAttribute("class", "py-1");
		this._destinationPicker.setAttribute("name", "Destination");
		// this._destinationPicker._select.classList.remove("col-8");
		this._destinationPicker._select.classList.add("pl-3", "ml-3");
		this._destination.appendChild(this._destinationPicker);
		this._destinationPicker.addEventListener(
			"change",
			this.updateDestination.bind(this)
		);

		const destBottom = document.createElement("div");
		destBottom.setAttribute("class", "col-6");
		this._destination.appendChild(destBottom);

		this._idemPotencyCheck = document.createElement("checkbox-input");
		this._idemPotencyCheck.label.setAttribute(
			"class",
			"d-flex flex-items-center pb-3"
		);
		this._idemPotencyCheck.setAttribute("class", "d-block f2 my-1 ml-6");
		this._idemPotencyCheck._checked = true;
		this._idemPotencyCheck.setAttribute(
			"name",
			"Flag duplicates before upload. (Uncheck to skip)"
		);
		destBottom.appendChild(this._idemPotencyCheck);
		// this._idemPotencyCheck.addEventListener(
		// 	"change",
		// 	this._abortIdemCheck.bind(this)
		// );

		this._folderCheck = document.createElement("checkbox-input");
		this._folderCheck.label.setAttribute(
			"class",
			"d-flex flex-items-center my-1 ml-6"
		);
		this._folderCheck._checked = true;
		this._folderCheck.setAttribute("class", "d-block f2");
		this._folderCheck.setAttribute(
			"name",
			"Preserve folder structure. (Uncheck to flatten)"
		);
		destBottom.appendChild(this._folderCheck);

		// Properties of media types
		this.mediaTypeSettings = document.createElement("media-type-settings");
		this.mediaTypeSettings.setAttribute("class", "col-12 mt-3");
		this._destination.appendChild(this.mediaTypeSettings);

		// File summary and upload CTAs
		const main = document.createElement("div");
		main.setAttribute("class", "px-3 py-3 rounded-3");
		main.setAttribute(
			"style",
			"border: 1px solid var(--color-charcoal--light);"
		);
		this._shadow.appendChild(main);

		this._summary = document.createElement("div");
		this._summary.setAttribute(
			"class",
			"d-flex flex-justify-between flex-items-center"
		);
		main.appendChild(this._summary);

		this._summaryTitle = document.createElement("div");
		// this._summaryTitle.innerHTML = `<span class="h3 mr-3">Summary</span>`;
		this._summaryTitle.setAttribute("class", "col-8");
		this._summary.appendChild(this._summaryTitle);

		this._summaryText = document.createElement("div");
		this._summaryText.textContent = "No files, or folders added.";
		this._summaryText.setAttribute("class", "py-2 text-gray f1");
		this._summaryTitle.appendChild(this._summaryText);

		this._invalidInfo = document.createElement("div");
		this._summaryTitle.appendChild(this._invalidInfo);

		this._invalidSummary = document.createElement("span");
		this._invalidSummary.setAttribute("class", "text-gray f2");
		this._invalidSummary.textContent = "Invalid: 0";
		this._invalidSummary.hidden = true;
		this._invalidInfo.appendChild(this._invalidSummary);

		this._invalidDetails = document.createElement("a");
		this._invalidDetails.setAttribute(
			"class",
			"text-underline text-gray clickable f3 ml-3 hidden"
		);
		this._invalidDetails.textContent = "Details";
		this._invalidDetails.addEventListener(
			"click",
			this._showInvalidDetails.bind(this)
		);
		this._invalidInfo.appendChild(this._invalidDetails);

		this._checkIdemDiv = document.createElement("div");
		this._checkIdemDiv.setAttribute(
			"class",
			"upload-idem-notification py-2 f2 mt-3"
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
			"btn btn-clear btn-charcoal f1 mr-3 hidden"
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
			"btn btn-clear btn-charcoal f1 mr-3 "
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
			"btn btn-clear btn-charcoal f1 "
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

		const selectSection = document.createElement("div");
		selectSection.setAttribute("class", "col-3");
		// topOfTable.appendChild(selectSection);

		const topRight = document.createElement("div");
		topRight.setAttribute(
			"class",
			"py-2 f3 text-gray d-flex flex-wrap col-3 hidden"
		);
		topOfTable.appendChild(topRight);

		this._dropZone = document.createElement("div");
		this._dropZone.setAttribute(
			"class",
			"col-lg-8 col-sm-11 offset-lg-2 f1 text-gray px-3 py-3 my-3 mt-6 rounded-3 text-center drop-zone flex-justify-center flex-items-center"
		);
		// this._dropZone.style = "height: 100px;";
		this._dropZone.innerHTML = `Drag and drop files and folders you want to upload here, or choose Add Files or Add Folder.`;
		// <br/><br/>Recommended browser upload size is 60GB, or 5000 files. For larger uploads try <a href="https://www.tator.io/docs/developer-guide/getting-started/install-tator-py" class="text-purple hover-text-underline" target="_blank">tator-py</a>.
		main.appendChild(this._dropZone);

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
		this._summaryTable.setAttribute("class", "col-12 file-table upload-table");
		main.appendChild(this._summaryTable);

		this._headerMap = new Map();
		this._headerMap
			.set("lastrow", "")
			// .set("select", this._allSelectedText)
			.set("name", "Path")
			.set("size", "Size")
			.set("type", "Type")
			.set("note", "Note");
		// ;

		store.subscribe(
			(state) => state.mediaTypeSettings,
			this._updateFileOptions.bind(this)
		);
	}

	connectedCallback() {
		this._projectId = Number(window.location.pathname.split("/")[1]);
		this.init(store);
	}
	init(store) {
		this._store = store;
		store.subscribe(
			(state) => state.uploadCancelled,
			(cancelled) => {
				if (cancelled) {
					// Cancel next uploads.
					this._cancel = true;
					// Abort uploads in progress.
					this._abortController.abort();
				} else {
					this._cancel = false;
				}
			}
		);
	}

	generateSpecList(mediaTypeSettings) {
		let allowDirectories = mediaTypeSettings.find((m) => m.dtype === "folder")
				? true
				: false,
			acceptList = mediaTypeSettings.map((m) => {
				if (m.dtype === "image") {
					return this._acceptedImageExt;
				} else if (m.dtype === "video") {
					return this._acceptedVideoExt;
				}
			});

		this._specifiedTypes = {
			description: "Media Files",
			acceptList: acceptList,
			allowDirectories: allowDirectories,
		};
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

	_updateFileOptions(mediaTypeSettings) {
		this.generateSpecList(mediaTypeSettings);

		// If there is already file data present when this changes, update the file options
		if (this._currentUpload) {
			let removed = this._currentUpload._updateFileOptions(mediaTypeSettings);

			// Notify the user
			if (removed.length > 0) {
				this.idemDivAsMessanger(
					`File type changed: Removed ${removed.length} entr${
						removed.length == 1 ? "y" : "ies"
					}.`
				);

				// Update the summary table
				this._createTable(this._currentUpload.list);
			}
		}
	}

	idemDivAsMessanger(message, time = 1500) {
		// this._loadingInterface.displayLoadingScreen(message);

		this._checkIdem.innerHTML = message;
		this._checkIdemDiv.style.display = "block";
		setTimeout(() => {
			this._checkIdemDiv.style.display = "none";
		}, time);
	}

	async fileHandleHandler(fileHandles) {
		const gid = uuidv1();

		let parent = `${
			this._chosenSection?.path === "None"
				? this._chosenSection.name.replaceAll(" ", "_").replaceAll(".", "_")
				: this._chosenSection?.path
				? this._chosenSection.path
				: ""
		}`;

		if (this._currentUpload === null) {
			this._currentUpload = new Upload({
				gid,
				fileHandles,
				parent,
				destination: this._chosenSection,
				store: this._store,
				sectionData: this._sectionData,
			});
			await this._currentUpload._constructList();
		} else {
			this._currentUpload.addFileHandles(fileHandles);
		}

		this._createTable();

		console.log("this._currentUpload.list.....", this._currentUpload.list);
		if (this._currentUpload.list.length > 0) {
			await this._checkIdempotency();
		} else {
			this._checkIdemDiv.classList.remove("checking-files");
		}
	}

	set sectionData(val) {
		this._sectionData = val;
	}

	set sections(val) {
		this._sections = val;
		// Fill in the left panel area with section information
		var choices = this._sectionData.getFolderEnumChoices();
      choices.unshift({ value: this._noParentName, label: this._noParentName });
		this._destinationPicker.choices = choices;

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

	set mediaTypes(val) {
		this._mediaTypes = val;
		this.mediaTypeSettings.mediaTypes = this._mediaTypes;

		// Seetup the media type settings
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
	}

	static get observedAttributes() {
		return ["section"].concat(UploadElement.observedAttributes);
	}

	set project(val) {
		this._project = val;
		this._pageLink.setAttribute("href", `/${this._project.id}/upload`);
	}

	_textSummaryUpdate() {
		if (!this._currentUpload?.list || this._currentUpload?.list.length === 0) {
			this._summaryText.textContent = "No files, or folders added.";
			this._invalidSummary.hidden = true;
		} else {

	
			const validSections = this._currentUpload.list.filter(
					(u) => !u.invalid_skip && u.type == "folder"
				),
				validFiles = this._currentUpload.list.filter(
					(u) => !u.invalid_skip && u.type !== "folder"
				),
				invalidEntries = this._currentUpload.list.filter((u) => u.invalid_skip);

			this._summaryText.innerHTML = `
				<div class="pb-1">
					Valid: ${validFiles.length} file${
				validFiles.length === 1 ? "" : "s"
			} (${formatBytesOutput(this._currentUpload.totalSize)}) 
					${validSections.length > 0 && validFiles.length > 0 ? " and " : ""}
					${validSections.length} folder${validSections.length === 1 ? "" : "s"}
				</div>
				${
					this._currentUpload.totalSize > 60000000000 ||
					validFiles.length > 5000
						? `<div class="text-red bg-gray py-3 px-3">Warning: Recommended max browser upload size is 60GB or 5000 files.\n For larger uploads try tator-py.</div>`
						: ""
				}
				<div>`;

			if (invalidEntries.length > 0) {
				this._invalidSummary.hidden = false;
				this._invalidSummary.innerHTML = `Invalid: 
				${invalidEntries.length}`;
				this._invalidDetails.classList.remove("hidden");
			} else {
				this._invalidSummary.hidden = true;
				this._invalidDetails.classList.add("hidden");
			}
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
			this._createTable();
			await this.asyncTimeout(10);
			this._cancelling = false;
		}
	}

	async _checkIdempotency() {
		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: [],
					ok: false, // TODO: Check if there are any errors
					buttonText: "Waiting for idempotency check...",
					idemCheck: true,
				},
			})
		);
		this._progressButton._progressCallback(0);
		this._idemCheckAbort = new AbortController();
		this._cancelledCheck = false;
		// this._checkIdemDiv.style.display = "block";
		// this._checkIdemDiv.classList.add("checking-files");
		// this._checkIdem.innerHTML = `<div class="f1 col-9">
		// <div>Checking selection for duplicate files... This may take a few moments.</div>`;

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
		const files = this._currentUpload.list.filter(
				(d) => d.type !== "folder" && d.invalid_skip !== true
			),
			folders = this._currentUpload.list.filter(
				(d) => d.type === "folder" && d.invalid_skip !== true
			),
			remainingFiles = this._currentUpload.list.filter((d) => d.invalid_skip);

		if (folders.length > 0) {
			await this._folderIdempotencyCheck(folders);
		}
		if (files.length > 0) {
			await this._fileIdempotencyCheck(files);
		}

		// this.idemDivAsMessanger("Idempotency check complete!");
		// this._checkIdemDiv.classList.remove("checking-files");
		this._createTable();

		const { validSections, validFiles } = this._currentUpload.getValidSummary();

		if (files.length !== validFiles.length) {
			this.idemDivAsMessanger("Some invalid files were skipped.");
		}

		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: [...validSections, ...validFiles],
					ok: true, // TODO: Check if there are any errors
					buttonText: `Upload ${
						validFiles.length > 0
							? `${validFiles.length} file${validFiles.length === 1 ? "" : "s"}`
							: ""
					} ${
						validFiles.length > 0 && validSections.length > 0 ? " and " : ""
					} ${
						validSections.length > 0
							? `${validSections.length} folder${
									validSections.length === 1 ? "" : "s"
							  }`
							: ""
					}`,
					idemCheck: false,
				},
			})
		);
		return;
	}

	async _fileIdempotencyCheck(files) {
		return new Promise(async (resolve, reject) => {
			const newSectNames = this._newSections.map((u) => u.name);
			let percentUp = 100 / files.length;
			let start = 0;
			if (files && files.length > 0) {
				// Goes through and checks if media exists in the location
				for (let f of files) {
					try {
						if (this._cancelledCheck) {
							resolve(folders);
						}
						await this.asyncTimeout(10);
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
						} else if (!f.info_skip && !f.invalid_skip) {
							f.note = "<span class=''>Valid file</span>";
						}

						this._currentUpload.updateIndex(f.index, f);
						this._createTable(true);
					} catch (err) {
						if (err !== "Idempotency check cancelled")
							console.error("Error checking idem. for file", err);
					}

					start += percentUp;
					this._progressButton._progressCallback(start);
				}
				resolve(files);
			}
		});
	}

	asyncTimeout(ms) {
		return new Promise((resolve) => {
			// console.log("Async timeout", ms);
			setTimeout(resolve, ms);
		});
	}

	joinNewPath(path, newPath) {
		const updatedName = name.replaceAll(" ", "_").replaceAll(".", "_");
		const joined =
			path == "" || path == null || path == undefined
				? `${updatedName}`
				: `${path}.${updatedName}`;

		return joined;
	}

	async _folderIdempotencyCheck(folders) {
		return new Promise(async (resolve, reject) => {
			try {
				if (this._cancelledCheck) {
					return resolve(folders);
				}
				if (folders && folders.length > 0) {
					for (let folder of folders) {
						let exists = false;
						// See if the adjusted path/name matches any of the provided sections
						// Use the lowercase version of the name and path for comparison
						for (const section of this._sections) {
							const sectionPath = this._sectionData.getSectionPath(section);
							// Check if the folder exists in the section
							let newPath = this._sectionData.getSectionPath(folder);
							if (
								folder.parent &&
								folder.parent !== "" &&
								folder.parent !== null
							) {
								newPath = `${folder.parent}.${newPath}`;
							}
							if (sectionPath.toLowerCase() === newPath.toLowerCase()) {
								exists = true;
							}
						}

						// Check if the folder exists in the section
						if (exists) {
							this._skippedEntries.push(folder);
							folder.exists = true;
							folder.invalid_skip = true;
							folder.note = `<span class="text-red">Folder with this name exists in this location.</span>`;

							this._currentUpload._removeParentPath(folder.name);
						} else if (!folder.invalid_skip) {
							folder.note = "<span class=''>Valid folder</span>";
						}

						this._currentUpload.updateIndex(folder.index, folder);

						this._createTable(this._data);
					}
				}
				resolve(folders);
			} catch (err) {
				if (err !== "Idempotency check cancelled")
					console.error("Error checking idem. for file", err);
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

	_createTable(idemCheck = false) {
		// Upload > list

		this._checkboxMap = new Map();

		this._summaryTable.innerHTML = "";
		this._createHeader();
		const body = this._summaryTable.createTBody();

		// TBD: Pagination?
		// const start = (this._currentPage - 1) * this._pageSize;
		// const end = start + this._pageSize;
		// const pageData = this._data.slice(start, end);

		// const pageText = `Page: <span>${
		// 	this._currentPage
		// }</span> of <span>${Math.ceil(this._data.length / this._pageSize)}</span>`;

		// this._paginatorSummary.innerHTML = pageText;
		const pageData = this._currentUpload?.list
			? this._currentUpload.list.filter((u) => !u.invalid_skip)
			: [];
		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: pageData,
					ok: !idemCheck, // TODO: Check if there are any errors
				},
			})
		);

		if (pageData && pageData.length > 0) {
			pageData.forEach((row, index) => {
				const tr = body.insertRow();
				tr.dataset.info = JSON.stringify(row);
				this._headerMap.forEach((value, key) => {
					const cell = tr.insertCell();
					if (key == "name") {
						cell.classList.add("wide");
					}
					if (key == "name") {
						const reducedName = `${this._sectionData.getSectionPath({
								name: row.name,
							})}`,
							sectionPath =
								row.parent && row.parent !== ""
									? this._sectionData
											.getSectionNamesLineage({ path: row.parent })
											.join(" > ")
									: "";
						if (row.type === "folder") {
							cell.innerHTML = `<span><svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
							<path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 19h-7a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v3.5"></path><path d="M16 19h6"></path><path d="M19 16v6"></path>
						</svg></span>`;
						}

						cell.innerHTML += `${sectionPath}<span class="text-bold">${reducedName}</span>`;
					} else if (key == "select") {
						if (row.invalid_skip) {
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
					} else if (
						key == "lastrow" &&
						row?.note &&
						row?.note?.indexOf("exists") > -1
					) {
						cell.classList.add("text-center", "f3", "clickable", "text-gray");

						const renameAction = document.createElement("span");
						renameAction.innerHTML = `Rename <br/><br/><br/>`;
						renameAction.addEventListener("click", (evt) => {
							tr.remove();
							this._currentUpload.updateEntry({ index: index });
							this._checkIdempotency();
						});
						cell.appendChild(renameAction);

						const removeAction = document.createElement("span");
						removeAction.textContent = "Remove";
						removeAction.addEventListener("click", (evt) => {
							tr.remove();
							this._removeEntry(row);
						});
						cell.appendChild(removeAction);
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
							if (row.invalid_skip) tr.classList.add("text-gray");
						}
					}
				});
			});
		}

		// Update related elements
		this._calculateSelected();
		this._textSummaryUpdate();
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
		this._currentUpload._removeEntry(row);
		// Notify the user
		this.idemDivAsMessanger(`Removed entry...`, 850);
		this._createTable();
	}

	_destinationApplySelected(evt) {
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
			this._currentUpload.updatePaths(oldPath, newPath);
		}

		this._lastSection = this._chosenSection;
		// this._createTable(data);
		this._checkIdempotency();
		// this._calculateSelected();
		// this._textSummaryUpdate();
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
	}

	updateDestination(evt) {
		this._lastSection = this._chosenSection;
		const sectionId =
			this._destinationPicker.getValue() !== this._noParentName
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

			window.history.replaceState(
				{},
				"",
				`/${this._projectId}/upload${(this._chosenSection.id !== null) ? `?section=${this._chosenSection.id}` : ""}`
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
		this._direction = 1; // to flip the sort direction
		this._totalSize = 0;
		this._skippedEntries = [];
		this._skippedReason = "";
		this._currentPage = 1;
		this._pageSize = 50000000000000000;
		this._data = [];
		this._uploads = [];
		this._newSections = [];
		this._noParentName = "-- Default --";
		this._duplicateMap = new Map();
		this._chosenSection = {
			id: null,
			name: "",
			path: "",
		};

		this._ftDisabled = "File type disabled";
		this._allSelectedText = "Select all";
		this._noneSelectedText = "Deselect all";
		this._skippedReason = "";
		this._haveNewSection = false;
		this._abortController = new AbortController();
		this._cancel = false;
		this._lastSection = null;

		// this._chosenSection = null;
		this._chosenMediaType = null;
		this._uploadAttributes = {};
		this._specifiedTypes = {
			description: "Media Files",
			acceptList: [],
			allowDirectories: true,
		};

		this._acceptedImageExt = [
			".tiff",
			".tif",
			".bmp",
			".jpe",
			".jpg",
			".jpeg",
			".png",
			".gif",
			".avif",
			".heic",
			".heif",
		];
		this._acceptedVideoExt = [
			".mp4",
			".avi",
			".3gp",
			".ogg",
			".wmv",
			".webm",
			".flv",
			".mkv",
			".mov",
			".mts",
			".m4v",
			".mpg",
			".mp2",
			".mpeg",
			".mpe",
			".mpv",
			".m4p",
			".qt",
			".swf",
			".avchd",
			".ts",
		];
	}

	upload() {
		this._uploading = this._currentUpload;
		this._uploading.upload();
		this._uploads.push(this._uploading);

		this._currentUpload = null
		this._resetUpload();
	}

	_resetUpload() {
		this._setEmptyVariables();
		this._createTable();
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

	_updateShowing(evt) {
		this._currentPage = 1;
		this._createTable();
	}

	_updatePage() {
		this._createTable();
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
		this._direction = this._direction * -1;
		this._currentUpload.sortList(key, this._direction);
		this._createTable();
	}

	_showInvalidDetails(evt) {
		window.dispatchEvent(
			new CustomEvent("show-invalid-details", {
				detail: {
					data: this._currentUpload.getSkippedEntries(),
				},
			})
		);
	}

	_clearAllInvalidEntries(evt) {
		evt.preventDefault();
		this._currentUpload.list = this._currentUpload.list.filter(
			(d) => !d.invalid_skip
		);

		this._createTable();
	}
}

customElements.define("upload-element", UploadElement);
