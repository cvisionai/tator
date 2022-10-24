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
    this.resetLink = this._shadow.getElementById("type-form-reset");
    this.delete = this._shadow.getElementById("type-form-delete");
    this.typeFormDiv = this._shadow.getElementById("type-form-div");
    this._attributeContainer = this._shadow.getElementById("type-form-attr-column");
    this._addLeaves = this._shadow.getElementById("type-form--add-edit-leaves");
    this._addLeavesLink = this._shadow.getElementById("type-form--add-edit-leaves_link");
    this._leavesFormHeading = this._shadow.getElementById("type-form--leaves-active");
    // this._attrMain = this._shadow.getElementById("type-form-attr-main");

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    // Subscribe to selection and projectId
    store.subscribe((state) => state.selection, this._updateForm.bind(this));
    store.subscribe(state => state.projectId, this.setProjectId.bind(this));
    
    // Create in the inner form handles
    const formName = this.getAttribute("form");
    this._form = document.createElement(formName);
    this._form.modal = this.modal;
    this.typeFormDiv.appendChild(this._form);

    // Once we know what type, listen to changes
    store.subscribe(state => state[this._form.typeName], this._newData.bind(this));
    
    const canDeleteProject = store.getState().deletePermission;
    this.typeName = this._form.typeName;
    this._addLeaves.hidden = !(this._typeName == "LeafType");

    // Event listeners for container actions
    this.save.addEventListener("click", this._form._saveData.bind(this._form));
    this.resetLink.addEventListener("click", this._form._resetForm.bind(this._form));
    this.delete.addEventListener("click", this._form._deleteType.bind(this._form));
    this.delete.hidden = (this._typeName === "Project" && !canDeleteProject);
  }

  setProjectId(newId, oldId) {
    console.log("Set projectId to newId");
    this.projectId = newId;
  }

   /**
   * @param {string} val
   */
    set typeName(val) {
      // console.log("Setting typeName");
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
      if (!this._addLeaves.hidden) {
        this._addLeavesLink.setAttribute("href", `#Leaf-${this._typeId}`)
      }   
    }
  
    /**
   * @param {int} val
   */
    set attributeTypes(val) {
      this._attributeTypes = val;

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
    if (this.typeName == store.getState().selection.typeName) {
      console.log("newData... ", newData);
      console.log("oldData... ", oldData);

      if (newData.setList.has(Number(this._typeId))) {
        // Refresh the view
        console.log("SET THIS DATA!!", newData.map.get(Number(this._typeId)));
        this._form.data = newData.map.get(Number(this._typeId));
      } else if (this._typeId == "New") {
        this._form.data = null;
      } else {
        const selectType = (newData.setList[0]) ? newData.setList[0] : "New";
        window.history.pushState({}, "", `#${this.typeName}-${selectType}`)
        // Just select something and let the subscribers take it from there....
        store.setState({ selection: { ...store.getState().selection, typeId: selectType } });
      }

      // attribute section
      if (!this._hideAttributes && typeof this._form._data.attribute_types !== "undefined") {
        this.attributeTypes = this._form._data.attribute_types;
      } else {
        this.removeAttributeSection();
      }
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
        
        if (data) {
          console.log("Data is:::::", data);
          console.log(data.name);

          this._form.data = data;
          this.objectName = (this._typeName === "Membership") ? data.username : data.name;
        
          // attribute section
          if (!this._hideAttributes && typeof data.attribute_types !== "undefined") {
            this.attributeTypes = data.attribute_types;
          } else {
            this.removeAttributeSection();
          }
        } 
      } else {
        this._form.data = null;
        this.objectName = "";
        this.removeAttributeSection();
      }
    }
  }

  removeAttributeSection() {
    if (this.attributeSection) this.attributeSection.remove();
    this._attributeContainer.hidden = true;
  }

  _getAttributeSection() {
    this.removeAttributeSection();
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection.setAttribute("data-from-id", `${this._typeId}`)
    this.attributeSection._init(this._typeName, this._form._data.id, this._form._data.name, this.projectId, this._form._data.attribute_types, this.modal);
    this._attributeContainer.appendChild(this.attributeSection);
    this._attributeContainer.hidden = false;
  }


  reset() {
    this.hidden = true;
    this._form.data = null;
  }
}



if (!customElements.get("type-form-container")) {
  customElements.define("type-form-container", TypeFormContainer);
}
