class LocalizationEdit extends SettingsSection {
  constructor() {
    super();
    this._shadow.appendChild(this.settingsSectionDiv);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( data );
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

      this.settingsSectionDiv.appendChild(itemDiv);
    }

    return this.settingsSectionDiv;
  }

  _getSectionForm(loc){
      let headingName = this._getHeadingName(media.dtype);
      let mediaType = this.boxHelper.headingWrap({
          "headingText" : `${headingName} | ${media.name}`,
          "descriptionText" : "Edit media type.",
          "level": 1,
          "collapsed": false
        });
      let currentMediaType = this.boxHelper.boxWrapDefault( {
          "children" : mediaType
        } );


      // append input for name and summary
      currentMediaType.appendChild( this.inputHelper.inputText({ "labelText": "Name", "value": media.name}) );
      currentMediaType.appendChild( this.inputHelper.inputText( { "labelText": "Description", "value": media.description} ) );

      // default volume (video, multi)
      let showVolume = media.dtype != 'image' ? true : false;
      if (showVolume) currentMediaType.appendChild( this.inputHelper.inputText({ "labelText": "Default Volume", "value": media.default_volume, "type":"number"}) );

      // visible
      currentMediaType.appendChild( this.inputHelper.inputCheckbox( { "labelText": "Visible", "value": media.visible, "type":"checkbox"} ) );

      let seperator = document.createElement("div");
      seperator.setAttribute("class", "col-12 py-2");
      seperator.setAttribute("style", "border-bottom: 1px solid #262e3d;");
      seperator.innerHTML = "&nbsp;"

      currentMediaType.append(seperator);

      let collapsableAttributeHeading = this.boxHelper.headingWrap({
          "headingText" : `Attributes`,
          "descriptionText" : "Edit media type.",
          "level": 2,
          "collapsed": "controlId"
        });
      currentMediaType.appendChild(collapsableAttributeHeading);

      let attributeMediaId = "attribute"+media.id;
      collapsableAttributeHeading.setAttribute("class", `toggle-${attributeMediaId} py-2`);

      currentMediaType.querySelector(`.toggle-${attributeMediaId}`).addEventListener("click", (event) => {
        this._toggleAttributes(event);
      });

      let collapsableAttributeBox = document.createElement("div");
      collapsableAttributeBox.id = attributeMediaId;
      collapsableAttributeBox.hidden = true;

      // attribute types
      let attributeTypes = media.attribute_types
      for(let a of attributeTypes){
        collapsableAttributeBox.appendChild( this.attributesOutput( {"attributes": a }) );
      }

      currentMediaType.appendChild(collapsableAttributeBox);

      return currentMediaType;
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
