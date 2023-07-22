import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class AffiliationEdit extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Affiliation";
    this.readableTypeName = "Affiliation";
    this._hideAttributes = true;

    // To show who algo is registered to
    this._userData = document.createElement("user-data");

    //
    var templateInner = document.getElementById("affiliation-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("affiliation-edit--form");
    this._userInput = this._shadow.getElementById(
      "affiliation-edit--search-users"
    );
    this._permissionSelect = this._shadow.getElementById(
      "affiliation-edit--permission"
    );

    //
    this._userInput.init(this._userData);
  }

  async _setupFormUnique() {
    //
    this._userInput.hidden = this._data.id !== "New";

    // permission
    if (!this._permissionSelect._choices) {
      const permissionOptions = [
        { label: "Member", value: "Member" },
        { label: "Admin", value: "Admin" },
      ];
      this._permissionSelect.choices = permissionOptions;
    }

    this._permissionSelect._select.required = this._data.id === "New";
    this._permissionSelect.setValue(this._data.permission);
    this._permissionSelect.default = this._data.permission;
  }

  _getFormData() {
    let formData;
    if (this._data.id == "New") {
      formData = [];
      const users = this._userData.getUsers();
      for (const user of users.values()) {
        formData.push({
          user: user.id,
          username: user.username, // ignored by BE, used by FE only
          organization: this.organizationId,
          permission: this._permissionSelect.getValue(),
        });
      }
    } else {
      formData = {};

      if (this._permissionSelect.changed()) {
        formData.permission = this._permissionSelect.getValue();
      }
    }

    return formData;
  }
}

customElements.define("affiliation-edit", AffiliationEdit);
