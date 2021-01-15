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
    this.attributeDiv.appendChild(this.modal);

    console.log(fromType.toLowerCase() + `__${this.tagName} init.`);
    //console.log(data);

    this._getAttributesForm(data)

    return this.attributeDiv;
  }

  _getAttributesForm(attributeTypes){
      if(attributeTypes.length > 0){
        // Seperator line @TODO could be a component?
        let seperator = document.createElement("div");
        seperator.setAttribute("class", "col-12 py-2");
        seperator.setAttribute("style", "border-bottom: 1px solid #262e3d;");
        seperator.innerHTML = "&nbsp;"
        this.attributeDiv.append(seperator);

        // Attributes list main heading and trigger
        let collapsableAttributeHeading = this.boxHelper.headingWrap({
            "headingText" : `Edit Attributes (${attributeTypes.length})`,
            "descriptionText" : "Edit media type.",
            "level": 2,
            "collapsed": true
          });
        collapsableAttributeHeading.setAttribute("class", `py-4 toggle-attribute text-semibold`);
        this.attributeDiv.appendChild(collapsableAttributeHeading);

        // Content box
        let collapsableAttributeBox = document.createElement("div");
        collapsableAttributeBox.hidden = true;

        this.attributeDiv.appendChild(collapsableAttributeBox);

        // Loop through and output attribute forms
        for(let a in attributeTypes){
          collapsableAttributeBox.appendChild( this.attributesOutput( {
              "attributes": attributeTypes[a],
              "attributeId": a
            }) );
        }

        // Attribute List toggle
        this.attributeDiv.querySelector(`.toggle-attribute`).addEventListener("click", (event) => {
          this._toggleAttributes(event);
          this._toggleChevron(event);
        });


        // New attribute link
        let newAttributeTrigger = this.boxHelper.headingWrap({
            "headingText" : `+ New Attribute`,
            "descriptionText" : "",
            "level": 3,
            "collapsed": false
          });
        newAttributeTrigger.setAttribute("class", "clickable py-3");

        /*newAttributeTrigger.addEventListener("click", (event) => {
          this._modalConfirm({
            "titleText" : "New Attribute",
            "mainText" : this._getAddForm(),
            "buttonText" : "Save",
            "callback": this._saveAttribute()
          });
        });*/

        this.attributeDiv.appendChild(newAttributeTrigger);

      }

      return this.attributeDiv;
  }

  _getAddForm(){
    return this.attributeForm._initEmptyForm();
  }

  _addAttribute(){
    console.log("attribute added! [[placeholder]]");
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
    //collapsableAttributeBox.setAttribute("data", attributes);
    collapsableAttributeBox.hidden = true;

    collapsableAttributeBox.addEventListener("change", (event) => {
      this._formChanged(collapsableAttributeBox);
    });

    // Fields for this form
    const newForm = document.createElement("attributes-form");
    const formContents = newForm._getFormWithValues(attributes);
    collapsableAttributeBox.appendChild(formContents);

    // create box with heading for this form
    let boxOnPage = this.boxHelper.boxWrapDefault( {
      "children" : attributeCurrent,
      "level":2,
      "customClass": "attributeId-"+attributeId
    } );

    // add listener
    boxOnPage.appendChild(collapsableAttributeBox);
    attributeCurrent.addEventListener("click", (event) => {
      this._toggleAttributes(event);
      this._toggleChevron(event)
    });

    return boxOnPage;
  }

  _formChanged(_form){
    console.log("Change in "+_form.id);
    let changedFormEl = document.querySelector(`[id="${_form.id}"] `);
    let changedFormElClasses = changedFormEl.classes;
    console.log( changedFormElClasses );

    return changedFormEl.setAttribute("class", changedFormElClasses+"changed");
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

  _modalConfirm({
    titleText = "",
    mainText = "",
    buttonText = "",
    callback = null //required
  } = {}){
    //this._modalClear();

    console.log("Modal confirm");
    this.modal._titleDiv.innerHTML = titleText;
    this.modal._main.innerHTML = mainText;


    let button = document.createElement("button")
    button.setAttribute("class", "btn btn-clear f2 text-semibold");
    button.innerHTML = buttonText;

    button.addEventListener("click", (event) => {
      if(callback == null){
        return this.modal._closeCallback();
      }else{
        return callback();
      }
    });

    return this.modal.setAttribute("is-open", "true")
  }

  _modalClear(){
    this.modal._titleDiv.innerHTML = "";
    this.modal._main.innerHTML = "";
    this.modal._footer.innerHTML = "";
  }
}

customElements.define("settings-attributes", SettingsAttributes);
