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
   * @precondition The provided modelData must have been initialized
   */
  init()
  {
    this.localizationTypes = this._modelData.getStoredLocalizationTypes();
    this.mediaTypes = this._modelData.getStoredMediaTypes();
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