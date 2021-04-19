class CheckboxSet extends TatorElement {
   constructor() {
      super();
      
      const div = document.createElement("div");
      div.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
      this._shadow.appendChild(div);
  
      this._name = document.createTextNode("");
      div.appendChild(this._name);

      //
      this._inputs = []

      this._inputDiv = document.createElement("div");
      this._inputDiv.setAttribute("class", "d-flex flex-row flex-wrap flex-justify-between col-8");
      div.appendChild(this._inputDiv);
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
      if( val && val.length ){
        for (let item of val) {          
          this._newInput(item);
        }
      }
    }

    _newInput(item){
      let checkbox = document.createElement("checkbox-input");
      checkbox.setAttribute("name", `${item.name}`)
      checkbox.setValue(item.id);
      checkbox.default = item.id;
      checkbox.itemData = item.data;
      
      return this._addInput(checkbox);
    }
  
    _addInput(checkbox) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("class", "col-6");
      wrapper.appendChild(checkbox);

      // keep track of text inputs
      this._inputs.push(checkbox);

      checkbox.addEventListener("change", () => {
        this.dispatchEvent(new Event("change"));
      });
        
      return this._inputDiv.appendChild(wrapper);
    }

    getValue(){
      const val = [];
      // Loop through the inputs
      for(let checkbox of this._inputs){
        if(checkbox.getValue().trim() != ""){
          val.push( checkbox.getValue() );
        }
      }
      return val;
    }
  
    getDataArray() {
      const val = [];
      // Loop through the inputs
      for(let checkbox of this._inputs){
        if(checkbox.getValue()){ // if it is checked, push its itemData into val
          val.push( checkbox.itemData );
        }
      }
      return val;     
    }

    changed(){
      return this.getValue() !== this._default;
    }

}

customElements.define("checkbox-set", CheckboxSet);





   // multipleCheckboxes({
//    value = '',
//    labelText = '',
//    name = '',
//    checkboxList = ''
//  } = {}){
//    const setName = this._getUniqueIdentifier(name);
//    const checkboxes = document.createElement("div");
//    checkboxes.setAttribute("class", `col-md-9 col-sm-8`);

//    const checkboxInner = document.createElement("div");
//    checkboxInner.setAttribute("class", `d-flex flex-row flex-wrap flex-justify-between`);

//    for(let data of checkboxList){
//      checkboxInner.appendChild( this._miniCheckboxSet(data, setName) );
//    }

//    checkboxes.appendChild(checkboxInner);

//    const checkboxesWithLabel = this.labelWrap({
//      "labelText": labelText,
//      "inputNode": checkboxes,
//      "labelType" : "fieldset"
//    });

//    return checkboxesWithLabel;
//  }

//  _miniCheckboxSet(data, setName){
//    // Outputs inputs in rows of three
//    let miniCheckboxSet = document.createElement("label");
//    miniCheckboxSet.setAttribute("class", "col-6 py-2");

//    let checkbox = document.createElement("input");
//    checkbox.setAttribute("type", "checkbox");
//    checkbox.setAttribute("value", data.id);
//    checkbox.setAttribute("name", setName);
//    checkbox.setAttribute("class", "checkbox");
//    if(data.data){
//      checkbox.setAttribute("data-data", data.data);
//    }

//    if (data.checked) checkbox.checked = true;

//    miniCheckboxSet.appendChild(checkbox);

//    let textSpan = document.createElement("span");
//    textSpan.setAttribute("class", "px-2 v-align-top");

//    let labelText = document.createTextNode(data.name);
//    textSpan.appendChild(labelText);
//    miniCheckboxSet.appendChild(textSpan)

//    return miniCheckboxSet;
//  }