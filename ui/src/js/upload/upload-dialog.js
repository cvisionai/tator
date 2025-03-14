import { ModalDialog } from "../components/modal-dialog.js";

export class UploadDialog extends ModalDialog {
	constructor() {
		super();

		this._title.nodeValue = "Uploading";
		this._div.style.width = "100%";
		this._div.style.height = "100vh";
		this._div.style.position = "fixed";
		this._div.style.top = "0";
		this._div.style.bottom = "0";
		this._div.style.left = "0";
		this._div.style.right = "0";

		this._main.style = "height:60vh;overflow-y:scroll;";
		this._modal.style = "height:100vh";

		this._folderText = document.createElement("h3");
		this._folderText.setAttribute("class", "text-center text-semibold py-3");
		this._folderText.hidden = true;
		this._main.appendChild(this._folderText);

		this._folderProgress = document.createElement("progress");
		this._folderProgress.setAttribute("class", "progress");
		this._folderProgress.hidden = true;
		this._main.appendChild(this._folderProgress);

		this._fileText = document.createElement("h3");
		this._fileText.setAttribute("class", "text-center text-semibold py-3");
		this._main.appendChild(this._fileText);

		this._fileProgress = document.createElement("progress");
		this._fileProgress.setAttribute("class", "progress");
		this._main.appendChild(this._fileProgress);

		const spacer = document.createElement("div");
		spacer.setAttribute("class", "py-3");
		this._main.appendChild(spacer);

		this._uploadText = document.createElement("h3");
		this._uploadText.setAttribute("class", "text-center text-semibold py-3");
		this._main.appendChild(this._uploadText);

		this._uploadProgress = document.createElement("progress");
		this._uploadProgress.setAttribute("max", 100);
		this._uploadProgress.setAttribute("class", "progress");
		this._main.appendChild(this._uploadProgress);

		this._summaryTable = document.createElement("table");
		this._summaryTable.setAttribute(
			"class",
			"col-12 file-table upload-table pb-6 mb-6"
		);
		this._main.appendChild(this._summaryTable);

		this._headerMap = new Map();
		this._headerMap
			.set("name", "File Name")
			.set("parent", "Destination Path")
			// .set("parent", "Path")
			.set("status", "Status")
			.set("action", "");

		// this._createTable([]);

		this._errors = document.createElement("ul");
		this._errors.setAttribute("class", "modal__errors d-flex flex-column");
		this._main.appendChild(this._errors);


		this._cancelButton = document.createElement("button");
		this._cancelButton.setAttribute("class", "btn btn-clear");
		this._cancelButton.textContent = "Abort and Clear All";
		this._footer.appendChild(this._cancelButton);

		this._close = document.createElement("button");
		this._close.setAttribute("class", "btn btn-clear btn-purple");
		this._close.textContent = "Go to project detail";
		this._close.style.display = "none";
		this._footer.appendChild(this._close);

		this._closeButton = this._shadow.querySelector("modal-close");
		this._closeButton.addEventListener("click", () => {
			this.removeAttribute("is-open");
			this._cancelled = true;
			this.dispatchEvent(new Event("cancel"));
			setTimeout(this._reset.bind(this), 1000);
		});

		this._cancelButton.addEventListener("click", () => {
			this.removeAttribute("is-open");
			this._cancelled = true;
			this.dispatchEvent(new Event("cancel"));
			setTimeout(this._reset.bind(this), 1000);
		});

		this._close.addEventListener("click", () => {
			this.removeAttribute("is-open");
			this.dispatchEvent(new Event("close"));
			window.location.href = `/${this._projectId}/project-detail`;

			setTimeout(this._reset.bind(this), 1000);
		});

		this._doneFiles = 0;
		this._failFiles = 0;
		this._totalFolders = 0;
		this._totalFiles = 0;
	}

	static get observedAttributes() {
		return ModalDialog.observedAttributes;
	}

	attributeChangedCallback(name, oldValue, newValue) {
		ModalDialog.prototype.attributeChangedCallback.call(
			this,
			name,
			oldValue,
			newValue
		);
		switch (name) {
			case "is-open":
				break;
		}
	}

	open() {
		this.setAttribute("is-open", "");
		window.scrollTo(0, 0);
	}

	init(store) {
		this._projectId = Number(window.location.pathname.split("/")[1]);

		// Create store subscriptions
		store.subscribe(
			(state) => state.uploadChunkProgress,
			this._setChunkProgress.bind(this)
		);
		store.subscribe(
			(state) => state.uploadTotalFiles,
			this._setTotalFiles.bind(this)
		);
		store.subscribe(
			(state) => state.uploadTotalFolders,
			this._setTotalFolders.bind(this)
		);
		store.subscribe(
			(state) => state.uploadFilesCompleted,
			this._setFilesCompleted.bind(this)
		);
		store.subscribe(
			(state) => state.uploadFoldersCompleted,
			this._setFoldersCompleted.bind(this)
		);
		store.subscribe(
			(state) => state.uploadCurrentFile,
			this._setFilename.bind(this)
		);
		store.subscribe((state) => state.uploadError, this._addError.bind(this));

		store.subscribe(
			(state) => state.uploadInformation,
			this._createTable.bind(this)
		);
	}

