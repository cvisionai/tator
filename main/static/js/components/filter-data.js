/**
 * This works in conjunction with FilterInterface. It is the backend portion
 * that connects with the database.
 *
 * #TODO Convert this to a TatorElement so that events can be dispatched
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

    this._allTypes = [];
    for (let idx = 0; idx < this.mediaTypes.length; idx++) {
      let entityType = this.mediaTypes[idx];
      entityType.typeGroupName = "Media";
      this._allTypes.push(entityType);
    }
    for (let idx = 0; idx < this.localizationTypes.length; idx++) {
      let entityType = this.localizationTypes[idx];
      entityType.typeGroupName = "Annotation";
      this._allTypes.push(entityType);
    }
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
    return this._allTypes;
  }
}