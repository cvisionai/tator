/**
 * Element that encaspulates a group of filter conditions
 */
class FilterConditionGroup extends TatorElement {

  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "analysis__filter_conditions_border px-4 py-4")
    this._shadow.appendChild(this._div);

    var topDiv = document.createElement("div");
    topDiv.setAttribute("class", "d-flex flex-justify-between flex-items-center py-2");
    this._div.appendChild(topDiv);

    var label = document.createElement("span");
    label.textContent = "Conditions"
    label.setAttribute("class", "f1 text-left text-gray text-uppercase text-semibold");
    topDiv.appendChild(label);

    var addConditionButton = document.createElement("button");
    addConditionButton.setAttribute("class", "btn btn-clear btn-outline");
    addConditionButton.textContent = "Add Condition";
    topDiv.appendChild(addConditionButton);

    var innerDiv = document.createElement("div");
    innerDiv.setAttribute("class", "analysis__filter_conditions_border d-flex py-2");
    this._div.appendChild(innerDiv)

    this._conditionDiv = document.createElement("div");
    this._conditionDiv.setAttribute("class", "px-1 py-1")
    this._conditionDiv.style.width = "100%";
    innerDiv.appendChild(this._conditionDiv);

    /**
     * Event handlers
     */

    // Create a new element for the user to apply a new condition/rule to the filter
    addConditionButton.addEventListener("click", () => {

      var newCondition = document.createElement("filter-condition");
      newCondition.data = this._data;
      this._conditionDiv.appendChild(newCondition);

      newCondition.addEventListener("remove", () => {
        this._conditionDiv.removeChild(newCondition);
      });
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
  }

  /**
   * @returns {array} - Array of FilterConditionData objects requested by the user.
   */
   getConditions()
   {
     var conditions = [];
     for (const conditionElem of this._conditionDiv.children)
     {
       var validCondition = conditionElem.getCondition();
       if (validCondition != null)
       {
         conditions.push(validCondition);
       }
     }
     return conditions;
   }
}

customElements.define("filter-condition-group", FilterConditionGroup);