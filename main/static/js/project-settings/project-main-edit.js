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

    // Input for name and summary
    this._editName = this._setNameInput( this._getNameFromData() );
    this.boxOnPage.appendChild( this._editName );

    this._editSummary = this._setSummaryInput( this._getSummaryFromData() );;
    this.boxOnPage.appendChild( this._editSummary );

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
