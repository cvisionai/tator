class VersionsEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Version";
      this.readableTypeName = "Version";
      this.icon = '<svg class="SideNav-icon icon-eye" viewBox="0 0 24 24" height="1em" width="1em"><path d="M0.106 11.553c-0.136 0.274-0.146 0.603 0 0.894 0.015 0.029 0.396 0.789 1.12 1.843 0.451 0.656 1.038 1.432 1.757 2.218 0.894 0.979 2.004 1.987 3.319 2.8 0.876 0.542 1.849 1 2.914 1.302 0.871 0.248 1.801 0.39 2.784 0.39s1.913-0.142 2.784-0.39c1.065-0.302 2.037-0.76 2.914-1.302 1.315-0.813 2.425-1.821 3.319-2.8 0.718-0.786 1.306-1.562 1.757-2.218 0.724-1.054 1.106-1.814 1.12-1.843 0.136-0.274 0.146-0.603 0-0.894-0.015-0.029-0.396-0.789-1.12-1.843-0.451-0.656-1.038-1.432-1.757-2.218-0.894-0.979-2.004-1.987-3.319-2.8-0.876-0.542-1.849-1-2.914-1.302-0.871-0.248-1.801-0.39-2.784-0.39s-1.913 0.142-2.784 0.39c-1.065 0.302-2.037 0.76-2.914 1.302-1.315 0.813-2.425 1.821-3.319 2.8-0.719 0.786-1.306 1.561-1.757 2.218-0.724 1.054-1.106 1.814-1.12 1.843zM2.141 12c0.165-0.284 0.41-0.687 0.734-1.158 0.41-0.596 0.94-1.296 1.585-2.001 0.805-0.881 1.775-1.756 2.894-2.448 0.743-0.459 1.547-0.835 2.409-1.079 0.703-0.2 1.449-0.314 2.237-0.314s1.534 0.114 2.238 0.314c0.862 0.245 1.666 0.62 2.409 1.079 1.119 0.692 2.089 1.567 2.894 2.448 0.644 0.705 1.175 1.405 1.585 2.001 0.323 0.471 0.569 0.873 0.734 1.158-0.165 0.284-0.41 0.687-0.734 1.158-0.41 0.596-0.94 1.296-1.585 2.001-0.805 0.881-1.775 1.756-2.894 2.448-0.743 0.459-1.547 0.835-2.409 1.079-0.704 0.2-1.45 0.314-2.238 0.314s-1.534-0.114-2.238-0.314c-0.862-0.245-1.666-0.62-2.409-1.079-1.119-0.692-2.089-1.567-2.894-2.448-0.644-0.705-1.175-1.405-1.585-2.001-0.323-0.471-0.569-0.874-0.733-1.158zM16 12c0-0.54-0.108-1.057-0.303-1.53-0.203-0.49-0.5-0.93-0.868-1.298s-0.809-0.666-1.299-0.869c-0.473-0.195-0.99-0.303-1.53-0.303s-1.057 0.108-1.53 0.303c-0.49 0.203-0.93 0.5-1.298 0.868s-0.666 0.809-0.869 1.299c-0.195 0.473-0.303 0.99-0.303 1.53s0.108 1.057 0.303 1.53c0.203 0.49 0.5 0.93 0.868 1.298s0.808 0.665 1.298 0.868c0.474 0.196 0.991 0.304 1.531 0.304s1.057-0.108 1.53-0.303c0.49-0.203 0.93-0.5 1.298-0.868s0.665-0.808 0.868-1.298c0.196-0.474 0.304-0.991 0.304-1.531zM14 12c0 0.273-0.054 0.53-0.151 0.765-0.101 0.244-0.25 0.464-0.435 0.65s-0.406 0.334-0.65 0.435c-0.234 0.096-0.491 0.15-0.764 0.15s-0.53-0.054-0.765-0.151c-0.244-0.101-0.464-0.25-0.65-0.435s-0.334-0.406-0.435-0.65c-0.096-0.234-0.15-0.491-0.15-0.764s0.054-0.53 0.151-0.765c0.101-0.244 0.25-0.464 0.435-0.65s0.406-0.334 0.65-0.435c0.234-0.096 0.491-0.15 0.764-0.15s0.53 0.054 0.765 0.151c0.244 0.101 0.464 0.25 0.65 0.435s0.334 0.406 0.435 0.65c0.096 0.234 0.15 0.491 0.15 0.764z"></path></svg>';
      this._hideAttributes = true;
      this.versionId = null;
   }

   async _getSectionForm(data) {
      let current = this.boxHelper.boxWrapDefault({
         "children": ""
      });

      this.versionId = data.id;

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
         this._number.setValue("");
         this._number.default = "";
      } else {
         this._number.setValue(this.data.number);
         this._number.default = this.data.number;
      }
      this._number._input.disabled = true;
      this._number.addEventListener("change", this._formChanged.bind(this));


      
      this._form.appendChild(this._number);

      // Bases
      // const basesList = new DataVersionList(this.projectId);
      const basesListWithChecked = await this.versionListHandler.getCompiledVersionList(data.bases, data.id);
      this._basesCheckbox = document.createElement("checkbox-set");
      this._basesCheckbox.setAttribute("name", "Bases");
      this._basesCheckbox.setAttribute("type", "number");
      this._basesCheckbox.setValue(basesListWithChecked);
      this._basesCheckbox.default = basesListWithChecked;
      console.log(this._basesCheckbox.default);
      this._basesCheckbox.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._basesCheckbox);

      current.appendChild(this._form);

      return current;
   }


   _getFormData() {
      const formData = {};

      console.log(`Data ID: ${this.data.id}`);
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

      console.log(this._basesCheckbox._default);
      console.log(this._basesCheckbox.getValue());
      console.log(this._basesCheckbox.changed());

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
         console.log("Main form was changed");
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
