import { getCookie } from "../../util/get-cookie.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { LeafDelete } from "./leaf-delete.js";
import { store } from "../store.js";
import { TatorElement } from "../../components/tator-element.js";

/**
 * Main Leaf section for type forms
 * 
 */
export class LeafMain extends TatorElement {
  constructor() {
    super();

    // 
    var template = document.getElementById("leaf-main");
    var clone = document.importNode(template.content, true);
    this._shadow.appendChild(clone);

    this._leafTypeName = this._shadow.getElementById("leaf-main--type-name");
    this._leafTypeId = this._shadow.getElementById("leaf-main--type-id");
    this._leafBox = this._shadow.getElementById("leaf-main--box");
    this._leafBoxShowHide = this._shadow.getElementById("leaf-main--box-inner");
    this._leavesContainer = this._shadow.getElementById("leaf-main--item-container");
    this._addLeafTrigger = this._shadow.getElementById("leaf-main--add-trigger");
    this.minAll = this._shadow.getElementById("leaf-main--minimize");
    this.expandAll = this._shadow.getElementById("leaf-main--expand");
    
    this.loading = new LoadingSpinner();
    this.loadingImg = this.loading.getImg();

    this._leaves = [];
    this._leafBoxes = new Map();
    this._leavesMap = new Map();

    this.leafForms = [];
    this.hasChanges = false;

    //
    this.typeName = "Leaf";
    this._hideAttributes = true;

    this.movingEl = null;
  }

  resetChanges() {
    this.hasChanges = false;
  }

  /**
   * @param {any[] | null} val
   */
  set data(val) {
    console.log("DATA SET FOR LEAF MAIN", val);

    if (val === null) {
      //EMPTY this...
      this._leaves = [];
      this.fromId = null;
      this.fromName = null;
      this.attributeTypes = [];
    } else {
      this._leaves = val;
      this.fromId = this._leaves.parent.id;
      this.fromName = this._leaves.parent.name;
      this.attributeTypes = this._leaves.parent.attribute_types;
    }
  }

  /**
   * @param {TatorElement} val
   */
  set modal(val) {
    this._modal = val;
  }

  /**
   * @param {string} val
   */
  set fromName(val) {
    this._leafTypeName.innerHTML = val;
  }

  /**
  * @param {string} val
  */
  set fromId(val) {
    this._leafTypeId.innerHTML = val;
    this._fromId = val;
  }

    /**
   * @param {string} val
   */
  set attributeTypes(val) {
    this._attributeTypes = val;
  }

  connectedCallback() {
    store.subscribe(state => state.project, this.setProjectInfo.bind(this));
    store.subscribe((state) => state.selection, this._updateForm.bind(this));
    store.subscribe(state => state.Leaf, this._newData.bind(this));

    // Listener to helper links
    this.minAll.addEventListener('click', this.minimizeAll.bind(this));
    this.expandAll.addEventListener('click', this.maximizeAll.bind(this));
    this._addLeafTrigger.addEventListener("click", this._newLeafEvent.bind(this));
  }

  setProjectInfo(newProject) {
    this.projectId = newProject.data.id;
    this.projectName = newProject.data.name;
    this.projectNameClean = String(projectName).replace(/[^a-z0-9]/gi, '').replace(" ", "_");
  }

  async _init() {
    console.log("INIT!! <<< >>> LEAF MAIN" + fromName, attributeTypes);
    // Init object global vars

    // add main div
    this._leavesContainer.innerHTML = "";

    if (this._leaves && this._leaves.length > 0) {
      this.leafDiv.appendChild(this._getLeavesSection(this._leaves));
      this._leafBoxShowHide.hidden = false;
    } else {
      this._leafBoxShowHide.hidden = true;
    }

    return this.leafDiv;
  }