	_setTotalFiles(numFiles) {
		this._cancelled = false;
		this._fileProgress.setAttribute("max", numFiles);
		this._totalFiles = numFiles;
		this._fileText.textContent = `Uploaded 0/${this._totalFiles} Files`;
	}

	_setTotalFolders(numFolders) {
		this._cancelled = false;
		this._folderProgress.setAttribute("max", numFolders);
		this._totalFolders = numFolders;
		this._folderText.textContent = `Created 0/${this._totalFolders} Folders`;

		this._folderProgress.hidden = false;
		this._folderText.hidden = false;
	}

	_setFilesCompleted(doneFiles) {
		this._doneFiles = doneFiles;
		this._fileComplete();
	}

	_setFoldersCompleted(doneFolders) {
		this._doneFolders = doneFolders;
		this._folderText.textContent = `Created ${this._doneFolders}/${this._totalFolders} Folders`;
		this._folderProgress.setAttribute("value", this._doneFolders); //TODO count failed folders
		this._fileComplete();
	}

	_setFilename(currentFile) {
		this._uploadText.textContent = `Uploading ${currentFile}...`;
	}

	_setChunkProgress(percent) {
		this._uploadProgress.setAttribute("value", percent);
	}

	_addError(message) {
		this._failFiles++;
		const li = document.createElement("li");
		this._errors.appendChild(li);

		const div = document.createElement("div");
		div.setAttribute("class", "d-flex flex-items-center py-4 text-semibold");
		li.appendChild(div);

		const icon = document.createElement("modal-warning");
		icon.setAttribute("class", "px-2");
		div.appendChild(icon);

		const text = document.createTextNode(message);
		div.appendChild(text);

		this._fileComplete();
	}

	_fileComplete() {
		console.log("File complete");
		this._fileProgress.setAttribute("value", this._doneFiles + this._failFiles);
		this._fileText.textContent = `Uploaded ${this._doneFiles}/${this._totalFiles} Files`;
		if (this._failFiles > 0) {
			this._fileText.textContent += ` (${this._failFiles} Failed)`;
		}
		if (this._doneFiles + this._failFiles == this._totalFiles) {
			this._finish();
		}
	}

	_finish() {
		if (!this._cancelled) {
			this._cancelButton.style.display = "none";
			this._close.style.display = "flex";
			if (this._failFiles == 0) {
				this._uploadText.innerHTML = `
            <div class="text-green py-3 h2">Upload complete!</div>
            <div class="text-normal f1 py-2">Successfully created: ${this._totalFolders} Folders</div>
						<div class="text-normal f1 py-2">Successfully added: ${this._totalFiles} Files</div>
            <div class="pb-6 py-3 text-normal">Monitor video transcodes with the "Activity" button.</div>
          `;
				this._title.nodeValue = "Upload Complete!";
				this._fileText.hidden = true;
				this._folderText.hidden = true;
				this._fileProgress.hidden = true;
				this._folderProgress.hidden = true;
				this._uploadProgress.hidden = true;
				this._header.style.display = "none";
			} else {
				this._uploadText.textContent = "Upload failure! See errors below.";
				this._title.nodeValue = "Upload Failure!";
			}
		}
	}

	_reset() {
		this._cancelButton.style.display = "flex";
		this._close.style.display = "none";
		this._title.nodeValue = "Uploading Files";
		this._fileText.textContent = "";
		this._fileProgress.setAttribute("value", 0);
		this._uploadText.textContent = "";
		this._uploadProgress.setAttribute("value", 0);
		this._doneFiles = 0;
		this._failFiles = 0;
		this._fileProgress.hidden = false;
		this._folderProgress.hidden = false;
		this._uploadProgress.hidden = false;
		this._header.style.display = "flex";

		while (this._errors.firstChild) {
			this._errors.removeChild(this._errors.firstChild);
		}
	}

	_createHeader() {
		this._summaryTable.innerHTML = "";
		const header = this._summaryTable.createTHead();
		const headerRow = header.insertRow();
		this._headerMap.forEach((value, key) => {
			const cell = headerRow.insertCell();
			cell.textContent = value;

			// cell.addEventListener("click", (evt) => {
			// 	this._sortTable(key, this._direction);
			// });
		});
	}

	_createTable(uploadInfo) {
		this._data = uploadInfo;
		console.log("Data", this._data);

		this._summaryTable.innerHTML = "";
		this._createHeader();
		const body = this._summaryTable.createTBody();

		if (this._data && this._data.length > 0) {
			this._data.forEach((row, index) => {
				const tr = body.insertRow();
				tr.dataset.info = JSON.stringify(row);
				this._headerMap.forEach((value, key) => {
					const cell = tr.insertCell();

					if (key == "action") {
						if (row.status == "Pending...") {
							tr.classList.add("text-gray");
							cell.textContent = "Abort";
						} else if (row.status == "Success!") {
							tr.classList.add("text-green");
						} else {
							tr.classList.add("text-red");
						}
					} else {
						cell.textContent = row[key];
					}
				});
			});
		}
	}
}

customElements.define("upload-dialog", UploadDialog);
