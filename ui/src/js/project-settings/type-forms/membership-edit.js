import { TypeForm } from "./type-form.js";
import { TypeNew } from "./type-new.js";

export class MembershipEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "Membership";
    this.readableTypeName = "Membership";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
    this._hideAttributes = true;
  }

  init(data) {
    this._data = data;
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

  _getAttributeSection() {
    return document.createElement("div");
  }

  _getExistingForm(data) {
    // console.log("Get existing form");
    // console.log(data.id);

    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

    //
    this._setForm();

    // permission
    const permissionOptions = [
      { "label": "View Only", "value": "View Only" },
      { "label": "Can Edit", "value": "Can Edit" },
      { "label": "Can Transfer", "value": "Can Transfer" },
      { "label": "Can Execute", "value": "Can Execute" },
      { "label": "Full Control", "value": "Full Control" },
    ];
    this._permissionSelect = document.createElement("enum-input");
    this._permissionSelect.setAttribute("name", "Permission");
    this._permissionSelect.choices = permissionOptions;
    this._permissionSelect._select.required = true;
    this._permissionSelect.setValue(data.permission);
    this._permissionSelect.default = data.permission;
    this._permissionSelect.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild( this._permissionSelect );

    // default version
    this._data.getVersionsPromise()
    .then(versions => {
      const versionOptions = versions.map(version => {return {"label": version.name,
                                                              "value": version.id}});
      
      this._versionSelect = document.createElement("enum-input");;
      this._versionSelect.setAttribute("name", "Version");
      this._versionSelect.choices = versionOptions;
      this._versionSelect._select.required = true;
      this._versionSelect.setValue(data.default_version_id);
      this._versionSelect.default = data.default_version_id;
      this._versionSelect.addEventListener("change", this._formChanged.bind(this));     
      this._form.appendChild(this._versionSelect);
    });

    current.appendChild(this._form);

    return current;
  }

  _getNewForm(data) {
    console.log("Get new form");
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );
    this._setForm();

    this._userData = document.createElement("user-data");
    this._userInput = document.createElement("user-input");
    this._userInput.setAttribute("name", "Search users");
    this._userInput.init(this._userData);
    this._form.appendChild(this._userInput);

    this._permission = document.createElement("enum-input");
    this._permission.setAttribute("name", "Permission");
    this._permission.choices = [
      {value: "View Only"},
      {value: "Can Edit"},
      {value: "Can Transfer"},
      {value: "Can Execute"},
      {value: "Full Control"},
    ];
    this._form.appendChild(this._permission);

    this._data.getVersionsPromise()
    .then(versions => {
      this._version = document.createElement("enum-input");
      this._version.setAttribute("name", "Default version");
      this._version.choices = versions.map(version => {return {value: version.id,
                                                               label: version.name}});
      this._form.appendChild(this._version);
    });

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
      const users = this._userData.getUsers();
      for (const user of users.values()) {
        formData.push({
          user: user.id,
          username: user.username, // ignored by BE, used by FE only
          project: this.projectId,
          permission: this._permission.getValue(),
          default_version: Number(this._version.getValue()),
          default_version_id: Number(this._version.getValue()) // ignored by BE, used by FE only
        });
      }
    } else {
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

  _savePost() {
    this.loading.showSpinner();
    let addNew = new TypeNew({
      "type" : this.typeName,
      "projectId" : this.projectId
    });

    let formDataList = this._getFormData("New", true);
    console.log("New form Data....");
    console.log(formDataList);

    let numSucceeded = 0;
    let numFailed = 0;
    let errorMessages = "";
    const promises = [];
    for (const formData of formDataList) {
      const username = formData.username;
      //delete formData.username;
      const promise = addNew.saveFetch(formData).then(([data, status]) => {
        console.log(data.message);
        this.loading.hideSpinner();

        if(status != 400){
          
          // Hide the add new form
          this.sideNav.hide(`itemDivId-${this.typeName}-New`);

          // Create and show the container with new type
          this.sideNav.addItemContainer({
            "type" : this.typeName,
            "id" : data.id,
            "hidden" : false
          });

          let form = document.createElement( this._getTypeClass() );
          form.init(this._data);

          this.sideNav.fillContainer({
            "type" : this.typeName,
            "id" : data.id,
            "itemContents" : form
          });

          // init form with the data
          formData.id = data.id;
          formData.project = this.projectId;
          if(this.typeName == "LocalizationType" || this.typeName == "StateType") formData.media = formData.media_types;
          form._init({ 
            "data": formData, 
            "modal" : this.modal, 
            "sidenav" : this.sideNav
          });

          // Add the item to navigation
          this._updateNavEvent("new", username, data.id);

          // Increment succeeded.
          numSucceeded++;
        } else {
          errorMessages = `${errorMessages}\n${data.message}`;
          numFailed++;
        }
      }).catch((err) => {
        console.error(err);
        errorMessages = `${errorMessages}\n${err}`;
        numFailed++;
      });
      promises.push(promise);
    }

    // Let user know everything's all set!
    Promise.all(promises).then(() => {
      this.loading.hideSpinner();
      this._userData.reset();
      let message;
      if (numSucceeded > 0) {
        message = `Successfully created ${numSucceeded} memberships.`;
        if (numFailed > 0) {
          message = `${message} Failed to create ${numFailed}.\n${errorMessages}`;
        }
        return this._modalSuccess(message);
      } else {
        return this._modalError(`Failed to create ${numFailed} memberships.\n${errorMessages}`);
      }
    });
  }
}

customElements.define("membership-edit", MembershipEdit);
