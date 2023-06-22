import { TypeFormTemplate } from "../components/type-form-template.js";
import { getCompiledList, store } from "../store.js";

export class VersionsEdit extends TypeFormTemplate {
  constructor() {
    super();

    this.typeName = "Version";
    this.readableTypeName = "Version";
    this._hideAttributes = false;
    this.saveWarningFlow = true;

    //
    var templateInner = document.getElementById("versions-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("versions-edit--form");
    this._editName = this._shadow.getElementById("versions-edit--name");
    this._editDescription = this._shadow.getElementById(
      "versions-edit--description"
    );
    this._showEmpty = this._shadow.getElementById("versions-edit--show-empty");
    this._number = this._shadow.getElementById("versions-edit--number");
    this._basesCheckbox = this._shadow.getElementById("versions-edit--bases");
  }

  async _setupFormUnique() {
    // description
    this._editDescription.setValue(this._data.description);
    this._editDescription.default = this._data.description;

    // Show Empty
    this._showEmpty.setValue(this._data.show_empty);
    this._showEmpty.default = this._data.show_empty;

    // number
    this._number.permission = "View Only";
    if (typeof this._data.number === "undefined") {
      this._number.setValue("Created on Save");
      this._number.default = "";
    } else {
      this._number.setValue(this._data.number);
      this._number.default = this._data.number;
    }

    // Bases
    const basesListWithChecked = await getCompiledList({
      type: this.typeName,
      skip: this._data.id,
      check: this._data.bases,
    });
    this._basesCheckbox.setValue(basesListWithChecked);
    this._basesCheckbox.default = basesListWithChecked;
  }

  _getFormData() {
    const formData = {};
    const isNew = this._data.id == "New" ? true : false;

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editDescription.changed() || isNew) {
      formData.description = this._editDescription.getValue();
    }

    if (this._showEmpty.changed() || isNew) {
      formData.show_empty = this._showEmpty.getValue();
    }

    // Note: we SKIP this._number because Number (for display only) is set on save

    if (this._basesCheckbox.changed() || isNew) {
      formData.bases = this._basesCheckbox.getValue();
    }

    return formData;
  }

  async setUpWarningSaveMsg() {
    const counts = await store.getState().getCountsForVersion(this._data.id);
    if (counts == null) {
      // If we have some error return a generic message
      this._warningSaveMessage = this._genericEditWarningMsg;
    }

    // If this doesn't affect anything, don't show a warning
    if (counts.states === 0 && counts.loc === 0) return "skip";

    // Otherwise create the message with counts
    this._warningSaveMessage = `There are ${counts.state} state${
      counts.state == 1 ? "" : "s"
    } 
         and ${counts.loc} localization${
      counts.loc == 1 ? "" : "s"
    } existing in this version. 
         Any edits will be reflected on those existing states and localizations.
         <br/><br/> Do you want to continue?`;

    return this._warningSaveMessage;
  }

  async setUpWarningDeleteMsg() {
    const counts = await store.getState().getCountsForVersion(this._data.id);
    if (counts == null) {
      // If we have some error return a generic message
      this._warningDeleteMessage = this._genericDeleteWarningMsg;
    }

    // Otherwise create the message with counts
    this._warningDeleteMessage = `Pressing confirm will delete this Version and all related states and localizations from your account.
         <br/><br/>There are ${counts.state} state${
      counts.state == 1 ? "" : "s"
    } 
         and ${counts.loc} localization${
      counts.loc == 1 ? "" : "s"
    } that will also be deleted. 
         <br/><br/> Do you want to continue?`;

    return this._warningDeleteMessage;
  }
}

customElements.define("versions-edit", VersionsEdit);
