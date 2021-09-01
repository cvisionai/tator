class AlgorithmEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Algorithm";
      this.readableTypeName = "Algorithm";
      this.icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="SideNav-icon icon-cpu no-fill"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
      this._hideAttributes = true;
      this.versionId = null;
   }

   async _getSectionForm(data) {
      this.data = data;
      let current = this.boxHelper.boxWrapDefault({
         "children": ""
      });

      this.algorithmId = data.id;
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

      // Path to manifest
      this._manifestPath = document.createElement("file-input");
      this._manifestPath.setAttribute("name", "Manifest");
      this._manifestPath.setAttribute("for", "manifest");
      this._manifestPath.setAttribute("type", "yaml");
      this._manifestPath.projectId = this.projectId;
      this._manifestPath.setValue(this.data.manifest);
      this._manifestPath.default = this.data.manifest;
      this._manifestPath.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._manifestPath);

      // Cluster
      const jobClusterWithChecked = await this.clusterListHandler.getCompiledList(this.data.cluster);
      this._clusterEnumInput = document.createElement("enum-input");
      this._clusterEnumInput.setAttribute("name", "Job Cluster");
      this._clusterEnumInput.choices = jobClusterWithChecked;
      this._clusterEnumInput.default = this.data.cluster;
      if (jobClusterWithChecked.length == 0) {
         this._clusterEnumInput.setAttribute("tooltip", "No Job Clusters associated to this Organization");
      } else {
         this._clusterEnumInput.addEventListener("change", this._formChanged.bind(this));
      }
      
      this._form.appendChild(this._clusterEnumInput);

      // User
      this._userEdit = document.createElement("text-input");
      this._userEdit.setAttribute("name", "User");
      this._userEdit.setValue(this.data.user);
      this._userEdit.default = this.data.user;
      this._userEdit.addEventListener("change", this._formChanged.bind(this));
      // this._form.appendChild(this._userEdit);

      // Files per job
      this._filesPerJob = document.createElement("text-input");
      this._filesPerJob.setAttribute("name", "Files Per Job");
      this._filesPerJob.setAttribute("type", "int");
      this._filesPerJob.setValue(this.data.files_per_job);
      this._filesPerJob.default = this.data.files_per_job;
      this._filesPerJob.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._filesPerJob);

      // Categories
      this._categoriesList = document.createElement("array-input");
      this._categoriesList.setAttribute("name", "Categories");
      this._categoriesList.setValue(this.data.categories);
      this._categoriesList.default = this.data.categories;
      this._categoriesList.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._categoriesList);

      // Parameters
      let paramInputTypes = JSON.stringify({ name: 'text-input', value: 'text-input' });
      let paramInputTemplate = JSON.stringify({ name: '', value: '' });
      this._parametersList = document.createElement("array-object-input");
      this._parametersList.setAttribute("name", "Parameters");
      this._parametersList.setAttribute("properties", paramInputTypes);
      this._parametersList.setAttribute("empty-row", paramInputTemplate);
      this._parametersList.setValue(this.data.parameters);
      this._parametersList.default = this.data.parameters;
      this._parametersList.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._parametersList);


      current.appendChild(this._form);

      return current;
   }


   _getFormData() {
      const formData = {};

      // console.log(`Data ID: ${this.data.id}`);
      // const isNew = this.data.id == "New" ? true : false;
      const isNew = true;

      if (this._editName.changed() || isNew) {
         formData.name = this._editName.getValue();
      }

      if (this._editDescription.changed() || isNew) {
         formData.description = this._editDescription.getValue();
      }

      if (this._manifestPath.changed() || isNew) {
         formData.manifest = this._manifestPath.getValue();
      }

      if (this._clusterEnumInput.changed() || isNew) {
         formData.cluster = Number(this._clusterEnumInput.getValue());
      }

      if (this._userEdit.changed() || isNew) {
         formData.user = Number(this._userEdit.getValue());
      }

      if (this._filesPerJob.changed() || isNew) {
         formData.files_per_job = this._filesPerJob.getValue();
      }

      if (this._categoriesList.changed() || isNew) {
         formData.categories = this._categoriesList.getValue();
      }

      if (this._parametersList.changed() || isNew) {
         formData.parameters = this._parametersList.getValue();
      }

      return formData;
   }

   async _save({ id = -1, globalAttribute = false } = {}) {
      this.loading.showSpinner();

      id = this.algorithmId;
      // Start spinner & Get promises list
      console.log("Settings _save method for algorithm id: " + id);
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

customElements.define("algorithm-edit", AlgorithmEdit);
