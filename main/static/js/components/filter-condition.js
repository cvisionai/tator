/**
 * Element used to encapsulate a filtering condition
 */
class FilterCondition extends TatorElement {

  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "analysis__filter_field_border d-flex flex-items-center flex-grow text-gray f2");
    this._shadow.appendChild(this._div);

    this._category = document.createElement("enum-input");
    this._category.setAttribute("name", "Category");
    this._category.style.marginLeft = "15px";
    this._div.appendChild(this._category);

    this._fieldName = document.createElement("enum-input");
    this._fieldName.setAttribute("name", "Field");
    this._fieldName.style.marginLeft = "15px";
    this._fieldName.permission = "View Only";
    this._div.appendChild(this._fieldName);

    this._modifier = document.createElement("enum-input");
    this._modifier.style.marginLeft = "15px";
    this._modifier.setAttribute("name", "Modifier");
    this._modifier.permission = "View Only";
    this._div.appendChild(this._modifier);

    this._value = document.createElement("text-input");
    this._value.style.marginLeft = "15px";
    this._value.setAttribute("name", "Value");
    this._value.permission = "View Only";
    this._div.appendChild(this._value);

    var removeButton = document.createElement("entity-delete-button");
    removeButton.style.marginLeft = "15px";
    removeButton.style.marginRight = "8px";
    this._div.appendChild(removeButton);

    this._data = [];
    this._currentType = [];

    /*
    * Event handlers
    */

    // Dispatch remove event if the remove button was pressed
    removeButton.addEventListener("click", () => {
      this.dispatchEvent(new Event("remove"));
    });

    // Adjust the field name based on the selected field
    this._category.addEventListener("change", () => {

      // Remove existing choices
      this._fieldName.clear();
      this._modifier.clear();
      this._value.setValue("");

      // Create the menu options for the field name
      var fieldChoices = [];

      fieldChoices.push({"value": "Select"});
      for (const attributeType of this._data)
      {
        if (attributeType.name == this._category.getValue())
        {
          for (const attribute of attributeType.attribute_types)
          {        
            fieldChoices.push({"value": attribute.name});
          }      
          this._currentType = attributeType;
          break;
        }
      }

      this._fieldName.choices = fieldChoices;
      this._fieldName.permission = "Can Edit";
      this._modifier.permission = "View Only";
      this._value.permission = "View Only";
    });

    // Adjust the modifier based on the selected field
    this._fieldName.addEventListener("change", () => {

      // Remove existing choices for the modifier and clear the value
      this._modifier.clear();
      this._value.setValue("");

      // #TODO Add more options to the other dtypes
      var choices = [];
      let selectedFieldName = this._fieldName.getValue();
      var dtype = "string";
      for (const attribute of this._currentType.attribute_types)
      {
        if (attribute.name == selectedFieldName)
        {
          dtype = attribute.dtype;
          break;
        }
      }

      if (dtype == "int" || dtype == "float")
      {
        choices.push({"value": "=="});
        choices.push({"value": ">"});
        choices.push({"value": ">="});
        choices.push({"value": "<"});
        choices.push({"value": "<="});
      }
      else
      {
        choices.push({"value": "Includes"});
        choices.push({"value": "Exact Match"});
      }

      this._modifier.choices = choices;
      this._modifier.permission = "Can Edit";
      this._value.permission = "Can Edit";
    });
  }

  /**
   * Sets the available dataset that can be selected by the user
   *
   * @param {array} val - List of objects with the following fields
   *   .name - str - Name of attribute type
   *   .attribute_types - array - Array of objects with the following fields
   *     .name - str - Name of attribute
   *     .dtype - str - string|bool|float|int|datetime|geopos|enum
   *     .choices - array - Valid only if enum was provided
   */
  set data(val) {
    this._data = val;

    // Reset the type choices to the given data
    this._category.clear();

    var choices = [];
    for (const attributeType of this._data)
    {
      choices.push({"value": attributeType.name});
    }
    this._category.choices = choices;
    this._currentType = [];
  }

  /**
   * @returns {FilterConditionData} Object containing the selected filter condition rule info.
   *                                null if there's an error (e.g. missing information)
   */
  getCondition() {
  
    const category = this._category.getValue();
    const field = this._fieldName.getValue();
    const modifier = this._modifier.getValue();
    const value = this._value.getValue();
    var condition = null;

    if (category && field && modifier && value)
    {
      condition = new FilterConditionData(category, field, modifier, value);
    }

    return condition;
  }
}

customElements.define("filter-condition", FilterCondition);