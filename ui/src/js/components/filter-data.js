import { TatorElement } from "./tator-element.js";
import { TatorData } from "../util/tator-data.js";

/**
 * This works in conjunction with FilterInterface. It is the backend portion
 * that connects with the database.
 *
 * #TODO Convert this to a TatorElement so that events can be dispatched
 */
export class FilterData {

  /**
   * @param {TatorData} modelData
   *    Class that will be initialized as the interface to the Tator compliant interface
   * @param {array} algorithmCategories
   *    List of categories to display in run algorithm option
   * @param {array} excludeTypesList
   *    List of types to exclude from creating filter options for
   *    Available options: Medias|Localizations|MediaStates|TrackStates
   * @param {array} skipTypeIds
   *    List of type ids to skip when creating filter options for
   *    Available options: Any Int ID
   */
  constructor(modelData, algorithmCategories, excludeTypesList, skipTypeIds) {

    this._modelData = modelData;

    if (algorithmCategories != null) {
      this.algorithmCategories = algorithmCategories;
    }

    this.excludeTypesList = [];
    if (excludeTypesList != null) {
      this.excludeTypesList = excludeTypesList;
    }

    this.skipTypeIds = [];
    if (skipTypeIds != null) {
      this.skipTypeIds = skipTypeIds;
    }
  }
  /**
   * @precondition The provided modelData must have been initialized
   */
  init() {
    this.mediaStateTypes = this._modelData.getStoredMediaStateTypes();
    this.localizationStateTypes = this._modelData.getStoredLocalizationStateTypes();
    this.localizationTypes = this._modelData.getStoredLocalizationTypes();
    this.mediaTypes = this._modelData.getStoredMediaTypes();
    this.versions = this._modelData.getStoredVersions();
    this.sections = this._modelData.getStoredSections();
    this.users = this._modelData.getStoredMemberships();
    this.algorithms = [];
    var algorithms = this._modelData.getStoredAlgorithms();

    if (typeof this.algorithmCategories != "undefined") {
      for (const algo of algorithms) {
        if (typeof algo.categories != "undefined") {
          for (const algoCategory of algo.categories) {
            if (this.algorithmCategories.indexOf(algoCategory) >= 0) {
              this.algorithms.push(algo);
              break;
            }
          }
        }
      }
    }
    else {
      this.algorithms = algorithms;
    }

    // Allow filtering by dtype for the media, state, and localization types
    var stateTypeOptions = [];
    for (let idx = 0; idx < this.mediaStateTypes.length; idx++) {
      let stateType = this.mediaStateTypes[idx];
      stateTypeOptions.push(`${stateType.name} (ID:${stateType.id})`);
    }
    for (let idx = 0; idx < this.localizationStateTypes.length; idx++) {
      let stateType = this.localizationStateTypes[idx];
      stateTypeOptions.push(`${stateType.name} (ID:${stateType.id})`);
    }

    var localizationTypeOptions = [];
    for (let idx = 0; idx < this.localizationTypes.length; idx++) {
      let locType = this.localizationTypes[idx];
      localizationTypeOptions.push(`${locType.dtype}/${locType.name} (ID:${locType.id})`);
    }

    var mediaTypeOptions = [];
    for (let idx = 0; idx < this.mediaTypes.length; idx++) {
      let mediaType = this.mediaTypes[idx];
      mediaTypeOptions.push(`${mediaType.dtype}/${mediaType.name} (ID:${mediaType.id})`);
    }

    // Allow options to filter by users
    var userNames = [];
    var userFirstLastNames = [];
    for (let idx = 0; idx < this.users.length; idx++) {
      let user = this.users[idx];
      userNames.push(`${user.username} (ID:${user.user})`);
      userFirstLastNames.push({
        label: `${user.username}(ID: ${user.user})`,
        value: user.user
      });
    }
    userNames.sort();
    userFirstLastNames.sort();

    // Versions aren't typically part of the localization type's user attribute list.
    // Pretend that it's an attribute with the name _version and apply it to each
    // localization type so that it can be part of the filter parameters.
    var versionNames = [];
    for (let idx = 0; idx < this.versions.length; idx++) {
      let version = this.versions[idx];
      versionNames.push({label: `${version.name} (ID:${version.id})`, value: version.id});
    }

    // Media sections aren't typically part of the media type's user attribute list.
    // Pretend that it's an attribute with the name _section and apply it to each
    // media type so that it can be part of the filter parameters.
    var sectionNames = [];
    for (let idx = 0; idx < this.sections.length; idx++) {
      let section = this.sections[idx];
      if (section.tator_user_sections != null) {
        sectionNames.push({label: `${section.name} (ID:${section.id})`, value: section.tator_user_sections});
      }
    }

    // Create the filter options
    this._allTypes = [];

    if (this.excludeTypesList.indexOf("Medias") < 0) {
      for (let idx = 0; idx < this.mediaTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.mediaTypes[idx]));
        entityType.typeGroupName = "Media";

        if (this.skipTypeIds.indexOf(this.mediaTypes[idx].id) < 0) {
          var nameAttribute = {
            name: "_name",
            dtype: "string"
          };
          entityType.attribute_types.push(nameAttribute);

          var mediaIdAttribute = {
            name: "_id",
            dtype: "int"
          };
          entityType.attribute_types.push(mediaIdAttribute);

          var sectionAttribute = {
            choices: sectionNames,
            name: "tator_user_sections",
            dtype: "enum"
          }
          entityType.attribute_types.push(sectionAttribute);

          var createdDatetimeAttribute = {
            name: "_created_datetime",
            dtype: "datetime"
          };
          entityType.attribute_types.push(createdDatetimeAttribute);

          var createdByAttribute = {
            choices: userFirstLastNames,
            name: "_created_by",
            dtype: "enum"
          }
          entityType.attribute_types.push(createdByAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "_modified_by",
            dtype: "enum"
          }
          entityType.attribute_types.push(modifiedByAttribute);

          var modifiedDatetimeAttribute = {
            name: "_modified_datetime",
            dtype: "datetime"
          };
          entityType.attribute_types.push(modifiedDatetimeAttribute);

          var dtypeAttribute = {
            choices: mediaTypeOptions,
            name: "_dtype",
            dtype: "enum"
          };
          entityType.attribute_types.push(dtypeAttribute);

          var archiveStateAttribute = {
            choices: ["live", "to_archive", "archived", "to_live"],
            name: "_archive_state",
            dtype: "enum"
          }
          entityType.attribute_types.push(archiveStateAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("Localizations") < 0) {
      for (let idx = 0; idx < this.localizationTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.localizationTypes[idx]));
        entityType.typeGroupName = "Annotation";

        if (this.skipTypeIds.indexOf(this.localizationTypes[idx].id) < 0) {
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
          };
          entityType.attribute_types.push(dtypeAttribute);

          var userAttribute = {
            choices: userNames,
            name: "_user",
            dtype: "enum"
          };
          entityType.attribute_types.push(userAttribute);

          var createdDatetimeAttribute = {
            name: "_created_datetime",
            dtype: "datetime"
          };
          entityType.attribute_types.push(createdDatetimeAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "Modified By",
            dtype: "enum"
          }
          entityType.attribute_types.push(modifiedByAttribute);

          var modifiedDatetimeAttribute = {
            name: "_modified_datetime",
            dtype: "datetime"
          };
          entityType.attribute_types.push(modifiedDatetimeAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("MediaStates") < 0) {
      for (let idx = 0; idx < this.mediaStateTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.mediaStateTypes[idx]));
        entityType.typeGroupName = "Collection";

        if (this.skipTypeIds.indexOf(this.mediaStateTypes[idx].id) < 0) {
          var versionAttribute = {
            choices: versionNames,
            name: "_version",
            dtype: "enum"
          };
          entityType.attribute_types.push(versionAttribute);

          var typeAttribute = {
            choices: stateTypeOptions,
            name: "_type",
            dtype: "enum"
          }
          entityType.attribute_types.push(typeAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("LocalizationStates") < 0) {
      for (let idx = 0; idx < this.localizationStateTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.localizationStateTypes[idx]));
        entityType.typeGroupName = "Collection";

        if (this.skipTypeIds.indexOf(this.localizationStateTypes[idx].id) < 0) {
          var versionAttribute = {
            choices: versionNames,
            name: "_version",
            dtype: "enum"
          };
          entityType.attribute_types.push(versionAttribute);

          var typeAttribute = {
            choices: stateTypeOptions,
            name: "_type",
            dtype: "enum"
          }
          entityType.attribute_types.push(typeAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "Modified By",
            dtype: "enum"
          }
          entityType.attribute_types.push(modifiedByAttribute);

          this._allTypes.push(entityType);
        }
      }
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
  getAllTypes() {
    return this._allTypes;
  }

  /**
   * Retrieve a list of the algorithms that are valid for this filter data view.
   * These will be filtered based on category.
   */
  getAlgorithms() {
    return this.algorithms;
  }

  /**
   * #TODO
   */
  getProjectId() {
    return this._modelData.getProjectId();
  }

  /**
   * #TODO
   */
  async launchAlgorithm(algorithm, parameters) {
    return this._modelData.launchAlgorithm(algorithm, parameters);
  }
}
