/**
 * This works in conjunction with FilterInterface. It is the backend portion
 * that connects with the database containing the Tator objects.
 */
class FilterData {
  constructor (modelData) {

    this._modelData = modelData;

    this.localizationTypes = null;
    this.init();
  }

  /**
   * Sets the following object properties:
   * localizationTypes - array - List of localizationType objects
   */
  async init() 
  {
    let [localizationTypes] = await Promise.all([
      this._modelData.getAllLocalizationTypes()
    ]);

    this.localizationTypes = localizationTypes;
  }
}