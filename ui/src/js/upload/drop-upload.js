import { UploadElement } from "../components/upload-element.js";
import "../components/upload-dialog-init.js";
import { store } from "./store.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";

export class DropUpload extends UploadElement {
	constructor() {
		super();

		this._noneText = "-- None --";
		this._duplicateMap = new Map();
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
		this._summaryText.setAttribute("class", "py-2 text-gray f3");
		this._summaryTitle.appendChild(this._summaryText);


		// this._fileInput.addEventListener("change", this._fileSelectCallback);

		this._removeButton = document.createElement("button");
		this._removeButton.setAttribute("class", "btn btn-clear btn-charcoal f3 mr-3 btn-small");
		this._removeButton.disabled = true;
		this._removeButton.textContent = "Remove";
    // this._removeButton.addEventListener("click", this.getImageFiles.bind(this));
		this._summary.appendChild(this._removeButton);

		this._chooseFileButton = document.createElement("button");
		this._chooseFileButton.setAttribute("class", "btn btn-clear btn-charcoal f3 mr-3 btn-small");
    this._chooseFileButton.textContent = "Add Files";
    this._chooseFileButton.addEventListener("click", this.filePicker.bind(this, false));
		this._summary.appendChild(this._chooseFileButton);
		
		this._chooseFolderButton = document.createElement("button");
		this._chooseFolderButton.setAttribute("class", "btn btn-clear btn-charcoal f3 btn-small");
		this._chooseFolderButton.textContent = "Add Folders";
		this._chooseFolderButton.addEventListener("click", this.filePicker.bind(this, true));
		this._summary.appendChild(this._chooseFolderButton);

		this._summaryTable = document.createElement("table");
		this._summaryTable.setAttribute("class", "col-12 file-table upload-table py-6 my-6");
		main.appendChild(this._summaryTable);

		this._headerMap = new Map();
		this._headerMap.set("select", "")
			.set("name", "Name")
			.set("parent", "Relative Path")
			.set("size", "Size")
			.set("type", "Type")
			.set("note", "Note");

		this._createTable([])

    this._videoPickerOpts = {
      description: "Images",
      accept: {
        "image/*": [...this._acceptedVideoExt],
      },
    };

    this._imagePickerOpts = {
      description: "Images",
      accept: {
        "image/*": [...this._acceptedImageExt],
      },
		};

		this._uploads = [];
		this._newSections = [];
	}

	connectedCallback() {
		this.init(store);
	}

	async filePicker(directory = false) {

		this._abortController = new AbortController();

    // open file picker, destructure the one element returned array
    // Set a group ID on the upload.
		const gid = uuidv1(),
			specifiedTypes = [this._imagePickerOpts]
		
		try {
			const fileHandles = !directory ? await window.showOpenFilePicker({
				types: specifiedTypes,
				excludeAcceptAllOption: true,
				multiple: true,
			}) : await window.showDirectoryPicker();
			console.log(fileHandles);
			
			this._totalSize = 0;

			let parent = "";


			if (fileHandles.kind == "directory") {
				parent = fileHandles.name;
				this._newSections.push(parent);
			} else if (!fileHandles || !fileHandles.length) {
				return;
			}

			
			
			await this._recursiveDirectoryUpload(fileHandles, gid, parent);
			this.showSummary();
		} catch (err) {
			console.error(err);
		}
    
	}
	
	_recursiveDirectoryUpload = async (handle, gid, parent) => {

		const entries = await handle.values();
		console.log("Entries", entries)
		for await (let entry of entries) {
			if (entry.kind === "file") {
				const file = await entry.getFile();
				const added = this._checkFile(file, gid);
				if (added) {
					this._uploads.push({ ...added, parent });
					this._totalSize += file.size;
				} else {
					// console.log("File not added", file);
				}
			} else if (entry.kind === "directory") {
				const newParent = `${parent}/${entry.name}`;
				// const newSection = await this._createSection(entry.name);
				this._newSections.push(newParent);
				await this._recursiveDirectoryUpload(entry, gid, newParent);
			}
		}


	}

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

	set mediaTypes(val) {
		this._mediaTypes = val;

		this.uploadDialogInit.mediaTypes = val;
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
		<div class="pb-1">${this._uploads.length} files</div><div class="pb-1">${this._newSections.length} folders</div><div class="pb-1">${this._totalSize} bytes</div><div>`;
		
		for (let s of this._newSections) {

			data.push({
				name: s,
				size: 0,
				type: "folder",
				parent: "/",
				duplicate: false
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
				note: dupe ? "Duplicate" : ""
			});
		}

		data = [...data, ...files];

		this.dispatchEvent(new CustomEvent("upload-summary", {
			detail: {
				data: data,
				ok: true // TODO: Check if there are any errors
			}
		})
		)

		this._createTable(data);

		// TODO
		// Big Upload is Total Size > 60000000000

		
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
				if(row.duplicate) tr.classList.add("text-red")
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
						input.addEventListener("change", this._calculateSelected.bind(this));
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
		const sectionId = Number(evt.target.getValue());

		console.log(sectionId, this._sectionData);

		this._chosenSection =
				sectionId && this._sectionData?._sectionIdMap?.[sectionId]
					? this._sectionData._sectionIdMap[sectionId]
					: null;

		this.section = this._chosenSection;
		
		
	}

	_resetUpload() {
		this._uploads = [];
		this._duplicateMap = new Map();
		this._newSections = [];
		this._totalSize = 0;
		this._createTable([]);
		this._removeButton.disabled = true;
		this._summaryText.textContent = "No files, or folders added.";

		this.dispatchEvent(new CustomEvent("upload-summary", {
			detail: {
				data: [],
				ok: false
			}
		})
		)
	}
}

customElements.define("drop-upload", DropUpload);
