import { AttributesForm } from "./attributes-form.js";

/* Class with methods return input types with preset values for editing.*/
export class AttributesClone {
  constructor(attributeDataByType) {
    // Feature-related class(es) to customize form element. Applies to all elements.
    this.attributeDataByType = attributeDataByType;
    this.attributeFormHelper = new AttributesForm();
  }

  _init() {
    return this._getDuplicateAttributesForm();
  }

  _getDuplicateAttributesForm() {
    this.form = document.createElement("form");
    //this.form.addEventListener("change", this._formChanged);

    const typeOptions = this._getTypesList();

    // Emptyform uses "" for dtype value
    this._typeSelect = document.createElement("enum-input");
    this._typeSelect.setAttribute("name", "Type");
    this._typeSelect.choices = typeOptions;
    this._typeSelect.setValue("none");
    this._typeSelect.default = "none";
    this.form.appendChild(this._typeSelect);

    this.submitForm = null;

    this._typeSelect.addEventListener("change", (event) => {
      let type = this._typeSelect.getValue();
      let entitySelect = this._getEntitiesForType(type);
      this.placeholderEntities.innerHTML = ""; //empty any current value
      this.placeholderAttributes.innerHTML = ""; //empty any current value
      this.checkedRadio = []; //removed remembered check
      this.placeholderEntities.appendChild(entitySelect);

      entitySelect.addEventListener("change", () => {
        const entity = this._entitySelect.getValue();
        const attributes = entity == "none" ? false : this.entities[entity];

        if (attributes && attributes.length > 0) {
          const checkboxHTML = this._getAttributeCheckboxes(attributes);

          this.placeholderAttributes.innerHTML = ""; //empty any current value
          this.placeholderAttributes.appendChild(checkboxHTML);
        } else {
          const label = document.createElement("label");
          label.setAttribute(
            "class",
            "d-flex flex-justify-between flex-items-center py-1"
          );
          label.appendChild(document.createTextNode("Attribute(s)"));

          const span = document.createElement("span");
          span.setAttribute("class", "col-8 text-gray");
          const message = document.createTextNode("None");
          span.appendChild(message);
          label.appendChild(span);

          this.placeholderAttributes.innerHTML = ""; //empty any current value
          this.placeholderAttributes.appendChild(label);
        }
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

  getInputData() {
    return this.attributeCheckboxes.getData();
  }

  _getAttributeCheckboxes(list) {
    // make a new list
    let newList = [];

    if (list) {
      for (let a of list) {
        let entity = {};
        entity.name = a.name; // checkbox label
        entity.id = a.name; // checkbox value
        entity.data = JSON.stringify(a); // checkbox hidden data
        newList.push(entity);
      }

      this.attributeCheckboxes = document.createElement("checkbox-set");
      this.attributeCheckboxes.setAttribute("name", "Attribute(s)");
      this.attributeCheckboxes.setValue(newList);
      this.attributeCheckboxes.default = newList;

      return this.attributeCheckboxes;
    }
  }

  // Choose a type and entity to see a list of attributes:
  _getTypesList() {
    return [
      { label: "Select type", value: "none" },
      { label: "Media Type", value: "MediaType" },
      { label: "Localization Type", value: "LocalizationType" },
      { label: "State Type", value: "StateType" },
      { label: "Leaf Type", value: "LeafType" },
    ];
  }

  _getEntitiesForType(type) {
    console.log(
      "_getEntitiesForType type" + type,
      this.attributeDataByType[type]
    );
    let entityOptions = [{ label: "Select", value: "none" }];
    this.entities = this.attributeDataByType[type];

    if (this.entities) {
      for (let o in this.entities) {
        let option = { label: o, value: o };
        entityOptions.push(option);
      }
    }

    this._entitySelect = document.createElement("enum-input");
    this._entitySelect.setAttribute("name", "Entity");
    this._entitySelect.choices = entityOptions;
    this._entitySelect.setValue("none");
    this._entitySelect.default = "none";

    return this._entitySelect;
  }
}
