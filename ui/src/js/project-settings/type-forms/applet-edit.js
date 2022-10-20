import { TypeFormTemplate } from "./type-form-template.js";
import { getCookie } from "../../util/get-cookie.js";
import { Utilities } from "../../util/utilities.js";

export class AppletEdit extends TypeFormTemplate {
   constructor() {
      super();
      this.typeName = "Applet";
      this.readableTypeName = "Applet";
      
      this._hideAttributes = true;

      // 
      var templateInner = document.getElementById("applet-edit");
      var innerClone = document.importNode(templateInner.content, true);
      this._shadow.appendChild(innerClone);

      this._form = this._shadow.getElementById("applet-edit--form");
      this._editName = this._shadow.getElementById("applet-edit--name");
      this._linkToDashboard = this._shadow.getElementById("applet-edit--link");
      this._editDescription = this._shadow.getElementById("applet-edit--description");
      this._htmlFilePath = this._shadow.getElementById("applet-edit--html-file");
      this._categoriesList = this._shadow.getElementById("applet-edit--categories");
   }

   async _setupFormUnique(data) {
      this._data = data;
      // append link
      if (this._data.id && this._data.id !== "New") {
         this._linkToDashboard.setAttribute("href", `${window.location.origin}/${this._projectId}/dashboards/${this.appletId}`);
      } else {
         this._linkToDashboard.hidden = true;
      }

      // description
      this._editDescription.setValue(this._data.description);
      this._editDescription.default = this._data.description;

      // Path to html file
      this._htmlFilePath.projectId = this.projectId;
      this._htmlFilePath.organizationId = this.organizationId;

      if (typeof this._data.html_file == "undefined") {
         this._data.html_file = [];
      }

      this._htmlFilePath.setValue(this._data.html_file);
      this._htmlFilePath.default = this._data.html_file;

      this._htmlFilePath._fetchCall = (bodyData) => {
         fetch(`/rest/SaveGenericFile/${this.projectId}`,
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
               this._htmlFilePath.setValue(htmlData.url);
               Utilities.showSuccessIcon(`HTML file uploaded to: ${htmlData.url}`);
               return htmlData;
            }
         ).catch(err => {
            console.error("Issue saving generic file.", err);
         });
      };

      // Categories
      this._categoriesList.setValue(this._data.categories);
      this._categoriesList.default = this._data.categories;
   }


   _getFormData() {
      const formData = {};

      // console.log(`Data ID: ${this._data.id}`);
      const isNew = this._data.id == "New" ? true : false;
      // const isNew = true;

      if (this._editName.changed() || isNew) {
         formData.name = this._editName.getValue();
      }

      if (this._editDescription.changed() || isNew) {
         formData.description = this._editDescription.getValue();
      }

      if ((this._htmlFilePath.changed() && this._htmlFilePath.getValue() !== "") || isNew) {
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

customElements.define("applet-edit", AppletEdit);
