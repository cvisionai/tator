class EntityFormForPanel extends TatorElement {
    constructor() {
      super();
    
       // @TODO what can be reused for this?
       this.todo = document.createElement("div");
       this._shadow.appendChild(this.todo);

       this.inputHelper = new SettingsInput();

    }

    _init( obj ){
      this.form = document.createElement("form");

      // @TODO this is specific to the data for /analysis/annotations.js
      for(const [attr, value] of Object.entries(obj.attributes)){
        // Attribute name and it's value
        const NAME = "Name";
        this.form.appendChild( this.inputHelper.inputText({
          "labelText" : attr,
          "name" : attr,
          "value" : value,
          "disabled" : true
        }) );
      }

        // View Media Button
        //class="btn btn-clear btn-charcoal text-gray"
        const viewMedia = document.createElement("a");
        viewMedia.setAttribute("href", obj.mediaLink);
        viewMedia.setAttribute("value", "View Media");
        viewMedia.setAttribute("class", `col-12 btn btn-clear btn-charcoal text-gray text-semibold`);
        viewMedia.appendChild( document.createTextNode("View Media") );
        this.form.appendChild(viewMedia);
      
        // Append form to el
        this._shadow.appendChild(this.form)

    }
   
  }
  
  customElements.define("entity-form-for-panel", EntityFormForPanel);  