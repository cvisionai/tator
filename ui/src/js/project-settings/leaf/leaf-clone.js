import { LeafForm } from "./leaf-form.js";

/* Class with methods return input types with preset values for editing.*/
export class LeafClone {
  constructor(leafDataByType) {
    // Feature-related class(es) to customize form element. Applies to all elements.
    this.leafDataByType = leafDataByType;
    this.leafFormHelper = new LeafForm();
  }

  _init(){
    return this._getDuplicateLeafsForm();
  }

  _getDuplicateLeafsForm(){
    this.form = document.createElement("form");
    //this.form.addEventListener("change", this._formChanged);

    const typeOptions = this._getTypesList();

    // Emptyform uses "" for dtype value
    this._typeSelect = document.createElement("enum-input");
    this._typeSelect.setAttribute("name", "Type");
    this._typeSelect.choices = typeOptions;
    this._typeSelect.setValue("");
    this._typeSelect.default = "";
    this.form.appendChild(this._typeSelect);

    this.submitForm = null;
    


    this._typeSelect.addEventListener("change",  (event) => {
      let type = this._typeSelect.getValue();
      let entitySelect = this._getEntitiesForType( type );
      this.placeholderEntities.innerHTML = ""; //empty any current value
      this.placeholderLeafs.innerHTML = ""; //empty any current value
      this.checkedRadio = []; //removed remembered check
      this.placeholderEntities.appendChild(entitySelect);

      const list = this.leafDataByType;

      //console.log(list);
  
      entitySelect.addEventListener("change", () => {
        const entity = this._entitySelect.getValue();
        const leafs = this.entities[entity];
        if (leafs && leafs.length > 0) {
          const checkboxHTML = this._getLeafCheckboxes( leafs );
          
          this.placeholderLeafs.innerHTML = ""; //empty any current value
          this.placeholderLeafs.appendChild(checkboxHTML);
        } else {
          const label = document.createElement("label");
          label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1")
          label.appendChild(document.createTextNode("Leaf(s)"))
          
          const span = document.createElement("span");
          span.setAttribute("class", "col-8 text-gray");
          const message = document.createTextNode("None");
          span.appendChild(message);
          label.appendChild(span);

          this.placeholderLeafs.innerHTML = ""; //empty any current value
          this.placeholderLeafs.appendChild(label);
        }
        
      });
    });

    this.placeholderEntities = document.createElement("div");
    this.placeholderEntities.setAttribute("class", "placeholderEntities");
    this.form.appendChild(this.placeholderEntities);

    this.placeholderLeafs = document.createElement("div");
    this.placeholderLeafs.setAttribute("class", "placeholderLeafs");
    this.form.appendChild(this.placeholderLeafs);

    return this.form;
  }

  getInputData(){
    return this.leafCheckboxes.getData();;
  }

  _getLeafCheckboxes( list ){
    // make a new list
    let newList = [];

    if (list) {
      for(let a of list){
        let entity = {}
        entity.name = a.name; // checkbox label
        entity.id = a.name; // checkbox value
        entity.data = JSON.stringify(a); // checkbox hidden data
        newList.push(entity);
      }

      this.leafCheckboxes = document.createElement("checkbox-set");
      this.leafCheckboxes.setAttribute("name", "Leaf(s)");
      this.leafCheckboxes.setValue(newList);
      this.leafCheckboxes.default = newList;
  
      return this.leafCheckboxes;
    }
  }

  // Choose a type and entity to see a list of leafs:
  _getTypesList(){
      return [
        {"label": "Select type", "value":""},
        {"label": "Media Type", "value":"MediaType"},
        {"label": "Localization Type", "value":"LocalizationType"},
        {"label": "State Type", "value":"StateType"},
        {"label": "Leaf Type", "value":"LeafType"},
      ];
  }

  _getEntitiesForType(type) {
    let entityOptions = [{"label":"Select", "value": ""}];
    this.entities = this.leafDataByType[type];

    if (this.entities) {
      for (let o in this.entities) {
        let option = {"label":o, "value":o};
        entityOptions.push(option)
      }
  
      this._entitySelect = document.createElement("enum-input");
      this._entitySelect.setAttribute("name", "Entity");
      this._entitySelect.choices = entityOptions;
      this._entitySelect.setValue("");
      this._entitySelect.default = "";
  
      return this._entitySelect;
    }
    
  }
}
