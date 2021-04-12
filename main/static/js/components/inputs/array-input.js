// This is a set of String data
// It's value is an array, but is output as many inputs
// Allows for more inputs to be added
// Empty inputs = removing item (@TODO add an 'x' feature)
class ArrayInput extends TatorElement {
    constructor() {
      super();
  
      this._div = document.createElement("div");
      this._shadow.appendChild(this._div)

      this.label = document.createElement("label");
      this.label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
      this._div.appendChild(this.label);
  
      this._name = document.createTextNode("");
      this.label.appendChild(this._name);

      //
      this._inputs = []

      // Add new
      //@Tmp keeping in helper bc of styling
      this.settingsHelper = new SettingsInput(); 
      this.addNewButton = this.settingsHelper.addNewRow({
          "labelText" : "+ New",
          "callback" : ""
      });
      this._div.appendChild(this.addNewButton);

      this.addNewButton.addEventListener("click", (e) => {
        e.preventDefault();
        this._newInput("");
        this.dispatchEvent(new CustomEvent("new-input", { detail : { name : this._name }}));
      });
  
    }
  
    static get observedAttributes() {
      return ["name"];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      switch (name) {
        case "name":
          this._name.nodeValue = newValue;
          break;
      }
    }
  
    set default(val) {
      this._default = val; // this will be an array
    }
  
    reset() {
      // Go back to default value
      if (typeof this._default !== "undefined") {
        this.setValue(this._default);
      } else {
        this.setValue([]);
      }
    }
  
    setValue(val) {
      if( Array.isArray(val) ){
        for(let key of val){
          let textInput = document.createElement("text-input");
          textInput._input.classList.remove("col-8");
          textInput.setValue(key);
          textInput.default = key;
          
          this._addInput(textInput);
        }
      }
    }

    _newInput(val){
      let textInput = document.createElement("text-input");
      
      if(val){
        textInput.setValue(val);
        textInput.default = val;
      }

      return this._addInput(textInput);
    }
  
    _addInput(input){
      input._input.classList.remove("col-8");
      const wrapper = document.createElement("div");
      //wrapper.setAttribute("class", "offset-lg-4 col-lg-8 pb-2");
      wrapper.appendChild(input);

      const spaceholder = document.createElement("div");
      spaceholder.innerHTML = " ";
      wrapper.appendChild(spaceholder);

      // keep track of text inputs
      this._inputs.push(input);

      input.addEventListener("change", () => {
        this.dispatchEvent(new Event("change"));
      });

      return this.addNewButton.before(wrapper);
    }

    getValue(){
      const val = [];
      // Loop through the inputs
      for(let input of this._inputs){
        if(input.getValue().trim() != ""){
          val.push( input.getValue() );
        }
      }
      return val;
    }

    changed(){
      return this.getValue() !== this._default;
    }
  }
  
  customElements.define("array-input", ArrayInput);
  