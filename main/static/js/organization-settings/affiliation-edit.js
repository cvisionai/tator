class AffiliationEdit extends OrganizationTypeForm {
  constructor() {
    super();
    this.typeName = "Affiliation";
    this.readableTypeName = "Affiliation";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
  }

  init(data) {
    this._data = data;
  }

  _getEmptyData() {
    return {
      "id" : `New`,
      "user" : "",
      "permission": "",
      "organization" : this.organizationId,
      "form" : "empty"
    };
  }

  _getAttributeSection() {
    return document.createElement("div");
  }

  _getExistingForm(data) {
    console.log("Get existing form");
    console.log(data.id);

    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

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
    this._form.appendChild( this._permissionSelect );

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
      {value: "Member"},
      {value: "Admin"},
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
      const users = this._userData.getUsers();
      for (const user of users.values()) {
        formData.push({
          user: user.id,
          username: user.username, // ignored by BE, used by FE only
          organization: this.organizationId,
          permission: this._permission.getValue(),
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

  _savePost() {
    this.loading.showSpinner();
    let addNew = new TypeNew({
      "type" : this.typeName,
      "organizationId" : this.organizationId
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
          formData.organization = this.organization;
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
        message = `Successfully created ${numSucceeded} affiliations.`;
        if (numFailed > 0) {
          message = `${message} Failed to create ${numFailed}.\n${errorMessages}`;
        }
        return this._modalSuccess(message);
      } else {
        return this._modalError(`Failed to create ${numFailed} affiliations.\n${errorMessages}`);
      }
    });
  }
}

customElements.define("affiliation-edit", AffiliationEdit);
