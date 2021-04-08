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

  _getFormData(id, includeDtype = false){
    let form = this._shadow.getElementById(id);
    let hasErrors = "";

    // permission 
    let permission = form.querySelector('[name="permission"]').value;

    let formData = {
      permission,
    };

    return formData;
  }

  /*_save({id = -1, globalAttribute = false} = {}){
  }*/

  _savePost() {
  }
}

customElements.define("membership-edit", MembershipEdit);
