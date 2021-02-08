class TypeNew {
    constructor({
        type, projectId, formData
      }){
        this.type = type;
        this.projectId = projectId;
    }

    // Facilitate creation of a new type
    init(){
        return this.getSave();
    }

    getSave(){
        const inputSubmit = document.createElement("input");
        inputSubmit.setAttribute("type", "submit");
        inputSubmit.setAttribute("value", "Save");
        inputSubmit.setAttribute("class", `btn btn-clear f1 text-semibold`);
  
        inputSubmit.addEventListener("click", this.saveFetch.bind(this));

        return inputSubmit;
    }

    saveFetch(formData){     
      return this._fetchPostPromise(formData).then( (response) => { 
        return response.json();
      }).then(
        (data) => {
            console.log(data);
            return data;
        }
      )
    }

    _fetchPostPromise(formData){
        console.log(`Creating new ${this.type} for Project id ${this.projectId}`);
    
        return fetch(`/rest/${this.type}s/${this.projectId}`, {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        })
      }
}