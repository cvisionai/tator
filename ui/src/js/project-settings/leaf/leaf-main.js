import { LoadingSpinner } from "../../components/loading-spinner.js";
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

    this._leafMainBack = this._shadow.getElementById("leaf-main--back");
    this._leafTypeName = this._shadow.getElementById("leaf-main--type-name");
    this._leafTypeId = this._shadow.getElementById("leaf-main--type-id");
    this._leafBox = this._shadow.getElementById("leaf-main--box");
    this._leafBoxShowHide = this._shadow.getElementById("leaf-main--box-inner");
    this._leavesContainer = this._shadow.getElementById(
      "leaf-main--item-container"
    );
    this._addLeafTrigger = this._shadow.getElementById(
      "leaf-main--add-trigger"
    );
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
    this.projectId = null;
    this.typeName = "Leaf";
    this._hideAttributes = true;

    this.movingEl = null;
    this._modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this._modal);
  }

  connectedCallback() {
    store.subscribe((state) => state.selection, this._updateForm.bind(this));
    store.subscribe((state) => state.Leaf, this._newData.bind(this));

    // Listener to helper links
    this.minAll.addEventListener("click", this.minimizeAll.bind(this));
    this.expandAll.addEventListener("click", this.maximizeAll.bind(this));
    this._addLeafTrigger.addEventListener(
      "click",
      this._newLeafEvent.bind(this)
    );
  }

  /**
   * @param {any[] | null} val
   */
  set data(val) {
    if (val === null) {
      //EMPTY this...
      this.leaves = [];
      this.fromId = null;
      this.fromName = null;
      this.attributeTypes = [];
    } else {
      this.leaves = val.data;
      const parent = val.type;
      this.fromId = parent.id;
      this.fromName = parent.name;
      this.attributeTypes = parent.attribute_types;
    }
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
    this._leafMainBack.setAttribute("href", `#LeafType-${val}`);
  }

  /**
   * @param {string} val
   */
  set attributeTypes(val) {
    this._attributeTypes = val;
  }

  /**
   * @param {any[]} val
   */
  set leaves(val) {
    this._leaves = val;
    this._leavesContainer.innerHTML = "";
    if (this._leaves && this._leaves.length > 0) {
      this._leafBoxShowHide.hidden = false;
      this._leavesContainer.appendChild(this._getLeavesSection());
    } else {
      this._leafBoxShowHide.hidden = true;
    }
  }

  /**
   * For each leaf creates the leaf item and adds appropriate listeners
   * @param {*} leaves
   * @returns
   */
  _getLeavesSection(leaves = this._leaves) {
    let leavesSection = document.createElement("div");
    leavesSection.style.minHeight = "150px";

    if (leaves && leaves.length > 0) {
      // Sets variable for output order, and levels
      this._getOrganizedLeaves();
      const highestLevel = this._levels.size - 1;

      // Loop through and output leaf forms
      for (let a in this._outputOrder) {
        this._outputOrder[a].expands =
          this._outputOrder[a].indent == highestLevel ||
          !this._parents.has(this._outputOrder[a].id)
            ? false
            : true;

        let leafContent = this.leavesOutput({
          leaves: leaves,
          leaf: this._outputOrder[a],
          leafId: a,
        });

        this._leavesContainer.appendChild(leafContent);
      }

      // Add drop listener on outer box once
      this._leafBox.addEventListener("dragleave", this.leafBoxStart.bind(this));
      this._leafBox.addEventListener("dragleave", this.leafBoxLeave.bind(this));
      this._leafBox.addEventListener("dragover", this.leafBoxEnter.bind(this));
      this._leafBox.addEventListener("dragenter", this.leafBoxEnter.bind(this));
      this._leafBox.addEventListener("drop", this.leafBoxDrop.bind(this));
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

  _getOrganizedLeaves(leaves = this._leaves) {
    // Reset variables for leaf main
    this._parents = new Map();
    this._levels = new Map();
    this._outputOrder = [];

    // Alphabetize first
    leaves = leaves.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
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
        this._outputOrder = [
          ...this._outputOrder,
          ...this._recursiveChildren(item),
        ];
      }
    }

    return this._outputOrder;
  }

  leafBoxStart(e) {
    const textData = e.dataTransfer.getData("text/plain");
  }

  leafBoxDrop(e) {
    e.preventDefault();
    e.stopPropagation(); // stops the browser from redirecting.
    this._leafBox.style.border = "none";
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

  _newLeafEvent(e, leafId = this._fromId) {
    e.preventDefault();
    let afObj = this._getAddForm(leafId);

    afObj.submitLeaf.addEventListener("click", (e) => {
      e.preventDefault();
      this._postLeaf(afObj.form);
    });

    afObj.form._parentLeaf.permission = "Can Edit";

    this._modal._confirm({
      titleText: "New Leaf",
      mainText: afObj.form.form,
      buttonSave: afObj.submitLeaf,
      scroll: true,
    });
    this._modal._div.classList.add("modal-wide");
    this.setAttribute("has-open-modal", "");
  }

  _getAddForm(parentLeafId) {
    let form = document.createElement("leaf-form");
    const leaves =
      this._leaves && this._leaves.length > 1
        ? this._getOrganizedLeaves()
        : this._leaves;

    form._initEmptyForm(leaves, this.projectNameClean, this._attributeTypes);
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

  async _postLeaf(formObj) {
    this._modal._closeCallback();
    this.loading.showSpinner();
    let formJSON = formObj._getLeafFormData();
    let attr = { ...formJSON.attributes };

    for (let [key, value] of Object.entries(attr)) {
      formJSON[key] = value;
    }

    delete formJSON["attributes"];
    let status = 0;

    try {
      const info = await store
        .getState()
        .addType({ type: "Leaf", data: [formJSON] });
      let currentMessage = info.data?.message
        ? info.data.message
        : JSON.parse(info.response.text).message;

      if (info.response.ok) {
        // iconWrap.appendChild(succussIcon);
        this.loading.hideSpinner();
        this._modal._success(currentMessage);
      } else if (status == 400) {
        iconWrap.appendChild(warningIcon);
        this.loading.hideSpinner();
        this._modal._error(`${currentMessage}`);
      }
    } catch (error) {
      this.loading.hideSpinner();
      this._modal._error(`Error: ${error}`);
    }
  }

  _dispatchRefresh(e) {
    this.dispatchEvent(this.refreshTypeEvent);
  }

  _toggleLeaves(el) {
    let hidden = el.hidden;

    return (el.hidden = !hidden);
  }

  _toggleChevron(e) {
    var el = e.target;
    return el.classList.toggle("chevron-trigger-90");
  }

  leavesOutput({ leaves = [], leaf = {}, leafId = undefined } = {}) {
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
    const forLeaf = e.detail.forLeaf;
    const newParent = e.detail.newParent;

    if (forLeaf == newParent) {
      return false;
    } else if (Number.isInteger(forLeaf)) {
      let leafSave = document.createElement("input");
      leafSave.setAttribute("type", "submit");
      leafSave.setAttribute("value", "Yes");
      leafSave.setAttribute("class", `btn btn-clear f1 text-semibold`);

      leafSave.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          const data = {};
          data.newName = "";
          data.oldName = "";
          data.formData = {
            id: forLeaf,
            parent: newParent,
            type: this._fromId,
          };
          data.id = forLeaf;

          this._updateLeaf(data);
        },
        { once: true }
      );

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
        titleText: `Confirm move`,
        mainText: message,
        buttonSave: leafSave,
        scroll: true,
      });
    } else {
      console.error("The ids given for the move were not valid integers.");
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
    leafForm._getFormWithValues(leaves, leaf, this._attributeTypes);
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
      const leafFormData = leafForm._leafFormData({
        entityType: this.typeName,
        id: this._fromId,
      });

      return this._updateLeaf(leafFormData);
    });

    // this.leafForms.push(leafForm);
    this._modal._confirm({
      titleText: `Edit Leaf (ID ${leaf.id})`,
      mainText: leafForm,
      buttonSave: leafSave,
      scroll: true,
    });
    this._modal._div.classList.add("modal-wide");
  }

  /**
   * Deprecated.....
   */
  deleteLeaf(id, name) {
    let button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn btn-small btn-charcoal float-right btn-outline text-gray"
    );
    button.style.marginRight = "10px";

    let deleteText = document.createTextNode(`Delete`);
    button.appendChild(deleteText);

    let descriptionText = `Delete ${name} from this ${this.typeName} and all its data?`;
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "clearfix py-6");

    let heading = document.createElement("div");
    heading.setAttribute(
      "class",
      "py-md-5 float-left col-md-5 col-sm-5 text-right"
    );

    heading.appendChild(button);

    let description = document.createElement("div");
    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.setAttribute(
      "class",
      "py-md-6 f1 text-gray float-left col-md-7 col-sm-7"
    );
    description.appendChild(_descriptionText);

    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    this.deleteBox = document.createElement("div");
    this.deleteBox.setAttribute(
      "class",
      `text-red py-3 rounded-2 edit-project__config`
    );
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
    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold");

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteLeaf(id);
    });

    this._modal._confirm({
      titleText: `Delete Confirmation`,
      mainText: `Pressing confirm will delete leaf "${name}" and its children. Do you want to continue?`,
      buttonSave: button,
      scroll: false,
    });
  }

  async _deleteLeaf(id) {
    this._modal._closeCallback();
    this.loading.showSpinner();

    if (typeof id != "undefined") {
      try {
        const info = await store
          .getState()
          .removeType({ type: "Leaf", id: id });
        const message = JSON.parse(info.response.text).message;
        this.loading.hideSpinner();
        if (info.response.ok) {
          this._modal._success(message);
        } else {
          this._modal._error(message);
        }
      } catch (err) {
        console.error(err);
        this._modal._error(err);
        this.loading.hideSpinner();
        return this._modal._error("Error with delete.");
      }
    } else {
      this.loading.hideSpinner();
      return this._modal._error("Error with delete.");
    }
  }

  async _updateLeaf(dataObject) {
    try {
      this.successMessages = "";
      this.failedMessages = "";
      this.confirmMessages = "";
      this.saveModalMessage = "";
      this.requiresConfirmation = false;
      let formData = dataObject.formData;

      const info = await store
        .getState()
        .updateType({ type: "Leaf", id: dataObject.id, data: formData });
      let currentMessage = info.data?.message
        ? info.data.message
        : JSON.parse(info.response.text).message;

      if (info.response.status == 200) {
        this._modal._success(currentMessage);
      } else {
        this._modal._error(currentMessage);
      }

      this.loading.hideSpinner();
    } catch (err) {
      this.loading.hideSpinner();
      this._modal._error(err);
      return console.error("Problem patching leaf...", err);
    }
  }

  async _newData(newData) {
    // If Leaf is updated, but this container isn't shown, do nothing
    if (this.typeName == store.getState().selection.typeName) {
      const selectedType = store.getState().selection.typeId;

      if (newData.setList.has(selectedType)) {
        const data = newData.map.get(selectedType);
        const type = await store.getState().getData("LeafType", selectedType);
        this.data = {
          data,
          type,
        };
      }
    }
  }

  async _updateForm(newSelection, oldSelection) {
    const newType = newSelection.typeName;
    const oldType = oldSelection.typeName;
    const affectsMe = this.typeName == newType || this.typeName == oldType;

    if (affectsMe) {
      if (oldType === this.typeName && oldType !== newType) {
        this.hidden = true;
        return;
      } else {
        this.hidden = false;
      }

      // Add data
      const newId = newSelection.typeId;
      if (newId !== "New") {
        const data = await store.getState().getData("Leaf", newId);
        const type = await store.getState().getData("LeafType", newId);
        this.data = {
          data,
          type,
        };
      } else {
        this.data = null;
      }
    }
  }
}

customElements.define("leaf-main", LeafMain);
