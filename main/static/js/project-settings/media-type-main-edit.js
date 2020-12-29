class MediaTypeMainEdit extends SettingsSection {
  constructor() {
    super();
    this._shadow.appendChild(this.settingsSectionDiv);

    //this._setAttributeDTypes();
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
      //h1.innerHTML = `Set media and attribute details.`;
      h1.innerHTML = this.data[i].name;
      itemDiv.appendChild(h1);

      itemDiv.appendChild( this._getSectionForm(this.data[i]) );
      itemDiv.appendChild( this._getSubmitDiv({"id":itemDiv.id}) );

      this.settingsSectionDiv.appendChild(itemDiv);
    }

    return this.settingsSectionDiv;
  }

  _getSectionForm(media){
      //let headingName = this._getHeadingName(media.dtype);
      /*let mediaType = this.boxHelper.headingWrap({
          "headingText" : `${media.name}`, //`${headingName} | ${media.name}`,
          "descriptionText" : "Edit media type.",
          "level": 1,
          "collapsed": false
        });
      let currentMediaType = this.boxHelper.boxWrapDefault( {
          "children" : mediaType
        } );*/

    let currentMediaType = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

      // append input for name and summary
      currentMediaType.appendChild( this.inputHelper.inputText({ "labelText": "Name", "value": media.name}) );
      currentMediaType.appendChild( this.inputHelper.inputText( { "labelText": "Description", "value": media.description} ) );

      // default volume (video, multi)
      let showVolume = media.dtype != 'image' ? true : false;
      if (showVolume) currentMediaType.appendChild( this.inputHelper.inputText({ "labelText": "Default Volume", "value": media.default_volume, "type":"number"}) );

      // visible
      currentMediaType.appendChild( this.inputHelper.inputCheckbox( { "labelText": "Visible", "value": media.visible, "type":"checkbox"} ) );

      // attribute types
      if(media.attribute_types.length > 0){
        let attributes = document.createElement("settings-attributes");
        attributes._init(media.attribute_types);
        currentMediaType.appendChild(attributes);
      }

      return currentMediaType;
  }

  _toggleAttributes(e){
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  _toggleChevron(e){
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch("/rest/MediaTypes/" + id, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  _fetchPatchPromise({id = -1 } = {}){
    return fetch("/rest/MediaType/" + id, {
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

  _descriptionChanged(){
    if(this._getDescriptionInputValue() === this._getDescriptionFromData()) return false;
    return true;
  }

  _visibleChanged(){
    if(this._getDescriptionInputValue() === this._getDescriptionFromData()) return false;
    return true;
  }

  changed(){
    return true;
  }


}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
