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
    this._shadow.appendChild(this._div);

    this._attributeName = document.createElement("enum-input");
    this._modifier = document.createElement("enum-input");
    this._filter = document.createElement("text-input");
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

    for (const attributeType of this._data)
    {
      if (attributeType.dtype == "string")
      {

      }
    }
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