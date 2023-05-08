/**
 * Processes the provided data types to be used by the entity timeline and
 * the timeline settings dialog.
 *
 * Dependency: localStorage is used
 *
 */
export class TimelineSettings {
  constructor(projectId, dataTypes) {
    this._projectId = projectId;
    this._localStorageKey = `tator_timeline_settings_proj_${projectId}`;

    this._frameNumericalTypes = [];
    this._frameBooleanTypes = [];
    this._attrRangeTypes = [];
    this._allTypes = [];
    this._defaultColor = "#797991";

    for (const dataType of dataTypes) {
      if (dataType.interpolation == "latest") {
        let sortedAttributeTypes = dataType.attribute_types;
        sortedAttributeTypes.sort((a, b) => {
          return a.order - b.order;
        });
        for (let attrType of sortedAttributeTypes) {
          if (attrType.dtype == "bool") {
            this._frameBooleanTypes.push({
              timelineType: "frameBoolean",
              dataType: dataType,
              name: attrType.name,
              color: this._defaultColor,
              visible: true,
            });
          } else if (attrType.dtype == "float" || attrType.dtype == "int") {
            this._frameNumericalTypes.push({
              timelineType: "frameNumerical",
              dataType: dataType,
              name: attrType.name,
              color: this._defaultColor,
              visible: true,
            });
          }
        }
      } else if (dataType.interpolation == "attr_style_range") {
        // To support attr_style_range, there must at least be one set of
        // start_frame|end_frame style attributes. Grab the start_frame/end_frame info.
        // Same applies to start_utc|end_utc style attributes
        //
        // There can actually be multiple start_frame|end_frame pairs. If this is the case,
        // there has to be a range associated. If not, then don't show anything and throw a
        // warning
        var startUTCAttr;
        var endUTCAttr;
        var startFrameAttr;
        var endFrameAttr;
        var startInVideoCheckAttr;
        var endInVideoCheckAttr;
        var inVideoCheckAttr;
        var inVideoCheckAttrList = [];
        var startUTCAttrList = [];
        var endUTCAttrList = [];
        var startFrameAttrList = [];
        var endFrameAttrList = [];
        var rangeList = [];
        var rangeUtcList = [];
        var mode;

        for (const attr of dataType.attribute_types) {
          const style = attr["style"];

          if (style) {
            const styleOptions = style.split(" ");
            const name = attr["name"];

            if (styleOptions.includes("start_frame")) {
              mode = "frame";
              startFrameAttrList.push(name);
            } else if (styleOptions.includes("end_frame")) {
              mode = "frame";
              endFrameAttrList.push(name);
            } else if (
              styleOptions.includes("start_frame_check") ||
              styleOptions.includes("start_in_video_check")
            ) {
              startInVideoCheckAttr = name;
            } else if (
              styleOptions.includes("end_frame_check") ||
              styleOptions.includes("end_in_video_check")
            ) {
              endInVideoCheckAttr = name;
            } else if (styleOptions.includes("start_utc")) {
              mode = "utc";
              startUTCAttrList.push(name);
            } else if (styleOptions.includes("end_utc")) {
              mode = "utc";
              endUTCAttrList.push(name);
            } else if (styleOptions.includes("in_video_check")) {
              inVideoCheckAttrList.push(name);
            } else if (styleOptions.includes("range_set")) {
              rangeList.push({
                name: name,
                data: attr["default"],
                order: attr["order"],
              });
            } else if (styleOptions.includes("range_set_utc")) {
              rangeUtcList.push({
                name: name,
                data: attr["default"],
                order: attr["order"],
              });
            }
          }
        }

        if (startFrameAttrList.length == 1 && endFrameAttrList.length == 1) {
          startFrameAttr = startFrameAttrList[0];
          endFrameAttr = endFrameAttrList[0];
          startUTCAttr = null;
          endUTCAttr = null;
          inVideoCheckAttr = null;

          this._attrRangeTypes.push({
            timelineType: "attributeRange",
            dataType: dataType,
            name: dataType.name,
            mode: mode,
            startUTCAttr: null,
            endUTCAttr: null,
            startFrameAttr: startFrameAttr,
            endFrameAttr: endFrameAttr,
            startInVideoCheckAttr: startInVideoCheckAttr,
            endInVideoCheckAttr: endInVideoCheckAttr,
            inVideoCheckAttr: null,
            color: this._defaultColor,
            visible: true,
          });
        } else if (
          startUTCAttrList.length >= 1 &&
          endUTCAttrList.length >= 1 &&
          startUTCAttrList.length == endUTCAttrList.length &&
          rangeUtcList.length == startUTCAttrList.length
        ) {
          rangeUtcList.sort(function (a, b) {
            if (a.order < b.order) {
              return 1;
            }
            if (a.order > b.order) {
              return -1;
            }
            return 0;
          });
          for (const rangeInfo of rangeUtcList) {
            const rangeTokens = rangeInfo.data.split("|");
            if (rangeTokens.length != 5) {
              console.error(
                "Incorrect datatype setup with attr_style_range interpolation."
              );
              break;
            }

            startUTCAttr = rangeTokens[0];
            endUTCAttr = rangeTokens[1];
            inVideoCheckAttr = rangeTokens[2];
            startInVideoCheckAttr = rangeTokens[3];
            endInVideoCheckAttr = rangeTokens[4];

            this._attrRangeTypes.push({
              timelineType: "attributeRange",
              dataType: dataType,
              name: rangeInfo.name,
              mode: mode,
              startUTCAttr: startUTCAttr,
              endUTCAttr: endUTCAttr,
              startFrameAttr: null,
              endFrameAttr: null,
              startInVideoCheckAttr: startInVideoCheckAttr,
              endInVideoCheckAttr: endInVideoCheckAttr,
              inVideoCheckAttr: inVideoCheckAttr,
              color: this._defaultColor,
              visible: true,
            });
          }
        } else if (startUTCAttrList.length == 1 && endUTCAttrList.length == 1) {
          startUTCAttr = startUTCAttrList[0];
          endUTCAttr = endUTCAttrList[0];

          this._attrRangeTypes.push({
            timelineType: "attributeRange",
            dataType: dataType,
            name: dataType.name,
            mode: mode,
            startUTCAttr: startUTCAttr,
            endUTCAttr: endUTCAttr,
            startFrameAttr: null,
            endFrameAttr: null,
            startInVideoCheckAttr: startInVideoCheckAttr,
            endInVideoCheckAttr: endInVideoCheckAttr,
            inVideoCheckAttr: null,
            color: this._defaultColor,
            visible: true,
          });
        } else if (
          startFrameAttrList.length > 1 &&
          endFrameAttrList.length > 1 &&
          startFrameAttrList.length == endFrameAttrList.length &&
          startFrameAttrList.length == rangeList.length
        ) {
          rangeList.sort(function (a, b) {
            if (a.order < b.order) {
              return 1;
            }
            if (a.order > b.order) {
              return -1;
            }
            return 0;
          });

          for (const rangeInfo of rangeList) {
            const rangeTokens = rangeInfo.data.split("|");
            if (rangeTokens.length != 3) {
              console.error(
                "Incorrect datatype setup with attr_style_range interpolation."
              );
              break;
            }

            startFrameAttr = rangeTokens[0];
            endFrameAttr = rangeTokens[1];
            inVideoCheckAttr = rangeTokens[2];

            this._attrRangeTypes.push({
              timelineType: "attributeRange",
              dataType: dataType,
              name: rangeInfo.name,
              mode: mode,
              startUTCAttr: null,
              endUTCAttr: null,
              startFrameAttr: startFrameAttr,
              endFrameAttr: endFrameAttr,
              startInVideoCheckAttr: null,
              endInVideoCheckAttr: null,
              inVideoCheckAttr: inVideoCheckAttr,
              color: this._defaultColor,
              visible: true,
            });
          }
        } else {
          console.error(
            "Incorrect datatype setup with attr_style_range interpolation."
          );
          continue;
        }
      }
    }

    this._allTypes.push(...this._frameBooleanTypes);
    this._allTypes.push(...this._attrRangeTypes);
    this._allTypes.push(...this._frameNumericalTypes);

    try {
      const storedDataJSON = localStorage.getItem(this._localStorageKey);
      if (storedDataJSON) {
        const storageObject = JSON.parse(storedDataJSON);
        if (storageObject.attributeTypesInfo) {
          for (const cachedInfo of storageObject.attributeTypesInfo) {
            for (var thisInfo of this._allTypes) {
              if (
                thisInfo.dataType.id == cachedInfo.dataTypeId &&
                thisInfo.name == cachedInfo.name
              ) {
                thisInfo.color = cachedInfo.color;
                thisInfo.visible = cachedInfo.visible;
                break;
              }
            }
          }
        }
      }
    } catch (exc) {
      console.warn(exc);
    }
  }

