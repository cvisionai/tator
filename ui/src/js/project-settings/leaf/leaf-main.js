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
    this._leavesMap = new Map();

    this.leafForms = [];
    this.hasChanges = false;

    this.movingEl = null;
  }

  resetChanges() {
    this.hasChanges = false;
  }

  async _init({ typeName, fromId, fromName, projectId, attributeTypes, modal, projectName, type }) {
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
    this.boxHelper = new SettingsBox(modal);
    this.refreshTypeEvent = new Event('settings-refresh');

    this.h1 = document.createElement("a");
    this.h1.setAttribute("href", `#itemDivId-LeafType-${this.fromId}`);
    this.h1.setAttribute("class", "h3 pb-3 edit-project__h1 clickable text-white");
    this.h1_name = document.createTextNode(`${this.fromName} `);
    this.h1.appendChild(this.h1_name);
    this.leafDiv.appendChild(this.h1);

    this.separate_span = document.createElement("span");
    this.separate_span.setAttribute("class", "px-2");
    this.h1.appendChild(this.separate_span);
    const h1_separate_span = document.createTextNode(`|`);
    this.separate_span.appendChild(h1_separate_span);

    this.type_span = document.createElement("span");
    this.type_span.setAttribute("class", "text-gray text-normal");
    this.h1.appendChild(this.type_span);
    const h1_type = document.createTextNode(` ${typeName}`);
    this.type_span.appendChild(h1_type);

    this.id_span = document.createElement("span");
    this.id_span.setAttribute("class", "text-gray text-normal");
    this.h1.appendChild(this.id_span);
    const h1_id = document.createTextNode(` (ID ${this.fromId})`);
    this.id_span.appendChild(h1_id);

    this.separate_span2 = document.createElement("span");
    this.separate_span2.setAttribute("class", "px-2");
    this.h1.appendChild(this.separate_span2);
    const h1_separate_span2 = document.createTextNode(`|`);
    this.separate_span2.appendChild(h1_separate_span2);

    // Section h2.
    this._h2 = document.createElement("span");
    this._h2.setAttribute("class", "h3 pb-3 edit-project__h1 text-normal text-gray");
    const t = document.createTextNode(`Leaves`);
    this._h2.appendChild(t);
    this.h1.appendChild(this._h2);

    // Create a styled box & Add box to page
    this.leafBox = this.boxHelper.boxWrapDefault({ "children": "" });
    this.leafDiv.appendChild(this.leafBox);

    const leaves = await fetch(`/rest/Leaves/${this.projectId}?type=${this.fromId}`)
    const data = await leaves.json();

    // Add the form and +Add links
    this._leaves = data;
    this.leafBox.appendChild(this._getNewLeavesTrigger());
    this.leafBox.appendChild(this._getLeavesSection(data));


    return this.leafDiv;
  }

  _getLeavesSection(leaves = []) {
    let leavesSection = document.createElement("div");
    leavesSection.style.minHeight = "150px";

    if (leaves && leaves.length > 0) {
      const heading = document.createElement("h3");
      heading.setAttribute("class", "f2 text-gray pb-3");

      const addText = document.createElement("span");
      addText.setAttribute("class", "text-white f1");
      addText.appendChild(document.createTextNode(`${leaves.length} Leaves`));
      heading.appendChild(addText);
      leavesSection.appendChild(heading);

      // #todo add link to the docs here?
      // Click on the  icon on any node in the label tree to move or edit it. When you hit save, it will update all annotations across every project that uses that label.
      this._helperText = document.createElement("p");
      this._helperText.setAttribute("class", "f2 text-gray pb-3 edit-project__h1 text-normal text-gray");
      const helptext = `<div class="py-1">Quick tips: Drag and drop to organize leaves into a heirarchy.</div><div class="py-1">To make a leaf top level, drag to container's edge.</div><div class="py-1">Edit details using the edit icon.</div>`;
      this._helperText.innerHTML = helptext;
      leavesSection.appendChild(this._helperText);

      this._helperLinks = document.createElement("p");
      this._helperLinks.setAttribute("class", "f2 text-gray pb-3 text-normal text-gray py-3");
      leavesSection.appendChild(this._helperLinks);

      const expandAll = document.createElement("a");
      expandAll.setAttribute("class", "text-purple text-underline");
      expandAll.setAttribute("href", "#");
      expandAll.textContent = "Expand all";
      this._helperLinks.appendChild(expandAll);

      const seperator = document.createElement("span");
      seperator.setAttribute("class", "px-3");
      seperator.textContent = "|";
      this._helperLinks.appendChild(seperator);

      const minAll = document.createElement("a");
      minAll.setAttribute("class", "text-purple text-underline");
      minAll.setAttribute("href", "#");
      minAll.textContent = "Minimize all";
      this._helperLinks.appendChild(minAll);

      let leafList = document.createElement("div");
      leafList.setAttribute("class", `leaves-edit--list`);
      leavesSection.appendChild(leafList);

      // Sets variable for output order, and levels
      this._getOrganizedLeaves(leaves);
      const highestLevel = this._levels.size - 1;

      // Loop through and output leaf forms
      for (let a in this._outputOrder) {
        this._outputOrder[a].expands = (this._outputOrder[a].indent == highestLevel || !this._parents.has(this._outputOrder[a].id)) ? false : true;

        let leafContent = this.leavesOutput({
          leaves: leaves,
          leaf: this._outputOrder[a],
          leafId: a
        });

        leafList.appendChild(leafContent);
      }

      // Listener to helper links
      minAll.addEventListener('click', this.minimizeAll.bind(this));
      expandAll.addEventListener('click', this.maximizeAll.bind(this));

      // Add drop listener on outer box once
      this.leafBox.addEventListener('dragleave', this.leafBoxStart.bind(this));
      this.leafBox.addEventListener('dragleave', this.leafBoxLeave.bind(this));
      this.leafBox.addEventListener("dragover", this.leafBoxEnter.bind(this));
      this.leafBox.addEventListener("dragenter", this.leafBoxEnter.bind(this));
      this.leafBox.addEventListener("drop", this.leafBoxDrop.bind(this));
    }

    return leavesSection;
  }

  minimizeAll(e) {
    e.preventDefault();
    // Start with level one and HIDE
    // Return the level 1 items
    try {
      for (const data of this._levels.get(0)) {
        const item = this._leafBoxes.get(data.id);

        if (this._parents.has(data.id)) { 
          item.minimizeIcon.hidden = true;
          item.maximizeIcon.hidden = false;
          let childrenList = this._parents.get(data.id);
          if (childrenList && childrenList.length > 0) {
            for (let innerChild of childrenList) {
              this._recursiveCollapse(innerChild.id);
            }
          }
        }
        
      }
    } catch (err) {
      console.error("Issue with minimize all.", err);
    }
  }

  maximizeAll(e) {
    e.preventDefault();
    // Start with level one and UNHIDE
    // Return the level 1 items
    try {
      for (const data of this._levels.get(0)) {
        this._recursiveExpand(data.id);
      }
    } catch (err) {
      console.error("Issue with maximize all.", err);
    }
  }

  _getOrganizedLeaves(leaves) {
    // Reset variables for leaf main
    this._parents = new Map();
    this._levels = new Map();
    this._outputOrder = [];

    // Alphabetize first
    leaves = leaves.sort((a, b) => {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    });

    // Arrange order and set indent depth
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

    // Return the level 1 items
    if (this._levels.get(0)) {
      const main = 0;
      for (const item of this._levels.get(main)) {
        this._outputOrder = [...this._outputOrder, ...this._recursiveChildren(item)];
      }  
    }

    return this._outputOrder;
  }

  leafBoxStart(e) {
    const textData = e.dataTransfer.getData("text/plain");
    console.log(textData);
  }

  leafBoxDrop(e) {
    console.log("this.leafBox handle drop");
    e.preventDefault();
    e.stopPropagation(); // stops the browser from redirecting.
    this.leafBox.style.border = "none";

    console.log(`leafBoxDrop: Move ${this.movingEl} to no parent?`);
    // console.log(e.dataTransfer);
    this.moveLeaf({ detail: { newParent: -1, forLeaf: this.movingEl } });
  }

  leafBoxLeave(e) {
    e.preventDefault();
    this.leafBox.style.border = "none";
  }

  leafBoxEnter(e) {
    e.preventDefault();

    if (e.target.classList.contains("edit-project__config")) {
      this.leafBox.style.border = "3px dotted #333";    
    } else {
      // console.log(`If this isn't over me, don't be dotty... `);
      this.leafBox.style.border = "none";    
    }

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
  _getNewLeavesTrigger() {
    // New leaf link
    const newLeafTrigger = document.createElement("a");
    newLeafTrigger.setAttribute("class", "btn btn-default float-right clickable  d-flex flex-items-center px-3 rounded-2"); //

    const addPlus = document.createElement("span");
    addPlus.setAttribute("class", "d-flex flex-items-center flex-justify-center"); //add-new__icon circle
    addPlus.appendChild(document.createTextNode("+"));

    const addText = document.createElement("span");
    addText.setAttribute("class", "px-3");
    addText.appendChild(document.createTextNode(" New Leaf"));

    newLeafTrigger.appendChild(addPlus);
    newLeafTrigger.appendChild(addText);

    newLeafTrigger.addEventListener("click", this._newLeafEvent.bind(this));

    return newLeafTrigger;
  }

  _newLeafEvent(e, leafId = null) {
    e.preventDefault();
    let afObj = this._getAddForm(leafId);

    afObj.submitLeaf.addEventListener("click", (e) => {
      e.preventDefault();

      this._postLeaf(afObj.form);
    });

    afObj.form._parentLeaf.permission = "Can Edit";

    this.boxHelper._modalConfirm({
      "titleText": "New Leaf",
      "mainText": afObj.form.form,
      "buttonSave": afObj.submitLeaf,
      "scroll": true
    });
    this.modal._div.classList.add("modal-wide");
    this.setAttribute("has-open-modal", "");
  }

  _getAddForm(parentLeafId) {
    let form = document.createElement("leaf-form");
    const leaves = this._leaves && this._leaves.length > 1 ? this._getOrganizedLeaves(this._leaves) : this._leaves;
    
    form._initEmptyForm(leaves, this.projectNameClean, this.attributeTypes);
    form.fromType = this.typeId;

    if (parentLeafId !== null) {
      // Set parent
      const parentValue = parentLeafId == null ? "null" : Number(parentLeafId);
      form._parentLeaf.default = parentValue;
      form._parentLeaf.setValue(parentValue);
    }

    let submitLeaf = document.createElement("input");
    submitLeaf.setAttribute("type", "submit");
    submitLeaf.setAttribute("value", "Save");
    submitLeaf.setAttribute("class", `btn btn-clear f1 text-semibold`);

    return { form, submitLeaf };
  }

  _postLeaf(formObj) {
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
    this._fetchPostPromise({ "formData": [formJSON] })
      .then(response => {
        status = response.status;
        return response.json()
      })
      .then(data => {
        let currentMessage = data.message;

        this.boxHelper.modal.addEventListener("close", this._dispatchRefresh.bind(this), {
          once : true
        });
  
        if (status == 201) {
          // iconWrap.appendChild(succussIcon);
          this.loading.hideSpinner();
          this.boxHelper._modalSuccess(currentMessage);
          
          // Replaces dispatchRefresh #TODO
          // store.getState().fetchType(this.typeName);
        } else if(status == 400) {
          iconWrap.appendChild(warningIcon);
          this.loading.hideSpinner();
          this.boxHelper._modalError(`${currentMessage}`);
        }

      }).catch((error) => {
        this.loading.hideSpinner();
        this.boxHelper._modalError(`Error: ${error}`);
      });
  }

  _dispatchRefresh(e) {
    //console.log("modal complete closed");
    this.dispatchEvent(this.refreshTypeEvent);
  }

  _toggleLeaves(el) {
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  _toggleChevron(e) {
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  leavesOutput({
    leaves = [],
    leaf = {},
    leafId = undefined
  } = {}) {
    const leafItem = document.createElement("leaf-item");
    leafItem._init(leaf, this);
    this.leafBox.appendChild(leafItem);

    // Map of all inner boxes
    this._leafBoxes.set(leaf.id, leafItem);
    this._leavesMap.set(leaf.id, leaf);

    if (leaf.expands) {
      leafItem.leafCurrent.addEventListener("click", () => {
        try {
          const id = leaf.id;

          leafItem.minimizeIcon.hidden = !leafItem.minimizeIcon.hidden;
          leafItem.maximizeIcon.hidden = !leafItem.maximizeIcon.hidden;
    
          const areExpanding = !leafItem.minimizeIcon.hidden;
          const children = this._parents.get(id);
          if (children && children.length > 0) {
            for (let c of children) {
              if (areExpanding) {
                this._recursiveUnhide(c.id);
              } else {
                this._recursiveHide(c.id);
              }
            }
          }

        } catch (err) {
          console.error("Problem toggling leaf node.", err);
        }
      });
    }

    this.dragSrcEl = null;

    leafItem.editIcon.addEventListener("click", () => {
      this._launchEdit(leaves, leaf);
    });

    leafItem.deleteIcon.addEventListener("click", () => {
      this._deleteLeafConfirm(leaf.id, leaf.name);
    });

    leafItem.addEventListener("new-parent", this.moveLeaf.bind(this));

    return leafItem;
  }

  moveLeaf(e) {
    console.log("move leaf");
    const forLeaf = e.detail.forLeaf;
    const newParent = e.detail.newParent;

    if (forLeaf == newParent) {
      return false;
    } else if (Number.isInteger(forLeaf)) {
      let leafSave = document.createElement("input");
      leafSave.setAttribute("type", "submit");
      leafSave.setAttribute("value", "Yes");
      leafSave.setAttribute("class", `btn btn-clear f1 text-semibold`);

      leafSave.addEventListener("click", (e) => {
        e.preventDefault();
        const data = {};
        data.newName = "";
        data.oldName = "";
        data.formData = { id: forLeaf, parent: newParent, type: this.fromId };
        data.id = forLeaf;

        return this._fetchLeafPatchPromise(this.fromId, data);
      }, { once: true });

      let message = "";
      if (newParent == -1) {
        const forData = this._leavesMap.get(forLeaf);
        message = `Move leaf ${forData.name} (${forData.id}) to the top level? All children will also move and have updated paths.`;
      } else {
        const forData = this._leavesMap.get(forLeaf);
        const newData = this._leavesMap.get(newParent);
        message = `Make leaf '${newData.name}' (${newData.id}) the new parent for '${forData.name}' (${forData.id})? All children will also move and have updated paths.`;
      }

      this.boxHelper._modalConfirm({
        "titleText": `Confirm move`,
        "mainText": message,
        "buttonSave": leafSave,
        "scroll": true
      });
    } else {
      console.error("The ids given for the move were not valid integers.")
    }
  }

  _recursiveHide(id) {
    const item = this._leafBoxes.get(id);
    item.classList.add("hidden");

    // Don't change the min/max icons, keep that
    if (this._parents.has(id)) {
      let childrenList = this._parents.get(id);
      if (childrenList && childrenList.length > 0) {
        for (let innerChild of childrenList) {
          this._recursiveHide(innerChild.id);
        }
      }
    }
  }

  _recursiveUnhide(id) {
    const item = this._leafBoxes.get(id);
    item.classList.remove("hidden");

    const itemIsExpanded = !item.minimizeIcon.hidden;
    if (itemIsExpanded) {
      // Unhide the children (if any)
      if (this._parents.has(id)) {
        let childrenList = this._parents.get(id);
        if (childrenList && childrenList.length > 0) {
          for (let innerChild of childrenList) {
            this._recursiveUnhide(innerChild.id);
          }
        }

      }
    }
  }

  _recursiveCollapse(id) {
    const item = this._leafBoxes.get(id);
    item.classList.add("hidden");

    if (this._parents.has(id)) {
      item.minimizeIcon.hidden = true;
      item.maximizeIcon.hidden = false;
      let childrenList = this._parents.get(id);
      if (childrenList && childrenList.length > 0) {
        for (let innerChild of childrenList) {
          this._recursiveCollapse(innerChild.id);
        }
      }
    }
  }

  _recursiveExpand(id) {
    const item = this._leafBoxes.get(id);
    item.classList.remove("hidden");

    if (this._parents.has(id)) {
      item.minimizeIcon.hidden = false;
      item.maximizeIcon.hidden = true;
      let childrenList = this._parents.get(id);

      if (childrenList && childrenList.length > 0) {
        for (let innerChild of childrenList) {
          this._recursiveExpand(innerChild.id);
        }  
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
      const data = {};
      const leafFormData = leafForm._leafFormData({ entityType: this.typeName, id: this.fromId });

      return this._fetchLeafPatchPromise(this.fromId, leafFormData);
    });

    // form export class listener
    // leafForm.addEventListener("change", () => {
    //   this.hasChanges = true;
    // });

    // this.leafForms.push(leafForm);
    this.boxHelper._modalConfirm({
      "titleText": `Edit Leaf (ID ${leaf.id})`,
      "mainText": leafForm,
      "buttonSave": leafSave,
      "scroll": true
    });
    this.modal._div.classList.add("modal-wide");
  }

  /**
   * Deprecated..... 
   */
  deleteLeaf(id, name) {
    let button = document.createElement("button");
    button.setAttribute("class", "btn btn-small btn-charcoal float-right btn-outline text-gray");
    button.style.marginRight = "10px";

    let deleteText = document.createTextNode(`Delete`);
    button.appendChild(deleteText);

    let descriptionText = `Delete ${name} from this ${this.typeName} and all its data?`;
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "clearfix py-6");

    let heading = document.createElement("div");
    heading.setAttribute("class", "py-md-5 float-left col-md-5 col-sm-5 text-right");

    heading.appendChild(button);

    let description = document.createElement("div");
    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.setAttribute("class", "py-md-6 f1 text-gray float-left col-md-7 col-sm-7");
    description.appendChild(_descriptionText);

    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    this.deleteBox = this.boxHelper.boxWrapDelete({
      "children": headingDiv
    });

    this.deleteBox.style.backgroundColor = "transparent";

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteLeafConfirm(id, name);
    });

    return this.deleteBox;
  }

  _deleteLeafConfirm(id, name) {
    let button = document.createElement("button");
    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold")

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteLeaf(id);
    });

    this.boxHelper._modalConfirm({
      "titleText": `Delete Confirmation`,
      "mainText": `Pressing confirm will delete leaf "${name}" and its children. Do you want to continue?`,
      "buttonSave": button,
      "scroll": false
    });
  }

  _deleteLeaf(id) {
    this.modal._closeCallback();;
    this.loading.showSpinner();

    let deleteLeaf = new LeafDelete({
      "leafId": id
    });

    if (name != "undefined") {
      deleteLeaf.deleteFetch().then((data) => {
        this.loading.hideSpinner();
        this.dispatchEvent(this.refreshTypeEvent);
        if (data.status == 200) {
          this.boxHelper._modalSuccess(data.message);
        } else {
          this.boxHelper._modalError(data.message);
        }
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

  _fetchPostPromise({ formData = null } = {}) {
    if (formData != null) {
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
        if (this.successMessages !== "") {
          let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
          this.saveModalMessage += heading + this.successMessages;
        }
        if (this.failedMessages !== "") {
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

          if (this.failedMessages !== "") {
            this.boxHelper._modalComplete(mainText);
          } else {
            this.boxHelper._modalSuccess(mainText);
          }
          
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
}

customElements.define("leaf-main", LeafMain);
