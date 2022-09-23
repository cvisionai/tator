import { TypeForm } from "./type-form.js";
// import { getCookie } from "../../util/get-cookie.js";
import { store, getCompiledList } from "../store.js";

export class VersionsEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Version";
      this.readableTypeName = "Version";
      this.icon = '<svg class="SideNav-icon icon-layers no-fill" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
      this._hideAttributes = true;
      this.versionId = null;

      const template = document.getElementById("versions-edit").content;
      this._shadow.appendChild(template.cloneNode(true));
  
      this._formDiv = this._shadow.getElementById("versions-edit--div");
      this.saveButton = this._shadow.getElementById("versions-edit--save");
      this.savePost = this._shadow.getElementById("versions-edit--save");
   }

   async _getSectionForm(data) {
      this.data = data;
      this.versionId = data.id;

      this._form = this._shadow.getElementById("versions-edit--form");
      // this._form.id = this.versionId; // todo still need this?
      
      // append input for name
      this._editName = this._shadow.getElementById("versions-edit--name");
      this._editName.setValue(this.data.name);
      this._editName.default = this.data.name;
      this._editName.addEventListener("change", this._formChanged.bind(this));

      // description
      this._editDescription = this._shadow.getElementById("versions-edit--description");
      this._editDescription.setValue(this.data.description);
      this._editDescription.default = this.data.description;
      this._editDescription.addEventListener("change", this._formChanged.bind(this));

      // Show Empty
      this._showEmpty = this._shadow.getElementById("versions-edit--show-empty");
      this._showEmpty.setValue(this.data.show_empty);
      this._showEmpty.default = this.data.show_empty;
      this._showEmpty.addEventListener("change", this._formChanged.bind(this));

      // number
      this._number = this._shadow.getElementById("versions-edit--number");
      if (typeof data.number === "undefined") {
         this._number.setValue("Created on Save");
         this._number.default = "";
      } else {
         this._number.setValue(this.data.number);
         this._number.default = this.data.number;
      }
      this._number._input.disabled = true;
      this._number._input.classList.add("disabled");
      this._number.addEventListener("change", this._formChanged.bind(this));

      // Bases
      const basesListWithChecked = getCompiledList({ type: this.typeName, skip: this.versionId, check: this.data.bases});

      this._basesCheckbox = this._shadow.getElementById("versions-edit--bases");
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;
      this._basesCheckbox.addEventListener("change", this._formChanged.bind(this));

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

      // Number is set on save, it is for display only
      // if (this._number.changed() || isNew) {
      //    formData.number = this._number.getValue();
      // }

      if (this._basesCheckbox.changed() || isNew) {
         formData.bases = this._basesCheckbox.getValue();
      }

      return formData;
   }

   /* This overrides the main type form */
   // TODO some complexity can be removed because attr forms are
   // no longer appended to main form save
   async _save({ id = -1 } = {}) {
      this.loading.showSpinner();
  
      if (this.isChanged() ) {
        try {
         //Get your form data...
         const formData = this._getFormData();

         if (Object.entries(formData).length === 0) {
            // Oops something went wrong...!
            this.loading.hideSpinner();
            return console.error("No formData");
         } else {
            if (typeof formData.name !== "undefined") {
               this.nameChanged = true;
               this.newName = formData.name;
            }

            const updatedResponse = await store.setState().updateType({ type: this.typeName, id, data: formData });
            console.log(updatedResponse);
            this.loading.hideSpinner();
            
            // if (updatedResponse.ok) {
               this._modalSuccess(currentMessage);
            // } else {
            //    this._modalError(currentMessage);
            // }
            
         }

          // Compiled messages from above
          this.saveModalMessage = "";

          if (this.successMessages !== "") {
            let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
            this.saveModalMessage += heading + this.successMessages;
          }
          if (this.failedMessages !== "") {
            let heading_1 = `<div class=" pt-4 h3 pt-4">Error</div>`;
            this.saveModalMessage += heading_1 + this.failedMessages;
          }
          let mainText = `${this.saveModalMessage}`;
      
          if (this.failedMessages !== "") {
            this.boxHelper._modalComplete(mainText);
          } else {
            this.boxHelper._modalSuccess(mainText);
          }
          
          await this.resetHard();
      
          this.loading.hideSpinner();
  
          // Clean up..................
          // Reset changed flags
           this.changed = false;
           
                   // Update related items with an event if required
            if (this.nameChanged) {
            this._updateNavEvent("rename", this.newName)
            } 

        } catch (err) {
          console.error("Error saving.", err);
          this.loading.hideSpinner();
          return this._modalError("Error saving.\nError: " + err);
        }
      } else {
        this.loading.hideSpinner();
        return this._modalSuccess("Nothing new to save!");
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

   _updateVersionList(versions, prevVersions) {
      console.log("Version-edit: UPDATE VERSIONS LIST!");
      const basesListWithChecked = getCompiledList({ type: this.typeName, skip: this.versionId, check: this.data.bases });
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;
   }
}

customElements.define("versions-edit", VersionsEdit);
