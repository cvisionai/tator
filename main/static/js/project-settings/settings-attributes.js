class SettingsAttributes extends HTMLElement {
  constructor() {
    super();


  }

  connectedCallback(){

  }

  _init(fromType, data){
    // Required helpers.
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");

    this.attributeDiv = document.createElement("div");
    this.attributeDiv.style.borderBottom = "none";
    this.appendChild(this.attributeDiv);

    // Prep the modal.
    this.modal = document.createElement("modal-dialog");

    this._setAttributeDTypes();

    console.log(fromType + `__${this.tagName} init.`);
    //console.log(data);

    this._getAttributesForm(data)

    return this.attributeDiv;
  }

  _getAttributesForm(attributeTypes){
      // attribute types
      if(attributeTypes.length > 0){
        //seperator line
        let seperator = document.createElement("div");
        seperator.setAttribute("class", "col-12 py-2");
        seperator.setAttribute("style", "border-bottom: 1px solid #262e3d;");
        seperator.innerHTML = "&nbsp;"
        this.attributeDiv.append(seperator);

        //heading
        let collapsableAttributeHeading = this.boxHelper.headingWrap({
            "headingText" : `Attributes`,
            "descriptionText" : "Edit media type.",
            "level": 2,
            "collapsed": true
          });
        collapsableAttributeHeading.setAttribute("class", `py-2 toggle-attribute`);
        this.attributeDiv.appendChild(collapsableAttributeHeading);

        // content in box
        let collapsableAttributeBox = document.createElement("div");
        collapsableAttributeBox.hidden = true;

        this.attributeDiv.appendChild(collapsableAttributeBox);

        for(let a in attributeTypes){
          collapsableAttributeBox.appendChild( this.attributesOutput( {"attributes": attributeTypes[a], "attributeId": a}) );
        }

        this.attributeDiv.querySelector(`.toggle-attribute`).addEventListener("click", (event) => {
          this._toggleAttributes(event);
          this._toggleChevron(event);
        });

      }

      return this.attributeDiv;
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

  attributesOutput({
    attributes = [],
    attributeId = undefined
  } = {}){
    let attributeCurrent = this.boxHelper.headingWrap({
      "headingText" : `${attributes.name}`,
      "descriptionText" : "Edit attribute.",
      "level":3,
      "collapsed":true
    });

    attributeCurrent.style.borderBottom = "none";
    attributeCurrent.setAttribute("class", `toggle-attribute`);

    // Only editable items inside this form
    let collapsableAttributeBox = document.createElement("form");
    collapsableAttributeBox.id = attributes.name;
    collapsableAttributeBox.setAttribute("class", "attribute-form");
    collapsableAttributeBox.hidden = true;

    collapsableAttributeBox.addEventListener("change", (event) => {
      this._formChanged(collapsableAttributeBox);
    });

    let boxOnPage = this.boxHelper.boxWrapDefault( {
      "children" : attributeCurrent,
      "level":2,
      "customClass": "attributeId-"+attributeId
    } );

    boxOnPage.appendChild(collapsableAttributeBox);
    attributeCurrent.addEventListener("click", (event) => {
      this._toggleAttributes(event);
      this._toggleChevron(event)
    });

    // Fields for this form

    // append input for name
    const NAME = "Name";
    collapsableAttributeBox.appendChild( this.inputHelper.inputText({ "labelText": NAME, "name": NAME.toLowerCase(), "value": attributes[NAME.toLowerCase()]}) );

    //description
    const DESCRIPTION = "Description";
    collapsableAttributeBox.appendChild( this.inputHelper.inputText( { "labelText": DESCRIPTION, "name": DESCRIPTION.toLowerCase(), "value": attributes[DESCRIPTION.toLowerCase()] } ) );

    // append input for dtype
    let selectBox = this._getDtypeSelectBox( attributes.dtype );
    collapsableAttributeBox.appendChild( selectBox );

    // required
    const REQUIRED = "Required";
    collapsableAttributeBox.appendChild( this.inputHelper.inputCheckbox({ "labelText": REQUIRED, "name": REQUIRED.toLowerCase(), "value": attributes[REQUIRED.toLowerCase()] }) );

    // visible
    const VISIBLE = "Visible";
    collapsableAttributeBox.appendChild( this.inputHelper.inputCheckbox({ "labelText": VISIBLE, "name": VISIBLE.toLowerCase(), "value": attributes[VISIBLE.toLowerCase()] }) );
    // @TODO - use SLIDE
    //collapsableAttributeBox.appendChild( mediaTypesInputHelper.inputRadioSlide({ "labelText": "Visible test", "value": attributes.visible, "type":"checkbox"}) );

    // default
    const DEFAULT = "Default";
    let showDefault = (attributes.dtype != 'datetime' && attributes.dtype != 'geopos')? true : false;
    if (showDefault)  collapsableAttributeBox.appendChild( this.inputHelper.inputText(
      { "labelText": DEFAULT, "name": DEFAULT.toLowerCase(), "value": attributes[DEFAULT.toLowerCase()] }
    ) );

    // int, float	minimum & maximum
    let showMinMax = (attributes.dtype == 'int' || attributes.dtype == 'float') ? true : false;
    if (showMinMax)  {
      const MIN = "Minimum";
      collapsableAttributeBox.appendChild( this.inputHelper.inputText(
        { "labelText": MIN, "name": MIN.toLowerCase(), "value": attributes[MIN.toLowerCase()], "type":"number"}
      ) );
      const MAX = "Maximum";
      collapsableAttributeBox.appendChild( this.inputHelper.inputText(
        { "labelText": MAX, "name": MAX.toLowerCase(), "value": attributes[MAX.toLowerCase()], "type":"number"}
      ) );
    }

    let showChoiceAndLabels = attributes.dtype == 'enum' ? true : false;
    if (showChoiceAndLabels){
      const CHOICES = "Choices";
      collapsableAttributeBox.appendChild( this.inputHelper.inputText(
          { "labelText": CHOICES, "name": CHOICES.toLowerCase(), "value": attributes[CHOICES.toLowerCase()] }
      ) );
      const LABELS = "Labels";
      collapsableAttributeBox.appendChild( this.inputHelper.inputText(
          { "labelText": LABELS, "name": LABELS.toLowerCase(), "value": attributes[LABELS.toLowerCase()] }
      ) );
    }

    return boxOnPage;
  }

  _formChanged(_form){
    console.log("Change in "+_form.id);
    let changedFormEl = document.querySelector(`[id="${_form.id}"] `);
    let changedFormElClasses = changedFormEl.classes;
    console.log( changedFormElClasses );

    return changedFormEl.setAttribute("class", changedFormElClasses+"changed");
  }

  _getDtypeSelectBox(dtype){
    let currentOption = dtype;
    let options = this._getDtypeOptions( this._getAllowedDTypeArray(currentOption) );

    let selectBox = this.inputHelper.inputSelectOptions({
      "labelText": "Data Type",
      "value": dtype,
      "optionsList": options
    });

    selectBox.after(this._inlineWarningDiv());

    selectBox.addEventListener("change", (e) => {
      //when changed check if we need to show a warning.
      let newType = e.target.value;
      let warningEl = e.target.parentNode.parentNode.parentNode.querySelector(".inline-warning");
      let message = ""

      if(this._getIrreverasibleDTypeArray({ "currentDT": dtype, "newDT": newType})){
        message = `Warning: ${dtype} to ${newType} is not reversable.`;
      } else if(this._getLossDTypeArray({ "currentDT": dtype, "newDT": newType})){
        message = `Warning: ${dtype} to ${newType} may cause data loss.`;
      }
      this._inlineWarning({
        "el" : warningEl,
        "message" : message
      });
    });

    return selectBox;
  }

  _inlineWarningDiv(){
    let inlineWarning = document.createElement("div");
    inlineWarning.setAttribute("class", "text-red d-flex inline-warning");
    inlineWarning.hidden = true;

    return inlineWarning;
  }


  _setAttributeDTypes(){
    this.attributeDTypes = [ "bool", "int", "float", "enum", "string", "datetime", "geopos"];
    return this.attributeDTypes;
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
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[dtype].allowed;
    //include itself
    ruleSetForDtype.push(dtype);

    return ruleSetForDtype;
  }

  _getLossDTypeArray({ currentDT = "", newDT = ""} = {}){
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[currentDT]['reversable-with-warning'];

    return ruleSetForDtype.includes(newDT);
  }

  _getIrreverasibleDTypeArray({ currentDT = "", newDT = ""} = {}){
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[currentDT].irreversible;

    return ruleSetForDtype.includes(newDT);
  }

  _getDtypeOptions(typeArray){
    return typeArray.map( (i) => {
      // ADD STAR TO THOSE WITH WARNING? OR JUST ON SAVE
      return ({ "optText": i, "optValue":i });
    });
  }

  getDOM(){
    return this._shadow;
  }

  _inlineWarning({
    el = "",
    message = ""
  }){
    //empty el
    el.innerHTML = "";
    let inlineL= document.createElement("span");
    inlineL.setAttribute("class", "col-4");
    inlineL.innerHTML = "&nbsp;"
    el.appendChild(inlineL);

    let inlineR= document.createElement("span");
    inlineR.setAttribute("class", "col-8");
    inlineR.innerHTML = message;
    el.appendChild(inlineR);

    return el.hidden = false;
  }
}

customElements.define("settings-attributes", SettingsAttributes);
