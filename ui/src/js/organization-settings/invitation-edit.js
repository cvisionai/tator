import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";
import { store } from "./store.js";

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
    this._permissionSelect = this._shadow.getElementById(
      "invitation-edit--permission"
    );
    this._statusField = this._shadow.getElementById("invitation-edit--status");
    this._regLinkDisplay = this._shadow.getElementById(
      "invitation-edit--reg-link"
    );
    this._affiliationDisplay = this._shadow.getElementById(
      "invitation-edit--aff-link"
    );

    //
    this._statusField.permission = "View Only";
    this._regLinkDisplay.permission = "View Only";
  }

  async _setupFormUnique() {
    //
    this._emailInput.clear();
    this._emailInput.hidden = this._data?.id !== "New";

    // permission
    if (!this._permissionSelect._choices) {
      const permissionOptions = [
        { label: "Member", value: "Member" },
        { label: "Admin", value: "Admin" },
      ];
      this._permissionSelect.choices = permissionOptions;
    }
    this._permissionSelect._select.required = this._data.id === "New";

    if (this._data.permission) {
      this._permissionSelect.setValue(this._data.permission);
      this._permissionSelect.default = this._data.permission;
    } else {
      this._permissionSelect.setValue("Member");
    this._permissionSelect.default = "Member";
    
    }
    this._permissionSelect.permission = "Can Edit";

    // status
    if (this._data.id !== "New") {
      this._statusField.setValue(this._data.status);
      this._statusField.default = this._data.status;
      this._statusField.hidden = false;
      this._permissionSelect.setAttribute("permission", "Can Edit");
    } else {
      this._statusField.hidden = true;
      this._permissionSelect.setAttribute("permission", "View Only");
    }

    //
    if (this._data.status == "Pending") {
      const registrationLink = `${window.location.origin}/registration?registration_token=${this._data.registration_token}`;
      this._regLinkDisplay.setAttribute("href", registrationLink);
      this._regLinkDisplay.hidden = false;

      this._statusField._input.classList.add("text-yellow");
    } else {
      this._regLinkDisplay.hidden = true;
      this._statusField._input.classList.remove("text-yellow");
    }

    //
    if (this._data.status == "Expired") {
      this._permissionSelect.permission = "View Only";
      this._statusField._input.classList.add("text-red");
    } else {
      this._statusField._input.classList.remove("text-red");
    }

    if (this._data.status == "Accepted") {
      this._statusField._input.classList.add("text-green");
    } else {
      this._statusField._input.classList.remove("text-green");
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

customElements.define("invitation-edit", InvitationEdit);
