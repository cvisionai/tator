import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeFormTemplate extends TatorElement {
  constructor() {
    super();

    this._hideAttributes = true;
    this.saveWarningFlow = false;

    // Genenric fallback for warning flow save
    this._genericEditWarningMsg = "Are you sure you want to edit this entity?";
    this._warningSaveMessage = this._genericEditWarningMsg;

    // Generic fallback for delete message
    this._genericDeleteWarningMsg =
      "Pressing confirm will delete this entity and all its data from your account. Do you want to continue?";
    this._warningDeleteMessage = this._genericDeleteWarningMsg;

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    store.subscribe((state) => state.Project, this.setProjectIds.bind(this));
    store.subscribe((state) => state.isStaff, this.setIsStaff.bind(this));
  }

  setProjectIds(newProject) {
    this.projectId = newProject.data.id;
    this.organizationId = newProject.data.organization;
  }

  setIsStaff(newIS, oldIS) {
    this.isStaff = newIS;
  }

  /**
   * @param {{ map?: any; id?: string; name?: string; project?: any; description?: string; visible?: boolean; grouping_default?: boolean; media?: never[]; dtype?: string; colorMap?: null; interpolation?: string; association?: string; line_width?: number; delete_child_localizations?: boolean; cluster?: null; manifest?: null; files_per_job?: null; parameters?: never[]; categories?: string; form?: string; } | null} val
   */
  set data(val) {
    if (val && val !== null) {
      this._data = val;
    } else {
      this._data = this._getEmptyData();
    }

    this.typeId = this._data.id;
    this.objectName = this._data.name;

    // name
    if (this.typeName !== "Membership") {
      let name = this._data.id === "New" ? "" : this._data.name;
      this._editName.setValue(name);
      this._editName.default = name;
    }

    this._setupFormUnique();
  }

  _saveData() {
    if (this.saveWarningFlow == true && this.typeId !== "New") {
      this.warningFlowSave();
    } else {
      this.saveDataFunction();
    }
  }

  async saveDataFunction() {
    const formData = this._getFormData();

    if (Object.entries(formData).length !== 0 && !Array.isArray(formData)) {
      try {
        const respData = await this.doSaveAction(formData);
        this.handleResponse(respData);
      } catch (err) {
        this.modal._error(err);
      }
    } else if (Array.isArray(formData) && formData.length !== 0) {
      const responses = [];
      for (let d of formData) {
        const respData = await this.doSaveAction(d);
        responses.push(respData);
      }
      this.handleResponseList(responses);
    } else {
      this.modal._success("Nothing new to save!");
    }
  }

  /**
   *
   * @param {String}
   */
  async warningFlowSave() {
    const msg = await this.setUpWarningSaveMsg();

    if (msg == "skip") {
      // If an eval inside warning message decides it is ok, we can head right to save
      // ie. in versions if it will affect 0 states/loc no warning is required
      return this.saveDataFunction();
    }

    const button = document.createElement("button");
    button.setAttribute("class", "btn f1 text-semibold text-red");

    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);

    button.addEventListener("click", () => {
      this.saveDataFunction();
      this.modal._modalCloseAndClear();
    });

    this.modal._confirm({
      titleText: `Edit Confirmation`,
      mainText: `${this._warningSaveMessage}`,
      buttonSave: button,
    });
  }

  /* Overriede this in child (see Version-Edit) */
  async setUpWarningSaveMsg() {
    return;
  }

  /* Overriede this in child (see Version-Edit) */
  async setUpWarningDeleteMsg() {
    this._warningDeleteMessage = `Pressing confirm will delete this ${this.typeName} and all its data from your account.<br/><br/>
      <br/><br/>Do you want to continue?`;
    return this._warningDeleteMessage;
  }

  doSaveAction(formData) {
    const info = { type: this.typeName, id: this.typeId, data: formData };
    if (this.typeId == "New") {
      return store.getState().addType(info);
    } else {
      return store.getState().updateType(info);
    }
  }

  handleResponse(info) {
    let message = info.data?.message
      ? info.data.message
      : JSON.parse(info.response.text).message;
    if (info.response.ok) {
      return this.modal._success(message);
    } else {
      if (
        info.response?.text &&
        info.response?.status &&
        info.response?.statusText
      ) {
        return this.modal._error(
          `<strong>${info.response.status} ${info.response.statusText}</strong><br/><br/>${message}`
        );
      } else {
        this.modal._error(`Error: Could not process request.`);
      }
    }
  }

  handleResponseList(responses) {
    let sCount = 0;
    let eCount = 0;
    let errors = "";

    for (let object of responses) {
      if (object.response.ok) {
        sCount++;
      } else {
        eCount++;
        const message = JSON.parse(object.response.text).message;
        errors += `Error: ${message} \n`; //${r.data.message}
      }
    }

    if (sCount > 0 && eCount === 0) {
      return this.modal._success(
        `Successfully added ${sCount} ${this.typeName}s.`
      );
    } else if (sCount > 0 && eCount > 0) {
      return this.modal._complete(
        `Successfully added ${sCount} ${
          this.typeName
        }s.\n Error adding ${eCount} ${this.typeName}s.\n Error message${
          eCount == 1 ? "" : "s"
        }: ${errors}`
      );
    } else {
      return this.modal._error(
        `Error adding ${eCount} ${this.typeName}s.\n Error message${
          eCount == 1 ? "" : "s"
        }: ${errors}`
      );
    }
  }

  // Use the most recently set data to update the values of form
  _resetForm(evt) {
    evt.preventDefault();
    this.setupForm(this._data);
  }

  async _deleteType() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red");

    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);

    button.addEventListener("click", this.asyncDelete.bind(this));
    await this.setUpWarningDeleteMsg();

    this.modal._confirm({
      titleText: `Delete Confirmation`,
      mainText: this._warningDeleteMessage,
      buttonSave: button,
    });
  }

  async asyncDelete() {
    this.modal._modalCloseAndClear();
    try {
      const respData = await store
        .getState()
        .removeType({ type: this.typeName, id: this._data.id });
      this.handleResponse(respData);

      if (this.typeName == "Project") {
        setTimeout(function () {
          window.location.href = "/projects/";
        }, 3000);
      } else {
        window.location.replace(
          `${window.location.origin}${window.location.pathname}#${this.typeName}-New`
        );
      }
    } catch (err) {
      this.modal._error(err);
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
      color_map: null,
      interpolation: "none",
      association: "Media",
      line_width: 2,
      delete_child_localizations: false,
      cluster: null,
      manifest: null,
      files_per_job: null,
      parameters: [],
      categories: "",
      form: "empty",
    };
  }
}

if (!customElements.get("type-form-template")) {
  customElements.define("type-form-template", TypeFormTemplate);
}
