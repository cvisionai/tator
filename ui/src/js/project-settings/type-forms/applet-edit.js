import { TypeForm } from "./type-form.js";
import { getCookie } from "../../util/get-cookie.js";
import { Utilities } from "../../util/utilities.js";

export class AppletEdit extends TypeForm {
   constructor() {
      super();
      this.typeName = "Applet";
      this.readableTypeName = "Applet";
      
      this._hideAttributes = true;

      // 
      var templateInner = document.getElementById("applet-edit");
      var innerClone = document.importNode(templateInner.content, true);
      this.typeFormDiv.appendChild(innerClone);

      this._form = this._shadow.getElementById("applet-edit--form");
      this._editName = this._shadow.getElementById("applet-edit--name");
      this._linkToDashboard = this._shadow.getElementById("applet-edit--link");
      this._editDescription = this._shadow.getElementById("applet-edit--description");
      this._htmlFilePath = this._shadow.getElementById("applet-edit--html-file");
      this._categoriesList = this._shadow.getElementById("applet-edit--categories");
   }

   async _setupFormUnique(data) {

      // append link
      if (this.data.id && this.data.id !== "New") {
         this._linkToDashboard.setAttribute("href", `${window.location.origin}/${this.projectId}/dashboards/${this.appletId}`);
      } else {
         this._linkToDashboard.hidden = true;
      }

      // description
      this._editDescription.setValue(this.data.description);
      this._editDescription.default = this.data.description;

      // Path to html file
      this._htmlFilePath.projectId = this.projectId;

      if (typeof this.data.html_file == "undefined") {
         this.data.html_file = [];
      }

      this._htmlFilePath.setValue(this.data.html_file);
      this._htmlFilePath.default = this.data.html_file;

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
      this._categoriesList.setValue(this.data.categories);
      this._categoriesList.default = this.data.categories;
   }


   _getFormData() {
      const formData = {};

      // console.log(`Data ID: ${this.data.id}`);
      const isNew = this.data.id == "New" ? true : false;
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
