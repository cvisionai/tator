class ProjectMainEdit extends SettingsSection {
  constructor() {
    super();
    // Inherits MainDiv, h1, and modal-dialog elements.
    // Name the Main Div.
    this.mainDiv.id = "projectMain";
    this.h1.innerHTML = `Set project details.`;

    this._shadow.appendChild(this.mainDiv);
  }

  _getSectionForm(){
    this.boxOnPage = this.boxHelper.boxWrapDefault({
        "children" : document.createTextNode("")
      });

    // Input for name and summary
    this._editName = this._setNameInput( this._getNameFromData() );
    this.boxOnPage.appendChild( this._editName );

    this._editSummary = this._setSummaryInput( this._getSummaryFromData() );;
    this.boxOnPage.appendChild( this._editSummary );

    let formElements = [this._editName, this._editSummary]

    formElements.forEach( item => {
      item.addEventListener("change", (event) => {
        console.log("Edited: "+item.getAttribute("name"));
        // @TODO  Check to if it matches data still
        //        UI show field was edited?
        //        Prompt don't leave without saving?
        //        ENABLE SAVE BUTTON
      });
    });

    return this.boxOnPage;
  }

  _getNameFromData({ data = this.data} = {}){
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

  _getSummaryFromData({ data = this.data} = {}){
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

  changed(){
    return this._nameChanged() || this._summaryChanged() ;
  }

  save(){
    // Check if anything changed
    fetch("/rest/Project/" + this.projectId, {
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
        return response.json().then( data => {
          console.log("Save response status: "+response.status)
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
      this._modalError("Internal error: "+error.message);
    });
  }

}

customElements.define("project-main-edit", ProjectMainEdit);
