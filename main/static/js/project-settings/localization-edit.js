class LocalizationEdit extends SettingsSection {
  constructor() {
    super();
    this._shadow.appendChild(this.mainDiv);
  }

  _init(){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( this.getAttribute("_data") );
    console.log(this.data);

    //this.projectId = this._setProjectId();
    for(let i in this.data){
      let itemDiv = document.createElement("div");
      itemDiv.id = "mediaId-"+this.data[i].id;
      itemDiv.setAttribute("class", "item-box");
      itemDiv.hidden = true;

      // Section h1.
      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h2 pb-3");
      h1.innerHTML = `Set localization and attribute details.`;
      itemDiv.appendChild(h1);

      itemDiv.appendChild( this._getSectionForm(this.data[i]) );
      itemDiv.appendChild( this._getSubmitDiv() );

      this.mainDiv.appendChild(itemDiv);
    }

    return this.mainDiv;
  }

  _getSectionForm(){
    this.boxOnPage = this.boxHelper.boxWrapDefault({
        "children" : document.createTextNode("")
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
    return fetch("/rest/LocalizationTypes/" + id, {
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
    console.log("Reset with project data.");
  }

  save(id){
    // Check if anything changed
    fetch("/rest/LocalizationType/{id}/" + id, {
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

customElements.define("localization-edit", LocalizationEdit);
