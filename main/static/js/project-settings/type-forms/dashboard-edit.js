class DashboardEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Dashboard";
      this.readableTypeName = "Dashboard";
      this.icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="SideNav-icon icon-cpu no-fill"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
      this._hideAttributes = true;
      this.versionId = null;

      // To show who algo is registered to
      // this._userData = document.createElement("user-data");
   }

   async _getSectionForm(data) {
      this.data = data;
      this.dashboardId = data.id;
      this._setForm();
      let current = this.boxHelper.boxWrapDefault({
         "children": ""
      });

      // append input for name
      this._editName = document.createElement("text-input");
      this._editName.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._editName.setAttribute("name", "Name");
      this._editName.setAttribute("type", "string");
      this._editName.setValue(this.data.name);
      this._editName.default = this.data.name;
      this._editName.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._editName);

      // description
      this._editDescription = document.createElement("text-input");
      this._editDescription.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._editDescription.setAttribute("name", "Description");
      this._editDescription.setAttribute("type", "string");
      this._editDescription.setValue(this.data.description);
      this._editDescription.default = this.data.description;
      this._editDescription.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._editDescription);

      // Path to html file
      this._htmlFilePath = document.createElement("file-input");
      // this._htmlFilePath.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._htmlFilePath.setAttribute("name", "HTML File");
      this._htmlFilePath.setAttribute("for", "manifest");
      // this._htmlFilePath.setAttribute("type", "html");
      this._htmlFilePath.projectId = this.projectId;
      this._htmlFilePath.setValue(this.data.html_file);
      this._htmlFilePath.default = this.data.html_file;

      this._htmlFilePath._fetchCall = (bodyData) => {
         return fetch(`/rest/SaveHTMLFile/${this.projectId}`,
            {
               method: "POST",
               credentials: "same-origin",
               body: JSON.stringify(bodyData),
               headers: {
                  "X-CSRFToken": getCookie("csrftoken"),
                  "Accept": "application/json",
                  "Content-Type": "application/json"
               }
            }
         ).then(resp => resp.json()).then(
            htmlData => {
               console.log(htmlData);
               this._htmlFilePath.setValue(htmlData.url);
               Utilities.showSuccessIcon(`HTML file uploaded to: ${htmlData.url}`);
            }
         );
      };

      this._htmlFilePath.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._htmlFilePath);

      // Categories
      this._categoriesList = document.createElement("array-input");
      // this._categoriesList.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._categoriesList.setAttribute("name", "Categories");
      this._categoriesList.setValue(this.data.categories);
      this._categoriesList.default = this.data.categories;
      this._categoriesList.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._categoriesList);

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

      if (this._htmlFilePath.changed() || (this._htmlFilePath.getValue() !== "")) {
         formData.html_file = this._htmlFilePath.getValue();
       } else if (isNew && !this._htmlFilePath.changed()) {
         formData.html_file = null;         
      }

      if (this._categoriesList.changed() || isNew) {
         formData.categories = this._categoriesList.getValue();
      }

      return formData;
   }

}

customElements.define("dashboard-edit", DashboardEdit);
