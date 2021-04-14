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
    this.h1.setAttribute("class", "h2 pb-3 edit-project__h1");
    const t = document.createTextNode(`Project ${this.projectId} settings.`); 
    this.h1.appendChild(t);
    this.typeFormDiv.appendChild(this.h1);

    this.typeFormDiv.appendChild( this._getSectionForm() )
    this.typeFormDiv.appendChild( this._getSubmitDiv({ "id":this.projectId}) );

    if(this.userHasPermission()) {
      this.typeFormDiv.appendChild( this.deleteProjectSection() );
    }

    return this.typeFormDiv;
  }

  userHasPermission(){
    return hasPermission( this.data.permission, "Creator" );
  }

  _getSectionForm() {
    this.boxOnPage = this.boxHelper.boxWrapDefault({
      "children": document.createTextNode("")
    });
  
    let _form = document.createElement("form");
    _form.id = "project-" + this.data.id;

    _form.addEventListener("change", e => this._formChanged(_form, e))

    // Image upload visible, and hidden - Plus Custom warning area.
    this.uploadWarningRow = document.createElement("div");
    this.uploadWarningRow.setAttribute("class", "offset-md-3 offset-sm-4 col-md-9 col-sm-8 pb-3");
    
    this._thumbInput = this._getThumbInput(this._getThumbValueData());
    _form.appendChild(this._thumbInput);
    
    this._hiddenThumbInput = this._getHiddenThumbInput();
    _form.appendChild(this._hiddenThumbInput);
    
    this._thumbEdit = this._getThumbnailEdit()
    _form.appendChild(this._thumbEdit);
    
    this._thumbEdit.appendChild(this.uploadWarningRow);

    // Input for name
    this._editName = this._setNameInput(this._getNameFromData());
    _form.appendChild(this._editName);

    // Input for name
    this._editSummary = this._setSummaryInput(this._getSummaryFromData());
    _form.appendChild(this._editSummary);

    // Enable downloads at project level,
    this._downloadEnable = this._setDownloadInputFromData();
    _form.appendChild(this._downloadEnable);

    this._form = _form;
    this.boxOnPage.appendChild(this._form);

    return this.boxOnPage;
  }

  _fetchGetPromise({ id = this.projectId } = {}) {
    return fetch("/rest/Project/" + id, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  _fetchPatchPromise({ id = this.projectId } = {}) {
    let data = this._getFormData();

    if(this._shadow.querySelectorAll(".errored").length > 0 || this._shadow.querySelectorAll(".invalid").length > 0){
      return this._modalError("Please fix form errors first.");
      return false;
    } else if (Object.entries(data).length === 0) {
      this._modalSuccess("Nothing new to save!");
      return false;
    } else {
      // Set in child element,
      return fetch("/rest/Project/" + id, {
        method: "PATCH",
        mode: "cors",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
    }

  }


  // thumbnail
  _getThumbnailEdit({ data = this.data } = {}) {
    let key = "thumb_upload";
    return this.inputHelper.editImageUpload({
      "value": data.thumb, // img path
      "labelText": "Thumbnail",
      "name": key,
      "forId": key
    });
  }

  _getHiddenThumbInput(){
    let key = "thumb";
    let hiddenInput = this.inputHelper.inputText({
      "labelText": null,
      "name": key,
      "value": "",
      "type": "hidden",
      "forId": key
    });
    return hiddenInput;
  }

  _getThumbInput(thumb) {
    let key = "thumb_upload";
    let styleHidden = "position: absolute; left: -99999rem";
    let uploadInput = this.inputHelper.inputText({
      "labelText": null,
      "name": key,
      "value": thumb,
      "type": "file",
      "forId": key
    });

    uploadInput.style = styleHidden;
    uploadInput.id = key;

    uploadInput.addEventListener("change", (event) => {
      let file = event.target.files[0];
      let token = getCookie("csrftoken");
      let gid =  "";
      let section = "";
      let projectId = this.projectId;
      let mediaTypeId = null;
      let username = "";
      let isImage = true;    
      let uploadData = {
        file,
        projectId,
        gid,
        section,
        mediaTypeId,
        username,
        token,
        isImage
      };

      // set preview
      this._thumbnailPreview(file);

      // upload file and set input
      let uploader = new SingleUpload( uploadData );
      return uploader.start().then( (key) => {
        this._setHiddenThumbInputValue(key);
      });
    });

    // Validate file size / show warning
    this.validate = new TypeFormValidation();
    const warning = new InlineWarning();
    this.uploadWarningRow.appendChild(warning.div());

    // Dispatch events to validate, and listen for errors
    uploadInput.addEventListener("change", (e) => {
      let file = e.target.files[0];
      let hasError = this.validate.findError("thumb_size", file.size);
      if(hasError){
        let errorEvent = new CustomEvent("input-invalid", {"detail" : 
          {"errorMsg" : hasError}
        });
        uploadInput.dispatchEvent(errorEvent);
      } else {
        let successEvent = new CustomEvent("input-valid");
        uploadInput.dispatchEvent(successEvent);
      }
    });

    uploadInput.addEventListener("input-invalid", (e) => {
      warning.show(e.detail.errorMsg);
      uploadInput.classList.add("invalid");
    });

    uploadInput.addEventListener("input-valid", (e) => {
      uploadInput.classList.remove("invalid");
      warning.hide();
    });

    return uploadInput;
  }

  _getThumbInputValue() {
    //returns the current value, or user input value
    return this._hiddenThumbInput.value;
  }

  _getThumbValueData({ data = this.data } = {}) {
    return data.thumb;
  }

  _setHiddenThumbInputValue(val, isFile = false) {
    return this._hiddenThumbInput.value = val;
  }

  _setHiddenThumbSize(size){
    return this._hiddenThumbInput.dataset.fileSize = size;
  }

  _getHiddenThumbSize(size){
    return this._hiddenThumbInput.dataset.fileSize;
  }

  _thumbInputChanged() {
    if (this._getThumbInputValue() === this._getThumbValueData()) return false;
    return true;
  }

  _thumbnailPreview(img, isFile = true) {
    let outputElement = this._thumbEdit.querySelector(".projects__image");

    if(isFile) {
      outputElement.src = URL.createObjectURL( img );
    } else {
      outputElement.src = img;
    }
    
    return outputElement;
  }

  // enable download
  _getDownloadEnableValueData({ data = this.data } = {}) {
    return data.enable_downloads;
  }

  _getDownloadEnableInputValue() {
    let radioSet = this._shadow.querySelectorAll(".radio-slide-wrap input");
    return this.inputHelper._getSliderSetValue(radioSet);
  }
  
  _setDownloadEnableInputValue(val){
    let radioSet = this._shadow.querySelectorAll(".radio-slide-wrap input");
    let span = this._shadow.querySelector(".radio-slide-wrap span");
    return this.inputHelper._setSliderSetValue(radioSet, span, val);
  }

  _setDownloadInputFromData({ data = this.data } = {}) {
    return this.inputHelper.inputRadioSlide({
      "value": data.enable_downloads,
      "labelText": "Enable Download",
      "name": "enable_downloads"
    });
  }

  _downloadEnabledChanged() {
    if (this._getDownloadEnableInputValue() == this._getDownloadEnableValueData()) return false;
    return true;
  }


  // reset
  reset() {
    let thumb = this._getThumbValueData();
    this._setHiddenThumbInputValue(thumb);
    this._thumbnailPreview(thumb, false)
    this._setNameInputValue(this._getNameFromData());
    this._setSummaryInputValue(this._getSummaryFromData());
    this._setDownloadEnableInputValue(this._getDownloadEnableValueData());
  }

  async resetHard() {
    console.log("reset hard");
    this.loading.showSpinner();
    const response = await this._fetchGetPromise();
    const data = await response.json();
    this.data = data;
    this.loading.hideSpinner();

    this.reset();
  }

  // save and formdata
  _getFormData() {
    let formDataJSON = {};

    if (this._nameChanged()) formDataJSON.name = this._getNameInputValue();
    //if (this._summaryChanged()) formDataJSON.summary = this._getSummaryInputValue();
    formDataJSON.summary = this._getSummaryInputValue();
    //if (this._downloadEnabledChanged()) formDataJSON.enable_downloads = this._getDownloadEnableInputValue();
    formDataJSON.enable_downloads = this._getDownloadEnableInputValue();
    if (this._thumbInputChanged()) {
      let thumbVal = this._getThumbInputValue();
      if (thumbVal != "" && thumbVal != null) formDataJSON.thumb = thumbVal;
    }

    //console.log(formDataJSON);

    return formDataJSON;
  }

  _save({ id = -1 } = {}) {
    console.log(`Project _save method for id: ${id}`);
    const patch = this._fetchPatchPromise({ "id": id });

    if (patch) {
      patch.then(response => {
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

  _getHeading(){
    let icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V1.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zM8 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 3z"></path></svg>';
    return `${icon} <span class="item-label">Project</span>`
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
