/**
 * Element used to encapsulate a single entity type for the data filtering module
 *
 * This responds to the given attribute information provided.
 */
class FilterAttributeType extends TatorElement {

  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "analysis__filter_attribute_border px-4 py-4")
    this._shadow.appendChild(this._div);

    var topDiv = document.createElement("div");
    topDiv.setAttribute("class", "d-flex flex-justify-between flex-items-center py-2");
    this._div.appendChild(topDiv);

    this._attributeTypeLabel = document.createElement("span");
    this._attributeTypeLabel.setAttribute("class", "f1 text-left text-gray text-uppercase text-semibold");
    topDiv.appendChild(this._attributeTypeLabel);

    var addConditionButton = document.createElement("button");
    addConditionButton.setAttribute("class", "btn btn-clear btn-outline");
    addConditionButton.textContent = "Add Condition";
    topDiv.appendChild(addConditionButton);

    this._innerDiv = document.createElement("div");
    this._innerDiv.setAttribute("class", "analysis__filter_attribute_border d-flex py-2");
    this._div.appendChild(this._innerDiv)

    this._conditionDiv = document.createElement("div");
    this._conditionDiv.setAttribute("class", "px-1 py-1 ")
    this._innerDiv.appendChild(this._conditionDiv);

    //
    // Event handlers
    //

    // Create a new element for the user to apply a new condition/rule to the filter
    addConditionButton.addEventListener("click", () => {

      var newCondition = document.createElement("filter-attribute-field");
      newCondition.data = this._data.attribute_types;
      this._conditionDiv.appendChild(newCondition);

      newCondition.addEventListener("remove", () => {
        this._conditionDiv.removeChild(newCondition);
      });
    });
  }

  /**
   * Sets the available filter parameters
   *
   * @param {object} val - Object with the following fields:
   *    .name - str - Name of attribute type
   *    .attribute_types - array - Array of objects with the following fields:
   *        .name - str - Name of attribute
   *        .dtype - str - string|bool|float|int|datetime|geopos|enum
   *        .choices - array - Valid only if enum was provided
   */
  set data(val) {
    this._data = val;
    this._attributeTypeLabel.textContent = this._data.name;
  }
}

customElements.define("filter-attribute-type", FilterAttributeType);