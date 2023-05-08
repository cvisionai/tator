import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeFormContainer extends TatorElement {
  constructor() {
    super();

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const template = document.getElementById("type-form-container").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Main parts of page
    this.editH1 = this._shadow.getElementById("type-form--edit-h1");
    this.newH1 = this._shadow.getElementById("type-form--new-h1");
    this.typeNameSet = this._shadow.querySelectorAll(".type-form-typeName");
    this.objectNameDisplay = this._shadow.getElementById(
      "type-form-objectName"
    );
    this.idDisplay = this._shadow.getElementById("type-form-id");
    this.saveResetDiv = this._shadow.getElementById(
      "type-form--save-reset-section"
    );
    this.save = this._shadow.getElementById("type-form-save");
    this.resetLink = this._shadow.getElementById("type-form-reset");
    this.deleteDiv = this._shadow.getElementById("type-form-delete-div");
    this.delete = this._shadow.getElementById("type-form-delete");
    this.typeFormDiv = this._shadow.getElementById("type-form-div");
    this._attributeContainer = this._shadow.getElementById(
      "type-form-attr-column"
    );
    this._addLeaves = this._shadow.getElementById("type-form--add-edit-leaves");
    this._addLeavesLink = this._shadow.getElementById(
      "type-form--add-edit-leaves_link"
    );
    this._leavesFormHeading = this._shadow.getElementById(
      "type-form--leaves-active"
    );

    // this is outside the template and references by all parts of page to sync the dimmer
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    // Subscribe to selection and projectId
    store.subscribe(
      (state) => state.selection,
      this._updateFormSelection.bind(this)
    );
    store.subscribe((state) => state.projectId, this.setProjectId.bind(this));
    store.subscribe(
      (state) => state.status,
      this.handleButtonsActive.bind(this)
    );

    // Create in the inner form handles
    const formName = this.getAttribute("form");
    this._form = document.createElement(formName);
    this.typeFormDiv.appendChild(this._form);

    // Once we know what type, listen to changes
    store.subscribe(
      (state) => state[this._form.typeName],
      this._newData.bind(this)
    );

    const canDeleteProject = store.getState().deletePermission;
    this.typeName = this._form.typeName;
    this._addLeaves.hidden = !(this._typeName == "LeafType");

    // Event listeners for container actions
    this.save.addEventListener("click", this._form._saveData.bind(this._form));
    this.resetLink.addEventListener(
      "click",
      this._form._resetForm.bind(this._form)
    );
    this.delete.addEventListener(
      "click",
      this._form._deleteType.bind(this._form)
    );
    this.deleteDiv.hidden = this._typeName === "Project" && !canDeleteProject;

    this._form.addEventListener("hide-save", () => {
      this.saveResetDiv.classList.add("hidden");
    });
  }

  handleButtonsActive(newStatus) {
    if (newStatus.name == "idle") {
      this.save.removeAttribute("disabled");
      this.resetLink.removeAttribute("disabled");
      this.delete.removeAttribute("disabled");
    } else {
      this.save.setAttribute("disabled", "true");
      this.resetLink.setAttribute("disabled", "true");
      this.delete.setAttribute("disabled", "true");
    }
  }

  setProjectId(newId, oldId) {
    this.projectId = newId;
  }

  /**
   * @param {string} val
   */
  set typeName(val) {
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
      this._addLeavesLink.setAttribute("href", `#Leaf-${this._typeId}`);
    }
    this.deleteDiv.hidden = val == "New";
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

  setUpData(data) {
    this._form.data = data;
    this.objectName =
      this._typeName === "Membership" ? data.username : data.name;

    // attribute section
    if (!this._hideAttributes && typeof data.attribute_types !== "undefined") {
      this.attributeTypes = data.attribute_types;
    } else {
      this.removeAttributeSection();
    }
  }

  /**
   * Subscription callback for [type] updates
   * @param {*} newData
   */
  _newData(newData) {
    // Nothing new or deleted
    if (
      this._typeName == store.getState().selection.typeName &&
      this._typeId !== "New"
    ) {
      if (newData.setList.has(Number(this._typeId))) {
        // Refresh the view for typeId we're looking at within update
        const data = newData.map.get(Number(this._typeId));
        this.setUpData(data);
      } else {
        // We have new data, but even tho Our typeName is selected the typeId isn't shown...
        // Just select something and let the subscribers take it from there....
        const selectType = newData.setList[0] ? newData.setList[0] : "New";
        window.history.pushState({}, "", `#${this._typeName}-${selectType}`);
        store.setState({
          selection: { ...store.getState().selection, typeId: selectType },
        });
      }
    }
  }

  /**
   * Subscription callback for [selection] updates
   * @param {*} newData
   */
  async _updateFormSelection(newSelection, oldSelection) {
    const affectsMe =
      this._typeName == newSelection.typeName ||
      this._typeName == oldSelection.typeName;

    if (affectsMe) {
      const newType = newSelection.typeName;
      const oldType = oldSelection.typeName;

      if (oldType === this._typeName && oldType !== newType) {
        this.hidden = true;
        return; // If container type was the old type, and not the new one hide and end
      } else {
        this.hidden = false; // Otherwise Show
      }

      // Add data
      const newId = newSelection.typeId;
      this.typeId = newId;

      if (newId !== "New") {
        const data = await store
          .getState()
          .getData(this._typeName, this._typeId);
        // console.log(`DEBUG: selection found newData for  ${this._typeName}, id: ${this._typeId}`, data);

        if (data) {
          this.setUpData(data);
          this._form.data = data;
          return;
        }
      }

      /* Clear container in any other case */
      // ie. NEW form (data is null), or no data from store
      this.resetToNew();
    }
  }

  // Removes the attribute main form, and hides the container
  removeAttributeSection() {
    if (this.attributeSection) this.attributeSection.remove();
    this._attributeContainer.hidden = true;
  }

  /**
   * Adds an attribute section to pages based on form data
   */
  _getAttributeSection() {
    // Clears
    this.removeAttributeSection();

    // Setup
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection.setAttribute("data-from-id", `${this._typeId}`);
    this.attributeSection._init(
      this._typeName,
      this._form._data.id,
      this._form._data.name,
      this.projectId,
      this._form._data.attribute_types,
      this.modal
    );

    // Append and show
    this._attributeContainer.appendChild(this.attributeSection);
    this._attributeContainer.hidden = false;
  }

  //
  resetToNew() {
    this._form.data = null;
    this.objectName = "";
    this.removeAttributeSection();
  }
}

if (!customElements.get("type-form-container")) {
  customElements.define("type-form-container", TypeFormContainer);
}
