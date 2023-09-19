import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class OrgTypeFormContainer extends TatorElement {
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
    this.save = this._shadow.getElementById("type-form-save");
    this.resetLink = this._shadow.getElementById("type-form-reset");
    this.deleteDiv = this._shadow.getElementById("type-form-delete-div");
    this.delete = this._shadow.getElementById("type-form-delete");
    this.typeFormDiv = this._shadow.getElementById("type-form-div");
    this._addLeaves = this._shadow.getElementById("type-form--add-edit-leaves");
    this._addLeavesLink = this._shadow.getElementById(
      "type-form--add-edit-leaves_link"
    );
    this._leavesFormHeading = this._shadow.getElementById(
      "type-form--leaves-active"
    );
    this.sideCol = this._shadow.getElementById("type-form-attr-column");
    this.sideCol.classList.add("hidden");

    // Buttons below form
    this._saveEditSection = this._shadow.getElementById(
      "type-form--save-reset-section"
    );

    this._customButtonSection = this._shadow.getElementById(
      "type-form--custom-button-section"
    );
    this._customButton = this._shadow.getElementById(
      "type-form--custom-button"
    );

    this._customButtonSectionPrimary = this._shadow.getElementById(
      "type-form--custom-button-section-primary"
    );
    this._customButtonPrimary = this._shadow.getElementById(
      "type-form--custom-button-primary"
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

    this.initTypeForm();
  }

  initTypeForm() {
    // Create in the inner form handles
    const formName = this.getAttribute("form");
    this._form = document.createElement(formName);
    this.typeFormDiv.appendChild(this._form);

    // Once we know what type, listen to changes
    const typeName = this._form.typeName;
    store.subscribe((state) => state[typeName], this._newData.bind(this));
    this.typeName = typeName;

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
  }

  handleButtonsActive(newStatus) {
    if (newStatus.name == "idle") {
      this.typeFormDiv.classList.remove("form-loading-glow");
      this.save.removeAttribute("disabled");
      this.resetLink.removeAttribute("disabled");
      this.delete.removeAttribute("disabled");
    } else {
      this.save.setAttribute("disabled", "true");
      this.typeFormDiv.classList.add("form-loading-glow");
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
    this.deleteDiv.hidden = val == "New";
  }

  /**
   * @param {int} val
   */
  set objectName(val) {
    this._objectName = val;
    // console.log("Org type container ... this._objectName = " + this._objectName);

    if (this._typeId === "New" || val === "") {
      this.editH1.hidden = true;
      this.newH1.hidden = false;
      this.sideCol.hidden = true;
    } else {
      this.editH1.hidden = false;
      this.newH1.hidden = true;
      this.objectNameDisplay.innerHTML = val;
      this.sideCol.hidden = false;
    }
  }

  setUpData(data) {
    this._data = data;
    this._form.data = data;
    let objectName = "";

    // Setup object info
    this.objectName = data?.name ? data.name : "";
  }

  /**
   * Subscription callback for [type] updates
   * @param {*} newData
   */
  _newData(newData) {
    // console.log("newData", newData);
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

  //
  resetToNew() {
    this._form.data = null;
    this.setUpData(null);
    this.objectName = "";
  }
}

if (!customElements.get("org-type-form-container")) {
  customElements.define("org-type-form-container", OrgTypeFormContainer);
}
