import { OrganizationTypeForm } from "./organization-type-form.js";
import { getCookie } from "../util/get-cookie.js";

export class InvitationEdit extends OrganizationTypeForm {
  constructor() {
    super();
    this.typeName = "Invitation";
    this.readableTypeName = "Invitation";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="fill: none" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-mail"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>';
    this._emailEnabled = false;
  }

  init(data) {
    this._data = data;
  }

  set emailEnabled(val) {
    this._emailEnabled = val;
  }

  _getEmptyData() {
    return {
      "id": `New`,
      "user": "",
      "permission": "",
      "organization": this.organizationId,
      "form": "empty"
    };
  }

  _getAttributeSection() {
    return document.createElement("div");
  }

  _getExistingForm(data) {
    let current = document.createElement("div");
    current.setAttribute("class", `py-3 rounded-2 edit-project__config`);

    //
    this._setForm();

    // permission
    const permissionOptions = [
      { "label": "Member", "value": "Member" },
      { "label": "Admin", "value": "Admin" },
    ];
    this._permissionSelect = document.createElement("enum-input");
    this._permissionSelect.setAttribute("name", "Permission");
    this._permissionSelect.choices = permissionOptions;
    this._permissionSelect._select.required = true;
    this._permissionSelect.setValue(data.permission);
    this._permissionSelect.default = data.permission;
    this._permissionSelect.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._permissionSelect);

    // status #Todo let user fix and Expired?
    // const statusOptions = [
    //   { "label": "Pending", "value": "Pending" },
    //   { "label": "Expired", "value": "Expired" },
    //   { "label": "Accepted", "value": "Accepted" },
    // ];
    // this._statusSelect = document.createElement("enum-input");
    // this._statusSelect.setAttribute("name", "Status");
    // this._statusSelect.choices = statusOptions;
    // this._statusSelect._select.required = true;
    // this._statusSelect.setValue(data.status);
    // this._statusSelect.default = data.status;
    // this._statusSelect.permission = "View Only";
    // this._statusSelect.addEventListener("change", this._formChanged.bind(this));
    // this._form.appendChild(this._statusSelect);

    // status
    this._statusField = document.createElement("text-input");
    this._statusField.setAttribute("name", "Status");
    this._statusField.setAttribute("type", "string");
    this._statusField.setValue(this.data.status);
    this._statusField.default = this.data.status;
    this._statusField.permission = "View Only";
    // this._statusField.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._statusField);

    //
    if (this.data.status == "Pending") {
      const registrationLink = `${window.location.origin}/registration?registration_token=${this.data.registration_token}`;
      this._regLinkDisplay = document.createElement("link-input");
      this._regLinkDisplay.setAttribute("name", "Registration Link");
      this._regLinkDisplay.setAttribute("href", registrationLink);
      this._regLinkDisplay.permission = "View Only";
      this._form.appendChild(this._regLinkDisplay);     
    }

    current.appendChild(this._form);

    return current;
  }

  _getNewForm(data) {
    // console.log("Get new form");
    let current = document.createElement("div");
    current.setAttribute("class", `py-3 rounded-2 edit-project__config`);
    this._setForm();

    this._emailInput = document.createElement("email-list-input");
    this._emailInput.setAttribute("name", "Email addresses");
    this._form.appendChild(this._emailInput);

    this._permission = document.createElement("enum-input");
    this._permission.setAttribute("name", "Permission");
    this._permission.choices = [
      { value: "Member" },
      { value: "Admin" },
    ];
    this._form.appendChild(this._permission);

    current.appendChild(this._form);
    return current;
  }

  _getSectionForm(data) {
    if (data.id == "New") {
      return this._getNewForm(data);
    } else {
      return this._getExistingForm(data);
    }
  }

  _getFormData(id) {
    let formData;
    if (id == "New") {
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

  _savePost() {
    this.loading.showSpinner();

    let formDataList = this._getFormData("New", true);
    // console.log("New form Data....");
    // console.log(formDataList);

    let numSucceeded = 0;
    let numFailed = 0;
    let errorMessages = "";
    let emailLinksHTML = '<ul class="pb-3">';
    const promises = [];
    for (const formData of formDataList) {
      const email = formData.email;
      const promise = this.orgData.createInvitation(formData).then(data => {
        // console.log(data.message);
        this.loading.hideSpinner();

        // Hide the add new form
        this.sideNav.hide(`itemDivId-${this.typeName}-New`);

        // Create and show the container with new type
        this._updateNavEvent("new", email, data.id);
        this.sideNav.addItemContainer({
          "type": this.typeName,
          "id": data.id,
          "hidden": false
        });

        this._data = formData;
        this._data.status = "PENDING";
        this._data.id = data.id;
        this._data.organization = this.organization;

        return data.id;
      })
        .then((id) => {
          return fetch(`/rest/Invitation/${id}`, {
            method: "GET",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            }
          });
        }).then((resp) => {
          return resp.json();
        }).then((data) => {
          if (typeof data.id !== "undefined" && data.id === this._data.id) {
            // if we can can get the status from endpoint, it is hardcoded above as pending (assumed since it was just created)
            this._data = data;
          }
          console.log(this._data);
          

          if (!this._emailEnabled) {
            const registrationLink = `${window.location.origin}/registration?registration_token=${this._data.registration_token}`;
            emailLinksHTML += `<li class="py-2"><span class="text-bold">${data.email}</span> can register at <a href="${registrationLink}" class="text-purple">${registrationLink}</a></li>`;
          }

          let form = document.createElement(this._getTypeClass());
          this.sideNav.fillContainer({
            "type": this.typeName,
            "id": this._data.id,
            "itemContents": form
          });

          // init form with the data
          form._init({
            data : this._data,
            modal : this.modal,
            sidenav : this.sideNav,
            orgData: this.orgData
          });

          // Increment succeeded.
          numSucceeded++;
        }).catch((err) => {
          console.error(err);
          errorMessages = `${errorMessages}<p class="py-1">${err}</p>`;
          numFailed++;
        });
      promises.push(promise);
    }

    // Let user know everything's all set!
    Promise.all(promises).then(() => {
      this.loading.hideSpinner();
      let message;
      if (numSucceeded > 0) {
        let successIcon = document.createElement("modal-success");
        message = `<p class="py-2">${successIcon.outerHTML} Successfully created ${numSucceeded} ${numSucceeded > 1 ? 'invitations' : 'invitation'}.</p>`;

        if (!this._emailEnabled) {
          message += emailLinksHTML + "</ul>";
        }

        if (numFailed > 0) {
          let errorIcon = document.createElement("modal-warning");
          message = `${message} <h3 class="py-1 f1 text-bold">Error Details:</h3><p class="py-2">${errorIcon.outerHTML} Failed to create ${numFailed} ${numFailed > 1 ? 'invitations' : 'invitation'}.</p>${errorMessages}`;
        }
        // Hide & Reset the add new form
        this.sideNav.hide(`itemDivId-${this.typeName}-New`);
        // console.log("Resetting new form after save....");
        this.reset();
        return this._modalComplete(message);
      } else {
        return this._modalError(`Failed to create ${numFailed} ${numFailed > 1 ? 'invitations' : 'invitation'}.<br/>${errorMessages}`);
      }
    });
  }
}

customElements.define("invitation-edit", InvitationEdit);
