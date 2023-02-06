/**
 * Dependency: localStorage is used
 */
export class AnnotationBrowserSettings {

  constructor(projectId, dataTypes, mediaType) {
    
    this._localStorageKey = `tator_annotation_browser_settings_proj_${projectId}`;
    this._mediaType = mediaType;
    this._locStateDataTypes = dataTypes;
    this._dataTypeIdMap = {};
    this._dataTypeIdMap[`${mediaType.dtype}_${mediaType.id}`] = mediaType;
    for (const dataType of dataTypes) {
      this._dataTypeIdMap[dataType.id] = dataType;
    }
  }

  alwaysVisible(dataType, attrName) {
    return false;
  }
}
