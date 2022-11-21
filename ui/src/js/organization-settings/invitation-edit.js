import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class InvitationEdit extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Invitation";
    this.readableTypeName = "Invitation";
    this._hideAttributes = true;

    // 
    var templateInner = document.getElementById("invitation-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("invitation-edit--form");
    this._emailInput = this._shadow.getElementById("invitation-edit--email");
    this._permissionSelect = this._shadow.getElementById("invitation-edit--permission");
    this._statusField = this._shadow.getElementById("invitation-edit--status");
    this._regLinkDisplay = this._shadow.getElementById("invitation-edit--reg-link");
  }
  
  async _setupFormUnique() {
    //
    this._emailInput.hidden = (this._data.id !== "New");

    // permission
    if(!this._permissionSelect._choices) {
      const permissionOptions = [
        { "label": "Member", "value": "Member" },
        { "label": "Admin", "value": "Admin" },
      ];
      this._permissionSelect.choices = permissionOptions;
    }
    this._permissionSelect._select.required = (this._data.id === "New");
    this._permissionSelect.setValue(data.permission);
    this._permissionSelect.default = data.permission;

    // status
    if (this._data.id !== "New") {
      this._statusField.setValue(this._data.status);
      this._statusField.default = this._data.status;
      this._statusField.permission = "View Only";
      this._statusField.hidden = false;
    } else {
      this._statusField.hidden = true;
    }

    //
    if (this._data.status == "Pending") {
      const registrationLink = `${window.location.origin}/registration?registration_token=${this._data.registration_token}`;
      this._regLinkDisplay.setAttribute("href", registrationLink);
      this._regLinkDisplay.permission = "View Only";
      this._regLinkDisplay.hidden = false;     
    } else {
      this._regLinkDisplay.hidden = true;
    }
  }

  _getFormData() {
    let formData;
    if (this._data.id == "New") {
      formData = [];
      const emails = this._emailInput.getValues();
      for (const email of emails) {
        formData.push({
          email: email,
          permission: this._permission.getValue(),
        });
      }
    } else {
      formData = {};

      if (this._permissionSelect.changed()) {
        formData.permission = this._permissionSelect.getValue();
      }

      // if (this._statusSelect.changed()) {
      //   formData.status = this._statusSelect.getValue();
      // }
    }

    return formData;
  }
}

customElements.define("invitation-edit", InvitationEdit);
