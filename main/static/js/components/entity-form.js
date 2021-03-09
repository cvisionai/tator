class EntityForm extends TatorElement {
    constructor() {
      super();
    
       // @TODO what can be reused for this?
       this.todo = document.createElement("div");
       this._shadow.appendChild(this.todo);

    }

    init( data ){
        this.todo.innerHTML = JSON.stringify(data);
    }
   
  }
  
  customElements.define("entity-form", EntityForm);  