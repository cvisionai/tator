import { TypeFormTemplate } from "./type-form-template.js";
import { getCompiledList, store } from "../store.js";

export class MembershipEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Membership";
    this.readableTypeName = "Membership";
    
    // TODO
    this._hideAttributes = true;

    // 
    var templateInner = document.getElementById("membership-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("membership-edit--form");
    this._userInput = this._shadow.getElementById("membership-edit--search-users");
    this._permissionSelect = this._shadow.getElementById("membership-edit--permission");
    this._versionSelect = this._shadow.getElementById("membership-edit--default-version");
  }

  async _setupFormUnique(data) {
    const formData = {};

    if (data.id == "New") {
      this._userData = document.createElement("user-data");
      this._userInput.init(this._userData);
      this._userInput.hidden = false;
    } else {
      this._userInput.hidden = true;
    }

    // permission
    const permissionOptions = [
      { "label": "View Only", "value": "View Only" },
      { "label": "Can Edit", "value": "Can Edit" },
      { "label": "Can Transfer", "value": "Can Transfer" },
      { "label": "Can Execute", "value": "Can Execute" },
      { "label": "Full Control", "value": "Full Control" },
    ];
    if(typeof this._permissionSelect._choices == "undefined") this._permissionSelect.choices = permissionOptions;
    this._permissionSelect._select.required = true;
    this._permissionSelect.setValue(data.permission);
    this._permissionSelect.default = data.permission;

    // default version
    this._versionSelect.clear();
    const versionOptions = await getCompiledList({ type: "Version", check: data.default_version });
    this._versionSelect.resetChoices();
    this._versionSelect.choices = versionOptions;
    this._versionSelect._select.required = true;
    this._versionSelect.setValue(data.default_version);
    this._versionSelect.default = data.default_version;
  }

  _getFormData() {
    let formData;
    console.log("Get form data........");
    // New we can be adding multiple memberships
    if (this._data.id == "New") {
      formData = [];
      const users = this._userData.getUsers();
      console.log("USERS", users);
      for (const [userId, user] of users.entries()) {
        console.log(user);
        formData.push({
          user: userId,
          username: user.username, // ignored by BE, used by FE only
          project: this.projectId,
          permission: this._permissionSelect.getValue(),
          default_version: Number(this._versionSelect.getValue()),
          default_version_id: Number(this._versionSelect.getValue()) // ignored by BE, used by FE only
        });
      }
    } else {
    // Otherwise we are just editing one
      formData = {};

      if (this._permissionSelect.changed()) {
        formData.permission = this._permissionSelect.getValue();
      }

      if (this._versionSelect.changed()) {
        formData.default_version = Number(this._versionSelect.getValue());
      }
    }

    return formData;
  }


  _getEmptyData() {
    return {
      "id" : `New`,
      "user" : "",
      "permission": "",
      "default_version": null,
      "project" : this.projectId,
      "form" : "empty"
    };
  }

}

customElements.define("membership-edit", MembershipEdit);
