import { getCookie } from "../../util/get-cookie.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { SettingsBox } from "../settings-box-helpers.js";
import { ProjectTypesData } from "../data/data-project-types.js";
import { LeafClone } from "./leaf-clone.js";
import { LeafData } from "../data/data-leafs-clone.js";
import { LeafDelete } from "./leaf-delete.js";

/**
 * Main Leaf section for type forms
 * 
 * Note: This is NOT a tatorElement
 * - It is basic HTMLElement so it does not inherit _shadow, etc.
 * - This allows access to inner components from type form, or a parent shadow dom
 * - Custom El cannot have children in constructor which is why main div defined in "_init"
 * 
 */
export class LeafMain extends HTMLElement {
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

  _init(typeName, fromId, fromName, projectId, data, modal, projectName){
    //console.log(typeName.toLowerCase() + `__${this.tagName} init.`);
    console.log("projectName"+projectName);

    // Init object global vars
    this.fromId = fromId;
    this.fromName = fromName;
    this.typeName = typeName;
    this.typeId = fromId;
    this.projectId = projectId;
    this.modal = modal;
    this.projectNameClean = String(projectName).replace(/[^a-z0-9]/gi, '').replace(" ", "_");

    // add main div
    this.leafDiv = document.createElement("div");
    this.appendChild(this.leafDiv);
    this.appendChild(this.loadingImg);

    // Required helpers.
    this.boxHelper = new SettingsBox( this.modal );
    this.refreshTypeEvent = new Event('settings-refresh');

    // Section h1.
    this._h2 = document.createElement("h2");
    this._h2.setAttribute("class", "h3 pb-3 edit-project__h1 text-normal text-gray");
    const t = document.createTextNode(`Leafs`); 
    this._h2.appendChild(t);
    this.leafDiv.appendChild(this._h2);

    // Create a styled box & Add box to page
    this.leafBox = this.boxHelper.boxWrapDefault( {"children" : ""} );
    this.leafDiv.appendChild(this.leafBox);

 

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
    this.leafBox.appendChild( this._getLeafsSection(data) );
    this.leafBox.appendChild( this._getNewLeafsTrigger() );
    this.leafBox.appendChild( this._getCopyLeafsTrigger() );    

    return this.leafDiv;
  }

  _getLeafsSection(leafTypes = []){
    let leafsSection = document.createElement("div");

    if(leafTypes && leafTypes.length > 0){
      // Leafs list main heading and trigger
      // let heading = this.boxHelper.headingWrap({
      //     "headingText" : `Edit Leafs (${leafTypes.length})`,
      //     "descriptionText" : "Edit media type.",
      //     "level": 2,
      //     "collapsed": true
      //   });
      // heading.setAttribute("class", `py-4 toggle-leaf text-semibold`);

      const heading = document.createElement("h3");
      heading.setAttribute("class", "f1 text-gray pb-3");
  
      // const addPlus = document.createElement("span");
      // addPlus.setAttribute("class", "add-new__icon d-flex flex-items-center flex-justify-center text-white circle");
      // const editSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>`;
      // addPlus.innerHTML = editSvg;
  
      const addText = document.createElement("span");
      addText.setAttribute("class", "");
      addText.appendChild(document.createTextNode(` Edit Leafs (${leafTypes.length})`));
  
      // heading.appendChild(addPlus);
      heading.appendChild(addText);

      leafsSection.appendChild(heading);

      let leafList = document.createElement("div");
      leafList.setAttribute("class", `leafs-edit--list`);
      leafsSection.appendChild(leafList);

      // Loop through and output leaf forms
      for(let a in leafTypes){
        let leafContent = this.leafsOutput( {
          "leafs": leafTypes[a],
          "leafId": a
        });
        leafList.appendChild( leafContent );
      }
    }

    return leafsSection;
  }


