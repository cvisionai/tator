class AlgorithmEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Algorithm";
      this.readableTypeName = "Algorithm";
      this.icon = `<svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" class="SideNav-icon" id="Layer_1" width="24px" height="24px" x="0px" y="0px" viewBox="0 0 472.615 472.615" style="enable-background:new 0 0 472.615 472.615;" xml:space="preserve">
      <g>
         <g>
            <circle cx="204.002" cy="183.237" r="49.063"/>
         </g>
      </g>
      <g>
         <g>
            <path d="M391.799,181.04C390.449,80.923,307.79,0,206.418,0C104.179,0,21.038,82.273,21.038,182.584    c-0.193,2.603-5.691,64.912,38.773,128.184c19.002,27.2,31.444,53.242,37.714,79.574c4.244,17.843,7.426,48.418,7.426,72.628    v9.645h214.799v-96.452h77.162v-86.807h54.978L391.799,181.04z M329.395,199.588l-29.642,4.941    c-2.505,11.305-6.973,21.85-13.007,31.318l17.489,24.485l-23.13,23.129l-24.484-17.489c-9.468,6.034-20.012,10.502-31.318,13.007    l-4.941,29.643h-32.71l-4.941-29.643c-11.305-2.505-21.85-6.973-31.318-13.007l-24.484,17.489l-23.13-23.129l17.489-24.485    c-6.034-9.468-10.502-20.012-13.007-31.318l-29.642-4.941v-32.71l29.642-4.94c2.505-11.305,6.973-21.851,13.007-31.319    l-17.489-24.484l23.13-23.13l24.484,17.49c9.468-6.035,20.012-10.503,31.318-13.007l4.941-29.643h32.71l4.941,29.643    c11.305,2.504,21.85,6.972,31.318,13.007l24.484-17.49l23.13,23.13l-17.489,24.484c6.033,9.468,10.502,20.013,13.007,31.319    l29.642,4.94V199.588z"/>
         </g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      <g>
      </g>
      </svg>`;
      this._hideAttributes = true;
      this.versionId = null;
   }

   async _getSectionForm(data) {
      this.data = data;
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

      // Path to manifest
      this._manifestPath = document.createElement("text-input");
      this._manifestPath.setAttribute("name", "Manifest Path");
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
      this._clusterEnumInput.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._clusterEnumInput);

      // User
      // this._userEdit = document.createElement("text-input");
      // this._userEdit.setAttribute("name", "User");
      // this._userEdit.setValue(this.data.user);
      // this._userEdit.default = this.data.user;
      // this._userEdit.addEventListener("change", this._formChanged.bind(this));
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
      this._parametersList = document.createElement("array-input");
      this._parametersList.setAttribute("name", "Parameters");
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
      const isNew = this.data.id == "New" ? true : false;

      if (this._editName.changed() || isNew) {
         formData.name = this._editName.getValue();
      }

      if (this._editDescription.changed() || isNew) {
         formData.description = this._editDescription.getValue();
      }

      if (this._manifestPath.changed() || isNew) {
         formData.manifest = this._manifestPath.getValue();
      }

      if (this._cluster.changed() || isNew) {
         formData.cluster = this._cluster.getValue();
      }

      if (this._userEdit.changed() || isNew) {
         formData.user = this._userEdit.getValue();
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

customElements.define("algorithm-edit", AlgorithmEdit);
