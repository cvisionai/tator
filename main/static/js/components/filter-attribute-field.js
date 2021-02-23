/**
 * Element used to encapsulate a single entity type's attribute field
 * for the data filtering module.
 *
 * This responds to the given attribute information provided.
 */
class FilterAttributeField extends TatorElement {

  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "analysis__filter_field_border d-flex flex-items-center flex-grow text-gray f2");
    this._shadow.appendChild(this._div);

    this._fieldName = document.createElement("enum-input");
    this._fieldName.setAttribute("name", "Field");
    this._fieldName.style.marginLeft = "15px";
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

    //
    // Event handlers
    //

    // Dispatch remove event if the remove button was pressed
    removeButton.addEventListener("click", () => {
      this.dispatchEvent(new Event("remove"));
    });

    // Adjust the modifier based on the selected field
    this._fieldName.addEventListener("change", () => {

      // Remove existing choices for the modifier and clear the value
      // #TODO Update the enum-input type with length retrieval and clearing options
      while (this._modifier._select.options.length > 0) {
        this._modifier._select.options.remove(0);
      }

      this._value.setValue("");

      // #TODO Add more options to the other dtypes
      var choices = [];
      let selectedFieldName = this._fieldName.getValue();
      var dtype = "string";
      for (const attribute of this._data)
      {
        if (attribute.name == selectedFieldName)
        {
          dtype = attribute.dtype;
          break;
        }
      }

      if (dtype == "int" || dtype == "float")
      {
        choices.push({"value": "Equals To"});
        choices.push({"value": "Greater Than"});
        choices.push({"value": "Greater Than Or Equal To"});
        choices.push({"value": "Less Than"});
        choices.push({"value": "Less Than Or Equal To"});
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
   * @param {array} val - List of objects with the following proeprties:
   *                      .name - str - Name of attribute
   *                      .dtype - str - string|bool|float|int|datetime|geopos|enum
   *                      .choices - array - Valid only if enum was provided
   */
  set data(val) {

    this._data = val;

    // Create the menu options for the field name
    var fieldChoices = [];

    fieldChoices.push({"value": "Select"});
    for (const attribute of this._data)
    {
      fieldChoices.push({"value": attribute.name});
    }

    this._fieldName.choices = fieldChoices;
  }

  /**
   * Retrieve the filter
   * @returns {string} null if the user did not fill out the fields
   *                   Otherwise, this will be the search string.
   */
  getFilterParameters() {

  }
}

customElements.define("filter-attribute-field", FilterAttributeField);