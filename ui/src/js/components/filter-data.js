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
   *    Available options: Medias|Localizations|MediaStates|LocalizationStates|FrameStates
   *    @TODO: This is generally a bad practice, lists should be inclusive vs. exclusionary as adding new elements causes people to seek out
   *           where code is and change it in N places. We should opt to change this interface to inclusive.
   * @param {array} skipTypeIds
   *    List of type ids to skip when creating filter options for
   *    Available options: Any Int ID
   * @param {boolean} squashMetadata
   *    If true, will collapse Localizations, MediaStates, LocalizationStates, and FrameStates (whichever aren't excluded) into a single 'Metadata' Category
   */
  constructor(
    modelData,
    algorithmCategories,
    excludeTypesList,
    skipTypeIds,
    squashMetadata,
    category_lookup
  ) {
    this._modelData = modelData;
    if (category_lookup)
    {
      this._category_lookup = category_lookup;
    }
    else
    {
      this._category_lookup = {};
    }
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

    this._squashMetadata = squashMetadata == true;
  }
  /**
   * @precondition The provided modelData must have been initialized
   */
  init() {
    this.frameStateTypes = this._modelData.getStoredFrameStateTypes();
    this.mediaStateTypes = this._modelData.getStoredMediaStateTypes();
    this.localizationStateTypes =
      this._modelData.getStoredLocalizationStateTypes();
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
    } else {
      this.algorithms = algorithms;
    }

    // Allow filtering by dtype for the media, state, and localization types
    var stateTypeOptions = [];
    for (let idx = 0; idx < this.mediaStateTypes.length; idx++) {
      let stateType = this.mediaStateTypes[idx];
      stateTypeOptions.push({
        label: `${stateType.name} (ID:${stateType.id})`,
        value: `${stateType.name} (ID:${stateType.id})`,
      });
    }
    for (let idx = 0; idx < this.localizationStateTypes.length; idx++) {
      let stateType = this.localizationStateTypes[idx];
      stateTypeOptions.push({
        label: `${stateType.name} (ID:${stateType.id})`,
        value: `${stateType.name} (ID:${stateType.id})`,
      });
    }

    var localizationTypeOptions = [];
    for (let idx = 0; idx < this.localizationTypes.length; idx++) {
      let locType = this.localizationTypes[idx];
      localizationTypeOptions.push({
        label: `${locType.dtype}/${locType.name} (ID:${locType.id})`,
        value: `${locType.dtype}/${locType.name} (ID:${locType.id})`,
      });
    }

    var mediaTypeOptions = [];
    for (let idx = 0; idx < this.mediaTypes.length; idx++) {
      let mediaType = this.mediaTypes[idx];
      mediaTypeOptions.push({
        label: `${mediaType.dtype}/${mediaType.name} (ID:${mediaType.id})`,
        value: `${mediaType.dtype}/${mediaType.name} (ID:${mediaType.id})`,
      });
    }

    // Allow options to filter by users
    var userNames = [];
    var userFirstLastNames = [];
    for (let idx = 0; idx < this.users.length; idx++) {
      let user = this.users[idx];
      userNames.push(`${user.username} (ID:${user.user})`);
      userFirstLastNames.push({
        label: `${user.username} (ID: ${user.user})`,
        value: `${user.username} (ID: ${user.user})`,
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
      versionNames.push({
        label: `${version.name} (ID:${version.id})`,
        value: `${version.name} (ID:${version.id})`,
      });
    }

    // Media sections aren't typically part of the media type's user attribute list.
    // Pretend that it's an attribute with the name _section and apply it to each
    // media type so that it can be part of the filter parameters.
    var sectionNames = [];
    for (let idx = 0; idx < this.sections.length; idx++) {
      let section = this.sections[idx];
      sectionNames.push({
        label: `${section.name} (ID:${section.id})`,
        value: `${section.name} (ID:${section.id})`,
      });
    }

    // Create the filter options
    this._allTypes = [];

    let category_lookup = this._category_lookup;
    if (this._squashMetadata) {
      category_lookup = {
        Localizations: "Metadata",
        MediaStates: "Metadata",
        FrameStates: "Metadata",
        LocalizationStates: "Metadata",
      };
    }

    if (this.excludeTypesList.indexOf("Medias") < 0) {
      for (let idx = 0; idx < this.mediaTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.mediaTypes[idx]));
        entityType.typeGroupName = "Media";

        if (this.skipTypeIds.indexOf(this.mediaTypes[idx].id) < 0) {
          var nameAttribute = {
            name: "$name",
            label: "Filename",
            dtype: "string",
          };
          entityType.attribute_types.push(nameAttribute);

          var mediaIdAttribute = {
            name: "$id",
            label: "ID",
            dtype: "int",
          };
          entityType.attribute_types.push(mediaIdAttribute);

          var sectionAttribute = {
            choices: sectionNames,
            name: "$section",
            label: "Section",
            dtype: "enum",
          };
          entityType.attribute_types.push(sectionAttribute);

          var createdDatetimeAttribute = {
            name: "$created_datetime",
            label: "Created Datetime",
            dtype: "datetime",
          };
          entityType.attribute_types.push(createdDatetimeAttribute);

          var createdByAttribute = {
            choices: userFirstLastNames,
            name: "$created_by",
            label: "Created By",
            dtype: "enum",
          };
          entityType.attribute_types.push(createdByAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "$modified_by",
            label: "Modified By",
            dtype: "enum",
          };
          entityType.attribute_types.push(modifiedByAttribute);

          var modifiedDatetimeAttribute = {
            name: "$modified_datetime",
            label: "Modified Datetime",
            dtype: "datetime",
          };
          entityType.attribute_types.push(modifiedDatetimeAttribute);

          var dtypeAttribute = {
            choices: mediaTypeOptions,
            name: "$type",
            label: "Data type",
            dtype: "enum",
          };
          entityType.attribute_types.push(dtypeAttribute);

          var elemental_id = {
            name: "$elemental_id",
            label: "Elemental ID",
            dtype: "string",
          };
          entityType.attribute_types.push(elemental_id);

          var archiveStateAttribute = {
            choices: ["live", "to_archive", "archived", "to_live"],
            name: "$archive_state",
            label: "Archive State",
            dtype: "enum",
          };
          entityType.attribute_types.push(archiveStateAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("Localizations") < 0) {
      for (let idx = 0; idx < this.localizationTypes.length; idx++) {
        let entityType = JSON.parse(
          JSON.stringify(this.localizationTypes[idx])
        );
        entityType.typeGroupName = category_lookup.Localizations
          ? category_lookup.Localizations
          : "Localization";

        if (this.skipTypeIds.indexOf(this.localizationTypes[idx].id) < 0) {
          if (
            ["box", "line", "dot"].indexOf(this.localizationTypes[idx].dtype) >=
            0
          ) {
            var geo_x = {
              name: "$x",
              label: "X coordinate",
              dtype: "float",
            };
            entityType.attribute_types.push(geo_x);
            var geo_y = {
              name: "$y",
              label: "Y coordinate",
              dtype: "float",
            };
            entityType.attribute_types.push(geo_y);
          }
          if (["box"].indexOf(this.localizationTypes[idx].dtype) >= 0) {
            var geo_width = {
              name: "$width",
              label: "Box Width",
              dtype: "float",
            };
            entityType.attribute_types.push(geo_width);
            var geo_height = {
              name: "$height",
              label: "Box Height",
              dtype: "float",
            };
            entityType.attribute_types.push(geo_height);
          }

          var elemental_id = {
            name: "$elemental_id",
            label: "Elemental ID",
            dtype: "string",
          };
          entityType.attribute_types.push(elemental_id);

          var frameAttribute = {
            name: "$frame",
            label: "Frame",
            dtype: "int",
          };
          entityType.attribute_types.push(frameAttribute);

          var versionAttribute = {
            choices: versionNames,
            name: "$version",
            label: "Version",
            dtype: "enum",
          };
          entityType.attribute_types.push(versionAttribute);

          var dtypeAttribute = {
            choices: localizationTypeOptions,
            name: "$type",
            label: "Data type",
            dtype: "enum",
          };
          entityType.attribute_types.push(dtypeAttribute);

          var userAttribute = {
            choices: userNames,
            name: "$user",
            label: "User",
            dtype: "enum",
          };
          entityType.attribute_types.push(userAttribute);

          var createdDatetimeAttribute = {
            name: "$created_datetime",
            label: "Created datetime",
            dtype: "datetime",
          };
          entityType.attribute_types.push(createdDatetimeAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "$modified_by",
            label: "Modified By",
            dtype: "enum",
          };
          entityType.attribute_types.push(modifiedByAttribute);

          var modifiedDatetimeAttribute = {
            name: "$modified_datetime",
            label: "Modified Datetime",
            dtype: "datetime",
          };
          entityType.attribute_types.push(modifiedDatetimeAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("MediaStates") < 0) {
      for (let idx = 0; idx < this.mediaStateTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.mediaStateTypes[idx]));
        entityType.typeGroupName = category_lookup.MediaStates
          ? category_lookup.MediaStates
          : "State";

        if (this.skipTypeIds.indexOf(this.mediaStateTypes[idx].id) < 0) {
          var versionAttribute = {
            choices: versionNames,
            name: "$version",
            label: "Version",
            dtype: "enum",
          };
          entityType.attribute_types.push(versionAttribute);

          var typeAttribute = {
            choices: stateTypeOptions,
            name: "$type",
            label: "Data type",
            dtype: "enum",
          };
          entityType.attribute_types.push(typeAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("LocalizationStates") < 0) {
      for (let idx = 0; idx < this.localizationStateTypes.length; idx++) {
        let entityType = JSON.parse(
          JSON.stringify(this.localizationStateTypes[idx])
        );
        entityType.typeGroupName = category_lookup.LocalizationStates
          ? category_lookup.LocalizationStates
          : "State";

        if (this.skipTypeIds.indexOf(this.localizationStateTypes[idx].id) < 0) {
          var versionAttribute = {
            choices: versionNames,
            name: "$version",
            label: "Version",
            dtype: "enum",
          };
          entityType.attribute_types.push(versionAttribute);

          var typeAttribute = {
            choices: stateTypeOptions,
            name: "$type",
            label: "Data Type",
            dtype: "enum",
          };
          entityType.attribute_types.push(typeAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "$modified_by",
            label: "Modified By",
            dtype: "enum",
          };
          entityType.attribute_types.push(modifiedByAttribute);

          this._allTypes.push(entityType);
        }
      }
    }

    if (this.excludeTypesList.indexOf("FrameStates") < 0) {
      for (let idx = 0; idx < this.frameStateTypes.length; idx++) {
        let entityType = JSON.parse(JSON.stringify(this.frameStateTypes[idx]));
        entityType.typeGroupName = category_lookup.FrameStates
          ? category_lookup.FrameStates
          : "State";

        if (this.skipTypeIds.indexOf(this.frameStateTypes[idx].id) < 0) {
          var frameAttribute = {
            name: "$frame",
            label: "Frame",
            dtype: "int",
          };
          entityType.attribute_types.push(frameAttribute);

          var versionAttribute = {
            choices: versionNames,
            name: "$version",
            label: "Version",
            dtype: "enum",
          };
          entityType.attribute_types.push(versionAttribute);

          var typeAttribute = {
            choices: stateTypeOptions,
            name: "$type",
            label: "Data Type",
            dtype: "enum",
          };
          entityType.attribute_types.push(typeAttribute);

          var modifiedByAttribute = {
            choices: userFirstLastNames,
            name: "$modified_by",
            label: "Modified By",
            dtype: "enum",
          };
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
