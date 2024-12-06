import { ModalDialog } from "./modal-dialog.js";

export class UploadDialogInit extends ModalDialog {
  constructor() {
    super();

    this._title.nodeValue = "Upload Settings";

    this._errors = document.createElement("ul");
    this._errors.setAttribute("class", "modal__errors d-flex flex-column");
    this._main.appendChild(this._errors);

    this._form = document.createElement("form");
    this._form.setAttribute("class", "modal__form");
    this._main.appendChild(this._form);

    const formGroup = document.createElement("div");
    formGroup.setAttribute("class", "form-group");
    this._form.appendChild(formGroup);

    this._parentFolders = document.createElement("enum-input");
    this._parentFolders.setAttribute("class", "text-gray f2");
    this._parentFolders.setAttribute("name", "Parent Folder:");
    formGroup.appendChild(this._parentFolders);

    this._imageType = document.createElement("enum-input");
    this._imageType.setAttribute("class", "text-gray f2");
    this._imageType.setAttribute("name", "Image Type:");
    this._imageType.permission = "View only";
    formGroup.appendChild(this._imageType);

    this._videoType = document.createElement("enum-input");
    this._videoType.setAttribute("class", "text-gray f2");
    this._videoType.setAttribute("name", "Video Type:");
    this._videoType.permission = "View only";
    formGroup.appendChild(this._videoType);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Choose Files";
    this._footer.appendChild(apply);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback.bind(this));

    apply.addEventListener("click", () => {
      this._closeCallback();
      this.dispatchEvent(new CustomEvent("choose-files"));
    });

    // Data initialization
    this._noParentName = "-- None --";
    this._sectionData = null;
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

  set mediaTypes(val) {
    this._mediaTypes = val;

    this.setupTypeDropdown("image", this._imageType);
    this.setupTypeDropdown("video", this._videoType);
  }

  setupTypeDropdown(type, element) {
    const list = [];
    for (let t of this._mediaTypes) {
      if (t.dtype === type) {
        list.push({ value: t.id, label: t.name, extra: t });
      }
    }
    element.choices = list;
    element.setValue(list[0].value);

    if (list.length >= 1) {
      element.permission = "Can Edit";
    }
  }

  open() {
    this.setupData();
    this.setAttribute("is-open", "true");
  }

  setupData() {
    const searchParams = new URLSearchParams(window.location.search),
      selectedSection = searchParams.get("section"),
      choices = this._sectionData.getFolderEnumChoices();

    choices.unshift({ value: this._noParentName, label: this._noParentName });
    this._parentFolders.choices = choices;

    if (selectedSection) {
      this._parentFolders.setValue(selectedSection);
    } else {
      this._parentFolders.setValue(this._noParentName);
    }
  }
}

customElements.define("upload-dialog-init", UploadDialogInit);
