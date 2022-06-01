import { getCookie } from "../../util/get-cookie.js";
import { LeafForm } from "../leaf/leaf-form.js";

/* Class with methods return input types with preset values for editing.*/
export class LeafData {
    constructor({projectId, typeName, typeId, selectedData}) {
      // Feature-related class(es) to customize form element. Applies to all elements.
      this.projectId = projectId;
      this.typeName = typeName;
      this.typeId = typeId;
      this.selectedData = selectedData;

      this.responseMessage = "";
    }

    _fetchPostPromise({formData = null } = {}){
        console.log("Leaf Clone Post Fetch");
    
        if(formData != null){
          return fetch(`/rest/Leaves/${this.projectId}?type=${this.typeId}`, {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
          });
        } else {
          console.log("Problem with new leaf form data.");
        }
      }
  
    createClones() {
      //create form data & post promise array for the attribute forms, and submit
      this.successMessages = "";
      this.failedMessages = "";
      let promise = Promise.resolve();
  
      for (let data of this.selectedData) {
        let cloneValue = JSON.parse(data); //parse data attribute
        cloneValue._default = cloneValue.default;
        // console.log("cloneValue");
        // console.log(cloneValue);

        this.leafForm = new LeafForm();
        this.leafForm._getFormWithValues({clone : true, ...cloneValue});
        let formJSON = this.leafForm._getLeafFormData();

        promise = promise.then(() => {return this._fetchPostPromise({
          "formData" : formJSON
        });})
        .then(response => response.json().then(data => ({response: response, data: data})))
        .then(obj => {
          let currentMessage = obj.data.message;
          let succussIcon = document.createElement("modal-success");
          let warningIcon = document.createElement("modal-warning");
          let iconWrap = document.createElement("span");
          if(obj.response.ok){
            iconWrap.appendChild(succussIcon);
            this.successMessages += `${iconWrap.innerHTML} ${currentMessage}<br/><br/>`;
          } else {
            iconWrap.appendChild(warningIcon);
            this.failedMessages += `${iconWrap.innerHTML} ${currentMessage}<br/><br/>`;
          }
        });
      }
      promise = promise.then(() => {return this.successMessages + this.failedMessages;});
      return promise;
    }
  
}
  
