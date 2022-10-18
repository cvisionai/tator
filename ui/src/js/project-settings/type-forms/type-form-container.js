import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeFormContainer extends TatorElement {
  constructor() {
    super();

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const template = document.getElementById("typeFormContainer").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Main parts of page
    this.editH1 = this._shadow.getElementById("type-form--edit-h1");
    this.newH1 = this._shadow.getElementById("type-form--new-h1");
    this.typeNameSet = this._shadow.querySelectorAll(".type-form-typeName");
    this.objectNameDisplay = this._shadow.getElementById("type-form-objectName");
    this.idDisplay = this._shadow.getElementById("type-form-id");
    this.save = this._shadow.getElementById("type-form-save");
    this.reset = this._shadow.getElementById("type-form-reset");
    this.delete = this._shadow.getElementById("type-form-delete");
    this.typeFormDiv = this._shadow.getElementById("type-form-div");
    this._attributeContainer = this._shadow.getElementById("type-form-attr-column");
    // this._attrMain = this._shadow.getElementById("type-form-attr-main");

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    store.subscribe((state) => state.selection, this._updateForm.bind(this));
    
    const formName = this.getAttribute("form");
    this._form = document.createElement(formName);
    
    this.projectId = store.getState().projectId // todo this is dupe used?
    this._form.projectId = this.projectId;
    const canDeleteProject = store.getState().deletePermission;
    this._form.isStaff = store.getState().isStaff; 
    this.#typeName = this._form.typeName;
    console.log(this._form.typeName);
    store.subscribe(state => state[this._form.typeName], this._newData.bind(this));
    
    // @TODO this could replace with status hub
    // Keeping due to leaf + attr not refactored to hub yet
    this._form.modal = this.modal;

    this.typeFormDiv.appendChild(this._form);
    this.save.addEventListener("click", this._form._saveData.bind(this._form));
    this.reset.addEventListener("click", this._form._resetForm.bind(this._form));
    this.delete.addEventListener("click", this._form._deleteType.bind(this._form));
    this.delete.hidden = (this._typeName === "Project" && !canDeleteProject);
    
  }

   /**
   * @param {string} val
   */
    set #typeName(val) {
      console.log("Setting typeName");
      this._typeName = val;
      for (let span of this.typeNameSet) {
        span.textContent = val;
      }
    }
  
    /**
     * @param {int} val
     */
    set typeId(val) {
      this._typeId = val;
      this.idDisplay.textContent = val;
    }
  
    /**
   * @param {int} val
   */
    set attributeTypes(val) {
      this._attributeTypes = val;
      this._attributeContainer.innerHTML = "";

      if (val && val !== null) {
        // Creates/Re-creates this.attributeSection & appends it
        this._getAttributeSection();       
      }

    }

    /**
 * @param {int} val
 */
  set objectName(val) {
    this._objectName = val;
    if (this._typeId === "New") {
      this.editH1.hidden = true;
      this.newH1.hidden = false;
    } else {
      this.editH1.hidden = false;
      this.newH1.hidden = true;
      this.objectNameDisplay.textContent = val;
    }
  }

  _newData(newData, oldData) {
    // Nothing new or deleted
    console.log("newData... ", newData);
    console.log("oldData... ", oldData);

    if (newData.setList.has(this._typeId)) {
      // Refresh the view
      this._form.data = newData.map.get(this._typeId);
    }
    
    // If something is New or Deleted
    // What is in newArray but not in forms
    const newArray = Array.from(newData.setList);
    const oldArray = Array.from(oldData.setList);
    const diff = newArray.filter(x => !oldArray.includes(x));
    const diffB = oldArray.filter(x => !newArray.includes(x));

    console.log(`newArray ${newArray.length} == oldArray ${oldArray.length}`);
    console.log("diff", diff);
    console.log("diffB", diffB);

    /* We have a form id that doesn't exist in new data */
    if (diffB.length === 1) {
      // Object was deleted
      console.log(`${diffB[0]} deleted........`);
      const newHash = `#${type}-${newArray[0]}`;
      window.history.pushState({}, "", newHash);
    }

    console.log(`diff.length !== newArray.length ${diff.length !== newArray.length}`)
    if (diff.length === 1) {
    /* We have a form id that doesn't exist in old data */
      const id = diff[0];
      // Object was added!
      console.log(`${id} added........`);
      const newHash = `#${type}-${id}`;
      window.history.pushState({}, "", newHash);
    }
  }

  async _updateForm(newSelection, oldSelection) {
    const affectsMe = (this._typeName == newSelection.typeName || this._typeName == oldSelection.typeName);
    
    if (affectsMe) {
      const newType = newSelection.typeName;
      const oldType = oldSelection.typeName;

      console.log(`TYPEFORM..... CURRENT typeName ${this._typeName} and newType ${newType} oldType ${oldType}`);
      
      if (oldType === this._typeName && oldType !== newType) {
        console.log("OLD Is hidden? " + this._typeName);
        this.hidden = true; //return this.reset();
        return;
      }

      console.log(this._typeName+" is new? unhiding this")
      this.hidden = false;
      
      const newId = newSelection.typeId;
      const oldId = oldSelection.typeId;

      // Add data
      this.typeId = newId;
      if (newId !== "New") {
        console.log(`this._typeName ${this._typeName}, this._typeId ${this._typeId}`);
        const data = await store.getState().getData(this._typeName, this._typeId);
        console.log("Data is:::::", data);

        this._form.data = data;
        this.objectName = (this._typeName === "Membership") ? data.username : data.name

        // attribute section
        if (this._hideAttributes == false && typeof data.attribute_types !== "undefined") {
          this.attributeTypes = data.attribute_types;
        }
      } else {
        this._form.data = null;
        this.objectName = "";
      }
    }
  }

  _getAttributeSection() {
    // console.log(this._data.attribute_types);
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection.setAttribute("data-from-id", `${this.typeId}`)
    this.attributeSection._init(this._typeName, this._form._data.id, this._form._data.name, this.projectId, this._form._data.attribute_types, this.modal);
    this._attributeContainer.appendChild(this.attributeSection);
    this._attributeContainer.hidden = false;
  }

  _getLeafSection() {
    this.projectName = "REFACTOR TODO";

    this.leafSection = document.createElement("leaf-main");
    this.leafSection.setAttribute("data-from-id", `${this._typeId}`);
    this.leafSection.setAttribute("data-project-id", `${this.projectId}`)
    this.leafSection._init({
      typeName: this._typeName,
      fromId: this._typeId,
      fromName: this._form._data.name,
      projectId: this.projectId,
      attributeTypes: this._form._data.attribute_types,
      modal: this.modal,
      projectName: this.projectName
    });

    // Register the update event - If attribute list name changes, or it is to be added/deleted listeners refresh data
    this.leafSection.addEventListener('settings-refresh', this._attRefreshListener.bind(this));

    return this.leafSection;
  }

  reset() {
    this.hidden = true;
    this._form.data = null;
  }
}



if (!customElements.get("type-form-container")) {
  customElements.define("type-form-container", TypeFormContainer);
}