  setColor(dataTypeId, attributeName, color) {
    for (var entry of this._allTypes) {
      if (entry.dataType.id == dataTypeId && entry.name == attributeName) {
        entry.color = color;
        this.saveToLocalStorage();
        return;
      }
    }
  }

  setVisible(dataTypeId, attributeName, visible) {
    for (var entry of this._allTypes) {
      if (entry.dataType.id == dataTypeId && entry.name == attributeName) {
        entry.visible = visible;
        this.saveToLocalStorage();
        return;
      }
    }
  }

  saveToLocalStorage() {
    var attributeTypesInfo = [];
    for (const info of this._allTypes) {
      attributeTypesInfo.push({
        dataTypeId: info.dataType.id,
        name: info.name,
        color: info.color,
        visible: info.visible,
      });
    }
    var storageObject = {
      projectId: this._projectId,
      attributeTypesInfo: attributeTypesInfo,
    };
    window.localStorage.setItem(
      this._localStorageKey,
      JSON.stringify(storageObject)
    );
  }

  getFrameBooleanInfo() {
    return this._frameBooleanTypes;
  }

  getFrameNumericalInfo() {
    return this._frameNumericalTypes;
  }

  getAttrRangeInfo() {
    return this._attrRangeTypes;
  }

  getSelectedColor() {
    return "#FFFFFF";
  }
}
