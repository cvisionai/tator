import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeFormTemplate extends TatorElement {
  constructor() {
    super();

    this._hideAttributes = true;
    this.saveWarningFlow = false;

    // Genenric fallback for warning flow save
    this._warningSaveMessage = "Are you sure you want to edit this entity?";

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    store.subscribe(state => state.projectId, this.setProjectId.bind(this));
    store.subscribe(state => state.organizationId, this.setOrganizationId.bind(this));
    store.subscribe(state => state.isStaff, this.setIsStaff.bind(this));
  }

  setProjectId(newId, oldId) {
    this.projectId = newId;
  }

  setOrganizationId(newId, oldId) {
    console.log("setOrganizationId"+newId);
    this.organizationId = newId;
  }

  setIsStaff(newIS, oldIS) {
    this.isStaff = newIS;
  }
     
  /**
   * @param {{ map?: any; id?: string; name?: string; project?: any; description?: string; visible?: boolean; grouping_default?: boolean; media?: never[]; dtype?: string; colorMap?: null; interpolation?: string; association?: string; line_width?: number; delete_child_localizations?: boolean; cluster?: null; manifest?: null; files_per_job?: null; parameters?: never[]; categories?: string; form?: string; } | null} val
   */
  set data(val) {
    if(val && val !== null){
      this._data = val;
    } else {
      this._data = this._getEmptyData();
    }

    this.typeId = this._data.id;
    this.objectName = this._data.name;

    // name
    if (this.typeName !== "Membership") {
      let name = (this._data.id === "New") ? "" : this._data.name;
      this._editName.setValue(name);
      this._editName.default = name;
    }

    this._setupFormUnique(this._data);
  }

  _saveData() {
    if (this.saveWarningFlow == true) {
      this.warningFlowSave();
    } else {
      this.saveDataFunction();
    }
  }

  async saveDataFunction() {
    console.log("saveDataFunction........");
    const formData = this._getFormData();

    if (Object.entries(formData).length !== 0 && !Array.isArray(formData)) {
      try {
        const respData = await this.doSaveAction(formData);
        console.log(respData);
        this.handleResponse(respData);
      } catch (err) {
        this.modal._error(err)
      }
    } else if (Array.isArray(formData) && formData.length !== 0) {
      const responses = [];
      for (let d of formData) {
        const respData = await this.doSaveAction(d);
        responses.push(respData);
        this.handleResponseList(responses);
      }
      
      this.handleResponse(respData);
    } else {
      // console.log();
      this.modal._success("Nothing new to save!");
    }
  }

  /**
   * 
   * @param {String} 
   */
  async warningFlowSave() {
    await this.setUpWarningSaveMsg();
    const button = document.createElement("button");
    button.setAttribute("class", "btn f1 text-semibold text-red");

    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);

    button.addEventListener("click", () => {
      this.saveDataFunction();
      this.modal._modalCloseAndClear();
    });

    this.modal._confirm({
      titleText: `Edit Confirmation`,
      mainText: `${this._warningSaveMessage}`,
      buttonSave: button
    });
  }

  /* Overriede this in child (see Version-Edit) */
  setUpWarningSaveMsg() {
    return;
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
    console.log("HANDLE RESPONSE", data);
    if (data.response.ok) {
      return this.modal._success(data.data.message);
    } else {
      if (data.response?.text && data.response?.status && data.response?.statusText) {
        const message = JSON.parse(data.response.text).message;
        return this.modal._error(`<strong>${data.response.status} ${data.response.statusText}</strong><br/><br/>${message}`);        
      } else {
        this.modal._error(`Error: Could not process request.`);
      }

    }
  }

  handleResponseList(responses) {
    let sCount = 0;
    let eCount = 0;
    let errors = "";

    for (let r of responses) {
      if (r.response.ok) {
        sCount++;
      } else {
        eCount++;
        errors += `Error: ${r.data.message} \n`;
      }
    }

    if (sCount > 0 && eCount === 0) {
      return this.modal._success(`Successfully added ${sCount} ${this.typeName}s.`);
    } else if (sCount > 0 && eCount > 0) {
      return this.modal._complete(`Successfully added ${sCount} ${this.typeName}s.\n Error adding ${eCount} ${this.typeName}s.\n Error message${(eCount == 1 ? '' :'s')}: ${errors}`);
    } else {
      return this.modal._error(`Error adding ${eCount} ${this.typeName}s.\n Error message${(eCount == 1 ? '' :'s')}: ${errors}`);
    }    
  }

  // Use the most recently set data to update the values of form
  _resetForm(evt) {
    evt.preventDefault();
    this.setupForm(this._data);
  }

  
  _deleteType() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn f1 text-semibold text-red");

    let confirmText = document.createTextNode("Delete")
    button.appendChild(confirmText);

    button.addEventListener("click", this.asyncDelete.bind(this));

    this.modal._confirm({
      titleText: `Confirm Delete`,
      mainText: `Delete "${this.objectName}" (ID: ${this._data.id})? This cannot be undone.`,
      buttonSave: button
    });
  }

  async asyncDelete() {
    this.modal._modalCloseAndClear();
    try {
      const respData = await store.getState().removeType({ type: this.typeName, id: this._data.id });
      console.log("Delete response", respData);
      this.handleResponse(respData);
      window.location.replace(`${window.location.origin}${window.location.pathname}#${this.typeName}-New`);
    } catch (err) {
      this.modal._error(err)
    }
  }

  _getEmptyData() {
    this.typeId = "New";
    this.objectName = "";
    return {
      id: `New`,
      name: "+ Add New",
      project: this.projectId,
      description: "",
      visible: false,
      grouping_default: false,
      default_volume: 0,
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
