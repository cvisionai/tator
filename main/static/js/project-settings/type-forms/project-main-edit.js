class ProjectMainEdit extends TypeForm {
  constructor() {
    super();

    //
    this.typeName = "Project";
    this.readableTypeName = "Project";

    // Content div
    this.typeFormDiv = document.createElement("div");
    this.typeFormDiv.setAttribute("class", "px-md-6")
    this._shadow.appendChild(this.typeFormDiv);

  }
  
  _init({ data, modal, sidenav}){
    // console.log(`${this.tagName} init.`);
    // console.log(data);

    // init vars
    this.data = data;
    this.typeId = this.data.id;
    this.projectId = this.data.id;
    this.modal = modal;
    this.sideNav = sidenav;

    // Pass modal to helper
    this.boxHelper = new SettingsBox( this.modal );

    this.setupFormPage();
  }

  setupFormPage(){
    // New heading element.
    this.h1 = document.createElement("h1");
    this.h1.setAttribute("class", "h3 pb-3 edit-project__h1");

    this.h1_name = document.createTextNode(`${this.data.name} `);
    this.h1.appendChild(this.h1_name);

    this.separate_span = document.createElement("span");
    this.separate_span.setAttribute("class", "px-2");
    this.h1.appendChild(this.separate_span);
    const h1_separate_span = document.createTextNode(`|`);
    this.separate_span.appendChild(h1_separate_span);

    this.type_span = document.createElement("span");
    this.type_span.setAttribute("class", "text-gray text-normal");
    this.h1.appendChild(this.type_span);
    const h1_type = document.createTextNode(` ${this.typeName}`);
    this.type_span.appendChild(h1_type);

    this.id_span = document.createElement("span");
    this.id_span.setAttribute("class", "text-gray text-normal");
    this.h1.appendChild(this.id_span);
    const h1_id = document.createTextNode(` (ID ${this.data.id})`);
    this.id_span.appendChild(h1_id);

    this.typeFormDiv.appendChild(this.h1);

    this.typeFormDiv.appendChild( this._getSectionForm() )
    this.typeFormDiv.appendChild( this._getSubmitDiv({ "id":this.projectId}) );

    if(this.userHasPermission()) {
      this.typeFormDiv.appendChild( this.deleteProjectSection() );
    }

    return this.typeFormDiv;
  }

  _getHeading(id){
    let icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V1.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zM8 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 3z"></path></svg>';
    return `${icon} <span class="item-label">Project ${id}</span>`
  }

  userHasPermission(){
    return hasPermission( this.data.permission, "Creator" );
  }

  _getSectionForm() {
    this.boxOnPage = this.boxHelper.boxWrapDefault({
      "children": document.createTextNode("")
    });
  
    this._form = document.createElement("form");
    this._form.id = "project-" + this.data.id;
    this.boxOnPage.appendChild(this._form);

    // Thumb
    this._thumbUpload = document.createElement("thumb-input");
    this._thumbUpload.setAttribute("name", "Thumbnail");
    this._thumbUpload.setAttribute("for", "thumb");
    this._thumbUpload.projectId = this.projectId;
    this._thumbUpload.setValue(this.data.thumb);
    this._thumbUpload.default = this.data.thumb === null ? "" : this.data.thumb;
    this._thumbUpload.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._thumbUpload);

    // Input for name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._editName.setValue(this.data.name);
    this._editName.default = this.data.name;
    this._editName.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editName);
    
    // Input for summary
    this._editSummary = document.createElement("text-input");
    this._editSummary.setAttribute("name", "Summary");
    this._editSummary.setAttribute("type", "string");
    this._editSummary.setValue(this.data.summary);
    this._editSummary.default = this.data.summary;
    this._editSummary.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editSummary);

    // Enable downloads at project level, 
    this._enableDownloads = document.createElement("bool-input");
    this._enableDownloads.setAttribute("name", "Enable Downloads");
    this._enableDownloads.setAttribute("on-text", "Yes");
    this._enableDownloads.setAttribute("off-text", "No");
    this._enableDownloads.setValue(this.data.enable_downloads);
    this._enableDownloads.default = this.data.enable_downloads;
    this._enableDownloads.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._enableDownloads);

    return this.boxOnPage;
  }

  // reset
  reset() {
    this._thumbUpload.reset();
    this._editName.reset();
    this._editSummary.reset();
    this._enableDownloads.reset();
  }

  // new get call and reset (aka hard reset)
  async resetHard() {
    this.loading.showSpinner();

    // Get new data
    const response = await this._fetchGetPromise();
    const data = await response.json();
    this.data = data;

    // Set new defaults
    this._thumbUpload.default = this.data.thumb;
    this._editName.default = this.data.name;
    this._editSummary.default = this.data.summary;
    this._enableDownloads.default = this.data.enable_downloads;

    // inputs go back to their deafaults
    this.reset()

    // hide spinner
    this.loading.hideSpinner();
  }

  // save and formdata
  _getFormData() {
    let formData = {};

    if (this._thumbUpload.changed()) {
      formData.thumb = this._thumbUpload.getValue();
    }

    if (this._editName.changed()) {
      formData.name = this._editName.getValue();
    }

    if (this._editSummary.changed()) {
      formData.summary = this._editSummary.getValue();
    }

    if (this._enableDownloads.changed()) {
      formData.enable_downloads = this._enableDownloads.getValue();
    }

    return formData;
  }

  _save({ id = -1 } = {}) {
    console.log(`Project _save method for id: ${id}`);
    const formData = this._getFormData();
    if (Object.entries(formData).length === 0) {
      return console.error("No formData");
    } else {
      const patch = this._fetchPatchPromise({ id, formData });

      if (patch) {
        return patch.then(response => {
          return response.json().then(data => {
            if (response.status == "200") {
              this._modalSuccess(data.message);
              this.resetHard();
            } else {
              this._modalError(data.message);
            }
          })
        }
        )
          .catch(error => {
            console.log('Error:', error.message);
            this._modalError("Internal error: " + error.message);
          });
      }
    }
  }

  _getHeading(){
    let icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V1.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zM8 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 3z"></path></svg>';
    return `${icon} <span class="item-label">Project</span>`
  }

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch(`/rest/${this.typeName}/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  deleteProjectSection(){
    let button = document.createElement("button");
    button.setAttribute("class", "btn btn-small btn-charcoal float-right btn-outline text-gray");
    button.style.marginRight = "10px";

    let deleteText = document.createTextNode(`Delete`);
    button.appendChild( deleteText );

    let descriptionText = `Delete this ${this.readableTypeName} and all its data?`;
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "clearfix py-6");

    let heading = document.createElement("div");
    heading.setAttribute("class", "py-md-5 float-left col-md-5 col-sm-5 text-right");
    
    heading.appendChild( button );
        
    let description = document.createElement("div");
    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.setAttribute("class", "py-md-6 f1 text-gray float-left col-md-7 col-sm-7");
    description.appendChild( _descriptionText );
    
    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    this.deleteBox = this.boxHelper.boxWrapDelete( {
      "children" : headingDiv
    } );

    this.deleteBox.style.backgroundColor = "transparent";

    button.addEventListener("click", this._deleteTypeConfirm.bind(this))

    return this.deleteBox;
  }

  _deleteTypeConfirm(){
    let button = document.createElement("button");
    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold")

    button.addEventListener("click", this._deleteType.bind(this));

    this._modalConfirm({
      "titleText" : `Delete Confirmation`,
      "mainText" : `Pressing confirm will delete this ${this.typeName} and all its data from your account. Do you want to continue?`,
      "buttonSave" : button,
      "scroll" : false    
    });
  }

  _deleteType(){
    this._modalCloseCallback();
    this.loading.showSpinner();
    let deleteProject = new ProjectDelete({
      "projectId" : this.projectId
    });
  
    if(this.typeId != "undefined"){
      deleteProject.deleteFetch().then((data) => {
        this.loading.hideSpinner();
        this._modalComplete(data.message)
        return setTimeout(function(){
          window.location.href = '/projects/';
       }, 3000);;
      }).catch((err) => {
        console.error(err);
        this.loading.hideSpinner();
        return this._modalError("Error with delete.");
      });
    } else {
      console.error("Type Id is not defined.");
      this.loading.hideSpinner();
      return this._modalError("Error with delete.");
    }

  }

}

customElements.define("project-main-edit", ProjectMainEdit);
