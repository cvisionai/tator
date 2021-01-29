class SettingsAttributes extends HTMLElement {
  constructor() {
    super();

    // Required helpers.
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");
    this.attributeFormHelper = new AttributesForm();
    this.modal = document.createElement("modal-dialog");
  }

  _init(fromType, fromId, projectId, data){
    console.log(fromType.toLowerCase() + `__${this.tagName} init.`);

    this.attributeDiv = document.createElement("div");
    this.appendChild(this.attributeDiv);

    //
    this.fromId = fromId;
    this.fromType = fromType;
    this.projectId = projectId;

    // Prep the modal.
    this.modal = document.createElement("modal-dialog");
    this.attributeDiv.appendChild(this.modal);

    // get the form and +Add link
    this.attributeDiv.appendChild( this._getAttributesSection(data) );
    this.attributeDiv.appendChild( this._getNewAttributesTrigger() );
    this.attributeDiv.appendChild( this._getCopyAttributesTrigger() );

    return this.attributeDiv;
  }

  _getAttributesSection(attributeTypes = []){
    let attributesSection = document.createElement("div");

    if(attributeTypes.length > 0){
      // Seperator line @TODO could be a component?
      let seperator = document.createElement("div");
      seperator.setAttribute("class", "col-12 py-2");
      seperator.setAttribute("style", "border-bottom: 1px solid #262e3d;");
      seperator.innerHTML = "&nbsp;"
      attributesSection.append(seperator);

      // Attributes list main heading and trigger
      let heading = this.boxHelper.headingWrap({
          "headingText" : `Attributes (${attributeTypes.length})`,
          "descriptionText" : "Edit media type.",
          "level": 2,
          "collapsed": true
        });
      heading.setAttribute("class", `py-4 toggle-attribute text-semibold`);
      attributesSection.appendChild(heading);

      let hiddenContent = document.createElement("div");
      hiddenContent.setAttribute("class", `attribute-list`);
      hiddenContent.hidden = true;
      attributesSection.appendChild(hiddenContent);

      // Attribute List toggle
      heading.addEventListener("click", (event) => {
        event.preventDefault();
        this._toggleAttributes(hiddenContent);
        this._toggleChevron(event);
      });

      // Loop through and output attribute forms
      for(let a in attributeTypes){
        hiddenContent.appendChild( this.attributesOutput( {
            "attributes": attributeTypes[a],
            "attributeId": a
          }) );
      }
    }

    return attributesSection;
  }

  _getNewAttributesTrigger(){
    // New attribute link
    let newAttributeTrigger = this.boxHelper.headingWrap({
        "headingText" : `+ New Attribute`,
        "descriptionText" : "",
        "level": 3,
        "collapsed": false
      });
    newAttributeTrigger.setAttribute("class", "clickable py-3");

    newAttributeTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      let afObj = this._getAddForm();
      this._modalConfirm({
        "titleText" : "New Attribute",
        "mainText" : afObj.addAttributeForm,
        "saveButton" : afObj.submitAttribute,
        "buttonText" : "Save",
        "scroll" : true
      });
    });

    return newAttributeTrigger;
  }

  _getAddForm(){
    let addAttributeForm = this.attributeFormHelper._initEmptyForm();
    let submitAttribute = this.inputHelper.saveButton();
    addAttributeForm.appendChild( submitAttribute );

    submitAttribute.addEventListener("click", (e) => {
      e.preventDefault();
      this._saveAttribute( addAttributeForm );
    });

    return {addAttributeForm, submitAttribute};
  }

  _saveAttribute(form){
    let formJSON = {
      "entity_type": this.fromType,
      "addition": this.attributeFormHelper._getAttributeFormData( form )
    };

    console.log(formJSON);
    let status = 0;
    this._fetchPostPromise({"formData" : formJSON})
    .then(response => {
      status = response.status;
      return response.json()
    })
    .then(data => {
      console.log(data);
      let currentMessage = data.message;
      let succussIcon = document.createElement("modal-success");
      let warningIcon = document.createElement("modal-warning");
      let iconWrap = document.createElement("span");

      if(status == 201) iconWrap.appendChild(succussIcon);
      if(status == 400) iconWrap.appendChild(warningIcon);

      this.modal._closeCallback();
      this._modalComplete(`${iconWrap.innerHTML} ${currentMessage}`);
    });

  }

  _getCopyAttributesTrigger(){
    // New attribute link
    let newCopyTrigger = this.boxHelper.headingWrap({
        "headingText" : `+ Clone Attribute(s)`,
        "descriptionText" : "",
        "level": 3,
        "collapsed": false
      });
    newCopyTrigger.setAttribute("class", "clickable py-3");

    let cloneSave = this.inputHelper.saveButton();
    let cloneAttribute = new AttributesClone( this.projectId, this.fromType, this.fromId, this.modal, this.modal._footer, cloneSave);

    newCopyTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      let form = cloneAttribute._init();

      this._modalConfirm({
        "titleText" : "Clone Attribute(s)",
        "mainText" : form,
        "saveButton" : cloneSave,
        "buttonText" : "Save",
        "scroll" : true
      });
    });

    return newCopyTrigger;
  }

  _toggleAttributes(el){
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

    attributeCurrent.setAttribute("class", `toggle-attribute edit-project__label`);

     // Avoid special name default in var later on
    attributes._default = attributes.default;
    let formId = attributes.name.replace(/[^\w]|_/g, "").toLowerCase();

    // Fields for this form
    const newForm = document.createElement("attributes-form");
    const formContents = newForm._getFormWithValues(attributes);
    formContents.setAttribute("class", "attribute-form px-4");
    formContents.id = `${formId}_${this.fromId}`;
    formContents.data = attributes;
    formContents.setAttribute("data-old-name", attributes.name);
    formContents.hidden = true;

    // add listener
    attributeCurrent.addEventListener("click", (event) => {
      event.preventDefault();
      this._toggleAttributes(formContents);
      this._toggleChevron(event)
    });

    // create box with heading for this form
    let boxOnPage = this.boxHelper.boxWrapDefault( {
      "children" : attributeCurrent,
      "level":2
    } );

    boxOnPage.appendChild(formContents);

    return boxOnPage;
  }

  getDOM(){
    return this._shadow;
  }

  _modalSuccess(message){
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    //this.modal._main.classList.add("fixed-heigh-scroll");

    return this.modal.setAttribute("is-open", "true")
  }

  _modalConfirm({
    titleText = "",
    mainText = "",
    saveButton = document.createElement(""),
    buttonText = "",
    scroll = false
  } = {}){
    this._modalClear();
    let modal = this.modal;
    modal._titleDiv.innerHTML = titleText;
    modal._main.appendChild(mainText);
    modal._footer.appendChild(saveButton);
    modal._main.classList.add("fixed-heigh-scroll");
    modal.setAttribute("is-open", "true")

    return modal;
  }

  _modalComplete(message){
    let text = document.createTextNode("Complete");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._footer.innerHTML = "";
    this.modal._main.classList.remove("fixed-heigh-scroll");

    return this.modal.setAttribute("is-open", "true")
  }

  _modalClear(){
    this.modal._titleDiv.innerHTML = "";
    this.modal._main.innerHTML = "";
    this.modal._footer.innerHTML = "";
  }

  _fetchPostPromise({formData = null } = {}){
    console.log("Attribute (new) Post Fetch");

    if(formData != null){
      return fetch("/rest/AttributeType/"+this.fromId, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
    } else {
      console.log("Problem with new attribute form data.");
    }
  }
}

customElements.define("settings-attributes", SettingsAttributes);
