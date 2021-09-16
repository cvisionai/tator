class AlgorithmEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Algorithm";
      this.readableTypeName = "Algorithm";
      this.icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="SideNav-icon icon-cpu no-fill"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
      this._hideAttributes = true;
      this.versionId = null;

      // To show who algo is registered to
      this._userData = document.createElement("user-data");
   }

   async _getSectionForm(data) {
      this.data = data;
      let current = this.boxHelper.boxWrapDefault({
         "children": ""
      });

      this.algorithmId = data.id;

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


      // User
      this._registeredUserName = "";
      this._registeredUserId = "";
      if (this.data.id == "New") {
         //use current user
         let userData = await this._userData.getCurrentUser();
         // console.log(userData);
         this._registeredUserName = `${userData.first_name} ${userData.last_name}`;
         this._registeredUserId = userData.id;
      } else {
         let userData = await this._userData.getUserById(this.data.user);
         // console.log(userData);
         this._registeredUserName = `${userData.first_name} ${userData.last_name}`;
         this._registeredUserId = userData.id;
      }

      // Visible input with readable name
      this._userEditVisible = document.createElement("text-input");
      this._userEditVisible.setAttribute("name", "Registering User");
      this._userEditVisible.setValue(this._registeredUserName);
      this._userEditVisible.default = this._registeredUserName;
      this._userEditVisible.permission = null;
      this._userEditVisible.addEventListener("change", this._formChanged.bind(this));
      // this._userEditVisible.setAttribute("tooltip", "User registering algorithm cannot be edited.")
      this._form.appendChild(this._userEditVisible);

      // Hidden input for formValue
      this._userEdit = document.createElement("text-input");
      this._userEdit.setValue(this._registeredUserId);
      this._userEdit.default = this._registeredUserId;
      this._userEdit.permission = null;
      this._userEdit.addEventListener("change", this._formChanged.bind(this));

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
      // this.member = this._getUserMembership(this._registeredUserId);
      // console.log(this.member);
      const jobClusterWithChecked = await this.clusterListHandler.getCompiledList(this.data.cluster);

      if (jobClusterWithChecked == null || jobClusterWithChecked.length == 0) {
         this._clusterEnumInput = document.createElement("text-input");
         this._clusterEnumInput.disabled = true;
         this._clusterEnumInput.setAttribute("name", "Job Cluster");
         this._clusterEnumInput.setValue("Null");
         this._clusterEnumInput.setAttribute("tooltip", "No Job Clusters associated to this Organization");
      } else {
         this._clusterEnumInput = document.createElement("enum-input");
         this._clusterEnumInput.setAttribute("name", "Job Cluster");
         this._clusterEnumInput.choices = jobClusterWithChecked;
         this._clusterEnumInput.default = this.data.cluster;
         this._clusterEnumInput.addEventListener("change", this._formChanged.bind(this));
      }

      this._form.appendChild(this._clusterEnumInput);


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

      if (this._manifestPath.changed() || (this._manifestPath.getValue() !== "")) {
         formData.manifest = this._manifestPath.getValue();
       } else if (isNew && !this._manifestPath.changed()) {
         formData.manifest = null;         
      }

      if (this._clusterEnumInput.changed() || isNew) {
         let clusterValue = this._clusterEnumInput.getValue();
         // console.log(clusterValue);
         if (clusterValue === null || clusterValue === "Null" || clusterValue == "") {
            formData.cluster = null;
         } else {
            formData.cluster = Number(clusterValue);
         }

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

   async _getUserMembership(userID) {
      // Membership section.
      if (this._projectMemberships == null) {
        this.membershipBlock = document.createElement("membership-edit");
        let membershipResp = await this.membershipBlock._fetchGetPromise({ "id": this.projectId });
        
        if (membershipResp.status !== 200) {
          return null;
        } else {
          this._projectMemberships = await membershipResp.json();
        }

        for( let member of this._projectMemberships){
           if (member.user == userID) {
              return member.permission;
           }
        }
        
      }
      
      return null;
    }

}

customElements.define("algorithm-edit", AlgorithmEdit);
