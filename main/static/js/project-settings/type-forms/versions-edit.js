class VersionsEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Version";
      this.readableTypeName = "Version";
      this.icon = '<svg class="SideNav-icon icon-layers no-fill" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
      this._hideAttributes = true;
      this.versionId = null;
   }

   async _getSectionForm(data) {
      let current = this.boxHelper.boxWrapDefault({
         "children": ""
      });

      this.versionId = data.id;
      // console.log(this.versionId);

      //
      this._setForm();

      
      // append input for name
      this._editName = document.createElement("text-input");
      this._editName.setAttribute("name", "Name");
      this._editName.setAttribute("type", "string");
      this._editName.setValue(this.data.name);
      this._editName.default = this.data.name;
      this._editName.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._editName);

      // description
      this._editDescription = document.createElement("text-input");
      this._editDescription.setAttribute("name", "Description");
      this._editDescription.setAttribute("type", "string");
      this._editDescription.setValue(this.data.description);
      this._editDescription.default = this.data.description;
      this._editDescription.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._editDescription);

      // Show Empty
      this._showEmpty = document.createElement("bool-input");
      this._showEmpty.setAttribute("name", "Show Empty");
      this._showEmpty.setAttribute("on-text", "Yes");
      this._showEmpty.setAttribute("off-text", "No");
      this._showEmpty.setValue(this.data.show_empty);
      this._showEmpty.default = this.data.show_empty;
      this._showEmpty.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._showEmpty);

      // number
      this._number = document.createElement("text-input");
      this._number.setAttribute("name", "Number");
      this._number.setAttribute("type", "int");
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
      
      this._form.appendChild(this._number);

      // Bases
      const basesListWithChecked = await this.versionListHandler.getCompiledVersionList(data.bases, data.id);
      // console.log(basesListWithChecked);

      this._basesCheckbox = document.createElement("checkbox-set");
      this._basesCheckbox.setAttribute("name", "Bases");
      this._basesCheckbox.setAttribute("type", "number");
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;
      this._basesCheckbox.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._basesCheckbox);

      current.appendChild(this._form);

      return current;
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

      // if (this._number.changed() || isNew) {
      //    formData.number = this._number.getValue();
      // }

      if (this._basesCheckbox.changed() || isNew) {
         formData.bases = this._basesCheckbox.getValue();
      }

      return formData;
   }

   async _deleteTypeConfirm() {
      this.loading.showSpinner();
      let button = document.createElement("button");
      let confirmText = document.createTextNode("Confirm")
      button.appendChild(confirmText);
      button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red")

      button.addEventListener("click", this._deleteType.bind(this));

      // Check the related state types
      const [sc, lc] = await Promise.all(
         [fetch(`/rest/StateCount/${this.projectId}?version=${this.versionId}`,
            {
               method: "GET",
               credentials: "same-origin",
               headers: {
                  "X-CSRFToken": getCookie("csrftoken"),
                  "Accept": "application/json",
                  "Content-Type": "application/json"
               }
            }
         ),
         fetch(`/rest/LocalizationCount/${this.projectId}?version=${this.versionId}`,
            {
               method: "GET",
               credentials: "same-origin",
               headers: {
                  "X-CSRFToken": getCookie("csrftoken"),
                  "Accept": "application/json",
                  "Content-Type": "application/json"
               }
            })]
      );

      const stateCountData = sc.json();
      const LocalizationCountData = lc.json();

      Promise.all([stateCountData, LocalizationCountData])
         .then(([stateCount, LocalizationCount]) => {
            this._modalConfirm({
               "titleText": `Delete Confirmation`,
               "mainText": `Pressing confirm will delete this ${this.typeName} and all related states and localizations from your account.<br/><br/><span class="text-ted">There are ${stateCount} states and ${LocalizationCount} localizations that will also be deleted.</span><br/><br/>Do you want to continue?`,
               "buttonSave": button,
               "scroll": false
            });
         });
   }

   async _save({ id = -1, globalAttribute = false } = {}) {
      this.loading.showSpinner();

      // Overriding save to show prompt
      let button = document.createElement("button");
      let confirmText = document.createTextNode("Confirm")
      button.appendChild(confirmText);
      button.setAttribute("class", "btn btn-clear f1 text-semibold")

      button.addEventListener("click", this._saveConfirmed.bind(this));

      // Check the related state types
      const [sc, lc] = await Promise.all(
         [fetch(`/rest/StateCount/${this.projectId}?version=${this.versionId}`,
            {
               method: "GET",
               credentials: "same-origin",
               headers: {
                  "X-CSRFToken": getCookie("csrftoken"),
                  "Accept": "application/json",
                  "Content-Type": "application/json"
               }
            }
         ),
         fetch(`/rest/LocalizationCount/${this.projectId}?version=${this.versionId}`,
            {
               method: "GET",
               credentials: "same-origin",
               headers: {
                  "X-CSRFToken": getCookie("csrftoken"),
                  "Accept": "application/json",
                  "Content-Type": "application/json"
               }
            })]
      );

      const stateCountData = sc.json();
      const LocalizationCountData = lc.json();

      Promise.all([stateCountData, LocalizationCountData])
         .then(([stateCount, LocalizationCount]) => {
            this.loading.hideSpinner();
            this._modalConfirm({
               "titleText": `Edit Confirmation`,
               "mainText": `There are ${stateCount} states and ${LocalizationCount} localizations existing in this version. Any edits will be reflected on those existing states and localizations.<br/><br/>Do you want to continue?`,
               "buttonSave": button,
               "scroll": false
            });
         });
   }

   async _saveConfirmed({ id = this.versionId }) {
      this.loading.showSpinner();
  
      //create form data & post promise array for the attribute forms, and submit
      this.successMessages = "";
      this.failedMessages = "";
      this.confirmMessages = "";
      this.nameChanged = false;
      this.newName = null;
      this.saveModalMessage = "";
      this.requiresConfirmation = false;
      this.hasAttributeChanges = this.attributeSection && this.attributeSection.hasChanges ? true : false;
  
  
      if (this.isChanged() || this.hasAttributeChanges) {
        try {
          if (this.isChanged()) {
            // Main type form
            await this._typeFormChanged({ id });
          }
        } catch (err) {
          console.error("Error saving.", err);
          this.loading.hideSpinner();
          return this._modalError("Error saving type form changes.\nError: " + err);
        }
        try {
          if (this.hasAttributeChanges) {
            // All attribute forms
            const attrFormsChanged = this.attributeSection.attrForms.filter(form => form._changed);
            if (attrFormsChanged && attrFormsChanged.length > 0) {
              for (let form of attrFormsChanged) {
                await this._attrFormsChanged(form);
              }
            }
          }
        } catch (err) {
          console.error("Error saving.", err);
          this.loading.hideSpinner();
          return this._modalError("Error saving attribute changes.\nError: " + err);
        }
  
        try {
          // Compiled messages from above
          await this._showSaveCompletModal();
  
          // Clean up..................
          // Reset changed flags
          this.changed = false;
          if (this.hasAttributeChanges) {
            const attrFormsChanged = this.attributeSection.attrForms.filter(form => form._changed);
            if (attrFormsChanged.length > 0) {
              for (let f of attrFormsChanged) {
                f.changeReset();
              }
            }
          }
  
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

}

customElements.define("versions-edit", VersionsEdit);