  _getLeavesSection(leaves = []) {
    let leavesSection = document.createElement("div");
    leavesSection.style.minHeight = "150px";

    if (leaves && leaves.length > 0) {
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

        this._leafContainer.appendChild(leafContent);
      }



      // Add drop listener on outer box once
      this._leafBox.addEventListener('dragleave', this._leafBoxStart.bind(this));
      this._leafBox.addEventListener('dragleave', this._leafBoxLeave.bind(this));
      this._leafBox.addEventListener("dragover", this._leafBoxEnter.bind(this));
      this._leafBox.addEventListener("dragenter", this._leafBoxEnter.bind(this));
      this._leafBox.addEventListener("drop", this._leafBoxDrop.bind(this));
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
    console.log("this._leafBox handle drop");
    e.preventDefault();
    e.stopPropagation(); // stops the browser from redirecting.
    this._leafBox.style.border = "none";

    console.log(`leafBoxDrop: Move ${this.movingEl} to no parent?`);
    // console.log(e.dataTransfer);
    this.moveLeaf({ detail: { newParent: -1, forLeaf: this.movingEl } });
  }

  leafBoxLeave(e) {
    e.preventDefault();
    this._leafBox.style.border = "none";
  }

  leafBoxEnter(e) {
    e.preventDefault();

    if (e.target.classList.contains("edit-project__config")) {
      this._leafBox.style.border = "3px dotted #333";
    } else {
      // console.log(`If this isn't over me, don't be dotty... `);
      this._leafBox.style.border = "none";
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

  _newLeafEvent(e, leafId = null) {
    e.preventDefault();
    let afObj = this._getAddForm(leafId);

    afObj.submitLeaf.addEventListener("click", (e) => {
      e.preventDefault();

      this._postLeaf(afObj.form);
    });

    afObj.form._parentLeaf.permission = "Can Edit";

    this._modal._confirm({
      "titleText": "New Leaf",
      "mainText": afObj.form.form,
      "buttonSave": afObj.submitLeaf,
      "scroll": true
    });
    this._modal._div.classList.add("modal-wide");
    this.setAttribute("has-open-modal", "");
  }

  _getAddForm(parentLeafId) {
    let form = document.createElement("leaf-form");
    const leaves = this._leaves && this._leaves.length > 1 ? this._getOrganizedLeaves(this._leaves) : this._leaves;

    form._initEmptyForm(leaves, this.projectNameClean, this.attributeTypes);
    form.fromType = this._fromId;

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
    this._modal._closeCallback();
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

        this._modal.addEventListener("close", this._dispatchRefresh.bind(this), {
          once: true
        });

        if (status == 201) {
          // iconWrap.appendChild(succussIcon);
          this.loading.hideSpinner();
          this._modal._success(currentMessage);

          // Replaces dispatchRefresh #TODO
          // store.getState().fetchType(this.typeName);
        } else if (status == 400) {
          iconWrap.appendChild(warningIcon);
          this.loading.hideSpinner();
          this._modal._error(`${currentMessage}`);
        }

      }).catch((error) => {
        this.loading.hideSpinner();
        this._modal._error(`Error: ${error}`);
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
    this._leafBox.appendChild(leafItem);

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
        data.formData = { id: forLeaf, parent: newParent, type: this._fromId };
        data.id = forLeaf;

        return this._fetchLeafPatchPromise(this._fromId, data);
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

      this._modal._confirm({
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
    leafForm.fromType = this._fromId;

    // create form and attach to the el
    leafForm._getFormWithValues(leaves, leaf, this.attributeTypes);
    leafForm.form.setAttribute("class", "leaf-form px-4");
    leafForm.setAttribute("data-old-name", leaf.name);
    leafForm.setAttribute("leafid", leaf.id);
    leafForm.id = `${formId}_${this._fromId}`;
    leafForm.form.data = leaf; // @TODO how is this used?
    // leafForm.hidden = true;

    let leafSave = document.createElement("input");
    leafSave.setAttribute("type", "submit");
    leafSave.setAttribute("value", "Save");
    leafSave.setAttribute("class", `btn btn-clear f1 text-semibold`);

    leafSave.addEventListener("click", (e) => {
      e.preventDefault();
      const data = {};
      const leafFormData = leafForm._leafFormData({ entityType: this.typeName, id: this._fromId });

      return this._fetchLeafPatchPromise(this._fromId, leafFormData);
    });

    // form export class listener
    // leafForm.addEventListener("change", () => {
    //   this.hasChanges = true;
    // });

    // this.leafForms.push(leafForm);
    this._modal._confirm({
      "titleText": `Edit Leaf (ID ${leaf.id})`,
      "mainText": leafForm,
      "buttonSave": leafSave,
      "scroll": true
    });
    this._modal._div.classList.add("modal-wide");
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

    this.deleteBox = document.createElement("div");
    this.deleteBox.setAttribute("class", `text-red py-3 rounded-2 edit-project__config`);
    this.deleteBox.style.border = "1px solid $color-charcoal--light";
    this.deleteBox.style.backgroundColor = "transparent";
    this.deleteBox.append(headingDiv);

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

    this._modal._confirm({
      "titleText": `Delete Confirmation`,
      "mainText": `Pressing confirm will delete leaf "${name}" and its children. Do you want to continue?`,
      "buttonSave": button,
      "scroll": false
    });
  }

  _deleteLeaf(id) {
    this._modal._closeCallback();;
    this.loading.showSpinner();

    let deleteLeaf = new LeafDelete({
      "leafId": id
    });

    if (name != "undefined") {
      deleteLeaf.deleteFetch().then((data) => {
        this.loading.hideSpinner();
        this.dispatchEvent(this.refreshTypeEvent);
        if (data.status == 200) {
          this._modal._success(data.message);
        } else {
          this._modal._error(data.message);
        }
      }).catch((err) => {
        console.error(err);
        this.loading.hideSpinner();
        return this._modal._error("Error with delete.");
      });
    } else {
      this.loading.hideSpinner();
      return this._modal._error("Error with delete.");
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
          this._modal._confirm({
            "titleText": "Confirm Edit",
            mainText,
            buttonSave
          });
        } else {
          let mainText = `${this.saveModalMessage}`;

          if (this.failedMessages !== "") {
            this._modal._complete(mainText);
          } else {
            this._modal._success(mainText);
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

  _newData(newData, oldData) {
    // If Leaf is updated, but this container isn't shown, do nothing
    if (this.typeName == store.getState().selection.typeName) {
      console.log("newData... ", newData);
      console.log("oldData... ", oldData);

      if (newData.setList.has(Number(this._typeId))) {
        // Refresh the view
        console.log("SET THIS DATA!!", newData.map.get(Number(this._typeId)));
        this.data = newData.map.get(Number(this._typeId));
      } else if (this._typeId == "New") {
        this.data = null;
      } else {
        const selectType = (newData.setList[0]) ? newData.setList[0] : "New";
        window.history.pushState({}, "", `#${this.typeName}-${selectType}`)
        // Just select something and let the subscribers take it from there....
        store.setState({ selection: { ...store.getState().selection, typeId: selectType } });
      }
    }
  }

  async _updateForm(newSelection, oldSelection) {
    console.log("Leaf form... newSelection", newSelection)
    const affectsMe = (this._typeName == newSelection.typeName || this._typeName == oldSelection.typeName);
    
    if (affectsMe) {
      const newType = newSelection.typeName;
      const oldType = oldSelection.typeName;

      if (oldType === this._typeName && oldType !== newType) {
        this.hidden = true; //return this.reset();
        return;
      }

      console.log(this._typeName+" is new: unhiding this")
      this.hidden = false;
      
      const newId = newSelection.typeId;
      const oldId = oldSelection.typeId;

      // Add data
      if (newId !== "New") {
        console.log(`this._typeName ${this._typeName}, this._typeId ${this._typeId}`);       
        const data = await store.getState().getData(this._typeName, this._typeId);
        
        if (data) {
          console.log("Data is:::::", data);
          this.data = data;
        } 
      } else {
        this.data = null;
      }
    }
  }

}

customElements.define("leaf-main", LeafMain);
