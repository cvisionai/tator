import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class OrganizationMainEdit extends OrgTypeFormTemplate {
  constructor() {
    super();

    //
    this.typeName = "Organization";
    this.readableTypeName = "Organization";
    this._hideAttributes = true;

    //
    var templateInner = document.getElementById("organization-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("organization-edit--form");
    this._thumbUpload = this._shadow.getElementById("organization-edit--thumb");
    this._editName = this._shadow.getElementById("organization-edit--name");
    this._defaultPermission = this._shadow.getElementById(
      "organization-edit--default-permission"
    );

    this._defaultPermission.choices = [
      { label: "No Access", value: "No Access", checked: true },
      { label: "View Only", value: "View Only" },
      { label: "Can Edit", value: "Can Edit" },
      { label: "Can Transfer", value: "Can Transfer" },
      { label: "Can Execute", value: "Can Execute" },
      { label: "Full Control", value: "Full Control" },
    ];
  }

  // overrides templates
  setOrganizationId(newId, oldId) {
    this.organizationId = newId;
    this._thumbUpload.organizationId = newId;
  }

  async _setupFormUnique() {
    // Thumb
    const thumbVal =
      !this._data.thumb || this._data.thumb === null ? "" : this._data.thumb;
    this._thumbUpload.default = thumbVal;
    this._thumbUpload.setValue(thumbVal);

    // Input for name
    this._editName.default = this._data.name;
    this._editName.setValue(this._data.name);

    // Enum for default project permissions
    this._defaultPermission.default = this._data.default_membership_permission;
    this._defaultPermission.setValue(this._data.default_membership_permission);
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

    if (this._defaultPermission.changed()) {
      formData.default_membership_permission =
        this._defaultPermission.getValue();
    }

    return formData;
  }
}

customElements.define("organization-main-edit", OrganizationMainEdit);
