import { TypeFormTemplate } from "../components/type-form-template.js";
import { Utilities } from "../../util/utilities.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { getCompiledList, store } from "../store.js";

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
    this._hostedTemplateEnumInput = this._shadow.getElementById("applet-edit--hosted-template");
    this._headersList = this._shadow.getElementById(
      "applet-edit--headers"
    );
    this._tparamsList = this._shadow.getElementById(
      "applet-edit--tparams"
    );
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

    // HTML file
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

    // Hosted Template
    this._hostedTemplateEnumInput.removeAttribute("tooltip"); //reset tooltip
    this._hostedTemplateEnumInput.clear();
    const hostedTemplateWithChecked = await getCompiledList({
      type: "HostedTemplate",
      skip: null,
      check: this._data.template,
    });
    // Check if there are going to be enum values first, show input with NULL
    if (hostedTemplateWithChecked == null || hostedTemplateWithChecked.length == 0) {
      this._hostedTemplateEnumInput.disabled = true;
      this._hostedTemplateEnumInput.setValue("Null");
      this._hostedTemplateEnumInput.setAttribute(
        "tooltip",
        "No Hosted Templates available"
      );
    } else {
      this._hostedTemplateEnumInput.removeAttribute("disabled");
      this._hostedTemplateEnumInput.permission = "Can Edit";
      this._hostedTemplateEnumInput.choices = [
        { label: "None", value: "" },
        ...hostedTemplateWithChecked,
      ];
      this._hostedTemplateEnumInput.default = this._data.template;
      this._hostedTemplateEnumInput.setValue(this._data.template);
    }

    let paramInputTypes = JSON.stringify({
      name: "text-input",
      value: "text-input",
    });
    let paramInputTemplate = JSON.stringify({ name: "", value: "" });

    // headers
    this._headersList.clear();
    this._headersList.permission = !this.cantSave ? "Admin" : "Member";
    this._headersList.setAttribute("properties", paramInputTypes);
    this._headersList.setAttribute("empty-row", paramInputTemplate);
    this._headersList.setValue(this._data.headers);
    this._headersList.default = this._data.headers;

    // tparams
    this._tparamsList.clear();
    this._tparamsList.permission = !this.cantSave ? "Admin" : "Member";
    this._tparamsList.setAttribute("properties", paramInputTypes);
    this._tparamsList.setAttribute("empty-row", paramInputTemplate);
    this._tparamsList.setValue(this._data.tparams);
    this._tparamsList.default = this._data.tparams;

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

    if (this._hostedTemplateEnumInput.changed() || isNew) {
      let templateValue = this._hostedTemplateEnumInput.getValue();
      if (
        templateValue === null ||
        templateValue === "Null" ||
        templateValue == ""
      ) {
        formData.template = null;
      } else {
        formData.template = Number(templateValue);
      }
    }

    if (this._headersList.changed() || isNew) {
      formData.headers = this._headersList.getValue();
    }

    if (this._tparamsList.changed() || isNew) {
      formData.tparams = this._tparamsList.getValue();
    }


    if (this._categoriesList.changed() || isNew) {
      formData.categories = this._categoriesList.getValue();
    }

    return formData;
  }
}

customElements.define("applet-edit", AppletEdit);
