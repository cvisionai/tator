import { getCookie } from "../../util/get-cookie.js";

export class TypeDelete {
    constructor({
        type, typeId
      }){
        this.type = type;
        this.typeId = typeId;
    }

        // Facilitate creation of a new type
      init(){
        return this.getDelete();
      }
  
      getDelete(){
          const deleteButton = document.createElement("button");
          deleteButton.setAttribute("value", "Save");
          deleteButton.setAttribute("class", `btn btn-clear f1 text-semibold btn-red`);
    
          deleteButton.addEventListener("click", this.deleteFetch.bind(this));
  
          return inputSubmit;
      }

    async deleteFetch(){     
      const response = await this._fetchPromise();
      const data = await response.json();
      data.status = response.status;
      return data;
    }

    _fetchPromise(){
        // console.log(`Deleting ${this.type} id ${this.typeId}`);
    
        return fetch(`/rest/${this.type}/${this.typeId}`, {
          method: "DELETE",
          mode: "cors",
          credentials: "include",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        })
      }
}