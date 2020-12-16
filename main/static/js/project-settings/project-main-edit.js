class ProjectMainEdit extends TatorElement {
  constructor() {
    super();
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");

    this.projectMainDiv = document.createElement("div");

    this._shadow.appendChild(this.projectMainDiv);
  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["_data"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "_data":
        this._init();
        break;
    }
  };

  _init(){
   //try{
      console.log("ProjectEditName - Init");
      //console.log(this.getAttribute("_data") );
      this.projectData = JSON.parse( this.getAttribute("_data") );

      const projectHeading = this.boxHelper.headingWrap({
          "headingText" : "Project | " + this._getNameFromData(),
          "descriptionText" : "Change the project name or summary.",
          "level" : 1
      });
      this.boxOnPage = this.boxHelper.boxWrapDefault({
          "children" : projectHeading
        });

      // Input for name and summary
      this._editName = this._setNameInput( this._getNameFromData() );
      this.boxOnPage.appendChild( this._editName );

      this._editName.addEventListener("change", (event) => {
        console.log("edited name");
      });

      this._editSummary = this._setSummaryInput( this._getSummaryFromData() );;
      this.boxOnPage.appendChild( this._editSummary );

      this._editSummary.addEventListener("change", (event) => {
        console.log("edited summary");
      });

      return this.projectMainDiv.appendChild( this.boxOnPage );
    //} catch(e){
    //  console.error("Project Main Edit Error: "+e);
    //}
  }

  _getNameFromData({ data = this.projectData} = {}){
    return data.name;
  }

  _setNameInput(name){
    return this.inputHelper.inputText( { "labelText": "Name", "value": name } );
  }

  _getNameInputValue(){
    return this._editName.querySelector("input").value;
  }

  _setNameInputValue(newValue){
    return this._editName.querySelector("input").value = newValue;
  }

  _getSummaryFromData({ data = this.projectData} = {}){
    return data.summary;
  }

  _setSummaryInput(summary){
    //return this.inputHelper.inputTextArea( { "labelText": "Summary", "value": summary } )
    return this.inputHelper.inputText( { "labelText": "Summary", "value": summary } )
  }

  _getSummaryInputValue(){
    return this._editSummary.querySelector("input").value;
  }

  _setSummaryInputValue(newValue){
    return this._editSummary.querySelector("input").value = newValue;
  }

  _getNewValue(input){
    return input.getAttribute("value");
  }

  reset(){
    this._setNameInputValue( this._getNameFromData() );
    this._setSummaryInputValue( this._getSummaryFromData() );
  }

  _nameChanged(){
    if(this._getNameInputValue() === this._getNameFromData()) return false;
    return true;
  }

  _summaryChanged(){
    if(this._getSummaryInputValue() === this._getSummaryFromData()) return false;
    return true;
  }

  changed(){
    return this._nameChanged() || this._summaryChanged() ;
  }

  save(projectId){
    // Check if anything changed
    fetch("/rest/Project/" + projectId, {
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
    .then(response => {
      if(response.status === 200){
        alert("Saved!");
      } else if(response.status === 400){
        alert("Error!");
      } else {
        alert("Error!");
      }
      console.log(response);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }
}

customElements.define("project-main-edit", ProjectMainEdit);
