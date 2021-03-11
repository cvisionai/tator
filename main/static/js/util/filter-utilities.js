/**
 * Class used to encapsulate a condition for the data filtering interface
 */
class FilterConditionData {

  /**
   * Note: There is no error checking (e.g. checking for nulls)
   * @param {string} category
   * @param {string} field
   * @param {string} modifier
   * @param {string} value
   */
  constructor (category, field, modifier, value) {
    this.category = category;
    this.field = field;
    this.modifier = modifier;
    this.value = value;
  }

  /**
   * @returns {string} String version of this object
   */
  getString() {
    return this.category + ":" + this.field + " " + this.modifier + " " + this.value;
  }
}

/**
 * Library of utility functions related to the filtering of data
 */
class FilterUtilities {
  /**
   * @returns {array of objects} Valid modifier choices given the dtype
   *                             Stored within the value property of the object because this
   *                             syncs up with the enum-input javascript.
   */
  static getModifierChoices(dtype) {

    var choices = [];

    // #TODO Add more options for the different dtypes

    if (dtype == "int" || dtype == "float") {
      choices.push({"value": "=="});
      choices.push({"value": ">"});
      choices.push({"value": ">="});
      choices.push({"value": "<"});
      choices.push({"value": "<="});
    }
    else if (dtype == "bool") {
      choices.push({"value": "=="});
    }
    else {
      choices.push({"value": "Includes"});
      choices.push({"value": "=="});
    }

    return choices;
  }
}