  // Add Leaf
  _getNewLeafsTrigger(){
    // New leaf link
    // let newLeafTrigger = this.boxHelper.headingWrap({
    //     "headingText" : `+ New Leaf`,
    //     "descriptionText" : "",
    //     "level": 3,
    //     "collapsed": false
    // });
    const newLeafTrigger = document.createElement("a");
    newLeafTrigger.setAttribute("class", "py-2 my-2 clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2");

    const addPlus = document.createElement("span");
    addPlus.setAttribute("class", "add-new__icon d-flex flex-items-center flex-justify-center text-white circle");
    addPlus.appendChild(document.createTextNode("+"));

    const addText = document.createElement("span");
    addText.setAttribute("class", "px-3");
    addText.appendChild(document.createTextNode(" New Leaf"));

    newLeafTrigger.appendChild(addPlus);
    newLeafTrigger.appendChild(addText);

    newLeafTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      let afObj = this._getAddForm();

      afObj.submitLeaf.addEventListener("click", (e) => {
        e.preventDefault();
  
        this._postLeaf( afObj.form );
      });

      this.boxHelper._modalConfirm({
        "titleText" : "New Leaf",
        "mainText" : afObj.form.form,
        "buttonSave" : afObj.submitLeaf,
        "scroll" : true
      });
      this.modal._div.classList.add("modal-wide");
      this.setAttribute("has-open-modal", "");
    });

    return newLeafTrigger;
  }

  _getAddForm(){
    let form = document.createElement("leaf-form");
    form._initEmptyForm();

    let submitLeaf = document.createElement("input");
    submitLeaf.setAttribute("type", "submit");
    submitLeaf.setAttribute("value", "Save");
    submitLeaf.setAttribute("class", `btn btn-clear f1 text-semibold`);

    return {form, submitLeaf};
  }

  _postLeaf(formObj){
    this.modal._closeCallback();
    this.loading.showSpinner();
    let formJSON = {
      "entity_type": this.typeName,
      "addition": formObj._getLeafFormData()
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

  // Clone Leaf
  _getCopyLeafsTrigger(){
    // New leaf link
    // let newCopyTrigger = this.boxHelper.headingWrap({
    //     "headingText" : `+ Clone Leaf(s)`,
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

    typesData._getLeafDataByType().then((leafDataByType) => {
      // console.log("did it come back from typesData ok? ");
      // console.log(leafDataByType);
      
      const clone = new LeafClone( leafDataByType );
      const cloneForm = clone._init();

      const cloneSave = document.createElement("input");
      cloneSave.setAttribute("type", "submit");
      cloneSave.setAttribute("value", "Save");
      cloneSave.setAttribute("class", `btn btn-clear f1 text-semibold`);
      
      cloneSave.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedData = clone.getInputData();
        //console.log(selectedData);
        
        let cloneData = new LeafData({
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
        "titleText" : "Clone Leaf(s)",
        "mainText" : cloneForm,
        "buttonSave" : cloneSave,
        "scroll" : true
      });
    }).catch((error) => {
      this.loading.hideSpinner();
      this.boxHelper._modalError(`Error: ${error}`);
    });
    
  }

  _toggleLeafs(el){
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  _toggleChevron(e){
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  leafsOutput({
    leafs = [],
    leafId = undefined
  } = {}){
    // let leafCurrent = this.boxHelper.headingWrap({
    //   "headingText" : `${leafs.name}`,
    //   "descriptionText" : "Edit leaf.",
    //   "level":3,
    //   "collapsed":true
    // });
    let innerLeafBox = document.createElement("div");
    innerLeafBox.setAttribute("class", "leafs-edit flex-items-center rounded-2 d-flex flex-row");
    this.leafBox.appendChild(innerLeafBox);

    let leafCurrent = document.createElement("div");
    leafCurrent.textContent = leafs.name;
    leafCurrent.setAttribute("class", "css-truncate col-10 px-3 clickable");
    innerLeafBox.appendChild(leafCurrent);

    let editIcon = document.createElement("div");
    editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editIcon.setAttribute("class", "clickable text-gray hover-text-white py-2 px-2");
    innerLeafBox.appendChild(editIcon);

    let deleteIcon = document.createElement("delete-button");
    // deleteIcon.textContent = "[D]";
    deleteIcon.setAttribute("class", "clickable");
    innerLeafBox.appendChild(deleteIcon);

    // editIcon.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // deleteIcon.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // leafCurrent.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // leafCurrent.addEventListener("mouseleave", ()=>{
    //   editIcon.classList.add("hidden");
    //   deleteIcon.classList.add("hidden");
    // });

    leafCurrent.addEventListener("click", () => {
      this._launchEdit(leafs);
    });

    editIcon.addEventListener("click", () => {
      this._launchEdit(leafs);
    });


    deleteIcon.addEventListener("click", () => {
      this._deleteAttrConfirm(leafs.name);
    });


    // create box with heading for this form
    // let boxOnPage = this.boxHelper.boxWrapDefault( {
    //   "children" : leafCurrent,
    //   "level":2
    // } );

    // let hiddenInnerBox = document.createElement("div");
    // hiddenInnerBox.appendChild(attrForm);
    // hiddenInnerBox.appendChild(this.deleteAttr(leafs.name));
    // hiddenInnerBox.hidden = true;
    // boxOnPage.appendChild(hiddenInnerBox);

    // // add listener
    // leafCurrent.addEventListener("click", (e) => {
    //   e.preventDefault();
    //   this._toggleLeafs(hiddenInnerBox);
    //   this._toggleChevron(e);
    // });

    // return boxOnPage;
    return innerLeafBox;
  }

  _launchEdit(leafs) {
    // Avoid special name default in var later on
    leafs._default = leafs.default;
    let formId = leafs.name.replace(/[^\w]|_/g, "").toLowerCase();

    // Fields for this form
    let attrForm = document.createElement("leafs-form");

    // create form and attach to the el
    attrForm._getFormWithValues(leafs);
    attrForm.form.setAttribute("class", "leaf-form px-4");
    attrForm.setAttribute("data-old-name", leafs.name);
    attrForm.id = `${formId}_${this.fromId}`;
    attrForm.form.data = leafs; // @TODO how is this used?
    // attrForm.hidden = true;

    let attrSave = document.createElement("input");
    attrSave.setAttribute("type", "submit");
    attrSave.setAttribute("value", "Save");
    attrSave.setAttribute("class", `btn btn-clear f1 text-semibold`);
    
    attrSave.addEventListener("click", (e) => {
      e.preventDefault();
      const leafFormData = attrForm._leafFormData({ entityType: this.typeName, id: this.fromId });

      
      return this._fetchLeafPatchPromise(this.fromId, leafFormData);               
    });

    // form export class listener
    // attrForm.addEventListener("change", () => {
    //   this.hasChanges = true;
    // });

    // this.attrForms.push(attrForm);
    this.boxHelper._modalConfirm({
      "titleText" : "Edit Leaf",
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
      "mainText" : `Pressing confirm will delete leaf "${name}". Do you want to continue?`,
      "buttonSave" : button,
      "scroll" : false    
    });
  }

  _deleteAttrType(name){
    this.modal._closeCallback();;
    this.loading.showSpinner();

    let deleteLeaf = new LeafDelete({
      "type" : this.typeName,
      "typeId" : this.fromId,
      "leafName" : name
    });
  
    if(name != "undefined"){
      deleteLeaf.deleteFetch().then((data) => {
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
    console.log("Leaf Form Post Fetch");

    if(formData != null){
      return fetch("/rest/Leaves/"+this.fromId, {
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
      console.log("Problem with new leaf form data.");
    }
  }

  _fetchLeafPatchPromise(parentTypeId, dataObject, global = false) {
    let promise = Promise.resolve();
    this.successMessages = "";
    this.failedMessages = "";
    this.confirmMessages = "";
    this.saveModalMessage = "";
    this.requiresConfirmation = false;
    let formData = dataObject.formData;
    let leafNewName = dataObject.newName;
    let leafOldName = dataObject.oldName;

    if (global === "true") {
      formData.global = "true";
    }
    // TODO - need to get leaf ID
    // This was carried over from attr which use the media type, not own ID
    const leafId = parentTypeId;

    promise = promise.then(() => {
      return fetch("/rest/Leaves/" + this.projectId, {
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
          let input = `<input type="checkbox" checked name="global" data-old-name="${leafOldName}" class="checkbox"/>`;
          let newNameText = (leafOldName == leafNewName) ? "" : ` new name "${leafNewName}"`
          this.confirmMessages += `<div class="py-2">${input} Leaf "${leafOldName}" ${newNameText}</div>`
          this.requiresConfirmation = true;
        } else {
          iconWrap.appendChild(warningIcon);
          //console.log("Return Message - It's a 400 response for main form.");
          // this.failedMessages += `<div class="py-2"><span class="v-align-top">${currentMessage}</span></div>`;
          this.failedMessages += `<div class="py-4">${iconWrap.innerHTML} <span class="v-align-top">Changes editing ${leafOldName} not saved.</span></div> <div class="f1">Error: ${currentMessage}</div>`
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
      return this._fetchLeafPatchPromise(this.typeId, formData, "true");
    });

    return buttonSave;
  }
}

customElements.define("leaf-main", LeafMain);
