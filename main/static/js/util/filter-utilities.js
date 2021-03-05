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