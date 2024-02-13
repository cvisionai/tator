import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class HostedTemplateEdit extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "HostedTemplate";
    this.readableTypeName = "Hosted Template";
    this._hideAttributes = true;

    //
    var templateInner = document.getElementById("hosted-template-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("hosted-template-edit--form");
    this._editName = this._shadow.getElementById("hosted-template-edit--name");
    this._editUrl = this._shadow.getElementById("hosted-template-edit--url");
    this._headersList = this._shadow.getElementById(
      "hosted-template-edit--headers"
    );
    this._tparamsList = this._shadow.getElementById(
      "hosted-template-edit--tparams"
    );
  }

  async _setupFormUnique() {
    // name
    let name = this._data.id === "New" ? "" : this._data.name;
    this._editName.setValue(name);
    this._editName.default = name;

    // url
    let url = this._data.id === "New" ? "" : this._data.url;
    this._editUrl.setValue(url);
    this._editUrl.default = url;

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
  }

  // save and formdata
  _getFormData() {
    let formData = {};
    const isNew = true; // schema doesn't accept nulls

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editUrl.changed() || isNew) {
      formData.url = this._editUrl.getValue();
    }

    if (this._headersList.changed() || isNew) {
      formData.headers = this._headersList.getValue();
    }

    if (this._tparamsList.changed() || isNew) {
      formData.tparams = this._tparamsList.getValue();
    }

    return formData;
  }
}

customElements.define("hosted-template-edit", HostedTemplateEdit);
