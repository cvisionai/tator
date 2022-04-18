import { getCookie } from "../../util/get-cookie.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { SettingsBox } from "../settings-box-helpers.js";
import { ProjectTypesData } from "../data/data-project-types.js";
import { AttributesClone } from "../attributes/attributes-clone.js";
import { AttributesData } from "../data/data-attributes-clone.js";

/**
 * Main Attribute section for type forms
 * 
 * Note: This is NOT a tatorElement
 * - It is basic HTMLElement so it does not inherit _shadow, etc.
 * - This allows access to inner components from type form, or a parent shadow dom
 * - Custom El cannot have children in constructor which is why main div defined in "_init"
 * 
 */
export class AttributesMain extends HTMLElement {
  constructor() {
    super();
    this.loading = new LoadingSpinner();
    this.loadingImg = this.loading.getImg();

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
    this.typeId = fromId;
    this.projectId = projectId;
    this.modal = modal;

    // add main div
    this.attributeDiv = document.createElement("div");
    this.appendChild(this.attributeDiv);
    this.appendChild(this.loadingImg);

    // Required helpers.
    this.boxHelper = new SettingsBox( this.modal );
    this.refreshTypeEvent = new Event('settings-refresh');

    // Section h1.
    this._h2 = document.createElement("h2");
    this._h2.setAttribute("class", "h3 pb-3 edit-project__h1 text-normal text-gray");
    const t = document.createTextNode(`Attributes`); 
    this._h2.appendChild(t);
    this.attributeDiv.appendChild(this._h2);

    // Create a styled box & Add box to page
    this.attributeBox = this.boxHelper.boxWrapDefault( {"children" : ""} );
    this.attributeDiv.appendChild(this.attributeBox);

 

    // this.separate_span = document.createElement("span");
    // this.separate_span.setAttribute("class", "px-2");
    // h2.appendChild(this.separate_span);
    // const h2_separate_span = document.createTextNode(`|`);
    // this.separate_span.appendChild(h2_separate_span);

    // const span = document.createElement("span");
    // span.setAttribute("class", "text-gray text-normal")
    // span.appendChild( document.createTextNode(`${this.fromName}`) );
    // h2.appendChild(span);

    // this.separate_span2 = document.createElement("span");
    // this.separate_span2.setAttribute("class", "px-2 text-gray text-normal");
    // h2.appendChild(this.separate_span2);
    // const h2_separate_span2 = document.createTextNode(`|`);
    // this.separate_span2.appendChild(h2_separate_span2);

    // const span2 = document.createElement("span");
    // span2.setAttribute("class", "text-gray text-normal")
    // span2.appendChild( document.createTextNode(`${this.typeName} (ID ${this.fromId})`) );
    // h2.appendChild(span2);

    


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
      // let heading = this.boxHelper.headingWrap({
      //     "headingText" : `Edit Attributes (${attributeTypes.length})`,
      //     "descriptionText" : "Edit media type.",
      //     "level": 2,
      //     "collapsed": true
      //   });
      // heading.setAttribute("class", `py-4 toggle-attribute text-semibold`);

      const heading = document.createElement("h3");
      heading.setAttribute("class", "f1 text-gray pb-3");
  
      // const addPlus = document.createElement("span");
      // addPlus.setAttribute("class", "add-new__icon d-flex flex-items-center flex-justify-center text-white circle");
      // const editSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>`;
      // addPlus.innerHTML = editSvg;
  
      const addText = document.createElement("span");
      addText.setAttribute("class", "");
      addText.appendChild(document.createTextNode(` Edit Attributes (${attributeTypes.length})`));
  
      // heading.appendChild(addPlus);
      heading.appendChild(addText);

      attributesSection.appendChild(heading);

      let attributeList = document.createElement("div");
      attributeList.setAttribute("class", `attributes-edit--list`);
      attributesSection.appendChild(attributeList);

      // Loop through and output attribute forms
      for(let a in attributeTypes){
        let attributeContent = this.attributesOutput( {
          "attributes": attributeTypes[a],
          "attributeId": a
        });
        attributeList.appendChild( attributeContent );
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
      this.modal._div.classList.add("modal-wide");
      this.setAttribute("has-open-modal", "");
    });

