/**
 * This works in conjunction with FilterInterface. It is the backend portion
 * that connects with the database.
 */
class FilterData {
  constructor (modelData) {

    this._modelData = modelData;

    // #TODO Add more types
    this.localizationTypes = [];
    this.mediaTypes = [];
  }

  /**
   * Sets the following object properties:
   * localizationTypes - array - List of localizationType objects
   *
   * #TODO Add more types
   */
  async init()
  {
    let [localizationTypes, mediaTypes] = await Promise.all([
      this._modelData.getAllLocalizationTypes(),
      this._modelData.getAllMediaTypes(),
    ]);

    this.localizationTypes = localizationTypes;
    this.mediaTypes = mediaTypes;
  }

  /**
   * Returns an array of all the types
   * init() must have been called prior to executing this
   *
   * @returns {array} - Array of all types (localizationType)
   *
   * #TODO Add more types
   * #TODO Add built in attributes (created by, versions, name, section)
   */
  getAllTypes()
  {
    return [...this.localizationTypes, ...this.mediaTypes];
  }
}