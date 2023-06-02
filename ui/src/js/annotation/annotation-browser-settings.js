/**
 * Dependency: localStorage is used
 */
export class AnnotationBrowserSettings {
  constructor(projectId, dataTypes, mediaType) {
    this._projectId = projectId;
    this._localStorageKey = `tator_annotation_browser_settings_proj_${projectId}`;

    this._mediaType = mediaType;
    this._locStateDataTypes = dataTypes;
    this._dataTypeIdMap = {};

    var mediaTypeId = this.makeId(mediaType);
    this._dataTypeIdMap[mediaTypeId] = mediaType;

    this._alwaysVisibleInfoMap = {};

    for (const dataType of dataTypes) {
      this._dataTypeIdMap[this.makeId(dataType)] = dataType;

      var alwaysVisibleInfo = {};
      var builtInAttributes = ["ID", "Version", "Frame"];
      for (const attrName of builtInAttributes) {
        alwaysVisibleInfo[attrName] = false;
      }
      for (const attr of dataType.attribute_types) {
        alwaysVisibleInfo[attr.name] = false;
      }
      this._alwaysVisibleInfoMap[this.makeId(dataType)] = alwaysVisibleInfo;
    }

    var alwaysVisibleInfo = {};
    var builtInAttributes = ["ID", "Version", "Frame"];
    for (const attrName of builtInAttributes) {
      alwaysVisibleInfo[attrName] = false;
    }
    for (const attr of mediaType.attribute_types) {
      alwaysVisibleInfo[attr.name] = false;
    }
    this._alwaysVisibleInfoMap[mediaTypeId] = alwaysVisibleInfo;

    try {
      const storedDataJSON = localStorage.getItem(this._localStorageKey);
      if (storedDataJSON) {
        const storageObject = JSON.parse(storedDataJSON);
        if (storageObject.alwaysVisibleInfoMap) {
          for (const [dataTypeId, info] of Object.entries(
            storageObject.alwaysVisibleInfoMap
          )) {
            if (dataTypeId in this._alwaysVisibleInfoMap) {
              for (const [attrName, visible] of Object.entries(info)) {
                this._alwaysVisibleInfoMap[dataTypeId][attrName] = visible;
              }
            }
          }
        }
      }
    } catch (exc) {
      console.warn(exc);
    }
  }

  getDataTypeIdMap() {
    return this._dataTypeIdMap;
  }

  setAlwaysVisible(dataType, attrName, alwaysVisible) {
    this._alwaysVisibleInfoMap[this.makeId(dataType)][attrName] = alwaysVisible;

    var storageObject = {
      projectId: this._projectId,
      alwaysVisibleInfoMap: this._alwaysVisibleInfoMap,
    };
    window.localStorage.setItem(
      this._localStorageKey,
      JSON.stringify(storageObject)
    );
  }

  isAlwaysVisible(dataType, attrName) {
    return this._alwaysVisibleInfoMap[this.makeId(dataType)][attrName];
  }

  makeId(dataType) {
    return `${dataType.dtype}/${dataType.id}`;
  }
}