    return newAttributeTrigger;
  }

  _getAddForm(){
    let attrForm = document.createElement("attributes-form");
    attrForm._initEmptyForm();

    let submitAttribute = document.createElement("input");
    submitAttribute.setAttribute("type", "submit");
    submitAttribute.setAttribute("value", "Save");
    submitAttribute.setAttribute("class", `btn btn-clear f1 text-semibold`);

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
      // console.log("did it come back from typesData ok? ");
      // console.log(attributeDataByType);
      
      const clone = new AttributesClone( attributeDataByType );
      const cloneForm = clone._init();

      const cloneSave = document.createElement("input");
      cloneSave.setAttribute("type", "submit");
      cloneSave.setAttribute("value", "Save");
      cloneSave.setAttribute("class", `btn btn-clear f1 text-semibold`);
      
      cloneSave.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedData = clone.getInputData();
        //console.log(selectedData);
        
        let cloneData = new AttributesData({
          projectId: this.projectId,
          typeId: this.fromId,
          typeName: this.typeName,
          selectedData
        });
        return cloneData.createClones().then((r) => {
          this.dispatchEvent(this.refreshTypeEvent);
          this.boxHelper._modalComplete(r);
        });               
      });

      this.loading.hideSpinner();
      this.boxHelper.modal._div.classList.add("modal-wide");
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
    // let attributeCurrent = this.boxHelper.headingWrap({
    //   "headingText" : `${attributes.name}`,
    //   "descriptionText" : "Edit attribute.",
    //   "level":3,
    //   "collapsed":true
    // });
    let innerAttributeBox = document.createElement("div");
    innerAttributeBox.setAttribute("class", "attributes-edit flex-items-center rounded-2 d-flex flex-row");
    this.attributeBox.appendChild(innerAttributeBox);

    let attributeCurrent = document.createElement("div");
    attributeCurrent.textContent = attributes.name;
    attributeCurrent.setAttribute("class", "css-truncate col-10 px-3 clickable");
    innerAttributeBox.appendChild(attributeCurrent);

    let editIcon = document.createElement("div");
    editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editIcon.setAttribute("class", "clickable text-gray hover-text-white py-2 px-2");
    innerAttributeBox.appendChild(editIcon);

    let deleteIcon = document.createElement("delete-button");
    // deleteIcon.textContent = "[D]";
    deleteIcon.setAttribute("class", "clickable");
    innerAttributeBox.appendChild(deleteIcon);

    // editIcon.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // deleteIcon.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // attributeCurrent.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // attributeCurrent.addEventListener("mouseleave", ()=>{
    //   editIcon.classList.add("hidden");
    //   deleteIcon.classList.add("hidden");
    // });

    attributeCurrent.addEventListener("click", () => {
      this._launchEdit(attributes);
    });

    editIcon.addEventListener("click", () => {
      this._launchEdit(attributes);
    });


    deleteIcon.addEventListener("click", () => {
      this._deleteAttrConfirm(attributes.name);
    });


    // create box with heading for this form
    // let boxOnPage = this.boxHelper.boxWrapDefault( {
    //   "children" : attributeCurrent,
    //   "level":2
    // } );

    // let hiddenInnerBox = document.createElement("div");
    // hiddenInnerBox.appendChild(attrForm);
    // hiddenInnerBox.appendChild(this.deleteAttr(attributes.name));
    // hiddenInnerBox.hidden = true;
    // boxOnPage.appendChild(hiddenInnerBox);

    // // add listener
    // attributeCurrent.addEventListener("click", (e) => {
    //   e.preventDefault();
    //   this._toggleAttributes(hiddenInnerBox);
    //   this._toggleChevron(e);
    // });

    // return boxOnPage;
    return innerAttributeBox;
  }

  _launchEdit(attributes) {
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
    // attrForm.hidden = true;

    let attrSave = document.createElement("input");
    attrSave.setAttribute("type", "submit");
    attrSave.setAttribute("value", "Save");
    attrSave.setAttribute("class", `btn btn-clear f1 text-semibold`);
    
    attrSave.addEventListener("click", (e) => {
      e.preventDefault();
      const attributeFormData = attrForm._attributeFormData({ entityType: this.typeName, id: this.fromId });

      
      return this._fetchAttributePatchPromise(this.fromId, attributeFormData);               
    });

    // form export class listener
    // attrForm.addEventListener("change", () => {
    //   this.hasChanges = true;
    // });

    // this.attrForms.push(attrForm);
    this.boxHelper._modalConfirm({
      "titleText" : "Edit Attribute",
      "mainText" : attrForm,
      "buttonSave" : attrSave,
      "scroll" : true
    });
    this.modal._div.classList.add("modal-wide");
  }

  /**
   * Deprecated..... 
   */
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
    console.log("Attribute Form Post Fetch");

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

  _fetchAttributePatchPromise(parentTypeId, dataObject, global = false) {
    let promise = Promise.resolve();
    this.successMessages = "";
    this.failedMessages = "";
    this.confirmMessages = "";
    this.saveModalMessage = "";
    this.requiresConfirmation = false;
    let formData = dataObject.formData;
    let attributeNewName = dataObject.newName;
    let attributeOldName = dataObject.oldName;

    if (global === "true") {
      formData.global = "true";
    }

    promise = promise.then(() => {
      return fetch("/rest/AttributeType/" + parentTypeId, {
        method: "PATCH",
        mode: "cors",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
    }).then(response => {
      return response.json().then(data => ({ response: response, data: data }));
    })
    .then(obj => {
      let currentMessage = obj.data.message;
      let response = obj.response;
      let succussIcon = document.createElement("modal-success");
      let iconWrap = document.createElement("span");
      let warningIcon = document.createElement("modal-warning");

      // console.log(`currentMessage::::: ${currentMessage}`);

      if (response.status == 200) {
        //console.log("Return Message - It's a 200 response.");
        iconWrap.appendChild(succussIcon);
        this.successMessages += `<div class="py-2">${iconWrap.innerHTML} <span class="v-align-top">${currentMessage}</span></div>`;
      } else if (response.status != 200) {
        if (currentMessage.indexOf("without the global flag set") > 0 && currentMessage.indexOf("ValidationError") < 0) {
          //console.log("Return Message - It's a 400 response for attr form.");
          let input = `<input type="checkbox" checked name="global" data-old-name="${attributeOldName}" class="checkbox"/>`;
          let newNameText = (attributeOldName == attributeNewName) ? "" : ` new name "${attributeNewName}"`
          this.confirmMessages += `<div class="py-2">${input} Attribute "${attributeOldName}" ${newNameText}</div>`
          this.requiresConfirmation = true;
        } else {
          iconWrap.appendChild(warningIcon);
          //console.log("Return Message - It's a 400 response for main form.");
          // this.failedMessages += `<div class="py-2"><span class="v-align-top">${currentMessage}</span></div>`;
          this.failedMessages += `<div class="py-4">${iconWrap.innerHTML} <span class="v-align-top">Changes editing ${attributeOldName} not saved.</span></div> <div class="f1">Error: ${currentMessage}</div>`
        }
      }
    }).then(() => {
      if (this.successMessages) {
        let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
        this.saveModalMessage += heading + this.successMessages;
      }
      if (this.failedMessages) {
        let heading = `<div class=" pt-4 h3 pt-4">Error</div>`;
        this.saveModalMessage += heading + this.failedMessages;
      }

      if (this.requiresConfirmation) {
        let buttonSave = this._getAttrGlobalTrigger(dataObject);
        let confirmHeading = `<div class=" pt-4 h3 pt-4">Global Change(s) Found</div>`
        let subText = `<div class="f1 py-2">Confirm to update across all types. Uncheck and confirm, or cancel to discard.</div>`

        let mainText = `${this.saveModalMessage}${confirmHeading}${subText}${this.confirmMessages}`;
        this.loading.hideSpinner();
        this.boxHelper._modalConfirm({
          "titleText": "Confirm Edit",
          mainText,
          buttonSave
        });
      } else {
        let mainText = `${this.saveModalMessage}`;
        
        this.boxHelper._modalComplete(
          mainText
        );
        // Reset forms to the saved data from model
        return this.dispatchEvent(this.refreshTypeEvent);
      }
    }).then(() => {
      this.loading.hideSpinner();
    }).catch(err => {
      return console.error("Problem patching attr...", err);
    });
      
    return promise;
  }

  _getAttrGlobalTrigger(formData) {
    let buttonSave = document.createElement("button")
    buttonSave.setAttribute("class", "btn btn-clear f1 text-semibold");
    buttonSave.innerHTML = "Confirm";

    buttonSave.addEventListener("click", (e) => {
      return this._fetchAttributePatchPromise(this.typeId, formData, "true");
    });

    return buttonSave;
  }
}

customElements.define("attributes-main", AttributesMain);
