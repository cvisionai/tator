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

  _getSectionForm(){
    this.boxOnPage = this.boxHelper.boxWrapDefault({
        "children" : document.createTextNode("")
    });

    //
    let _form = document.createElement("form");
    _form.id = "project-"+this.data.id;
    this.boxOnPage.appendChild( _form );

    // Image upload
    this._thumbInput = this._getHiddenThumbInput( this.data.thumb );
    _form.appendChild( this._thumbInput );
    this._thumbEdit = this._getThumbnailEdit()
    _form.appendChild( this._thumbEdit );

    // Input for name
    this._editName = this._setNameInput( this._getNameFromData() );
    _form.appendChild( this._editName );

    // Input for name
    this._editSummary = this._setSummaryInput( this._getSummaryFromData() );
    _form.appendChild( this._editSummary );

    // Enable downloads at project level,
    this._downloadEnable = this._setDownloadInput( );
    _form.appendChild( this._downloadEnable );

    let formElements = [this._editName, this._editSummary];

    return this.boxOnPage;
  }

  _fetchGetPromise({id = this.projectId} = {}){
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

  _fetchPatchPromise({id = this.projectId} = {}){
    let data = this._getFormData();

    if(Object.entries(data).length === 0){
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

  _setDownloadInput({data = this.data} = {}){
    return this.inputHelper.inputRadioSlide({
      "value" : data.enable_downloads,
      "labelText" : "Enable Download"
    });
  }

  _getThumbnailEdit({data = this.data} = {}){
    return this.inputHelper.editImageUpload({
      "value" : data.thumb, // img path
      "labelText" : "Thumbnail"
    });
  }

  _getHiddenThumbInput(thumb){
    let key = "thumb";
    let styleHidden = "position: absolute; left: -99999rem";
    let input = this.inputHelper.inputText( {
      "labelText": null,
      "name": key,
      "value": name,
      "type": "file"
    } );

    input.style = styleHidden;
    input.id = "thumb";

    input.addEventListener("change", (event) => {
      let imagePreview = this._thumbnailPreview(event);
    });

    return input;
  }

  _getThumbInputValue(){
    return this._thumbInput.value;
  }

  _getThumbValueData({ data = this.data} = {}){
    return data.thumb;
  }

  _getDownloadEnableValue(){
    let radioSet = this._shadow.querySelectorAll(".radio-slide-wrap input");

    for(let s of radioSet){
      if(s.id.indexOf("on") > -1 && s.checked == true) return true
      if(s.id.indexOf("off") > -1 && s.checked == true) return false
    }
  }

  _getDownloadEnableValueData({ data = this.data} = {}){
    return data.enable_downloads;
  }

  _thumbnailPreview( event ){
    let outputElement = this._thumbEdit.querySelector(".projects__image");
    outputElement.src = URL.createObjectURL(event.target.files[0]);
    // outputElement.onload = function() {
    //   URL.revokeObjectURL(outputElement.src) // free memory
    // }
    return outputElement;
  }

  reset(){
    this._setNameInputValue( this._getNameFromData() );
    this._setSummaryInputValue( this._getSummaryFromData() );
    console.log("[Reset with previously fetched project data.]");
  }

  resetHard(){
    this._fetchNewProjectData();
    this.reset();
    console.log("[Reset with newly fetched project data.]");
  }

  _nameChanged(){
    if(this._getNameInputValue() === this._getNameFromData()) return false;
    return true;
  }

  _summaryChanged(){
    if(this._getSummaryInputValue() === this._getSummaryFromData()) return false;
    return true;
  }
  _downloadEnabledChanged(){
    if(this._getDownloadEnableValue() == this._getDownloadEnableValueData()) return false;
    return true;
  }

  _thumbInputChanged(){
    if(this._getThumbInputValue() === this._getThumbValueData()) return false;
     return true;
  }

  _getFormData(){
    let formDataJSON = {};

    if(this._nameChanged()) formDataJSON.name = this._getNameInputValue();
    if(this._summaryChanged()) formDataJSON.summary = this._getSummaryInputValue();
    if(this._downloadEnabledChanged()) formDataJSON.enable_downloads = this._getDownloadEnableValue();
    if(this._thumbInputChanged()) {
      let thumbVal = this._getThumbInputValue();
      if(thumbVal != "" && thumbVal != null)formDataJSON.thumb = thumbVal;
    }

    return formDataJSON;
  }

  _changed(){
    return  true;
  }

}

customElements.define("project-main-edit", ProjectMainEdit);
