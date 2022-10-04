import { TypeForm } from "./type-form.js";
import { getCookie } from "../../util/get-cookie.js";
import { Utilities } from "../../util/utilities.js";

export class AlgorithmEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Algorithm";
      this.readableTypeName = "Algorithm";
      this.icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="SideNav-icon icon-cpu no-fill"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
      this._hideAttributes = true;
      this.versionId = null;

      // To show who algo is registered to
      this._userData = document.createElement("user-data");

      // 
      var templateInner = document.getElementById("algorithm-edit");
      var innerClone = document.importNode(templateInner.content, true);
      this.typeFormDiv.appendChild(innerClone);

      this._form = this._shadow.getElementById("algorithm-edit--form");
      this._editName = this._shadow.getElementById("algorithm-edit--name");
      this._editDescription = this._shadow.getElementById("algorithm-edit--description");
      this._userEditVisible = this._shadow.getElementById("algorithm-edit--registering-user");
      this._manifestPath = this._shadow.getElementById("algorithm-edit--manifest");
      this._clusterEnumInput = this._shadow.getElementById("algorithm-edit--job-cluster");
      this._filesPerJob = this._shadow.getElementById("algorithm-edit--files");
      this._categoriesList = this._shadow.getElementById("algorithm-edit--categories");
      this._parametersList = this._shadow.getElementById("algorithm-edit--parameters");
   }

   async _setupFormUnique(data) {

      // Before we setup the form, check if the user will be able to do things
      const jobClusterWithChecked = await this.clusterListHandler.getCompiledList(this.data.cluster);
      this.userCantSaveCluster = !this.isStaff && (jobClusterWithChecked == null || jobClusterWithChecked.length == 0);
      this.userCantSeeCluster = (jobClusterWithChecked === 403); // Non Auth user

      if (this.userCantSaveCluster || this.userCantSeeCluster) {
         this._cannotEdit = document.createElement("p");
         this._cannotEdit.setAttribute("class", "text-gray pb-3");
         this._form.appendChild(this._cannotEdit);
      
         if (this.data.id == "New") {
            // Wihtout authorization to see clusters, or if there are none
            if (this.userCantSeeCluster) {
               this._cannotEdit.textContent = "Required: A Job Cluster is required to add an algorithm. User is not authorized to select a Job Cluster. ";
            } else {
               this._cannotEdit.innerHTML = `Required: Add a Job Cluster via <a href="/${this.clusterListHandler.organizationId}/organization-settings" class="text-purple clickable">Organization Settings</a> to add an algorithm.`;
            }
            
            this._form.appendChild(this._cannotEdit);
            this.savePost.disabled = true;
            this.savePost.hidden = true;
            current.appendChild(this._form);

            return current;
         } else {
            if (this.userCantSeeCluster) {
               this._cannotEdit.textContent = "Warning: Current user does not have access to view Job Clusters. Edits will only save if an active cluster is already present.";
               this.userCantSaveCluster = false;
            } else if (this.userCantSaveCluster) {
               this.saveButton.disabled = true;
               this._cannotEdit.innerHTML = `View Only: Please add a Job Cluster via <a href="/${this.clusterListHandler.organizationId}/organization-settings" class="text-purple clickable">Organization Settings</a> to edit this algorithm.`;
            }
         }
      }

      // description
      this._editDescription.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._editDescription.setValue(this.data.description);
      this._editDescription.default = this.data.description;

      // User
      this._registeredUserName = "";
      this._registeredUserId = "";
      try {
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
      } catch (err) {
         console.error("Couldn't get user data.", err);
      }

      // Visible input with readable name
      this._userEditVisible.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._userEditVisible.setValue(this._registeredUserName);
      this._userEditVisible.default = this._registeredUserName;
      // this._userEditVisible.permission = null;

      // Note: HIDDEN input for formValue of ID; Name is for user only
      this._userEdit.default = this._registeredUserId;
      this._userEdit.permission = null;

      // Path to manifest
      this._manifestPath.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._manifestPath.projectId = this.projectId;

      if (this.data.manifest) {
         this._manifestPath.setValue(`/media/${this.data.manifest}`);
         this._manifestPath.default = `/media/${this.data.manifest}`;       
      } else {
         this._manifestPath.default = null;
      }

      
      this._manifestPath._fetchCall = (bodyData) => {
         return fetch(`/rest/SaveAlgorithmManifest/${this.projectId}`,
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
            manifestData => {
               // console.log(manifestData);
               const viewLink = `/media/${manifestData.url}`;
               this._manifestPath.setValue(viewLink);
               Utilities.showSuccessIcon(`Manifest file uploaded to: ${viewLink}`);
            }
         );
      };

      // Cluster
      if (!this.userCantSeeCluster) {
         // if they aren't a non auth user
         // Check if there are going to be enum values first, show input with NULL
         if (jobClusterWithChecked == null || jobClusterWithChecked.length == 0) {
            this._clusterEnumInput.disabled = true;
            this._clusterEnumInput.setValue("Null");
         } else {
            this._clusterEnumInput.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
            this._clusterEnumInput.choices = jobClusterWithChecked;
            this._clusterEnumInput.default = this.data.cluster;
         }
      } else {
         this._clusterEnumInput.default = this.data.cluster;
      }

      // Files per job
      this._filesPerJob.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._filesPerJob.setValue(this.data.files_per_job);
      this._filesPerJob.default = this.data.files_per_job;

      // Categories
      this._categoriesList.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      this._categoriesList.setValue(this.data.categories);
      this._categoriesList.default = this.data.categories;

      // Parameters
      // let paramInputTypes = JSON.stringify({ name: 'text-input', value: 'text-input' });
      // let paramInputTemplate = JSON.stringify({ name: '', value: '' });
      this._parametersList.permission = !this.userCantSaveCluster ? "Can Edit" : "Ready Only";
      // this._parametersList.setAttribute("properties", paramInputTypes);
      // this._parametersList.setAttribute("empty-row", paramInputTemplate);
      this._parametersList.setValue(this.data.parameters);
      this._parametersList.default = this.data.parameters;
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

      // console.log(`UserCantSaveCluster ${this.userCantSaveCluster} and userCantSeeCluster ${this.userCantSeeCluster}`)
      if (!(this.userCantSaveCluster || this.userCantSeeCluster)) {
         if (this._clusterEnumInput.changed() || isNew) {
            let clusterValue = this._clusterEnumInput.getValue();
            // console.log(clusterValue);
            if (clusterValue === null || clusterValue === "Null" || clusterValue == "") {
               formData.cluster = null;
            } else {
               formData.cluster = Number(clusterValue);
            }
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

}

customElements.define("algorithm-edit", AlgorithmEdit);
