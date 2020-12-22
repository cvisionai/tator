class MediaTypeMainEdit extends SettingsSection {
  constructor() {
    super();
    this._shadow.appendChild(this.mainDiv);

    this._setAttributeDTypes();
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
      h1.innerHTML = `Set media and attribute details.`;
      itemDiv.appendChild(h1);

      itemDiv.appendChild( this._getSectionForm(this.data[i]) );
      itemDiv.appendChild( this._getSubmitDiv() );

      this.mainDiv.appendChild(itemDiv);
    }

    return this.mainDiv;
  }

  _getSectionForm(media){
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

  _toggleAttributes(e){
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  attributesOutput({
    attributes = []
  } = {}){
    const settingsBoxHelper = new SettingsBox();
    const mediaTypesInputHelper = new SettingsInput();

    let headingName = this._getHeadingName(attributes.dtype);

    let attributeCurrent = settingsBoxHelper.headingWrap({
      "headingText" : `Attribute ${headingName} | ${attributes.name}`,
      "descriptionText" : "Edit attribute.",
      "level":3,
      "collapsed":true
    });

    attributeCurrent.style.borderBottom = "none";

    let attributeMediaId = "attribute"+attributes.id;
    attributeCurrent.setAttribute("class", `toggle-a-${attributeMediaId}`);

    let collapsableAttributeBox = document.createElement("div");
    collapsableAttributeBox.id = attributeMediaId;
    collapsableAttributeBox.hidden = true;

    let boxOnPage = settingsBoxHelper.boxWrapDefault( {"children" : attributeCurrent, "level":2} );

    boxOnPage.appendChild(collapsableAttributeBox);
    attributeCurrent.addEventListener("click", (event) => {
      this._toggleAttributes(event);
    });

    // append input for name and description
    collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Name", "value": attributes.name}) );
    collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText( { "labelText": "Description", "value": attributes.description} ) );

    // append input for dtype
    let currentOption = attributes.dtype;
    let options = this._getDtypeOptions( this._getAllowedDTypeArray(currentOption) );

    collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputSelectOptions({
      "labelText": "Data Type",
      "value": attributes.dtype,
      "optionsList": options
    }));

    //required
    collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputCheckbox({ "labelText": "Required", "value": attributes.required, "type":"checkbox"}) );

    // default
    let showDefault = (attributes.dtype != 'datetime' && attributes.dtype != 'geopos')? true : false;
    if (showDefault)  collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Default", "value": attributes.default, "type":"text"}) );

    // visible
    collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputCheckbox({ "labelText": "Visible", "value": attributes.visible, "type":"checkbox"}) );

    // int, float	minimum & maximum
    let showMinMax = (attributes.dtype == 'int' || attributes.dtype == 'float') ? true : false;
    if (showMinMax)  {
      collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Minimum", "value": attributes.minimum, "type":"number"}) );
      collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Maximum", "value": attributes.maximum, "type":"number"}) );
    }

    let showChoiceAndLabels = attributes.dtype == 'enum' ? true : false;
    if (showChoiceAndLabels){
      collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Choice", "value": attributes.choices}) );
      collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Labels", "value": attributes.labels}) );
    }

    return boxOnPage;

  }

  _setAttributeDTypes(){
    this.attributeDTypes = [ "bool", "int", "float", "enum", "string", "datetime", "geopos"];
    return this.attributeDTypes;
  }

  _getHeadingName(dtype){
    switch(dtype){
      case "image":
        return "Image Type";
        break;
      case "video":
        return "Video Type";
        break;
      case "multi":
        return "Multi Type";
        break;
      case "bool":
        return "Boolean Type";
        break;
      case "int":
        return "Integer Type";
        break;
      case "float":
        return "Float Type";
        break;
      case "string":
        return "String Type";
        break;
      case "datetime":
        return "Datetime Type";
        break;
      case "geopos":
        return "Geopos Type";
        break;
      case "enum":
        return "Enum Type";
        break;
    }
  }

  _getDTypeRules(){
    return ( {
      "bool" : {
        "allowed": ["enum","string"],
        "fully-reversable": [],
        "reversable-with-warning": [],
        "irreversible": ["enum","string"]
      },
      "int" : {
        "allowed": ["float","enum","string"],
        "fully-reversable": ["float"],
        "reversable-with-warning": [],
        "irreversible": ["enum","string"]
      },
      "float" : {
        "allowed": ["int","enum","string"],
        "fully-reversable": [],
        "reversable-with-warning": ["int"],
        "irreversible": ["enum","string"]
      },
      "enum" : {
        "allowed": ["string"],
        "fully-reversable": ["string"],
        "reversable-with-warning": [],
        "irreversible": []
      },
      "string" : {
        "allowed": ["enum"],
        "fully-reversable": ["enum"],
        "reversable-with-warning": [],
        "irreversible": []
      },
      "datetime" : {
        "allowed": ["enum","string"],
        "fully-reversable": [],
        "reversable-with-warning": [],
        "irreversible": ["enum","string"]
      },
      "geopos" : {
        "allowed": ["enum","string"],
        "fully-reversable": [],
        "reversable-with-warning": [],
        "irreversible": ["enum","string"]
      }
    });
  }

  _getAllowedDTypeArray(dtype){
    return this.attributeDTypes.filter( a => {
      let allRules = this._getDTypeRules();
      let ruleSetForDtype = allRules[dtype];
      return ruleSetForDtype["allowed"].includes(a);
    });
  }

  _getLossDTypeArray(dtype){
    return this.attributeDTypes.filter( a => {
      let allRules = this._getDTypeRules();
      let ruleSetForDtype = allRules[dtype];
      return ruleSetForDtype["reversable-with-warning"].includes(a);
    });
  }

  _getIrreverasibleDTypeArray(dtype){
    return this.attributeDTypes.filter( a => {
      let allRules = this._getDTypeRules();
      let ruleSetForDtype = allRules[dtype];
      return ruleSetForDtype["irreversible"].includes(a);
    });
  }

  _getDtypeOptions(typeArray){
    return typeArray.map( (i) => {
      let text = this._getHeadingName(i);
      // ADD STAR TO THOSE WITH WARNING? OR JUST ON SAVE
      return ({ "optText": text, "optValue":i });
    });
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

customElements.define("media-type-main-edit", MediaTypeMainEdit);
