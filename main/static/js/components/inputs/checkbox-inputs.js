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