/**
 * This works in conjunction with FilterInterface. It is the backend portion
 * that connects with the database containing the Tator objects.
 */
class FilterData {
  constructor (modelData) {

    this._modelData = modelData;

    // #TODO Add more types
    this.localizationTypes = [];
  }

  /**
   * Sets the following object properties:
   * localizationTypes - array - List of localizationType objects
   *
   * #TODO Add more types
   */
  async init()
  {
    let [localizationTypes] = await Promise.all([
      this._modelData.getAllLocalizationTypes()
    ]);

    this.localizationTypes = localizationTypes;
  }

  /**
   * Returns an array of all the types
   * init() must have been called prior to executing this
   * @returns {array} - Array of all types (localizationType)
   *
   * #TODO Add more types
   */
  getAllTypes()
  {
    return [...this.localizationTypes];
  }
}