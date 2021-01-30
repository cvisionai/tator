class ProjectMainEdit extends SettingsSection {
  constructor() {
    super();
    // MainDiv is the project's "item" box as it relates to nav.
    this.settingsSectionDiv.setAttribute("class", "item-box");

    // New heading element.
    this.h1 = document.createElement("h1");
    this.h1.setAttribute("class", "h2 pb-3"); 
    this.settingsSectionDiv.appendChild(this.h1);

    // Name the Main Div.
    this.settingsSectionDiv.id = "projectMain";
    this.h1.innerHTML = `Project details.`; 

    this._shadow.appendChild(this.settingsSectionDiv); 
  }

  _getSectionForm() {
    this.boxOnPage = this.boxHelper.boxWrapDefault({
      "children": document.createTextNode("")
    }); 

  
    let _form = document.createElement("form");
    _form.id = "project-" + this.data.id;
    this.boxOnPage.appendChild(_form); 

    _form.addEventListener("change", e => this._formChanged(_form, e))

    // Image upload
    this._thumbInput = this._getThumbInput(this._getThumbValueData());
    _form.appendChild(this._thumbInput);
    this._hiddenThumbInput = this._getHiddenThumbInput();
    _form.appendChild(this._hiddenThumbInput);
    this._thumbEdit = this._getThumbnailEdit()
    _form.appendChild(this._thumbEdit);

    // Input for name
    this._editName = this._setNameInput(this._getNameFromData());
    _form.appendChild(this._editName);

    // Input for name
    this._editSummary = this._setSummaryInput(this._getSummaryFromData());
    _form.appendChild(this._editSummary);

    // Enable downloads at project level,
    this._downloadEnable = this._setDownloadInputFromData();
    _form.appendChild(this._downloadEnable);

    let formElements = [this._editName, this._editSummary];

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
    console.log(data);

    if (Object.entries(data).length === 0) {
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
      return uploader.start().then(key => {
        this._setHiddenThumbInputValue(key);
        console.log("Uploader complete.");
      });
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

  _thumbInputChanged() {
    if (this._getThumbInputValue() === this._getThumbValueData()) return false;
    return true;
  }

  _thumbnailPreview(img, isFile = true) {
    let outputElement = this._thumbEdit.querySelector(".projects__image");
    console.log(img);
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

  resetHard() {
    this._fetchNewProjectData();
    this.reset();
    console.log("[Reset with newly fetched project data.]");
  }


  // input methods for unique 





  // save and formdata
  _getFormData() {
    let formDataJSON = {};

    if (this._nameChanged()) formDataJSON.name = this._getNameInputValue();
    if (this._summaryChanged()) formDataJSON.summary = this._getSummaryInputValue();
    if (this._downloadEnabledChanged()) formDataJSON.enable_downloads = this._getDownloadEnableInputValue();
    if (this._thumbInputChanged()) {
      let thumbVal = this._getThumbInputValue();
      if (thumbVal != "" && thumbVal != null) formDataJSON.thumb = thumbVal;
    }

    console.log(formDataJSON);

    return formDataJSON;
  }

  _save({ id = -1 } = {}) {
    console.log(`Project _save method for id: ${id}`);
    const patch = this._fetchPatchPromise({ "id": id });

    if (patch != false) {
      patch.then(response => {
        return response.json().then(data => {
          console.log("Save response status: " + response.status)
          if (response.status == "200") {
            this._modalSuccess(data.message);
            this._fetchNewProjectData();
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
    } else {
      this._modalSuccess("Nothing new to save!")
    }

  }

}

customElements.define("project-main-edit", ProjectMainEdit);
