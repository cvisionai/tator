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
    this.h1.innerHTML = `Set project details.`;

    this._shadow.appendChild(this.settingsSectionDiv);
  }

  _getSectionForm(){
    this.boxOnPage = this.boxHelper.boxWrapDefault({
        "children" : document.createTextNode("")
      });

    // Image upload
    this._thumbEdit = this._getThumbnailEdit();
    this.boxOnPage.appendChild( this._thumbEdit );

    // Input for name
    this._editName = this._setNameInput( this._getNameFromData() );
    this.boxOnPage.appendChild( this._editName );

    // Input for name
    this._editSummary = this._setSummaryInput( this._getSummaryFromData() );
    this.boxOnPage.appendChild( this._editSummary );

    // Enable downloads at project level,
    this._downloadEnable = this._setDownloadInput( );
    this.boxOnPage.appendChild( this._downloadEnable );

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
      body: JSON.stringify({
        "name": this._getNameInputValue(),
        "summary": this._getSummaryInputValue()
      })
    })
  }

  _setDownloadInput({data = this.data} = {}){
    return this.inputHelper.inputCheckbox({
      "value" : data.enable_downloads, // img path
      "labelText" : "Enable Download"
    });
  }

  _getThumbnailEdit({data = this.data} = {}){

    // returns label, and image with edit overlay
    // button opens a modal
    return this.inputHelper.editImageUpload({
      "value" : data.thumb, // img path
      "labelText" : "Thumbnail",
      "callBack" : this._editThumb // required
    });
  }

  _editThumb(){
    console.log("Callback to pop edit thumb form modal...");
    //pops a new form inside a modal
    let uploadInput = `<input type="file" name="thumb" id="newThumbnail">`

    this._modalConfirm({
      "titleText" : "Thumnail Uploader",
      "mainText" : uploadInput,
      "buttonText" : "Upload",
      "callback" :  this._fetchUploadThumbnail
    });
  }

  _fetchUploadThumbnail({ event = null}){
    // check that there is a file there and hit upload endpoint
    console.log("Placeholder to upload new thumbnail to project....");
    console.log(event);
  }

  reset(){
    this._setNameInputValue( this._getNameFromData() );
    this._setSummaryInputValue( this._getSummaryFromData() );
    console.log("Reset with project data.");
  }

  resetHard(){
    this._fetchNewProjectData();
    this.reset();
  }

  _nameChanged(){
    if(this._getNameInputValue() === this._getNameFromData()) return false;
    return true;
  }

  _summaryChanged(){
    if(this._getSummaryInputValue() === this._getSummaryFromData()) return false;
    return true;
  }

  _changed(){
    return this._nameChanged() || this._summaryChanged() ;
  }

}

customElements.define("project-main-edit", ProjectMainEdit);
