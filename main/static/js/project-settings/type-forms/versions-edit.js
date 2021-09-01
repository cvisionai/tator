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
      console.log(this.versionId);

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
      if (typeof data.number == "undefined") {
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
      console.log(basesListWithChecked);

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

      if (this._number.changed() || isNew) {
         formData._number = this._number.getValue();
      }

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

   _saveConfirmed({ id = this.versionId }) {
      this._modalCloseCallback();
      // Start spinner & Get promises list
      console.log("Settings _save method for id: " + id);
      // this.loading.showSpinner();

      let promises = []
      let errors = 0; // @TODO

      this._nameEdit = {
         edited: false,
         newName: "",
         typeName: this.typeName,
         typeId: this.typeId
       }

      // Main type form
      if (this.isChanged()) {
         // console.log("Main form was changed");
         const formData = this._getFormData();
         if (Object.entries(formData).length === 0) {
            return console.error("No formData");
         } else {
            promises.push(this._fetchPatchPromise({ id, formData }));
            if (typeof formData.name !== "undefined") {
               this._nameEdit.edited = true;
               this._nameEdit.newName = formData.name;
             }
         }
      }

      let messageObj = {};
      if (promises.length > 0 && errors === 0) {
         // Check if anything changed
         Promise.all(promises).then(async (respArray) => {
            let responses = [];
            respArray.forEach((item, i) => {
               responses.push(item.json())
            });

            Promise.all(responses)
               .then(dataArray => {
                  messageObj = this._handleResponseWithAttributes({
                     id,
                     dataArray,
                     hasAttributeChanges: false,
                     attrPromises: [],
                     respArray
                  });

                  let message = "";
                  let success = false;
                  let error = false;
                  if (messageObj.messageSuccess) {
                     let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
                     message += heading + messageObj.messageSuccess;
                     success = true;
                  }
                  if (messageObj.messageError) {
                     let heading = `<div class=" pt-4 h3 pt-4">Error</div>`;
                     message += heading + messageObj.messageError;
                     error = true;
                  }

                  if (messageObj.requiresConfirmation) {
                     let buttonSave = this._getAttrGlobalTrigger(id);
                     let confirmHeading = `<div class=" pt-4 h3 pt-4">Global Change(s) Found</div>`
                     let subText = `<div class="f1 py-2">Confirm to update across all types. Uncheck and confirm, or cancel to discard.</div>`

                     let mainText = `${message}${confirmHeading}${subText}${messageObj.messageConfirm}`;
                     this.loading.hideSpinner();
                     this._modalConfirm({
                        "titleText": "Complete",
                        mainText,
                        buttonSave
                     });
                  } else {
                     let mainText = `${message}`;
                     this.loading.hideSpinner();
                     this._modalComplete(
                        mainText
                     );
                     // Reset forms to the saved data from model
                     this.resetHard();
                  }
               }).then(() => {
                  // Reset changed flag
                  this.changed = false;

                  // Update anything related
                  // Update related items with an event if required
                  if (this._nameEdit.edited) {
                     this._updateNavEvent("rename", this._nameEdit.newName)
                  }
               });

         }).catch(err => {
            console.error("File " + err.fileName + " Line " + err.lineNumber + "\n" + err);
            this.loading.hideSpinner();
         });
      } else if (!promises.length > 0) {
         this.loading.hideSpinner();
         console.error("Attempted to save but no promises found.");
         return this._modalSuccess("Nothing new to save!");
      } else if (!errors === 0) {
         this.loading.hideSpinner();
         return this._modalError("Please fix form errors.");
      } else {
         this.loading.hideSpinner();
         return this._modalError("Problem saving form data.");
      }
   }

}

customElements.define("versions-edit", VersionsEdit);
