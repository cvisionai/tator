import * as d3 from "d3";
import { v1 as uuidv1 } from "uuid";
import { TatorApi } from "../../../../scripts/packages/tator-js/pkg/src/index.js";
import { BaseTimeline } from "../annotation/base-timeline.js";

export class EntityTimeline extends BaseTimeline {
  constructor() {
    super();

    this._selectedDiv = document.createElement("div");
    this._shadow.appendChild(this._selectedDiv);

    this._mainTimelineDiv = document.createElement("div");
    this._mainTimelineDiv.id = "main-timeline";
    this._shadow.appendChild(this._mainTimelineDiv);

    this._focusTimelineDiv = document.createElement("div");
    this._focusTimelineDiv.setAttribute("class", "");
    this._focusTimelineDiv.id = "focus-timeline";
    this._shadow.appendChild(this._focusTimelineDiv);

    this._mainSvg = d3.select(this._shadow).select("#main-timeline")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("font", "12px sans-serif")
      .style("color", "#6d7a96");

    this._focusSvg = d3.select(this._shadow).select("#focus-timeline")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("font", "12px sans-serif")
      .style("color", "#6d7a96");

    this._focusLine = this._focusSvg.append("g").attr("display", "none");

    // Initially hide the focus timeline. Some external UI element will control
    // whether or not to display this.
    this._focusTimelineDiv.style.display = "none";

    // Redraw whenever there's a resize
    this._selectedData = null;
    this._stateData = [];
    this._numericalData = [];
    this._pointsData = [];
    window.addEventListener("resize", this._updateSvgData());
  }

  /**
   * Set a pointer to the global data storage and setup event listeners when
   * there is new data.
   * @param {AnnotationData} val - Tator data singleton that contains the annotations
   */
  set annotationData(val) {
    this._data = val;

    this._data.addEventListener("freshData", () => {
      this._setupAttrStyleRangeTypes();
      this._updateData();
    });

    this._data.addEventListener("initialized", () => {
      this._setupAttrStyleRangeTypes();
      this._updateData();
    });
  }

  timeStoreInitialized() {
    this._timeStoreInitialized = true;
    this._setupAttrStyleRangeTypes();
    this._updateData();
  }

