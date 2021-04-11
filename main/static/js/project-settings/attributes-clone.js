/* Class with methods return input types with preset values for editing.*/
class AttributesClone {
  constructor(attributeDataByType) {
    // Feature-related class(es) to customize form element. Applies to all elements.
    this.attributeDataByType = attributeDataByType;
    this.attributeFormHelper = new AttributesForm();
    this.inputHelper = new SettingsInput("media-types-main-edit");
  }

  _init(){
    return this._getDuplicateAttributesForm();
  }

  _getDuplicateAttributesForm(){
    const form = document.createElement("form");
    this.form = form;

    //this.form.addEventListener("change", this._formChanged);

    const typeOptions = this._getTypesList();

    // Fields for this form
    const TYPE = "Type";
    this.typeOptionsSelect = this.inputHelper.inputSelectOptions({
      "labelText": TYPE,
      "value": "Select",
      "optionsList": typeOptions,
      "name" : TYPE.toLowerCase()
    });
    this.form.appendChild(this.typeOptionsSelect);

    this.submitForm  = null;

    this.typeOptionsSelect.addEventListener("change",  (event) => {
      let value = "";
  
      for(let i of event.target.options){
        if(i.selected == true) {
          value = i.value;
        }
      }
  
      let entitySelect = this._getEntitiesForType( value );
      this.placeholderEntities.innerHTML = ""; //empty any current value
      this.placeholderAttributes.innerHTML = ""; //empty any current value
      this.checkedRadio = []; //removed remembered check
      this.placeholderEntities.appendChild(entitySelect);
  
      return entitySelect.addEventListener("change", (event) => {
        let checkboxHTML = this._getAttributeCheckboxes(event);
        this.placeholderAttributes.innerHTML = ""; //empty any current value
        this.placeholderAttributes.appendChild(checkboxHTML);
      });
    });

    this.placeholderEntities = document.createElement("div");
    this.placeholderEntities.setAttribute("class", "placeholderEntities");
    this.form.appendChild(this.placeholderEntities);

    this.placeholderAttributes = document.createElement("div");
    this.placeholderAttributes.setAttribute("class", "placeholderAttributes");
    this.form.appendChild(this.placeholderAttributes);

    return this.form;
  }

  getInputs(){
    return this.placeholderAttributes.getElementsByTagName("input");
  }

  _getAttributeCheckboxes(event){
    let value = ""
    for(let i of event.target.options){
      if(i.selected == true) {
        value = i.value;
      }
    }

    // make a new list
    let list = this.entities[value];
    let newList = [];
    for(let a of list){
      let entity = {}
      entity.name = a.name; // checkbox label
      entity.id = a.name; // checkbox value
      entity.data = JSON.stringify(a); // checkbox hidden data
      newList.push(entity);
    }

    let attributeCheckboxes = this.inputHelper.multipleCheckboxes({
      "value" : '',
      "labelText" : 'Attribute(s)',
      "name" : 'attribute-clones',
      "checkboxList" : newList
    });

    return attributeCheckboxes;
  }

  // Choose a type and entity to see a list of attributes:
  _getTypesList(){
      return [
        {"optText": "Select type", "optValue":""},
        {"optText": "Media Type", "optValue":"MediaType"},
        {"optText": "Localization Type", "optValue":"LocalizationType"},
        {"optText": "State Type", "optValue":"StateType"},
        {"optText": "Leaf Type", "optValue":"LeafType"},
      ];
  }

  _getEntitiesForType(type){
    this.entities = this.attributeDataByType[type];

    let entityOptions = [{"optText":"Select", "optValue": ""}];

    for(let o in this.entities){
      let option = {"optText":o, "optValue":o};
      entityOptions.push(option)
    }

    let entitySelectBox = this.inputHelper.inputSelectOptions({
      "labelText": "Entity",
      "value": "",
      "optionsList": entityOptions,
      "name" : "entity"
    });

    return entitySelectBox;
  }
}
