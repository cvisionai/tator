import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeFormTemplate extends TatorElement {
  constructor() {
    super();

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const typeFormTemplate = document.getElementById("type-form-template").content;
    this._shadow.appendChild(typeFormTemplate.cloneNode(true));

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
    // this.attributeSection = this._shadow.getElementById("type-form-attr-main");
    
    // console.log("Created type form....");
    this._hideAttributes = true;
    this.saveWarningFlow = false;

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
  }

  /**
 * @param {int} val
 */
  set objectName(val) {
    this._objectName = val;
    if (val === "+ Add New") {
      this.editH1.hidden = true;
      this.newH1.hidden = false;
    } else {
      this.objectNameDisplay.textContent = val;
    }
  }
   
   init(parent, modal, isStaff, canDeleteProject) {
      this.parent = parent;
      this.modal = modal;
      this.isStaff = isStaff;

      this.save.addEventListener("click", this._saveData.bind(this));
      this.reset.addEventListener("click", this._resetForm.bind(this));
      if (this._typeName == "Project" && !canDeleteProject) {
        this.delete.hidden();
      } else {
        this.delete.addEventListener("click", this._deleteType.bind(this));
      }
   }

  /**
   * @param {int} val
   */
  set attributeTypes(val) {
    this._attributeTypes = val;

    // Shows container
    this._attributeContainer.hidden = false;

    // Clears any content (Covers a reset scenario)
    if (this.attributeSection) this.attributeSection.remove();

    // Creates/Re-creates this.attributeSection & appends it
    this._getAttributeSection();
  }

   
  set data(val) {
   this._data = val;

    // Setup view
    this.typeId = data.id;
    this.objectName = data.name;
    this.projectId = data.project;

    // name
    if (this._typeName !== "Membership") {
      let name = ""
      if (data.id !== "New") name = this._data.name
      this._editName.setValue(name);
      this._editName.default = name;
    }

    this._setupFormUnique(data);

    // attribute section
    if (data.id !== "New" && this._hideAttributes == false && typeof this._data.attribute_types !== "undefined") {
      this.attributeTypes = this._data.attribute_types;
    }
  }

  _getAttributeSection() {
    // console.log(this._data.attribute_types);
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection.setAttribute("data-from-id", `${this.typeId}`)
    this.attributeSection._init(this.typeName, this._data.id, this._data.name, this.projectId, this._data.attribute_types, this.modal);
    this._attributeContainer.appendChild(this.attributeSection);

    return this.attributeSection;
  }

  _getLeafSection() {
    this.leafSection = document.createElement("leaf-main");
    this.leafSection.setAttribute("data-from-id", `${this.typeId}`);
    this.leafSection.setAttribute("data-project-id", `${this.projectId}`)
    this.leafSection._init({
      typeName: this.typeName,
      fromId: this.typeId,
      fromName: this._data.name,
      projectId: this.projectId,
      attributeTypes: this._data.attribute_types,
      modal: this.modal,
      projectName: this.projectName
    });

    // Register the update event - If attribute list name changes, or it is to be added/deleted listeners refresh data
    this.leafSection.addEventListener('settings-refresh', this._attRefreshListener.bind(this));

    return this.leafSection;
  }

  _saveData() {
    if (this.saveWarningFlow == true) {
      this.warningFlow(this.saveDataFunction);
    } else {
      this.saveDataFunction();
    }
  }

  async saveDataFunction() {
    const formData = this._getFormData();
    // console.log(Object.entries(formData).length);
    if (Object.entries(formData).length !== 0) {
      let respData = await this.doSaveAction(formData);
      this.handleResponse(respData);
    } else {
      // console.log();
      this.modal._success("Nothing new to save!");
    }
  }

  warningFlow(todo) {
    const button = document.createElement("button");
    button.setAttribute("class", "btn f1 text-semibold text-red");

    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);

    button.addEventListener("click", () => {
      todo();
      this.modal._modalCloseAndClear();
    });


    this.modal._confirm({
      titleText: `Confirm {action}`,
      mainText: `{actionWarning} #Todo`,
      buttonSave: button
    });
  }

  doSaveAction(formData) {
    const info = { type: this.typeName, id: this.typeId, data: formData };
    if (this.typeId == "New") {
      return store.getState().addType(info);
    } else {
      return store.getState().updateType(info);
    }
  }

  handleResponse(data) {
    console.log(data);
    if (data.response.ok) {
      return this.modal._success(data.data.message);
    } else {
      console.log(data.response.message);

      let message = data.response.message;
      if (data.response.message === "name 'ObjectDoesNotExist' is not defined") {
        message = "You must choose a base.";
      }

    }
  }

  _resetForm() {
    // Use the most recently set data to update the values of form
    this.setupForm(this._data);
  }

  _deleteType() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn f1 text-semibold text-red");

    let confirmText = document.createTextNode("Delete")
    button.appendChild(confirmText);

    button.addEventListener("click", async () => {
      this.modal._modalCloseAndClear();
      this.handleResponse(await store.getState().removeType(this.typeName, this._data.id));
    });

    this.modal._confirm({
      titleText: `Confirm Delete`,
      mainText: `Delete "${this.objectName}" (ID: ${this._data.id})? This cannot be undone.`,
      buttonSave: button
    });
  }

  _getEmptyData() {
    return {
      id: `New`,
      name: "+ Add New",
      project: this.projectId,
      description: "",
      visible: false,
      grouping_default: false,
      media: [],
      dtype: "",
      colorMap: null,
      interpolation: "none",
      association: "Media",
      line_width: 2,
      delete_child_localizations: false,
      cluster: null,
      manifest: null,
      files_per_job: null,
      parameters: [],
      categories: "",
      form: "empty"
    };
  }

}



if (!customElements.get("type-form-template")) {
  customElements.define("type-form-template", TypeFormTemplate);
}
