class AttributesMain extends HTMLElement {
  constructor() {
    super();
    this.loading = new LoadingSpinner();
    this.loadingImg = this.loading.getImg()
  }

  _init(typeName, fromId, projectId, data){
    console.log(typeName.toLowerCase() + `__${this.tagName} init.`);

    //
    this.fromId = fromId;
    this.typeName = typeName;
    this.projectId = projectId;

    // add main div
    this.attributeDiv = document.createElement("div");
    this.appendChild(this.attributeDiv);
    this.appendChild(this.loadingImg);

    // Required helpers.
    this.boxHelper = new SettingsBox( this.attributeDiv );
    this.inputHelper = new SettingsInput("media-types-main-edit");
    this.attributeFormHelper = new AttributesForm();

    // Section h1.
    const h2 = document.createElement("h2");
    h2.setAttribute("class", "h3 py-6 pb-3 edit-project__h1");
    const t = document.createTextNode(`Attribute settings.`); 
    h2.appendChild(t);
    this.attributeDiv.appendChild(h2);

    this.attributeBox = this.boxHelper.boxWrapDefault( {
      "children" : ""
    } );

    // get the form and +Add link
    this.attributeBox.appendChild( this._getAttributesSection(data) );
    this.attributeBox.appendChild( this._getNewAttributesTrigger() );
    this.attributeBox.appendChild( this._getCopyAttributesTrigger() );

    this.attributeDiv.appendChild(this.attributeBox);

    return this.attributeDiv;
  }

  _getAttributesSection(attributeTypes = []){
    let attributesSection = document.createElement("div");

    if(attributeTypes && attributeTypes.length > 0){
      // Seperator line @TODO component?
      // let seperator = document.createElement("div");
      // seperator.setAttribute("class", "col-12 py-2");
      // seperator.setAttribute("style", "border-bottom: 1px solid #262e3d;");
      // seperator.innerHTML = "&nbsp;"
      // attributesSection.append(seperator);

      // Attributes list main heading and trigger
      let heading = this.boxHelper.headingWrap({
          "headingText" : `Edit Attributes (${attributeTypes.length})`,
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


  // Add Attribute
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

      afObj.submitAttribute.addEventListener("click", (e) => {
        e.preventDefault();
  
        this._postAttribute( afObj.addAttributeForm );
      });

      this.boxHelper._modalConfirm({
        "titleText" : "New Attribute",
        "mainText" : afObj.addAttributeForm,
        "buttonSave" : afObj.submitAttribute,
        "scroll" : true
      });
    });

    return newAttributeTrigger;
  }

  _getAddForm(){
    let addAttributeForm = this.attributeFormHelper._initEmptyForm();
    let submitAttribute = this.inputHelper.saveButton();

    return {addAttributeForm, submitAttribute};
  }

  _postAttribute(form){
    this.boxHelper._modalCloseCallback();
    this.loading.showSpinner();
    let formJSON = {
      "entity_type": this.typeName,
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

      
      this.loading.hideSpinner();
      this.boxHelper._modalComplete(`${iconWrap.innerHTML} ${currentMessage}`);
    }).catch((error) => {
      this.loading.hideSpinner();
      this.boxHelper._modalErrin(`Error: ${error}`);
    });
  }

  // Clone Attribute
  _getCopyAttributesTrigger(){
    // New attribute link
    let newCopyTrigger = this.boxHelper.headingWrap({
        "headingText" : `+ Clone Attribute(s)`,
        "descriptionText" : "",
        "level": 3,
        "collapsed": false
      });
    newCopyTrigger.setAttribute("class", "clickable py-3");
    
    newCopyTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      this._getCloneModal();    
    });

    return newCopyTrigger;
  }

  _getCloneModal(){
    this.loading.showSpinner();
    let typesData = new ProjectTypesData(this.projectId);
    console.log(typesData);
    typesData._getAttributeDataByType().then( (attributeDataByType) => {
      let clone = new AttributesClone( attributeDataByType );
      let cloneForm = clone._init();
      let cloneSave = this.inputHelper.saveButton();
      
      cloneSave.addEventListener("click", (event) => {
        event.preventDefault();
        let inputs = clone.getInputs();
        let cloneData = new AttributesData({"projectId":this.projectId, "typeId": this.fromId, "typeName": this.typeName, inputs});
        return cloneData.createClones().then((r) => this.boxHelper._modalComplete(r));               
      });

      this.loading.hideSpinner();
      return this.boxHelper._modalConfirm({
        "titleText" : "Clone Attribute(s)",
        "mainText" : cloneForm,
        "buttonSave" : cloneSave,
        "scroll" : true
      });
    }).catch((error) => {
      this.loading.hideSpinner();
      this.boxHelper._modalError(`Error: ${error}`);
    });
    
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
    const formContents = this.attributeFormHelper._getFormWithValues(attributes);
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

    let deleteAttribute = new AttributesDelete({
      "type" : this.typeName, 
      "typeId" : this.fromId, 
      "attributeName" : attributes.name, 
      "pageDiv" : this.attributeDiv
    });
    boxOnPage.appendChild( deleteAttribute.init() );

    return boxOnPage;
  }

  getDOM(){
    return this._shadow;
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

customElements.define("attributes-main", AttributesMain);
