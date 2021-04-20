class AttributesMain extends HTMLElement {
  constructor() {
    super();
    this.loading = new LoadingSpinner();
    this.loadingImg = this.loading.getImg()

    this.attrForms = [];
    this.hasChanges = false;
  }

  resetChanges(){
    this.hasChanges = false;
  }

  _init(typeName, fromId, fromName, projectId, data, modal){
    //console.log(typeName.toLowerCase() + `__${this.tagName} init.`);

    // Init object global vars
    this.fromId = fromId;
    this.fromName = fromName;
    this.typeName = typeName;
    this.projectId = projectId;
    this.modal = modal;

    // add main div
    this.attributeDiv = document.createElement("div");
    this.appendChild(this.attributeDiv);
    this.appendChild(this.loadingImg);

    // Required helpers.
    this.boxHelper = new SettingsBox( this.modal );
    this.inputHelper = new SettingsInput("media-types-main-edit");
    this.refreshTypeEvent = new Event('settings-refresh');

    // Section h1.
    const h2 = document.createElement("h2");
    h2.setAttribute("class", "h3 py-6 pb-3 edit-project__h1");
    const t = document.createTextNode(`Attributes`); 
    h2.appendChild(t);

    this.separate_span = document.createElement("span");
    this.separate_span.setAttribute("class", "px-2");
    h2.appendChild(this.separate_span);
    const h2_separate_span = document.createTextNode(`|`);
    this.separate_span.appendChild(h2_separate_span);

    const span = document.createElement("span");
    span.setAttribute("class", "text-gray text-normal")
    span.appendChild( document.createTextNode(`${this.fromName}`) );
    h2.appendChild(span);

    this.separate_span2 = document.createElement("span");
    this.separate_span2.setAttribute("class", "px-2 text-gray text-normal");
    h2.appendChild(this.separate_span2);
    const h2_separate_span2 = document.createTextNode(`|`);
    this.separate_span2.appendChild(h2_separate_span2);

    const span2 = document.createElement("span");
    span2.setAttribute("class", "text-gray text-normal")
    span2.appendChild( document.createTextNode(`${this.typeName} (ID ${this.fromId})`) );
    h2.appendChild(span2);

    this.attributeDiv.appendChild(h2);

    // Create a styled box & Add box to page
    this.attributeBox = this.boxHelper.boxWrapDefault( {"children" : ""} );
    this.attributeDiv.appendChild(this.attributeBox);

    // Add the form and +Add links
    this.attributeBox.appendChild( this._getAttributesSection(data) );
    this.attributeBox.appendChild( this._getNewAttributesTrigger() );
    this.attributeBox.appendChild( this._getCopyAttributesTrigger() );    

    return this.attributeDiv;
  }

  _getAttributesSection(attributeTypes = []){
    let attributesSection = document.createElement("div");

    if(attributeTypes && attributeTypes.length > 0){
      // Attributes list main heading and trigger
      let heading = this.boxHelper.headingWrap({
          "headingText" : `Edit Attributes (${attributeTypes.length})`,
          "descriptionText" : "Edit media type.",
          "level": 2,
          "collapsed": true
        });
      heading.setAttribute("class", `py-4 toggle-attribute text-semibold`);

      // const heading = document.createElement("a");
      // heading.setAttribute("class", "toggle-attribute clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2");
  
      // const addPlus = document.createElement("span");
      // addPlus.setAttribute("class", "add-new__icon d-flex flex-items-center flex-justify-center text-white circle");
      // const editSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>`;
      // addPlus.innerHTML = editSvg;
  
      // const addText = document.createElement("span");
      // addText.setAttribute("class", "px-3");
      // addText.appendChild(document.createTextNode(` Edit Attributes (${attributeTypes.length})`));
  
      // heading.appendChild(addPlus);
      // heading.appendChild(addText);

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
        let attributeContent = this.attributesOutput( {
          "attributes": attributeTypes[a],
          "attributeId": a
        });
        hiddenContent.appendChild( attributeContent );
      }
    }

    return attributesSection;
  }


  // Add Attribute
  _getNewAttributesTrigger(){
    // New attribute link
    // let newAttributeTrigger = this.boxHelper.headingWrap({
    //     "headingText" : `+ New Attribute`,
    //     "descriptionText" : "",
    //     "level": 3,
    //     "collapsed": false
    // });
    const newAttributeTrigger = document.createElement("a");
    newAttributeTrigger.setAttribute("class", "py-2 my-2 clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2");

    const addPlus = document.createElement("span");
    addPlus.setAttribute("class", "add-new__icon d-flex flex-items-center flex-justify-center text-white circle");
    addPlus.appendChild(document.createTextNode("+"));

    const addText = document.createElement("span");
    addText.setAttribute("class", "px-3");
    addText.appendChild(document.createTextNode(" New Attribute"));

    newAttributeTrigger.appendChild(addPlus);
    newAttributeTrigger.appendChild(addText);

    newAttributeTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      let afObj = this._getAddForm();

      afObj.submitAttribute.addEventListener("click", (e) => {
        e.preventDefault();
  
        this._postAttribute( afObj.attrForm );
      });

      this.boxHelper._modalConfirm({
        "titleText" : "New Attribute",
        "mainText" : afObj.attrForm.form,
        "buttonSave" : afObj.submitAttribute,
        "scroll" : true
      });
      this.setAttribute("has-open-modal", "");
    });

    return newAttributeTrigger;
  }

  _getAddForm(){
    let attrForm = document.createElement("attributes-form");
    attrForm._initEmptyForm();
    let submitAttribute = this.inputHelper.saveButton();

    return {attrForm, submitAttribute};
  }

  _postAttribute(formObj){
    this.modal._closeCallback();
    this.loading.showSpinner();
    let formJSON = {
      "entity_type": this.typeName,
      "addition": formObj._getAttributeFormData()
    };

    let status = 0;
    this._fetchPostPromise({"formData" : formJSON})
    .then(response => {
      status = response.status;
      return response.json()
    })
    .then(data => {
      let currentMessage = data.message;
      let succussIcon = document.createElement("modal-success");
      let warningIcon = document.createElement("modal-warning");
      let iconWrap = document.createElement("span");

      if(status == 201) iconWrap.appendChild(succussIcon);
      if(status == 400) iconWrap.appendChild(warningIcon);
      
      this.loading.hideSpinner();
      this.completed = this.boxHelper._modalComplete(`${iconWrap.innerHTML} ${currentMessage}`);
    
      this.boxHelper.modal.addEventListener("close", this._dispatchRefresh.bind(this), {
        once : true
      });
    
    }).catch((error) => {
      this.loading.hideSpinner();
      this.boxHelper._modalError(`Error: ${error}`);
    });
  }

  _dispatchRefresh(e){
    //console.log("modal complete closed");
    this.dispatchEvent(this.refreshTypeEvent);   
  }

  // Clone Attribute
  _getCopyAttributesTrigger(){
    // New attribute link
    // let newCopyTrigger = this.boxHelper.headingWrap({
    //     "headingText" : `+ Clone Attribute(s)`,
    //     "descriptionText" : "",
    //     "level": 3,
    //     "collapsed": false
    //   });
    const newCopyTrigger = document.createElement("a");
    newCopyTrigger.setAttribute("class", "py-2 my-2 clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2");

    const addPlus = document.createElement("span");
    addPlus.setAttribute("class", "add-new__icon d-flex flex-items-center flex-justify-center text-white circle");
    addPlus.appendChild(document.createTextNode("+"));

    const addText = document.createElement("span");
    addText.setAttribute("class", "px-3");
    addText.appendChild(document.createTextNode(" Clone Existing"));

    newCopyTrigger.appendChild(addPlus);
    newCopyTrigger.appendChild(addText);
    
    newCopyTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      this._getCloneModal();    
    });

    return newCopyTrigger;
  }

  _getCloneModal(){
    this.loading.showSpinner();
    let typesData = new ProjectTypesData(this.projectId);

    typesData._getAttributeDataByType().then((attributeDataByType) => {
      console.log("did it come back from typesData ok? ");
      console.log(attributeDataByType);
      
      const clone = new AttributesClone( attributeDataByType );
      const cloneForm = clone._init();
      const cloneSave = this.inputHelper.saveButton();
      
      cloneSave.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedData = clone.getInputData();
        console.log(selectedData);
        
        let cloneData = new AttributesData({
          projectId: this.projectId,
          typeId: this.fromId,
          typeName: this.typeName,
          selectedData
        });
        return cloneData.createClones().then((r) => {
          this.dispatchEvent(this.refreshTypeEvent);
          this.boxHelper._modalComplete(r)
        });               
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
    let attrForm = document.createElement("attributes-form");

    // create form and attach to the el
    attrForm._getFormWithValues(attributes);
    attrForm.form.setAttribute("class", "attribute-form px-4");
    attrForm.setAttribute("data-old-name", attributes.name);
    attrForm.id = `${formId}_${this.fromId}`;
    attrForm.form.data = attributes; // @TODO how is this used?
    //attrForm.hidden = true;

    this.attrForms.push(attrForm);
    
    // form class listener
    attrForm.addEventListener("change", () => {
      this.hasChanges = true;
    });

    // create box with heading for this form
    let boxOnPage = this.boxHelper.boxWrapDefault( {
      "children" : attributeCurrent,
      "level":2
    } );

    let hiddenInnerBox = document.createElement("div");
    hiddenInnerBox.appendChild(attrForm);
    hiddenInnerBox.appendChild(this.deleteAttr(attributes.name));
    hiddenInnerBox.hidden = true;
    boxOnPage.appendChild(hiddenInnerBox);

    // add listener
    attributeCurrent.addEventListener("click", (e) => {
      e.preventDefault();
      this._toggleAttributes(hiddenInnerBox);
      this._toggleChevron(e);
    });

    return boxOnPage;
  }

  deleteAttr(name){
    let button = document.createElement("button");
    button.setAttribute("class", "btn btn-small btn-charcoal float-right btn-outline text-gray");
    button.style.marginRight = "10px";

    let deleteText = document.createTextNode(`Delete`);
    button.appendChild( deleteText );

    let descriptionText = `Delete ${name} from this ${this.typeName} and all its data?`;
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "clearfix py-6");

    let heading = document.createElement("div");
    heading.setAttribute("class", "py-md-5 float-left col-md-5 col-sm-5 text-right");
    
    heading.appendChild( button );
        
    let description = document.createElement("div");
    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.setAttribute("class", "py-md-6 f1 text-gray float-left col-md-7 col-sm-7");
    description.appendChild( _descriptionText );
    
    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    this.deleteBox = this.boxHelper.boxWrapDelete( {
      "children" : headingDiv
    } );

    this.deleteBox.style.backgroundColor = "transparent";

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteAttrConfirm(name);
    });

    return this.deleteBox;
  }

  _deleteAttrConfirm(name){
    let button = document.createElement("button");
    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold")

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteAttrType(name);
    });

    this.boxHelper._modalConfirm({
      "titleText" : `Delete Confirmation`,
      "mainText" : `Pressing confirm will delete attribute "${name}". Do you want to continue?`,
      "buttonSave" : button,
      "scroll" : false    
    });
  }

  _deleteAttrType(name){
    this.modal._closeCallback();;
    this.loading.showSpinner();

    let deleteAttribute = new AttributesDelete({
      "type" : this.typeName,
      "typeId" : this.fromId,
      "attributeName" : name
    });
  
    if(name != "undefined"){
      deleteAttribute.deleteFetch().then((data) => {
        this.loading.hideSpinner();
        this.dispatchEvent(this.refreshTypeEvent);
        return this.boxHelper._modalComplete(data.message);
      }).catch((err) => {
        console.error(err);
        this.loading.hideSpinner();
        return this.boxHelper._modalError("Error with delete.");
      });
    } else {
      this.loading.hideSpinner();
      return this.boxHelper._modalError("Error with delete.");
    }

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