  /**
   * Expected that state types will not change within the annotator/usage of this timeline.
   * Therefore, run this once at initialization.
   *
   * @postcondition this._attrStyleRangeTypes is set
   */
  _setupAttrStyleRangeTypes() {

    if (this._attrStyleRangeTypes != undefined) {
      return;
    }

    if (this._data == undefined) {
      return;
    }

    this._attrStyleRangeTypes = [];

    for (let typeId in this._data._dataTypes) {

      // Grab the dataType and if this is not a state type, then ignore it
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isLocalization) {
        continue;
      }

      if (dataType.interpolation == "attr_style_range") {
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
          const style = attr['style'];

          if (style) {

            const styleOptions = style.split(' ');
            const name = attr['name'];

            if (styleOptions.includes("start_frame")) {
              mode = "frame";
              startFrameAttrList.push(name);
            }
            else if (styleOptions.includes("end_frame")) {
              mode = "frame";
              endFrameAttrList.push(name);
            }
            else if (styleOptions.includes("start_frame_check") || styleOptions.includes("start_in_video_check")) {
              startInVideoCheckAttr = name;
            }
            else if (styleOptions.includes("end_frame_check") || styleOptions.includes("end_in_video_check")) {
              endInVideoCheckAttr = name;
            }
            else if (styleOptions.includes("start_utc")) {
              mode = "utc";
              startUTCAttrList.push(name);
            }
            else if (styleOptions.includes("end_utc")) {
              mode = "utc";
              endUTCAttrList.push(name);
            }
            else if (styleOptions.includes("in_video_check")) {
              inVideoCheckAttrList.push(name);
            }
            else if (styleOptions.includes("range_set")) {
              rangeList.push({name: name, data: attr["default"], order: attr["order"]});
            }
            else if (styleOptions.includes("range_set_utc")) {
              rangeUtcList.push({name: name, data: attr["default"], order: attr["order"]});
            }
          }
        }

        if (startFrameAttrList.length == 1 && endFrameAttrList.length == 1) {

          startFrameAttr = startFrameAttrList[0];
          endFrameAttr = endFrameAttrList[0];
          startUTCAttr = null;
          endUTCAttr = null;
          inVideoCheckAttr = null;

          this._attrStyleRangeTypes.push({
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
          });
        }
        else if (
          startUTCAttrList.length >= 1 &&
          endUTCAttrList.length >= 1 &&
          startUTCAttrList.length == endUTCAttrList.length &&
          rangeUtcList.length == startUTCAttrList.length) {

          rangeUtcList.sort(function(a, b) {
              if (a.order < b.order) {
                return 1;
              }
              if (a.order > b.order) {
                return -1;
              }
              return 0;
            }
          );
          for (const rangeInfo of rangeUtcList) {
            const rangeTokens = rangeInfo.data.split('|');
            if (rangeTokens.length != 5) {
              console.error("Incorrect datatype setup with attr_style_range interpolation.")
              break;
            }

            startUTCAttr = rangeTokens[0];
            endUTCAttr = rangeTokens[1];
            inVideoCheckAttr = rangeTokens[2];
            startInVideoCheckAttr = rangeTokens[3];
            endInVideoCheckAttr = rangeTokens[4];

            this._attrStyleRangeTypes.push({
              dataType: dataType,
              name: rangeInfo.name,
              mode: mode,
              startUTCAttr: startUTCAttr,
              endUTCAttr: endUTCAttr,
              startFrameAttr: null,
              endFrameAttr: null,
              startInVideoCheckAttr: startInVideoCheckAttr,
              endInVideoCheckAttr: endInVideoCheckAttr,
              inVideoCheckAttr: inVideoCheckAttr
            });
          }
        }
        else if (startUTCAttrList.length == 1 && endUTCAttrList.length == 1) {

          startUTCAttr = startUTCAttrList[0];
          endUTCAttr = endUTCAttrList[0];

          this._attrStyleRangeTypes.push({
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
          });
        }
        else if (startFrameAttrList.length > 1 &&
          endFrameAttrList.length > 1 &&
          startFrameAttrList.length == endFrameAttrList.length &&
          startFrameAttrList.length == rangeList.length) {

          rangeList.sort(function(a, b) {
              if (a.order < b.order) {
                return 1;
              }
              if (a.order > b.order) {
                return -1;
              }
              return 0;
            }
          );

          for (const rangeInfo of rangeList) {
            const rangeTokens = rangeInfo.data.split('|');
            if (rangeTokens.length != 3) {
              console.error("Incorrect datatype setup with attr_style_range interpolation.")
              break;
            }

            startFrameAttr = rangeTokens[0];
            endFrameAttr = rangeTokens[1];
            inVideoCheckAttr = rangeTokens[2];

            this._attrStyleRangeTypes.push({
              dataType: dataType,
              name: rangeInfo.name,
              mode: mode,
              startUTCAttr: null,
              endUTCAttr: null,
              startFrameAttr: startFrameAttr,
              endFrameAttr: endFrameAttr,
              startInVideoCheckAttr: null,
              endInVideoCheckAttr: null,
              inVideoCheckAttr: inVideoCheckAttr
            });
          }
        }
        else {
          console.error("Incorrect datatype setup with attr_style_range interpolation.")
          continue;
        }
      }
    }
  }

  _createStateGraphData(attrTypeInfo, data) {
    var startFrame;
    var endFrame;
    if (attrTypeInfo.mode == "frame") {
      startFrame = data.attributes[attrTypeInfo.startFrameAttr];
      endFrame = data.attributes[attrTypeInfo.endFrameAttr];
    }
    else if (attrTypeInfo.mode == "utc") {
      startFrame = this._timeStore.getGlobalFrame("utc", [], data.attributes[attrTypeInfo.startUTCAttr]);
      endFrame = this._timeStore.getGlobalFrame("utc", [], data.attributes[attrTypeInfo.endUTCAttr]);
    }

    if (attrTypeInfo.startInVideoCheckAttr && attrTypeInfo.endInVideoCheckAttr) {
      // Start frame check and end frame check attributes exist.
      // #TODO This capability may go away in lieu of just using -1 values.
      if (data.attributes[attrTypeInfo.startInVideoCheckAttr] === false) {
        startFrame = 0;
      }
      if (data.attributes[attrTypeInfo.endInVideoCheckAttr] === false) {
        endFrame = this._timeStore.getLastGlobalFrame();
      }
    }
    else {
      // Start/end frame check attributes don't exist.
      // Just assume if there's a -1, it's going to stretch
      if (startFrame == -1) {
        startFrame = 0;
      }
      if (endFrame == -1) {
        endFrame = this._timeStore.getLastGlobalFrame();
      }
    }

    if (attrTypeInfo.inVideoCheckAttr) {
      // A "in video check" attribute is there. Don't draw if this value is false.
      if (data.attributes[attrTypeInfo.inVideoCheckAttr] === false) {
        return null;
      }
    }

    if (startFrame > -1 && endFrame > -1 && startFrame <= endFrame) {
      return {
        startFrame: startFrame,
        endFrame: endFrame};
    }
    else {
      return null;
    }
  }

  /**
   * Called whenever there's been a notification of new data. This will update the GUI.
   */
  _updateData() {

    // Recreate the state and numerical datasets
    this._pointsData = [];
    this._numericalData = [];
    this._stateData = [];

    if (isNaN(this._maxFrame)) {
      this.showMain(false);
      this.showFocus(false);

      this.dispatchEvent(new CustomEvent("graphData", {
        composed: true,
        detail: {
          pointsData: this._pointsData,
          numericalData: this._numericalData,
          stateData: this._stateData
        }
      }));
      return;
    }

    if (this._data == undefined) {
      return;
    }

    if (this._attrStyleRangeTypes == undefined) {
      return;
    }

    if (!this._timeStoreInitialized) {
      return;
    }

    for (let typeId in this._data._dataTypes) {

      const dataType = this._data._dataTypes[typeId];
      if (dataType.isLocalization) {
        let allData = this._data._dataByType.get(typeId);
        if (!allData) {
          continue;
        }
      }

      if (dataType.interpolation == "latest") {
        let allData = this._data._dataByType.get(typeId);
        if (!allData) {
          continue;
        }

        // Get the attributes we care about (the bools) and save off that data
        // in the format expected by the graphics
        let sortedAttributeTypes = dataType.attribute_types;
        sortedAttributeTypes.sort((a,b) => {return a.order - b.order});
        for (let attrType of sortedAttributeTypes) {
          if (attrType.dtype == "bool") {

            // Collect all the data for this attribute
            let graphData = [];
            for (let data of allData) {
              let value = data.attributes[attrType.name];
              let graphValue;
              if (!value) {
                value = false;
                graphValue = 0.0;
              }
              else {
                graphValue = 1.0;
              }
              graphData.push({
                frame: this._timeStore.getGlobalFrame("matchFrame", data.media, data.frame),
                value: graphValue,
                actualValue: value});
            }

            // If there's data then add it to the plot dataset
            if (graphData.length > 0) {

              // Add a point at the last frame to draw the state all the way to the end
              graphData.sort((a,b) => {return a.frame - b.frame});
              graphData.push({...graphData[graphData.length - 1]});
              graphData[graphData.length - 1].frame = this._maxFrame;

              if (graphData[0].frame != this._minFrame) {
                graphData.unshift({frame: this._minFrame, value: 0.0, actualValue: false});
              }

              this._stateData.push({
                meta: attrType.id,
                name: attrType.name,
                graphData: graphData
              });
            }
          }
          // #TODO This is a temporary fix until display_timeline is the nominal method
          //       Typically, the first conditional would check if style exists and the
          //       next would be attrType.style == "display_timeline"
          else if (attrType.dtype == "float" || attrType.dtype == "int") {
            // Display this attribute as a numerical graph.
            // Normalize the data because the graph domain is from 0 to 1.
            let graphData = [];
            let maxValue = 0.0;
            for (let data of allData) {
              let value = data.attributes[attrType.name];
              if (!isNaN(value)) {
                if (value > maxValue) {
                  maxValue = value;
                }
                graphData.push({
                  frame: this._timeStore.getGlobalFrame("matchFrame", data.media, data.frame),
                  value: 0.0,
                  actualValue: value});
              }
            }

            // If there's data then add it to the plot dataset
            // #TODO Might need to handle negative numbers
            // #TODO Use min/max values defined by the attribute type if available
            if (graphData.length > 0) {

              for (let idx = 0; idx < graphData.length; idx++) {
                graphData[idx].value = graphData[idx].actualValue / maxValue;
              }

              // Add a point at the last frame to draw the state all the way to the end
              // #TODO Not sure if this is needed
              graphData.sort((a,b) => {return a.frame - b.frame});
              graphData.push({...graphData[graphData.length - 1]});
              graphData[graphData.length - 1].frame = this._maxFrame;

              this._numericalData.push({
                name: `${attrType.name}`,
                graphData: graphData
              });
            }
          }
        }
      }
    }

    // Have to loop over the stored _attrStyleRangeTypes separately from the dataTypes
    // since we treat each start/end range separately in the graph.
    for (let attrTypeInfo of this._attrStyleRangeTypes) {
      // We've already figured out how the attributes are connected to each other earlier
      // with _setupAttrStyleRangeTypes()
      let allData = this._data._dataByType.get(attrTypeInfo.dataType.id);
      if (!allData) {
        continue;
      }

      let graphData = [];
      for (let data of allData) {

        var startFrame;
        var endFrame;
        if (attrTypeInfo.mode == "frame") {
          startFrame = data.attributes[attrTypeInfo.startFrameAttr];
          endFrame = data.attributes[attrTypeInfo.endFrameAttr];
        }
        else if (attrTypeInfo.mode == "utc") {
          startFrame = this._timeStore.getGlobalFrame("utc", [], data.attributes[attrTypeInfo.startUTCAttr]);
          endFrame = this._timeStore.getGlobalFrame("utc", [], data.attributes[attrTypeInfo.endUTCAttr]);
        }

        if (attrTypeInfo.startInVideoCheckAttr && attrTypeInfo.endInVideoCheckAttr) {
          // Start frame check and end frame check attributes exist.
          // #TODO This capability may go away in lieu of just using -1 values.
          if (data.attributes[attrTypeInfo.startInVideoCheckAttr] === false) {
            startFrame = 0;
          }
          if (data.attributes[attrTypeInfo.endInVideoCheckAttr] === false) {
            endFrame = this._timeStore.getLastGlobalFrame();
          }
        }
        else {
          // Start/end frame check attributes don't exist.
          // Just assume if there's a -1, it's going to stretch
          if (startFrame == -1) {
            startFrame = 0;
          }
          if (endFrame == -1) {
            endFrame = this._timeStore.getLastGlobalFrame();
          }
        }

        if (attrTypeInfo.inVideoCheckAttr) {
          // A "in video check" attribute is there. Don't draw if this value is false.
          if (data.attributes[attrTypeInfo.inVideoCheckAttr] === false) {
            continue;
          }
        }

        if (startFrame > -1 && endFrame > -1 && startFrame <= endFrame) {
          // Save the graphData to the state data list
          graphData.push({
            meta: data.meta,
            frame: startFrame,
            value: 1.0,
            actualValue: true});
          graphData.push({
            meta: data.meta,
            frame: endFrame,
            value: 0.0,
            actualValue: false});
        }
      }

      // If there's data then add it to the plot dataset
      if (graphData.length > 0) {

        // Add a point at the last frame to draw the state all the way to the end
        // (on both ends if required)
        graphData.sort((a,b) => {return a.frame - b.frame});
        graphData.push({...graphData[graphData.length - 1]});
        graphData[graphData.length - 1].frame = this._maxFrame;

        if (graphData[0].frame != this._minFrame) {
          graphData.unshift({frame: this._minFrame, value: 0.0, actualValue: "false"});
        }

        this._stateData.push({
          meta: attrTypeInfo.dataType.id,
          name: attrTypeInfo.name,
          graphData: graphData
        });
      }
    }

    this.dispatchEvent(new CustomEvent("graphData", {
      composed: true,
      detail: {
        numericalData: this._numericalData,
        stateData: this._stateData
      }
    }));

    this.showMain(true);
    this._updateSvgData();
  }

  /**
   * Used in making unique identifiers for the various d3 graphing elements
   * @returns {object} id, href properties
   */
  _d3UID() {
    var id = uuidv1();
    var href = new URL(`#${id}`, location) + "";
    return {id: id, href: href};
  }

  /**
   * Called whenever there's new data to be displayed on the timelines
   */
  _updateSvgData() {

    var that = this;
    if (isNaN(this._maxFrame)) {
      return;
    }

    this._mainPointsHeight = 30;
    this._mainLineHeight = 30;
    if (this._pointsData.length == 0) {
      this._mainPointsHeight = 0;
    }
    if (this._numericalData.length == 0) {
      this._mainLineHeight = 0;
    }
    this._mainStepPad = 2;
    this._mainStep = 5; // vertical height of each entry in the series / band
    this._mainMargin = ({top: 5, right: 3, bottom: 3, left: 3});
    this._mainHeight =
    this._mainLineHeight +
      this._stateData.length * (this._mainStep + this._mainStepPad) +
      this._mainMargin.top + this._mainMargin.bottom;
    this._mainWidth = this._mainTimelineDiv.offsetWidth;

    if (this._mainWidth <= 0) { return; }
    this._mainSvg.attr("viewBox",`0 0 ${this._mainWidth} ${this._mainHeight}`);

    // Define the axes
    this._mainX = d3.scaleLinear()
      .domain([this._minFrame, this._maxFrame])
      .range([0, this._mainWidth])

    var mainY = d3.scaleLinear()
      .domain([0, 1.0])
      .range([0, -this._mainStep]);

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._mainSvg.selectAll('*').remove();

    // States are represented as area graphs
    var area = d3.area()
      .curve(d3.curveStepAfter)
      .x(d => this._mainX(d.frame))
      .y0(0)
      .y1(d => mainY(d.value));

    var mainStateDataset = this._stateData.map(d => Object.assign({
      clipId: this._d3UID(),
      pathId: this._d3UID()
    }, d));

    const gState = this._mainSvg.append("g")
      .selectAll("g")
      .data(mainStateDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${i * (this._mainStep + this._mainStepPad) + this._mainMargin.top})`);

    gState.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", this._mainWidth)
        .attr("height", this._mainStep);

    gState.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => area(d.graphData));

    gState.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", this._mainWidth)
      .attr("height", this._mainStep);

    gState.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("fill", "#797991")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * this._mainStep})`)
        .attr("xlink:href", d => d.pathId.href);

    // Numerical data are represented as line graphs
    var mainLineDataset = this._numericalData.map(d => Object.assign({
      clipId: this._d3UID(),
      pathId: this._d3UID(),
      name: d.name
    }, d));

    var mainLineY = d3.scaleLinear()
      .domain([-0.1, 1.1])
      .range([0, -this._mainLineHeight]);

    var mainLine = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => this._mainX(d.frame))
      .y(d => mainLineY(d.value));

    const startOfMainLineGraph = (this._stateData.length) * (this._mainStep + this._mainStepPad) + this._mainMargin.top;

    if (mainLineDataset.length > 0) {
      this._mainSvg.append("rect")
        .attr("transform", `translate(0,${startOfMainLineGraph})`)
        .attr("fill", "#262e3d")
        .attr("width", this._mainWidth)
        .attr("height", this._mainLineHeight);
    }

    this._mainLineG = this._mainSvg.append("g")
      .selectAll("g")
      .data(mainLineDataset)
      .join("g")
        .attr("transform", `translate(0,${startOfMainLineGraph})`);

    this._mainLineG.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", this._mainWidth)
        .attr("height", this._mainLineHeight);

    this._mainLineG.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => mainLine(d.graphData));

    this._mainLineG.append("g")
      .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("opacity","0.7")
        .attr("stroke", d => "#797991")
        .attr("stroke-width", d => 1.0)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("fill", "none")
        .attr("transform", `translate(0,${this._mainLineHeight})`)
        .attr("xlink:href", d => d.pathId.href)
        .style("stroke-dasharray", ("1, 2"));

    this._mainLineTextBackground = this._mainLineG.append("rect")
        .attr("opacity", "0.0");

    this._mainLineText = this._mainLineG.append("text")
      .attr("x", 4)
      .attr("y", this._mainLineHeight / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#fafafa")
      .attr("opacity", "0.0");


    if (this._selectedGraphData) {
      const selectedG = this._mainSvg.append("g");
      selectedG.append("g")
        .selectAll("rect")
        .data(this._selectedGraphData)
        .join("rect")
          .attr("transform", (d) => {
            var step = 0;
            for (let idx = 0; idx < this._stateData.length; idx++) {
              if (this._stateData[idx].meta == d.meta) {
                step = idx;
                break;
              }
            }
            return `translate(0,${(step + 1) * this._mainStep})`;
          })
          .attr("fill", d => d.color)
          .attr("x", d => this._mainX(d.startFrame))
          .attr("y", mainY(0))
          .attr("width", d => {
            const newStart = Math.max(0,Math.round(this._mainX.invert(0)));
            const newEnd = Math.min(this._maxFrame, Math.round(this._mainX.invert(this._mainWidth)));
            var width = ((d.endFrame - d.startFrame) / (newEnd - newStart)) * this._mainWidth;
            if ((d.endFrame - d.startFrame) < newStart || d.startFrame > newEnd) {
              width = 0;
            }
            return width;
          })
          .attr("height", this._mainStep);
    }

    this._mainFrameLine = this._mainSvg.append("line")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    this._mainSvg
      .on("mousemove", function(event) {
        event.preventDefault();

        // Remember the y-axis is 0 to -1
        const pointer = d3.pointer(event, that);
        const pointerFrame = that._mainX.invert(pointer[0]);
        const pointerValue = mainLineY.invert(pointer[1] - startOfMainLineGraph) + 1.0;

        var selectedData;
        var currentDistance;
        var selectedDistance = Infinity;
        for (let datasetIdx = 0; datasetIdx < mainLineDataset.length; datasetIdx++) {

          let d = mainLineDataset[datasetIdx];

          for (let idx = 0; idx < d.graphData.length; idx++) {
            if (d.graphData[idx].frame > pointerFrame) {
              if (idx > 0) {

                currentDistance = Math.abs(pointerValue - d.graphData[idx - 1].value);
                if (currentDistance < selectedDistance) {
                  selectedData = d;
                  selectedDistance = currentDistance
                }

                break;

              }
            }
          }
        }

        if (typeof selectedData != "undefined") {
          that._highlightMainLine(selectedData.name);
        }
      })
    .on("mouseleave", function() {
      that._unhighlightMainLines();
    })

    // Setup the brush to focus/zoom on the main timeline if the focus timeline is displayed
    // and there is data
    if (this._focusTimelineDiv.style.display != "none") {
      this._mainBrush = d3.brushX()
        .extent([[this._mainMargin.left, 0.5], [this._mainWidth - this._mainMargin.right, this._mainHeight - this._mainMargin.bottom + 0.5]])
        .on("brush", this._mainBrushed.bind(this));

      this._mainBrushG = this._mainSvg.append("g")
        .call(this._mainBrush);

      var startX = this._mainX(this._mainBrushWindow[0]);
      var endX = this._mainX(this._mainBrushWindow[1]);
      this._mainBrushG.transition().call(this._mainBrush.move, [startX, endX]);
    }
  }

  /**
   * Highlights the main timeline associated with the provided name.
   * @param {string} selectedName Name of data to highlight in the main timeline graph
   *                              Assumes the name matches the dataset.
   */
  _highlightMainLine(selectedName) {

    this._mainLineG.selectAll("use").join("use")
      .attr("opacity", d => d.name === selectedName ? "0.7" : "0.4")
      .attr("stroke", d => d.name === selectedName ? "#fafafa" : "#797991")
      .attr("stroke-width", d => d.name === selectedName ? 1.5 : 0.5)
      .style("stroke-dasharray", d => d.name === selectedName ? null : ("1, 2"));

    this._mainLineText
      .attr("opacity", "1.0")
      .text(selectedName);

    var textBBox = this._mainLineText.node().getBBox();

    this._mainLineTextBackground.attr("opacity", "0.2")
    this._mainLineTextBackground.attr("x", textBBox.x - textBBox.width / 4);
    this._mainLineTextBackground.attr("y", textBBox.y);
    this._mainLineTextBackground.attr("width", textBBox.width + textBBox.width / 2);
    this._mainLineTextBackground.attr("height", textBBox.height);
    this._mainLineTextBackground.attr("fill", "#151b28");
  }

  /**
   * Unhighlights all the lines in the main timeline. This is the default.
   */
  _unhighlightMainLines() {
    this._mainLineG.selectAll("use")
      .join("use")
      .attr("opacity", "0.7")
      .attr("stroke", "#797991")
      .attr("stroke-width", 1.0)
      .style("stroke-dasharray", "1, 2");

    this._mainLineText.attr("opacity", "0");

    this._mainLineTextBackground.attr("opacity", "0");
  }

  /**
   * Callback for "brush" with d3.brushX
   * This recreates the focusSVG/timeline with the dataset the brush on the mainSVG covers
   * @param {array} selection Mouse pointer event
   */
  _mainBrushed ({selection}) {

    if (!selection) {
      return;
    }

    // Selection is an array of startX and stopX
    // Use this to update the x-axis of the focus panel
    const focusStep = 25; // vertical height of each entry in the series / band
    const focusStepPad = 4;
    const focusMargin = ({top: 20, right: 5, bottom: 3, left: 5});
    const focusHeight =
      this._numericalData.length * (focusStep + focusStepPad) +
      this._stateData.length * (focusStep + focusStepPad) +
      focusMargin.top + focusMargin.bottom;
    const focusWidth = this._mainWidth;
    this._focusSvg.attr("viewBox",`0 0 ${focusWidth} ${focusHeight}`);

    // Define the axes
    var minFrame = this._mainX.invert(selection[0]);
    var focusX = d3.scaleLinear()
      .domain([minFrame, this._mainX.invert(selection[1])])
      .range([0, focusWidth]);

    var focusY = d3.scaleLinear()
      .domain([0, 1.0])
      .range([0, -focusStep]);

    this.dispatchEvent(new CustomEvent("zoomedTimeline", {
      composed: true,
      detail: {
        minFrame: Math.round(minFrame),
        maxFrame: Math.round(this._mainX.invert(selection[1]))
      }
    }));

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._focusSvg.selectAll('*').remove();

    // x-axis ticks
    if (this.inFrameDisplayMode()) {
      var focusXAxis = g => g
        .attr("transform", `translate(0,${focusMargin.top})`)
        .call(d3.axisTop(focusX).ticks().tickSizeOuter(0).tickFormat(d3.format("d")))
        .call(g => g.selectAll(".tick").filter(d => focusX(d) < focusMargin.left || focusX(d) >= focusWidth - focusMargin.right).remove())
        .call(g => g.select(".domain").remove());
    }
    else if (this.inRelativeTimeDisplayMode()) {
      var focusXAxis = g => g
        .attr("transform", `translate(0,${focusMargin.top})`)
        .call(d3.axisTop(focusX).ticks().tickSizeOuter(0).tickFormat(d => {
          return this._createRelativeTimeString(d);
        }))
        .call(g => g.selectAll(".tick").filter(d => focusX(d) < focusMargin.left || focusX(d) >= focusWidth - focusMargin.right).remove())
        .call(g => g.select(".domain").remove());
    }
    else if (this.inUTCDisplayMode()) {
      var focusXAxis = g => g
        .attr("transform", `translate(0,${focusMargin.top})`)
        .call(d3.axisTop(focusX).ticks().tickSizeOuter(0).tickFormat(d => {
          return this._createUTCString(d, "time");
        }))
        .call(g => g.selectAll(".tick").filter(d => focusX(d) < focusMargin.left * 2 || focusX(d) >= focusWidth - focusMargin.right * 2).remove())
        .call(g => g.select(".domain").remove());
    }

    // States are represented as area graphs
    var focusArea = d3.area()
      .curve(d3.curveStepAfter)
      .x(d => focusX(d.frame))
      .y0(0)
      .y1(d => focusY(d.value));

    var focusLine = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => focusX(d.frame))
      .y(d => focusY(d.value));

    var focusStateDataset = this._stateData.map(d => Object.assign({
        clipId: this._d3UID(),
        pathId: this._d3UID(),
        textId: this._d3UID()
      }, d));

    const focusG = this._focusSvg.append("g")
      .selectAll("g")
      .data(focusStateDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${i * (focusStep + focusStepPad) + focusMargin.top})`);

    focusG.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

    if (minFrame > -1) {
      focusG.append("defs").append("path")
        .attr("id", d => d.pathId.id)
        .attr("d", d => focusArea(d.graphData));
    }

    focusG.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    focusG.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("fill", (d, i) => "#797991")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
        .attr("xlink:href", d => d.pathId.href);

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusG.append("text")
        .attr("x", 4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa")
        .style("font-size", "12px")
        .text(d => d.name);

    const focusStateValues = focusG.append("text")
        .attr("class", "focusStateValues")
        .attr("x", focusWidth * 0.4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .style("font-size", "12px")
        .attr("fill", "#fafafa");

    // States are represented as line graphs
    var focusLineDataset = this._numericalData.map(d => Object.assign({
        clipId: this._d3UID(),
        pathId: this._d3UID(),
        textId: this._d3UID()
      }, d));

    const focusGLine = this._focusSvg.append("g")
      .selectAll("g")
      .data(focusLineDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${(i + this._stateData.length) * (focusStep + focusStepPad) + focusMargin.top})`);

    focusGLine.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

    if (minFrame > -1){
      focusGLine.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => focusLine(d.graphData));
    }

    focusGLine.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    focusGLine.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("pointer-events", "none")
        .attr("stroke", (d, i) => "#797991")
        .attr("fill", (d, i) => "none")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
        .attr("xlink:href", d => d.pathId.href)

    focusGLine.selectAll("rect")
      .on("mouseover", function(event, d) {
        that._highlightMainLine(d.name);
      })
      .on("mouseout", function(event, d) {
        that._unhighlightMainLines();
      });

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusGLine.append("text")
        .style("font-size", "12px")
        .attr("pointer-events", "none")
        .attr("x", 4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa")
        .text(d => d.name);

    const focusLineValues = focusGLine.append("text")
        .style("font-size", "12px")
        .attr("class", "focusLineValues")
        .attr("pointer-events", "none")
        .attr("x", focusWidth * 0.4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa");

    // Apply the x-axis ticks at the end, after the other graphics have been filled in
    var displayXAxis = selection[0] >= 0;
    if (displayXAxis) {
      var focusXAxisG = this._focusSvg.append("g")
        .style("font-size", "12px")
        .call(focusXAxis);

      var focusFrameTextBackground = focusXAxisG.append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

      var focusFrameText = focusXAxisG.append("text")
        .style("font-size", "12px")
        .attr("x", focusWidth * 0.4)
        .attr("y", -focusStep / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#fafafa");
    }

    // Create the vertical line hover
    const mouseLine = this._focusSvg.append("line")
      .attr("pointer-events", "none")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    var that = this;
    this._focusSvg.on("click", function(event, d) {

      const selectedFrame = Math.round(focusX.invert(d3.pointer(event)[0]));

      if (selectedFrame >= that._minFrame && selectedFrame <= that._maxFrame) {
        that.dispatchEvent(new CustomEvent("selectFrame", {
          detail: {
            frame: selectedFrame
          }
        }));
      }
    });
    this._focusSvg.on("mouseover", function() {
        d3.select(this).style("cursor", "pointer");
        mouseLine.attr("opacity", "0.5");
        that._mainFrameLine.attr("opacity", "0.5");
    });
    this._focusSvg.on("mouseout", function() {
        d3.select(this).style("cursor", "default");
        mouseLine.attr("opacity", "0");
        that._mainFrameLine.attr("opacity", "0");
        if (displayXAxis) {
          focusFrameTextBackground.attr("opacity", "0");
          focusFrameText.attr("opacity", "0");
          focusLineValues.attr("opacity", "0");
          focusStateValues.attr("opacity", "0");
        }
    });
    this._focusSvg.on("mousemove", function(event, d) {

        var currentFrame = parseInt(focusX.invert(d3.pointer(event)[0]));

        mouseLine
          .attr("opacity", "0.5")
          .attr("x1", d3.pointer(event)[0])
          .attr("x2", d3.pointer(event)[0])
          .attr("y1", -focusStep - focusMargin.bottom)
          .attr("y2", focusHeight);

        that._mainFrameLine
          .attr("opacity", "0.5")
          .attr("x1", that._mainX(currentFrame))
          .attr("x2", that._mainX(currentFrame))
          .attr("y1", -that._mainStep - that._mainMargin.bottom)
          .attr("y2", that._mainHeight);

        if (displayXAxis) {
          focusFrameText.attr("opacity", "1.0");
          focusFrameText.attr("x", d3.pointer(event)[0]);
          if (that.inFrameDisplayMode()) {
            focusFrameText.text(currentFrame);
          }
          else if (that.inRelativeTimeDisplayMode()) {
            focusFrameText.text(that._createRelativeTimeString(currentFrame));
          }
          else if (that.inUTCDisplayMode()) {
            focusFrameText.text(that._createUTCString(currentFrame));
          }

          var textBBox = focusFrameText.node().getBBox();

          focusFrameTextBackground.attr("opacity", "1.0")
          focusFrameTextBackground.attr("x", textBBox.x - textBBox.width / 4);
          focusFrameTextBackground.attr("y", textBBox.y);
          focusFrameTextBackground.attr("width", textBBox.width + textBBox.width / 2);
          focusFrameTextBackground.attr("height", textBBox.height);
          focusFrameTextBackground.attr("fill", "#151b28");
        }

        let idx;

        focusLineValues.attr("opacity", "1.0");
        focusLineValues.text(function(d) {
          for (idx = 0; idx < d.graphData.length; idx++) {
            if (d.graphData[idx].frame > currentFrame) {
              if (idx > 0) {
                return d3.format(".2f")(d.graphData[idx - 1].actualValue);
              }
            }
          }
          return "";
        });

        focusStateValues.attr("opacity", "1.0");
        focusStateValues.text(function(d) {
          for (idx = 0; idx < d.graphData.length; idx++) {
            if (d.graphData[idx].frame > currentFrame) {
              if (idx > 0) {
                return String(d.graphData[idx - 1].actualValue);
              }
            }
          }
          return "";
        });
    });
  }

  /**
   * Call this to initialize the timeline.
   * This will default the display mode to frames.
   *
   * @param {integer} minFrame
   * @param {integer} maxFrame
   */
   init(minFrame, maxFrame) {

    if (minFrame != this._minFrame && this._maxFrame != maxFrame){
      // Reset the zoom if the play window has changed
      this._zoomTransform = null;
    }

    this._minFrame = minFrame;
    this._maxFrame = maxFrame;
    this._updateData();
    this.redraw();
  }

  /**
   *
   * @param {bool} display True if the main timeline should be displayed. False otherwise.
   */
  showMain(display) {
    if (display) {
      this._mainTimelineDiv.style.display = "block";
    }
    else {
      this._mainTimelineDiv.style.display = "none";
    }
  }

  /**
   *
   * @param {bool} display True if the focus timeline should be displayed. False otherwise.
   */
  showFocus(display, currentFrame) {
    if (display) {

      if (currentFrame != null) {
        var timelineSpan = this._maxFrame - this._minFrame;
        var window = Math.floor(timelineSpan * 0.1);
        if (window < 25) {
          window = 25;
        }
        var minFrame = currentFrame - window;
        if (minFrame < this._minFrame) { minFrame = this._minFrame; }
        var maxFrame = currentFrame + window;
        if (maxFrame > this._maxFrame) { maxFrame = this._maxFrame; }
        this._mainBrushWindow = [minFrame, maxFrame];
      }

      this._focusTimelineDiv.style.display = "block";
    }
    else {
      this._focusTimelineDiv.style.display = "none";
    }
    this._updateSvgData();
  }

  /**
   * This highlights a particular localization, frame range state, or track.
   * Provide null to deselect.
   *
   * @param {Tator.Localization | Tator.State | null} data
   */
  selectEntity(data) {
    this._selectedData = data;

    if (this._selectedData) {
      this._selectedGraphData = [{
        type: "state",
        meta: data.meta,
        startFrame: 5000,
        endFrame: 10000,
        color: "#FFFFFF"
      }]
    }

    this.redraw();
  }

  /**
   * Force a redraw of the timeline
   */
  redraw() {
    this._updateSvgData();
  }

}

customElements.define("entity-timeline", EntityTimeline);