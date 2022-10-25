import { TypeFormTemplate } from "./type-form-template.js";
import { getCompiledList } from "../store.js";

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
      this._editDescription = this._shadow.getElementById("versions-edit--description");
      this._showEmpty = this._shadow.getElementById("versions-edit--show-empty");
      this._number = this._shadow.getElementById("versions-edit--number");
      this._basesCheckbox = this._shadow.getElementById("versions-edit--bases");
   }

   async _setupFormUnique(data) {
      // description
      this._editDescription.setValue(this._data.description);
      this._editDescription.default = this._data.description;

      // Show Empty
      this._showEmpty.setValue(this._data.show_empty);
      this._showEmpty.default = this._data.show_empty;

      // number
      this._number.permission = "View Only";
      if (typeof data.number === "undefined") {
         this._number.setValue("Created on Save");
         this._number.default = "";
      } else {
         this._number.setValue(this._data.number);
         this._number.default = this._data.number;
      }

      // Bases   
      const basesListWithChecked = await getCompiledList({ type: this.typeName, skip: data.id, check: this._data.bases});
      // console.log("Set value in checkbox set..."+basesListWithChecked.length);
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;
   }


   _getFormData() {
      const formData = {};

      // console.log(`Data ID: ${this._data.id}`);
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
      const counts = await state.getState().getCountsRelatedToVersion(this._data.id);
      this._warningSaveMessage = `There are ${counts.state} state${(counts.state == 1) ? '' : 's'} 
         and ${counts.loc} localization${(counts.loc == 1) ? '' : 's'} existing in this version. 
         Any edits will be reflected on those existing states and localizations.
         <br/><br/> Do you want to continue?`;
   }
}

customElements.define("versions-edit", VersionsEdit);
