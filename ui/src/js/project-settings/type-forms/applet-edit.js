import { TypeFormTemplate } from "../components/type-form-template.js";
import { Utilities } from "../../util/utilities.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class AppletEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Applet";
    this.readableTypeName = "Applet";

    this._hideAttributes = true;

    //
    var templateInner = document.getElementById("applet-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("applet-edit--form");
    this._editName = this._shadow.getElementById("applet-edit--name");
    this._linkToDashboard = this._shadow.getElementById("applet-edit--link");
    this._editDescription = this._shadow.getElementById(
      "applet-edit--description"
    );
    this._htmlFilePath = this._shadow.getElementById("applet-edit--html-file");
    this._categoriesList = this._shadow.getElementById(
      "applet-edit--categories"
    );
  }

  /** These override template to set additional info to the form */
  setProjectIds(newProject) {
    this.projectId = newProject.data.id;
    this.organizationId = newProject.data.organization;
    this._htmlFilePath.projectId = newProject.data.id;
    this._htmlFilePath.organizationId = newProject.data.organization;
  }

  async _setupFormUnique() {
    // append link
    if (this._data.id && this._data.id !== "New") {
      this._linkToDashboard.setAttribute(
        "href",
        `${window.location.origin}/${this.projectId}/dashboards/${this._data.id}`
      );
    } else {
      this._linkToDashboard.hidden = true;
    }

    // description
    this._editDescription.setValue(this._data.description);
    this._editDescription.default = this._data.description;

    if (typeof this._data.html_file == "undefined") {
      this._data.html_file = [];
    }

    this._htmlFilePath.setValue(this._data.html_file);
    this._htmlFilePath.default = this._data.html_file;

    this._htmlFilePath._fetchCall = (bodyData) => {
      fetchCredentials(`/rest/SaveGenericFile/${this.projectId}`, {
        method: "POST",
        body: JSON.stringify(bodyData),
      })
        .then((resp) => resp.json())
        .then((htmlData) => {
          this._htmlFilePath.setValue(htmlData.url);
          Utilities.showSuccessIcon(`HTML file uploaded to: ${htmlData.url}`);
          return htmlData;
        })
        .catch((err) => {
          console.error("Issue saving generic file.", err);
        });
    };

    // Categories
    this._categoriesList.clear();
    this._categoriesList.setValue(this._data.categories);
    this._categoriesList.default = this._data.categories;
  }

  _getFormData() {
    const formData = {};
    const isNew = this._data.id == "New" ? true : false;

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editDescription.changed() || isNew) {
      formData.description = this._editDescription.getValue();
    }

    if (
      (this._htmlFilePath.changed() && this._htmlFilePath.getValue() !== "") ||
      isNew
    ) {
      formData.html_file = this._htmlFilePath.getValue();
    } else if (isNew && !this._htmlFilePath.changed()) {
      formData.html_file = null;
    }

    if (this._categoriesList.changed() || isNew) {
      formData.categories = this._categoriesList.getValue();
    }

    return formData;
  }
}

customElements.define("applet-edit", AppletEdit);
