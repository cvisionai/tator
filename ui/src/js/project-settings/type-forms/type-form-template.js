import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeFormTemplate extends TatorElement {
  constructor() {
    super();

    // this.attributeSection = this._shadow.getElementById("type-form-attr-main");
    
    // console.log("Created type form....");
    this._hideAttributes = true;
    this.saveWarningFlow = false;
  }
     
  /**
   * @param {{ map?: any; id?: string; name?: string; project?: any; description?: string; visible?: boolean; grouping_default?: boolean; media?: never[]; dtype?: string; colorMap?: null; interpolation?: string; association?: string; line_width?: number; delete_child_localizations?: boolean; cluster?: null; manifest?: null; files_per_job?: null; parameters?: never[]; categories?: string; form?: string; } | null} val
   */
  set data(val) {
    console.log(val);
    if(val && val !== null){
      this._data = val;
    } else {
      this._data = this._getEmptyData();
    }

    this.typeId = this._data.id;
      this.objectName = this._data.name;
      this.projectId = this._data.project;

      // name
      if (this.typeName !== "Membership") {
        let name = (this._data.id === "New") ? "" : this._data.name
        this._editName.setValue(name);
        this._editName.default = name;
      }

      this._setupFormUnique(this._data);


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
      try {
        let respData = await this.doSaveAction(formData);
        this.handleResponse(respData);
      } catch (err) {
        this.modal._error(err)
      }
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
      return this.modal._error(data.data.message);
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
    this.typeId = "New";
    this.objectName = "";
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
