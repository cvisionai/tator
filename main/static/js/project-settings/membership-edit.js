class MembershipEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "Membership";
    this.readableTypeName = "Membership";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
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
    console.log("Get existing form");
    console.log(data.id);

    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

    //
    this._setForm();

    // append input for name
    const USERNAME = "Username";
    this._editName = this.inputHelper.inputText( {
      "labelText": USERNAME,
      "name": USERNAME.toLowerCase(),
      "value": data[USERNAME.toLowerCase()],
      "required" : true,
      "disabledInput": true,
    });
    this._form.appendChild( this._editName );

    // permission
    const PERMISSION = "Permission";
    const permissionOptions = [
      { "optText": "View Only", "optValue": "View Only" },
      { "optText": "Can Edit", "optValue": "Can Edit" },
      { "optText": "Can Transfer", "optValue": "Can Transfer" },
      { "optText": "Can Execute", "optValue": "Can Execute" },
      { "optText": "Full Control", "optValue": "Full Control" },
    ];
    this.permissionSelect = this.inputHelper.inputSelectOptions({
      "labelText": "Permission",
      "name": PERMISSION.toLowerCase(),
      "value": data[PERMISSION.toLowerCase()],
      "optionsList" : permissionOptions,
      "disabledInput" : false,
      "required" : true,
    });
    this._form.appendChild( this.permissionSelect );

    // default version
    /*const VERSION = "Version"; 
    const versionOptions = [
    const versionList = new DataVersionList( this.projectId );
    let versionListWithChecked = versionList.getCompiledVersionList( data[VERSION.toLowerCase()]);

    this._form.appendChild( this.inputHelper.multipleCheckboxes({
        "labelText" : `Default ${VERSION}`,
        "name": VERSION.toLowerCase(),
        "checkboxList": versionListWithChecked
    } ) );*/

    current.appendChild(this._form)

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
  
  _getFormData(id, includeDtype = false) {
    let formData;
    if (id == "New") {
      formData = [];
      const users = this._userData.getUsers();
      for (const user of users.values()) {
        formData.push({
          user: user.id,
          project: this.projectId,
          permission: this._permission.getValue(),
          username: user.username,
        });
      }
    } else {
      let form = this._shadow.getElementById(id);
      let hasErrors = "";

      // permission 
      let permission = form.querySelector('[name="permission"]').value;

      formData = {
        permission: permission,
      };
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
      delete formData.username;
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
