class TypeNew {
    constructor({
        type, projectId, formData
      }){
        this.type = type;
        this.projectId = projectId;
    }

    async saveFetch(formData){     
      const response = await this._fetchPostPromise(formData);
      const data = await response.json();
      return data;
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