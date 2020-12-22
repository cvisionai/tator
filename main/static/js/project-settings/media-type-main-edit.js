class MediaTypeMainEdit extends TatorElement {
  constructor() {
    super();
    this.boxHelper = new SettingsBox("media-types-main-box");
    this.inputHelper = new SettingsInput("media-types-main-input");

    this.mediaTypeBoxOnPage = document.createElement("div");

    this._shadow.appendChild(this.mediaTypeBoxOnPage);
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
  //  try{
      console.log("Project Edit Media Types - Init");
      this.data = JSON.parse( this.getAttribute("_data") );
      console.log(this.data);

      for(let i in this.data){
        this.itemDiv = document.createElement("div");
        this.itemDiv.id = "mediaId-"+this.data[i].id;
        this.itemDiv.setAttribute("class", "item-box");

        // Project Settings h1.
        const h1 = document.createElement("h1");
        h1.setAttribute("class", "h2 pb-3");
        h1.innerHTML = `Set media and attribute details.`;
        this.itemDiv.appendChild(h1);

        let headingName = this._getHeadingName(this.data[i].dtype);
        let mediaType = this.boxHelper.headingWrap({
            "headingText" : `${headingName} | ${this.data[i].name}`,
            "descriptionText" : "Edit media type.",
            "level": 1,
            "collapsed": false
          });
        let currentMediaType = this.boxHelper.boxWrapDefault( {
            "children" : mediaType
          } );


        // append input for name and summary
        currentMediaType.appendChild( this.inputHelper.inputText({ "labelText": "Name", "value": this.data[i].name}) );
        currentMediaType.appendChild( this.inputHelper.inputText( { "labelText": "Description", "value": this.data[i].description} ) );

        // default volume (video, multi)
        let showVolume = this.data[i].dtype != 'image' ? true : false;
        if (showVolume) currentMediaType.appendChild( this.inputHelper.inputText({ "labelText": "Default Volume", "value": this.data[i].default_volume, "type":"number"}) );

        // visible
        currentMediaType.appendChild( this.inputHelper.inputCheckbox( { "labelText": "Visible", "value": this.data[i].visible, "type":"checkbox"} ) );

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

        let attributeMediaId = "attribute"+this.data[i].id;
        collapsableAttributeHeading.setAttribute("class", `toggle-${attributeMediaId} py-2`);

        let collapsableAttributeBox = document.createElement("div");
        collapsableAttributeBox.id = attributeMediaId;
        collapsableAttributeBox.hidden = true;

        currentMediaType.appendChild(collapsableAttributeBox);
        currentMediaType.querySelector(`.toggle-${attributeMediaId}`).addEventListener("click", (event) => {
          this._toggleAttributes(event);
        });

        // attribute types
        let attributeTypes = this.data[i].attribute_types
        for(let a of attributeTypes){
          collapsableAttributeBox.appendChild( this.attributesOutput( {"attributes": a }) );
        }

        this.itemDiv.appendChild( currentMediaType );
        this.itemDiv.hidden = true;

        this.mediaTypeBoxOnPage.appendChild( this.itemDiv );
      }
  //  } catch(e){
  //    console.error("Media Type Main Edit Error: "+e);
  //  }
  }

  getDom(){
    return this._shadow;
  }

  _toggleAttributes(e){
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

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
    let options = this._getDtypeOptions([ "bool", "int", "float", "enum", "string", "datetime", "geopos"]);
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

  _getDtypeOptions(typeArray){
    return typeArray.map( (i) => ({ "optText":this._getHeadingName(i), "optValue":i }) );
  }

}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
