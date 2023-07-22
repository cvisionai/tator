import { TypeFormTemplate } from "../components/type-form-template.js";

export class ProjectMainEdit extends TypeFormTemplate {
  constructor() {
    super();

    //
    this.typeName = "Project";
    this.readableTypeName = "Project";

    //
    var templateInner = document.getElementById("project-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("project-edit--form");
    this._editName = this._shadow.getElementById("project-edit--name");
    this._editSummary = this._shadow.getElementById("project-edit--summary");
    this._thumbUpload = this._shadow.getElementById("project-edit--thumb");
    this._enableDownloads = this._shadow.getElementById(
      "project-edit--downloads"
    );
  }

  async _setupFormUnique() {
    // Thumb
    this._thumbUpload.organization = this._data.organization;
    this._thumbUpload.projectId = this._data.id;
    this._thumbUpload.setValue(this._data.thumb);
    this._thumbUpload.default =
      this._data.thumb === null ? "" : this._data.thumb;

    // Input for summary
    this._editSummary.setValue(this._data.summary);
    this._editSummary.default = this._data.summary;

    // Enable downloads at project level,
    this._enableDownloads.setValue(this._data.enable_downloads);
    this._enableDownloads.default = this._data.enable_downloads;
  }

  // save and formdata
  _getFormData() {
    let formData = {};

    if (this._thumbUpload.changed()) {
      formData.thumb = this._thumbUpload.getValue();
    }

    if (this._editName.changed()) {
      formData.name = this._editName.getValue();
    }

    if (this._editSummary.changed()) {
      formData.summary = this._editSummary.getValue();
    }

    if (this._enableDownloads.changed()) {
      formData.enable_downloads = this._enableDownloads.getValue();
    }

    return formData;
  }
}

customElements.define("project-main-edit", ProjectMainEdit);
