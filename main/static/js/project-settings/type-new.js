class TypeNew {
    constructor({
        type, projectId, form, typeFormDiv, formData
      }){
        this.type = type;
        this.projectId = projectId;
        this.form = form;
        this.formData = formData;
        this.typeFormDiv = typeFormDiv;
        this.boxHelper = new SettingsBox( this.typeFormDiv );
    }

    // Facilitate creation of a new type
    init(){
        let buttonSave = this.getSave();
        this.boxHelper._modalConfirm({
            "titleText" : "Save",
            "mainText" : this.form,
            buttonSave
          });
    }

    getSave(){
        const inputSubmit = document.createElement("input");
        inputSubmit.setAttribute("type", "submit");
        inputSubmit.setAttribute("value", text);
        inputSubmit.setAttribute("class", `btn btn-clear f1 text-semibold`);
  
        inputSubmit.addEventListener("click", this.saveFetch)

        return inputSubmit;
    }

    saveFetch(){     
        this._fetchPostPromise().then( data => data.json).then(
            (data) => {
                console.log(data);
            }
        )
    }

    _fetchPostPromise({id = this.projectId } = {}){
        console.log(`Creatinw new ${this.typeName} for Project id ${id}`);
        let formData = this.formData(`${this.typeName}_New`);
        console.log(formData);
    
        //return fetch("/rest/StateType/" + id, {
        return fetch(`/rest/${this.typeName}s/${id}`, {
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