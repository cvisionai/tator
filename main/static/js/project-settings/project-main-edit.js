class ProjectMainEdit extends TatorElement {
  constructor() {
    super();
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");

    this.projectMainDiv = document.createElement("div");
    this.projectMainDiv.id = "projectMain";
    this.projectMainDiv.setAttribute("class", "item-box");

    // Project Settings h1.
    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h2 pb-3");
    h1.innerHTML = `Set project details.`;
    this.projectMainDiv.appendChild(h1);

    this.modal = document.createElement("modal-dialog");
    this.projectMainDiv.appendChild(this.modal);

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

      this.projectData = JSON.parse( this.getAttribute("_data") );
      console.log(this.projectData);

      this.projectId = this.projectData.id;

      this.projectMainDiv.appendChild( this._getProjectForm() )
      this.projectMainDiv.appendChild( this._getSubmitDiv() );

      return this.projectMainDiv;
    //} catch(e){
    //  console.error("Project Main Edit Error: "+e);
    //}
  }

  _getProjectForm(){
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
        // ENABLE SAVE BUTTON
      });
    });

    return this.boxOnPage;
  }

  _getSubmitDiv(){
    // Save button and reset link. @TODO move to each form section
    const submitDiv = document.createElement("div");
    submitDiv.setAttribute("class", "d-flex flex-items-center flex-justify-center py-3");

    this.saveButton = this.inputHelper.saveButton();
    submitDiv.appendChild(this.saveButton);

    this.resetLink = this.inputHelper.resetLink();
    submitDiv.appendChild(this.resetLink);

    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      if( this.changed() ){
        console.log("Saving new data...");
        this.save( this.projectId );
      } else {
        console.log("Nothing new to save! :)");
      }
    });

    // Form reset event
    this.resetLink.addEventListener("click", (event) => {
      event.preventDefault();
      console.log("Reset!");
      this.reset();
      alert("Reset complete.");
    });

    return submitDiv;
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

  _fetchNewProjectData(){
    fetch("/rest/Project/" + this.projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    })
    .then( r => r.json())
    .then( data => {
        // Init project edit box.
        this.projectData = data;
        console.log("ProjectData Updated.");
        console.log(data);
      })
      .catch(err => {
        console.error("Failed to retrieve data: " + err);
      });
  }

  reset(){
    this._setNameInputValue( this._getNameFromData() );
    this._setSummaryInputValue( this._getSummaryFromData() );
    console.log("Input set with project data.");
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

  getDom(){
    return this._shadow;
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
        return response.json().then( data => {
          console.log("Save response status: "+response.status)
          if (response.status == "200") {
            this.showModalSuccess(data.message);
            this._fetchNewProjectData();
          } else {
            this.showModalError(data.message);
          }
        })
      }
    )
    .catch(error => {
      console.log('Error:', error.message);
      this.showModalError("Internal error: "+error.message);
    });
  }

  showModalSuccess(message){
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  showModalError(message){
    let text = document.createTextNode(" Error saving project details");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-warning") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

}

customElements.define("project-main-edit", ProjectMainEdit);
