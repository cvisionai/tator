import { TypeForm } from "./type-form.js";
// import { getCookie } from "../../util/get-cookie.js";
import { store, getCompiledList } from "../store.js";

export class VersionsEdit extends TypeForm {
   constructor() {
      super();

      this._typeName = "Version";
      this.readableTypeName = "Version";
      
      // const templateInner = document.getElementById("versions-edit").content;
      var templateInner = document.getElementById("versions-edit");
      var innerClone = document.importNode(templateInner.content, true);
      this.typeFormDiv.appendChild(innerClone);

      this._form = this._shadow.getElementById("versions-edit--form");
      this._editName = this._shadow.getElementById("versions-edit--name");
      this._editDescription = this._shadow.getElementById("versions-edit--description");
      this._showEmpty = this._shadow.getElementById("versions-edit--show-empty");
      this._number = this._shadow.getElementById("versions-edit--number");
      this._basesCheckbox = this._shadow.getElementById("versions-edit--bases");
   
      console.log("Created version edit....");
      console.log(this._editName);
   }

   async setupForm(data) {
      this.data = data;

      // Setup view
      this._typeId = data.id;
      this._objectName = data.name;
      this._projectId = data.project;

      // name
      let  name  = ""
      if(data.id !== "New") name = this.data.name
      this._editName.setValue(name);
      this._editName.default = name;

      // description
      this._editDescription.setValue(this.data.description);
      this._editDescription.default = this.data.description;

      // Show Empty
      this._showEmpty.setValue(this.data.show_empty);
      this._showEmpty.default = this.data.show_empty;

      // number
      this._number.permission = "View Only";
      if (typeof data.number === "undefined") {
         this._number.setValue("Created on Save");
         this._number.default = "";
      } else {
         this._number.setValue(this.data.number);
         this._number.default = this.data.number;
      }

      // Bases
      
      const basesListWithChecked = getCompiledList({ type: this.typeName, skip: data.id, check: this.data.bases});
      // console.log("Set value in checkbox set..."+basesListWithChecked.length);
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;

      return this._formDiv;
   }


   _getFormData() {
      const formData = {};

      // console.log(`Data ID: ${this.data.id}`);
      const isNew = this.data.id == "New" ? true : false;

      if (this._editName.changed() || isNew) {
         formData.name = this._editName.getValue();
      }

      if (this._editDescription.changed() || isNew) {
         formData.description = this._editDescription.getValue();
      }

      if (this._showEmpty.changed() || isNew) {
         formData.show_empty = this._showEmpty.getValue();
      }

      // SKIP this._number: Number is set on save, it is for display only

      if (this._basesCheckbox.changed() || isNew) {
         formData.bases = this._basesCheckbox.getValue();
      }

      return formData;
   }

   /* This overrides the main type form */
   // TODO some complexity can be removed because attr forms are
   // no longer appended to main form save
   async _save() {
      try {
         //Get your form data...
         const formData = this._getFormData();

         if (Object.entries(formData).length === 0) {
            this._modalSuccess("Nothing new to save!");
         } else {
            // Update type will control the spinner showing on page
            // updated versions will update everything else - no need to hard refresh
            const updatedResponse = await store.setState().updateType({ type: this.typeName, id: this.versionId, data: formData });
            console.log(updatedResponse);

            // Take the response message for the modal to show the user
            // #TDO
         }
      } catch (err) {
         console.error("Error saving version.", err);
      }
   }

   async _deleteTypeConfirm() {
      this.loading.showSpinner();
      let button = document.createElement("button");
      let confirmText = document.createTextNode("Confirm")
      button.appendChild(confirmText);
      button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red")

      button.addEventListener("click", this._deleteType.bind(this));

      // Check the related state types
      // Check the states and annotations in this versions for confirm msg
      const { stateCount, localizationCount } = await store.getState().getVersionContentCount(this.versionId);

      this.loading.hideSpinner();
      this._modalConfirm({
         "titleText": `Delete Confirmation`,
         "mainText": `
               Pressing confirm will delete this ${this.typeName} and all related states and localizations from your account.<br/><br/>
               <span class="text-red">
                  There are ${stateCount} states and ${localizationCount} localizations that will also be deleted.
               </span><br/><br/>
               Do you want to continue?
            `,
         "buttonSave": button,
         "scroll": false
      });
   }

   _saveEntityButton(id) {
      // console.log("Creating Save button from Version");
      this.saveButton.setAttribute("type", "submit");
      this.saveButton.setAttribute("value", "Save");
      this.saveButton.setAttribute("class", `btn btn-clear f1 text-semibold`);
  
  
      if (!this.saveButton.disabled) {
        this.saveButton.addEventListener("click", (event) => {
          this.saveButton.disabled = true;
          this.saveButton.classList.add("disabled");
          event.preventDefault();
          if (this.isChanged()) {
            // console.log("Save for id: " + id);
            this._saveWithConfirm({ "id": id }).then(() => {
              this.saveButton.disabled = false;
              this.saveButton.classList.remove("disabled");
            })
          } else {
            // @TODO- UX Save button disabled until form change
            let happyMsg = "Nothing new to save!";
            this._modalSuccess(happyMsg);
          }
        });
      }
  
      return this.saveButton;
    }

   async _saveWithConfirm({ id = -1, globalAttribute = false } = {}) {
      this.loading.showSpinner();

      // Overriding save to show prompt
      let button = document.createElement("button");
      let confirmText = document.createTextNode("Confirm")
      button.appendChild(confirmText);
      button.setAttribute("class", "btn btn-clear f1 text-semibold")

      button.addEventListener("click", this._save.bind(this));

      // Check the states and annotations in this versions for confirm msg
      const { stateCount, localizationCount } = await store.getState().getVersionContentCount(this.versionId);

      this.loading.hideSpinner();
      this._modalConfirm({
         "titleText": `Edit Confirmation`,
         "mainText": `
               There are ${stateCount} states and ${localizationCount} localizations existing in this version. 
               Any edits will be reflected on those existing states and localizations.<br/><br/>
               Do you want to continue?
            `,
         "buttonSave": button,
         "scroll": false
      });
   }

   _updateVersionList() {
      console.log("Version-edit: UPDATE VERSIONS LIST!");
      const basesListWithChecked = getCompiledList({ type: this.typeName, skip: this.data.id, check: this.data.bases });
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;
   }
}

customElements.define("versions-edit", VersionsEdit);
