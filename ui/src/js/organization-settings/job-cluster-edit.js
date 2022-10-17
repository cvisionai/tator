import { OrganizationTypeForm } from "./organization-type-form.js";

export class JobClusterEdit extends OrganizationTypeForm {
  constructor() {
    super();
    this.typeName = "JobCluster";
    this.readableTypeName = "Job Cluster";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="fill: none" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-cpu"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>';
  }

  init(data) {
    this._data = data;
  }

  _getEmptyData() {
    return {
      "id" : `New`,
      "organization" : this.organizationId,
      "name": "",
      "host": "",
      "port": "",
      "token": "",
      "cert": "",
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

    // name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._editName.setValue(this.data.name);
    this._editName.default = this.data.name;
    this._editName.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editName);

    // host
    this._editHost = document.createElement("text-input");
    this._editHost.setAttribute("name", "Host");
    this._editHost.setAttribute("type", "string");
    this._editHost.setValue(this.data.host);
    this._editHost.default = this.data.host;
    this._editHost.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editHost);

    // port
    this._editPort = document.createElement("text-input");
    this._editPort.setAttribute("name", "Port");
    this._editPort.setAttribute("type", "int");
    this._editPort.setValue(this.data.port);
    this._editPort.default = this.data.port;
    this._editPort.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editPort);

    // token
    this._editToken = document.createElement("text-input");
    this._editToken.setAttribute("name", "Token");
    this._editToken.setAttribute("type", "password");
    this._editToken.setValue(this.data.token);
    this._editToken.default = this.data.token;
    this._editToken.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editToken);

    // cert
    this._editCert = document.createElement("text-area");
    this._editCert.setAttribute("name", "Cert");
    this._editCert.setAttribute("type", "string");
    this._editCert.setValue(this.data.cert);
    this._editCert.default = this.data.cert;
    this._editCert.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editCert);

    current.appendChild(this._form);

    return current;
  }

  _getNewForm(data) {
    console.log("Get new form");
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );
    this._setForm();

    // name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._form.appendChild(this._editName);

    // host
    this._editHost = document.createElement("text-input");
    this._editHost.setAttribute("name", "Host");
    this._editHost.setAttribute("type", "string");
    this._editHost.setValue(this.data.host);
    this._editHost.default = this.data.host;
    this._form.appendChild(this._editHost);

    // port
    this._editPort = document.createElement("text-input");
    this._editPort.setAttribute("name", "Port");
    this._editPort.setAttribute("type", "int");
    this._editPort.setValue(this.data.port);
    this._editPort.default = this.data.port;
    this._form.appendChild(this._editPort);

    // token
    this._editToken = document.createElement("text-input");
    this._editToken.setAttribute("name", "Token");
    this._editToken.setAttribute("type", "password");
    this._editToken.setValue(this.data.token);
    this._editToken.default = this.data.token;
    this._form.appendChild(this._editToken);

    // cert
    this._editCert = document.createElement("text-area");
    this._editCert.setAttribute("name", "Cert");
    this._editCert.setAttribute("type", "string");
    this._editCert.setValue(this.data.cert);
    this._editCert.default = this.data.cert;
    this._form.appendChild(this._editCert);

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
    let formData = {};
    // const isNew = this.data.id == "New" ? true : false;
    const isNew = true; // schema doesn't accept nulls

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editHost.changed() || isNew) {
      formData.host = this._editHost.getValue();
    }

    if (this._editPort.changed() || isNew) {
      formData.port = this._editPort.getValue();
    }

    if (this._editToken.changed() || isNew) {
      formData.token = this._editToken.getValue();
    }

    if (this._editCert.changed() || isNew) {
      formData.cert = this._editCert.getValue();
    }

    return formData;
  }

  // _savePost() {
  //   this.loading.showSpinner();

  //   let formData = this._getFormData("New");

  //   let numSucceeded = 0;
  //   let numFailed = 0;
  //   let errorMessages = "";
  //   // const promises = [];
  //   // for (const formData of formDataList) {
  //     const name = formData.name;
  //     //delete formData.username;
  //     const promise = this._data.createJobCluster(formData).then(data => {
  //       console.log(data.message);
  //       this.loading.hideSpinner();

  //       // Hide the add new form
  //       this.sideNav.hide(`itemDivId-${this.typeName}-New`);

  //       // Create and show the container with new type
  //       this.sideNav.addItemContainer({
  //         "type" : this.typeName,
  //         "id" : data.id,
  //         "hidden" : false
  //       });

  //       let form = document.createElement( this._getTypeClass() );
  //       form.init(this._data);

  //       this.sideNav.fillContainer({
  //         "type" : this.typeName,
  //         "id" : data.id,
  //         "itemContents" : form
  //       });

  //       // init form with the data
  //       formData.id = data.id;
  //       formData.organization = this.organizationId;
  //       form._init({ 
  //         "data": formData, 
  //         "modal" : this.modal, 
  //         "sidenav" : this.sideNav
  //       });

  //       // Add the item to navigation
  //       this._updateNavEvent("new", name, data.id);

  //       // Increment succeeded.
  //       numSucceeded++;
  //     }).then(() => {
  //       this.loading.hideSpinner();
  //       this.reset();
  //       let message;
  //       if (numSucceeded > 0) {
  //         message = `Successfully created ${numSucceeded} job clusters.`;
  //         if (numFailed > 0) {
  //           message = `${message} Failed to create ${numFailed}.\n${errorMessages}`;
  //         }
  //         return this._modalSuccess(message);
  //       } else {
  //         return this._modalError(`Failed to create ${numFailed} job clusters.\n${errorMessages}`);
  //       }
  //     }).catch((err) => {
  //       console.error(err);
  //       errorMessages = `${errorMessages}\n${err}`;
  //       return this._modalError(`Failed to create ${numFailed} job clusters.\n${errorMessages}`);
  //     });
  // }
}

customElements.define("job-cluster-edit", JobClusterEdit);
