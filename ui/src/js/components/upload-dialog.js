import { ModalDialog } from "./modal-dialog.js";

export class UploadDialog extends ModalDialog {
  constructor() {
    super();

    this._title.nodeValue = "Uploading Files";

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

    this._errors = document.createElement("ul");
    this._errors.setAttribute("class", "modal__errors d-flex flex-column");
    this._main.appendChild(this._errors);

    this._cancelButton = document.createElement("button");
    this._cancelButton.setAttribute("class", "btn btn-clear btn-red");
    this._cancelButton.textContent = "Cancel";
    this._footer.appendChild(this._cancelButton);

    this._close = document.createElement("button");
    this._close.setAttribute("class", "btn btn-clear btn-purple");
    this._close.textContent = "Close";
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
      setTimeout(this._reset.bind(this), 1000);
    });

    this._doneFiles = 0;
    this._failFiles = 0;
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

  init(store) {
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
      (state) => state.uploadFilesComplete,
      this._setFilesCompleted.bind(this)
    );
    store.subscribe(
      (state) => state.uploadCurrentFile,
      this._setFilename.bind(this)
    );
    store.subscribe((state) => state.uploadError, this._addError.bind(this));
  }

  _setTotalFiles(numFiles) {
    this._cancelled = false;
    this._fileProgress.setAttribute("max", numFiles);
    this._totalFiles = numFiles;
    this._fileText.textContent = `Uploaded 0/${this._totalFiles} Files`;
  }

  _setFilesCompleted(doneFiles) {
    this._doneFiles = doneFiles;
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
        this._uploadText.textContent =
          'Upload complete! Monitor video transcodes with the "Activity" button.';
        this._title.nodeValue = "Upload Complete!";
        window.dispatchEvent(new Event("upload-complete"));
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

    while (this._errors.firstChild) {
      this._errors.removeChild(this._errors.firstChild);
    }
  }
}

customElements.define("upload-dialog", UploadDialog);
