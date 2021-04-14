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
    this.versions = this._modelData.getStoredVersions();
    this.sections = this._modelData.getStoredSections();

    // Want to be able to filter based on localization dtypes. Package up the localization types
    // and add it as an attribute
    var localizationTypeOptions = [];
    for (let idx = 0; idx < this.localizationTypes.length; idx++) {
      let locType = this.localizationTypes[idx];
      localizationTypeOptions.push(`${locType.dtype}_${locType.id}`);
    }

    // Versions aren't typically part of the localization type's user attribute list.
    // Pretend that it's an attribute with the name _version and apply it to each
    // localization type so that it can be part of the filter parameters.
    var versionNames = [];
    for (let idx = 0; idx < this.versions.length; idx++) {
      let version = this.versions[idx];
      versionNames.push(`${version.name} (ID:${version.id})`);
    }

    // Media sections aren't typically part of the media type's user attribute list.
    // Pretend that it's an attribute with the name _section and apply it to each
    // media type so that it can be part of the filter parameters.
    var sectionNames = [];
    for (let idx = 0; idx < this.sections.length; idx++) {
      let section = this.sections[idx];
      sectionNames.push(`${section.name} (ID:${section.id})`);
    }

    this._allTypes = [];
    for (let idx = 0; idx < this.mediaTypes.length; idx++) {
      let entityType = JSON.parse(JSON.stringify(this.mediaTypes[idx]));
      entityType.typeGroupName = "Media";

      var sectionAttribute = {
        choices: sectionNames,
        name: "_section",
        dtype: "enum"
      };
      entityType.attribute_types.push(sectionAttribute);

      this._allTypes.push(entityType);
    }
    for (let idx = 0; idx < this.localizationTypes.length; idx++) {
      let entityType = JSON.parse(JSON.stringify(this.localizationTypes[idx]));
      entityType.typeGroupName = "Annotation";

      var versionAttribute = {
        choices: versionNames,
        name: "_version",
        dtype: "enum"
      };
      entityType.attribute_types.push(versionAttribute);

      var dtypeAttribute = {
        choices: localizationTypeOptions,
        name: "_dtype",
        dtype: "enum"
      }
      entityType.attribute_types.push(dtypeAttribute);

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