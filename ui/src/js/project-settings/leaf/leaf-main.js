import { getCookie } from "../../util/get-cookie.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { SettingsBox } from "../settings-box-helpers.js";
import { ProjectTypesData } from "../data/data-project-types.js";
import { LeafClone } from "./leaf-clone.js";
import { LeafData } from "../data/data-leaves-clone.js";
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

    this._leaves = [];
    this._leafBoxes = new Map();

    this.leafForms = [];
    this.hasChanges = false;
  }

  resetChanges(){
    this.hasChanges = false;
  }

  async _init({typeName, fromId, fromName, projectId, attributeTypes, modal, projectName, type}){
    // Init object global vars
    this.fromId = fromId;
    this.fromName = fromName;
    this.typeName = typeName;
    this.typeId = fromId;
    this.projectId = projectId;
    this.modal = modal;
    this.projectNameClean = String(projectName).replace(/[^a-z0-9]/gi, '').replace(" ", "_");
    this.attributeTypes = attributeTypes;

    // add main div
    if (this.leafDiv) this.leafDiv.remove();
    this.leafDiv = document.createElement("div");
    this.leafDiv.setAttribute("class", "px-6")
    this.appendChild(this.leafDiv);
    this.appendChild(this.loadingImg);

    // Required helpers.
    this.boxHelper = new SettingsBox( modal );
    this.refreshTypeEvent = new Event('settings-refresh');

    // Section h1.
    this._h2 = document.createElement("h2");
    this._h2.setAttribute("class", "h3 pb-3 edit-project__h1 text-normal text-gray");
    const t = document.createTextNode(`Leaves (TypeId: ${this.fromId})`); 
    this._h2.appendChild(t);
    this.leafDiv.appendChild(this._h2);

    // Create a styled box & Add box to page
    this.leafBox = this.boxHelper.boxWrapDefault( {"children" : ""} );
    this.leafDiv.appendChild(this.leafBox);

    const leaves = await fetch(`/rest/Leaves/${this.projectId}?type=${this.fromId}`)
    const data = await leaves.json();

    // Add the form and +Add links
    this._leaves = data;
    this.leafBox.appendChild( this._getLeavesSection(data) );
    this.leafBox.appendChild( this._getNewLeavesTrigger() );
    // this.leafBox.appendChild( this._getCopyLeavesTrigger() );    

    return this.leafDiv;
  }

  _getLeavesSection(leaves = []){
    let leavesSection = document.createElement("div");
    // leavesSection.setAttribute("class", "d-flex");

    if(leaves && leaves.length > 0){
      const heading = document.createElement("h3");
      heading.setAttribute("class", "f1 text-gray pb-3");
  
      const addText = document.createElement("span");
      addText.setAttribute("class", "");
      addText.appendChild(document.createTextNode(`${leaves.length} Leaves`));
      heading.appendChild(addText);
      leavesSection.appendChild(heading);

      let leafList = document.createElement("div");
      leafList.setAttribute("class", `leaves-edit--list`);
      leavesSection.appendChild(leafList);

      // re-arrange order and set indent depth
      this._parents = new Map();
      this._levels = new Map();
      this._outputOrder = [];
      for (let i in leaves) {       
        const indent = leaves[i]["path"].split(".").length - 2;
        leaves[i].indent = indent;

        // Group parent + child relationships
        if (leaves[i].parent) {
          if (this._parents.has(leaves[i].parent)) {
            const array = this._parents.get(leaves[i].parent);
            array.push(leaves[i]);
            this._parents.set(leaves[i].parent, array);
          } else {
            this._parents.set(leaves[i].parent, [leaves[i]]);
          }
        }

        // Group level relationships (set up highest levels first)
        if (this._levels.get(indent)) {
          const array = this._levels.get(indent);
          array.push(leaves[i]);
          this._levels.set(indent, array);
        } else {
          this._levels.set(indent, [leaves[i]]);
        }
      }

      for (const item of this._levels.get(0)) {
        this._outputOrder = [...this._outputOrder, ...this._recursiveChildren(item)];
      }
      this._leaves = this._outputOrder;

      //
      const highestLevel = this._levels.size - 1;

      // Loop through and output leaf forms
      for (let a in this._outputOrder) {
        this._outputOrder[a].expands = (this._outputOrder[a].indent == highestLevel || !this._parents.has(this._outputOrder[a].id)) ? false : true;

        let leafContent = this.leavesOutput({
          leaves : leaves,
          leaf : this._outputOrder[a],
          leafId : a
        });

        leafList.appendChild( leafContent );
      }
    }

    return leavesSection;
  }

  _recursiveChildren(item, carryOver = []) {
    // get the children
    let newArray = [...carryOver];
    newArray.push(item);

    if (this._parents.has(item.id)) {
      let childrenList = this._parents.get(item.id);
      for (let innerChild of childrenList) {
        newArray = this._recursiveChildren(innerChild, newArray);
      }    
    }
    
    return newArray;
  }

  // Add Leaf
  _getNewLeavesTrigger(){
    // New leaf link
    const newLeafTrigger = document.createElement("a");
    newLeafTrigger.setAttribute("class", "py-2 mt-6 clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2");

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

      console.log(this.modal);
      afObj.form._parentLeaf.permission = "Can Edit";

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
    form._initEmptyForm(this._leaves, this.projectNameClean, this.attributeTypes);
    form.fromType = this.typeId;

    let submitLeaf = document.createElement("input");
    submitLeaf.setAttribute("type", "submit");
    submitLeaf.setAttribute("value", "Save");
    submitLeaf.setAttribute("class", `btn btn-clear f1 text-semibold`);

    return {form, submitLeaf};
  }

  _postLeaf(formObj){
    this.modal._closeCallback();
    this.loading.showSpinner();
    let formJSON = formObj._getLeafFormData();
    console.log(formJSON);
    let attr = { ...formJSON.attributes };
    
    for (let key in formJSON) {
      console.log(key);
      formJSON[key] = formJSON[key];
    }

    delete formJSON["attributes"];

    let status = 0;
    this._fetchPostPromise({"formData" : [formJSON]})
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
  _getCopyLeavesTrigger(){
    // New leaf link
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

  _toggleLeaves(el){
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  _toggleChevron(e){
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  leavesOutput({
    leaves = [],
      leaf = {},
    leafId = undefined
  } = {}){
   

    const minusIcon = document.createElement("span");
    minusIcon.setAttribute("class", "text-gray leaves-minus py-1");
    minusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=""><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    minusIcon.hidden = true;

    const addIcon = document.createElement("span");
    addIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=""><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    addIcon.setAttribute("class", "text-gray leaves-plus py-1");
    addIcon.hidden = true;

    const innerLeafBox = document.createElement("div");
    innerLeafBox.setAttribute("class", "leaves-edit py-3 d-flex flex-row f1 flex-items-center");
    innerLeafBox.style.borderBottom = "1px solid rgba(255,255,255,.4)";
    this.leafBox.appendChild(innerLeafBox);

    const leafIndent = document.createElement("span");
    leafIndent.setAttribute("class","d-flex flex-align-center");
    if (leaf.indent > 0) {
      leafIndent.setAttribute("style", `padding-left: ${(leaf.indent) * 30}px;`);
      // leafIndent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill text-gray"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>`;
      leafIndent.innerHTML = `&nbsp;`;
      minusIcon.hidden = true;
      innerLeafBox.classList.add("hidden");
    } else {
      addIcon.hidden = false;
    }

    const leafName = document.createElement("span");
    leafName.setAttribute("class", "py-2 px-2");
    const leafNameText = document.createTextNode(leaf.name);
    leafName.appendChild(leafNameText);
    // const expander = leaf.expands ? `${addIcon.outerHTML}${minusIcon.outerHTML}` : "";
    // leafIndent.innerHTML += ` ${leaf.name} ${expander}`;

    if (leaf.expands) {
      leafIndent.appendChild(minusIcon);
      leafIndent.appendChild(addIcon);
    }
    leafIndent.appendChild(leafName);

    const leafCurrent = document.createElement("div");
    leafCurrent.appendChild(leafIndent);
    leafCurrent.setAttribute("class", "col-12 px-3");
    if (leaf.expands) leafCurrent.classList.add("clickable");
    innerLeafBox.appendChild(leafCurrent);

    const editIcon = document.createElement("div");
    editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editIcon.setAttribute("title", `Edit ${leaf.name}`);
    editIcon.setAttribute("class", "clickable text-gray hover-text-white py-2 px-2");
    innerLeafBox.appendChild(editIcon);

    const deleteIcon = document.createElement("delete-button");
    deleteIcon.innerHTML = `<svg id="icon-trash" viewBox="0 0 24 24" height="24" width="24" stroke-width="1"><path d="M18 7v13c0 0.137-0.027 0.266-0.075 0.382-0.050 0.122-0.125 0.232-0.218 0.325s-0.203 0.167-0.325 0.218c-0.116 0.048-0.245 0.075-0.382 0.075h-10c-0.137 0-0.266-0.027-0.382-0.075-0.122-0.050-0.232-0.125-0.325-0.218s-0.167-0.203-0.218-0.325c-0.048-0.116-0.075-0.245-0.075-0.382v-13zM17 5v-1c0-0.405-0.081-0.793-0.228-1.148-0.152-0.368-0.375-0.698-0.651-0.974s-0.606-0.499-0.974-0.651c-0.354-0.146-0.742-0.227-1.147-0.227h-4c-0.405 0-0.793 0.081-1.148 0.228-0.367 0.152-0.697 0.375-0.973 0.651s-0.499 0.606-0.651 0.973c-0.147 0.355-0.228 0.743-0.228 1.148v1h-4c-0.552 0-1 0.448-1 1s0.448 1 1 1h1v13c0 0.405 0.081 0.793 0.228 1.148 0.152 0.368 0.375 0.698 0.651 0.974s0.606 0.499 0.974 0.651c0.354 0.146 0.742 0.227 1.147 0.227h10c0.405 0 0.793-0.081 1.148-0.228 0.368-0.152 0.698-0.375 0.974-0.651s0.499-0.606 0.651-0.974c0.146-0.354 0.227-0.742 0.227-1.147v-13h1c0.552 0 1-0.448 1-1s-0.448-1-1-1zM9 5v-1c0-0.137 0.027-0.266 0.075-0.382 0.050-0.122 0.125-0.232 0.218-0.325s0.203-0.167 0.325-0.218c0.116-0.048 0.245-0.075 0.382-0.075h4c0.137 0 0.266 0.027 0.382 0.075 0.122 0.050 0.232 0.125 0.325 0.218s0.167 0.203 0.218 0.325c0.048 0.116 0.075 0.245 0.075 0.382v1z"></path></svg>`;
    deleteIcon.setAttribute("title", `Delete ${leaf.name}`);
    deleteIcon.setAttribute("class", "clickable text-gray hover-text-white py-2 px-2");
    innerLeafBox.appendChild(deleteIcon);

    if (leaf.expands) {
      leafCurrent.addEventListener("click", () => {
        minusIcon.hidden = !minusIcon.hidden;
        addIcon.hidden = !addIcon.hidden;
        const children = this._parents.get(leaf.id);

        for (let c of children) {
          if (addIcon.hidden) {
            this._recursiveUnhide(c.id);
          } else {
            this._recursiveHide(c.id);
          }
        }
      }); 
    }

    editIcon.addEventListener("click", () => {
      this._launchEdit(leaves, leaf);
    });


    deleteIcon.addEventListener("click", () => {
      this._deleteLeafConfirm(leaf.id, leaf.name);
    });

    this._leafBoxes.set(leaf.id, innerLeafBox);

    return innerLeafBox;
  }

  _expandChildren() {
    console.log("_expandChildren");
  }

  _recursiveHide(id) {
    const item = this._leafBoxes.get(id);
    item.classList.add("hidden");
    
    if (this._parents.has(id)) {
      let childrenList = this._parents.get(id);
      for (let innerChild of childrenList) {
        this._recursiveHide(innerChild.id);
      }    
    } 
  }

  _recursiveUnhide(id) {
    const item = this._leafBoxes.get(id);
    item.classList.remove("hidden");
    if (item.querySelector(".leaves-plus")) {
      const plus = item.querySelector(".leaves-plus");
      plus.hidden = true;
      
      const minus = item.querySelector(".leaves-minus");
      minus.hidden = false;
    }
    
    if (this._parents.has(id)) {
      let childrenList = this._parents.get(id);
      for (let innerChild of childrenList) {
        this._recursiveUnhide(innerChild.id);
      }    
    }
  }

  _launchEdit(leaves, leaf) {
    // Avoid special name default in var later on
    leaf._default = leaf.default;
    let formId = leaf.name.replace(/[^\w]|_/g, "").toLowerCase();

    // Fields for this form
    let leafForm = document.createElement("leaf-form");
    leafForm.fromType = this.typeId;

    // create form and attach to the el
    leafForm._getFormWithValues(leaves, leaf, this.attributeTypes);
    leafForm.form.setAttribute("class", "leaf-form px-4");
    leafForm.setAttribute("data-old-name", leaf.name);
    leafForm.setAttribute("leafid", leaf.id);
    leafForm.id = `${formId}_${this.fromId}`;
    leafForm.form.data = leaf; // @TODO how is this used?
    // leafForm.hidden = true;

    let leafSave = document.createElement("input");
    leafSave.setAttribute("type", "submit");
    leafSave.setAttribute("value", "Save");
    leafSave.setAttribute("class", `btn btn-clear f1 text-semibold`);
    
    leafSave.addEventListener("click", (e) => {
      e.preventDefault();
      const leafFormData = leafForm._leafFormData({ entityType: this.typeName, id: this.fromId });
      
      return this._fetchLeafPatchPromise(this.fromId, leafFormData);               
    });

    // form export class listener
    // leafForm.addEventListener("change", () => {
    //   this.hasChanges = true;
    // });

    // this.leafForms.push(leafForm);
    this.boxHelper._modalConfirm({
      "titleText" : `Edit Leaf (ID ${leaf.id})`,
      "mainText" : leafForm,
      "buttonSave" : leafSave,
      "scroll" : true
    });
    this.modal._div.classList.add("modal-wide");
  }

  /**
   * Deprecated..... 
   */
  deleteLeaf(id, name){
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
      this._deleteLeafConfirm(id, name);
    });

    return this.deleteBox;
  }

  _deleteLeafConfirm(id, name){
    let button = document.createElement("button");
    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold")

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteLeaf(id);
    });

    this.boxHelper._modalConfirm({
      "titleText" : `Delete Confirmation`,
      "mainText" : `Pressing confirm will delete leaf "${name}". Do you want to continue?`,
      "buttonSave" : button,
      "scroll" : false    
    });
  }

  _deleteLeaf(id){
    this.modal._closeCallback();;
    this.loading.showSpinner();

    let deleteLeaf = new LeafDelete({
      "leafId" : id
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
    if(formData != null){
      return fetch(`/rest/Leaves/${this.projectId}`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: [JSON.stringify(formData)]
      });
    } else {
      console.error("Problem with new leaf form data.");
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
    // This was carried over from leaf which use the media type, not own ID
    const leafId = parentTypeId;

    promise = promise.then(() => {
      return fetch("/rest/Leaf/" + dataObject.id, {
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
          //console.log("Return Message - It's a 400 response for leaf form.");
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
      return console.error("Problem patching leaf...", err);
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
