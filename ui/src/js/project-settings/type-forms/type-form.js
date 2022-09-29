import { TatorElement } from "../../components/tator-element.js";
import { getCookie } from "../../util/get-cookie.js";
import { Utilities } from "../../util/utilities.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { SettingsBox } from "../settings-box-helpers.js";
import { TypeNew } from "./type-new.js";
import { TypeDelete } from "./type-delete.js";
import { store } from "../store.js";



export class TypeForm extends TatorElement {
  constructor() {
    super();

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const typeFormTemplate = document.getElementById("type-form").content;
    this._shadow.appendChild(typeFormTemplate.cloneNode(true));

    // Main parts of page
    this.typeNameSet = this._shadow.querySelectorAll(".type-form-typeName");
    this.objectNameDisplay = this._shadow.getElementById("type-form-objectName");
    this.idDisplay = this._shadow.getElementById("type-form-id");
    this.save = this._shadow.getElementById("type-form-save");
    this.reset = this._shadow.getElementById("type-form-reset");
    this.delete = this._shadow.getElementById("type-form-delete");
    this.typeFormDiv = this._shadow.getElementById("type-form-div");
    this._attributeContainer =  this._shadow.getElementById("type-form-attr-column");

    console.log("Created type form....");

    // for use by form
    this.formDiv = this._shadow.getElementById("type-form-div");
  }

    /**
   * @param {int} val
   */
     set _projectId(val) {
      this.projectId = val;
    }

  /**
   * @param {string} val
   */
  set _typeName(val) {
    this.typeName = val;
    for (let span of this.typeNameSet) {
      span.textContent = val;
    }
  }

  /**
   * @param {int} val
   */
    set _typeId(val) {
      this.typeId = val;
      this.idDisplay.textContent = val;
    }
  
    /**
   * @param {int} val
   */
    set _objectName(val) {
      this.objectName= val;
      this.objectNameDisplay.textContent = val;
    }
  
    /**
     * @param {int} val
     */
    set attributeTypes(val) {
      this._attributeTypes = val;

      // create attribute form and append to container
      const section = this._getAttributeSection();
      this._attributeContainer.appendChild(section);
    }

  init(modal) {
    this.modal = modal;
    this.save.addEventListener("click", this._saveData.bind(this));
    // this.reset.addEventListener("click", this._save.bind(this));
    // this.delete.addEventListener("click", this._save.bind(this));
  }

  async _saveData() {
    const formData = this._getFormData();
    console.log(Object.entries(formData).length);
    if (Object.entries(formData).length !== 0) {
      let respData = await this.doSaveAction(formData);
      this.handleResponse(respData);
    } else {
      //
      console.log("nothing new to save");
    }

  }

  doSaveAction(formData) {
    if (this.typeId == "New") {
      return store.getState().addType(this.typeName, formData) ;
    } else {
      return store.getState().updateType({ type: this.typeName, id: this.typeId, data: formData });
    }
  }

  handleResponse(data) {
    console.log(data);
    if (data.response.ok) {
      return this.modal._success(data.data.message);
    }
  }
  
    _getAttributeSection() {
      this.attributeSection = document.createElement("attributes-main");
      this.attributeSection.setAttribute("data-from-id", `${this.typeId}`)
      // this.attributeSection._init(this.typeName, this.typeId, this.data.name, this.projectId, this._attributeTypes, this.modal);
  
      // // Register the update event - If attribute list name changes, or it is to be added/deleted listeners refresh data
      // this.attributeSection.addEventListener('settings-refresh', this._attRefreshListener.bind(this));
  
      return this.attributeSection;
    }
  
    _getEmptyData() {

      return {
        id: `New`,
        name: "",
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



if (!customElements.get("type-form")) {
  customElements.define("type-form", TypeForm);
}
