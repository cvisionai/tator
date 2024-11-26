import "../../../node_modules/d3/dist/d3.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";
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

    this._mainSvg = d3
      .select(this._shadow)
      .select("#main-timeline")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("font", "12px sans-serif")
      .style("color", "#6d7a96");

    this._focusSvg = d3
      .select(this._shadow)
      .select("#focus-timeline")
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
      this.updateData();

      if (this._selectedData) {
        this.selectEntity(this._selectedData);
      }
    });

    this._data.addEventListener("initialized", () => {
      this.updateData();
    });
  }

  /**
   * This should be called prior to utilizing the entity timeline functions.
   * @param {TimelineSettings} val - Expected to have been initialized already.
   */
  set timelineSettings(val) {
    this._timelineSettings = val;
  }

  timeStoreInitialized() {
    this._timeStoreInitialized = true;
    this.updateData();
  }

  /**
   * @precondition this._timelineSettings must have been initialized
   * @precondition this._data must have been initialized
   * @precondition this._stateData must have been initialized with the current set of data
   * @precondition this._selectedData must have been set
   */
  setSelectedStateGraphData() {
    var data = this._selectedData;

    if (!data.type.includes("state")) {
      return null;
    }
    const dataType = this._data._dataTypes[data.type];

    if (
      dataType.interpolation == "latest" ||
      dataType.interpolation == "attr_style_range"
    ) {
      this._selectedStateGraphData = [];

      for (const stateData of this._stateData) {
        if (stateData.type == data.type) {
          var graphData = [];
          graphData.push({
            id: data.id,
            frame: this._minFrame,
            value: 0.0,
            actualValue: false,
          });

          for (const entry of stateData.graphData) {
            if (entry.id == data.id) {
              graphData.push(entry);
            } else if (entry.prevId == data.id) {
              graphData.push(entry);
            }
          }

          if (graphData.length == 0) {
            continue;
          }

          this._selectedStateGraphData.push({
            type: stateData.type,
            name: stateData.name,
            color: this._timelineSettings.getSelectedColor(),
            graphData: graphData,
          });
        }
      }
    }
  }

  /**
   * Called whenever there's been a notification of new data. This will update the GUI.
   */
  updateData() {
    // Recreate the state and numerical datasets
    this._numericalData = [];
    this._stateData = [];

    if (isNaN(this._maxFrame)) {
      this.showMain(false);
      this.showFocus(false);

      this.dispatchEvent(
        new CustomEvent("graphData", {
          composed: true,
          detail: {
            numericalData: this._numericalData,
            stateData: this._stateData,
          },
        })
      );
      return;
    }

    if (this._data == undefined) {
      return;
    }

    if (this._timelineSettings == undefined) {
      return;
    }

    if (!this._timeStoreInitialized) {
      return;
    }

    this._frameBooleanTypes = this._timelineSettings.getFrameBooleanInfo();
    this._frameNumericalTypes = this._timelineSettings.getFrameNumericalInfo();
    this._attrRangeTypes = this._timelineSettings.getAttrRangeInfo();

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
        sortedAttributeTypes.sort((a, b) => {
          return a.order - b.order;
        });
        for (let attrType of sortedAttributeTypes) {
          if (attrType.dtype == "bool") {
            var color = "#FFFFFF";
            var visible = true;
            for (const info of this._frameBooleanTypes) {
              if (
                info.name == attrType.name &&
                info.dataType.id == dataType.id
              ) {
                color = info.color;
                visible = info.visible;
              }
            }

            if (!visible) {
              continue;
            }

            // Collect all the data for this attribute
            let graphData = [];
            for (let data of allData) {
              let value = data.attributes[attrType.name];
              let graphValue;
              if (!value) {
                value = false;
                graphValue = 0.0;
              } else {
                graphValue = 1.0;
              }
              graphData.push({
                id: data.id,
                frame: this._timeStore.getGlobalFrame(
                  "matchFrame",
                  data.media,
                  data.frame
                ),
                value: graphValue,
                actualValue: value,
              });
            }

            // If there's data then add it to the plot dataset
            if (graphData.length > 0) {
              // Add a point at the last frame to draw the state all the way to the end
              graphData.sort((a, b) => {
                return a.frame - b.frame;
              });
              graphData.push({ ...graphData[graphData.length - 1] });
              graphData[graphData.length - 1].frame = this._maxFrame;

              if (graphData[0].frame != this._minFrame) {
                graphData.unshift({
                  id: null,
                  frame: this._minFrame,
                  value: 0.0,
                  actualValue: false,
                });
              }

              let prevId = null;
              for (const entry of graphData) {
                entry.prevId = prevId;
                prevId = entry.id;
              }

              this._stateData.push({
                type: dataType.id,
                name: attrType.name,
                graphData: graphData,
                color: color,
              });
            }
          }
          // #TODO This is a temporary fix until display_timeline is the nominal method
          //       Typically, the first conditional would check if style exists and the
          //       next would be attrType.style == "display_timeline"
          else if (attrType.dtype == "float" || attrType.dtype == "int") {
            var color = "#FFFFFF";
            var visible = true;
            for (const info of this._frameNumericalTypes) {
              if (
                info.name == attrType.name &&
                info.dataType.id == dataType.id
              ) {
                color = info.color;
                visible = info.visible;
              }
            }

            if (!visible) {
              continue;
            }

            // Display this attribute as a numerical graph.
            // Normalize the data because the graph domain is from 0 to 1.
            let graphData = [];
            let maxValue = 0.0;
            let minValue = Number.MAX_SAFE_INTEGER;
            for (let data of allData) {
              let value = data.attributes[attrType.name];
              if (!isNaN(value)) {
                if (value > maxValue) {
                  maxValue = value;
                }
                if (value < minValue) {
                  minValue = value;
                }
                graphData.push({
                  frame: this._timeStore.getGlobalFrame(
                    "matchFrame",
                    data.media,
                    data.frame
                  ),
                  value: 0.0,
                  actualValue: value,
                });
              }
            }

            // If there's data then add it to the plot dataset
            // #TODO Might need to handle negative numbers
            // #TODO Use min/max values defined by the attribute type if available
            if (graphData.length > 0) {
              for (let idx = 0; idx < graphData.length; idx++) {
                graphData[idx].value =
                  (graphData[idx].actualValue - minValue) /
                  (maxValue - minValue);
              }

              // Add a point at the last frame to draw the state all the way to the end
              // #TODO Not sure if this is needed
              graphData.sort((a, b) => {
                return a.frame - b.frame;
              });
              graphData.push({ ...graphData[graphData.length - 1] });
              graphData[graphData.length - 1].frame = this._maxFrame;

              this._numericalData.push({
                color: color,
                type: dataType.id,
                name: `${attrType.name}`,
                graphData: graphData,
              });
            }
          }
        }
      }
    }

    // Have to loop over the stored _attrRangeTypes separately from the dataTypes
    // since we treat each start/end range separately in the graph.
    for (let attrTypeInfo of this._attrRangeTypes) {
      if (!attrTypeInfo.visible) {
        continue;
      }

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
        } else if (attrTypeInfo.mode == "utc") {
          startFrame = this._timeStore.getGlobalFrame(
            "utc",
            [],
            data.attributes[attrTypeInfo.startUTCAttr]
          );
          endFrame = this._timeStore.getGlobalFrame(
            "utc",
            [],
            data.attributes[attrTypeInfo.endUTCAttr]
          );
        }

        if (
          attrTypeInfo.startInVideoCheckAttr &&
          attrTypeInfo.endInVideoCheckAttr
        ) {
          // Start frame check and end frame check attributes exist.
          // #TODO This capability may go away in lieu of just using -1 values.
          if (data.attributes[attrTypeInfo.startInVideoCheckAttr] === false) {
            startFrame = 0;
          }
          if (data.attributes[attrTypeInfo.endInVideoCheckAttr] === false) {
            endFrame = this._timeStore.getLastGlobalFrame();
          }
        } else {
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
            id: data.id,
            frame: startFrame,
            value: 1.0,
            actualValue: true,
          });
          graphData.push({
            id: data.id,
            frame: endFrame,
            value: 0.0,
            actualValue: false,
          });
        }
      }

      // If there's data then add it to the plot dataset
      if (graphData.length > 0) {
        // Add a point at the last frame to draw the state all the way to the end
        // (on both ends if required)
        graphData.sort((a, b) => {
          return a.frame - b.frame;
        });
        graphData.push({ ...graphData[graphData.length - 1] });
        graphData[graphData.length - 1].frame = this._maxFrame;

        if (graphData[0].frame != this._minFrame) {
          graphData.unshift({
            frame: this._minFrame,
            value: 0.0,
            actualValue: "false",
            id: null,
          });
        }

        this._stateData.push({
          type: attrTypeInfo.dataType.id,
          name: attrTypeInfo.name,
          graphData: graphData,
          color: attrTypeInfo.color,
        });
      }
    }

    this.dispatchEvent(
      new CustomEvent("graphData", {
        composed: true,
        detail: {
          numericalData: this._numericalData,
          stateData: this._stateData,
        },
      })
    );

    this.showMain(true);
    this._updateSvgData();
  }

  /**
   * Used in making unique identifiers for the various d3 graphing elements
   * @returns {object} id, href properties
   */
  _d3UID(type, name, category) {
    if (type == null) {
      var id = uuidv1();
    } else {
      var id = `tator_entityTimeline_${type}_${name.replace(
        " ",
        "-"
      )}_${category}`;
    }
    var href = `#${id}`;
    return { id: id, href: href };
  }

  /**
   * Called whenever there's new data to be displayed on the timelines
   */
  _updateSvgData() {
    // debounce this function by 33 ms so it doesn't run constantly
    clearTimeout(this._svgUpdateTimer);
    this._svgUpdateTimer = setTimeout(() => {
      this._inner_updateSvgData();
    }, 33);
  }

  _inner_updateSvgData() {
    var that = this;
    if (isNaN(this._maxFrame)) {
      return;
    }

    this._mainPointsHeight = 10;
    this._mainLineHeight = 30;
    if (this._pointsData.length == 0) {
      this._mainPointsHeight = 0;
    }
    if (this._numericalData.length == 0) {
      this._mainLineHeight = 0;
    }
    this._mainStepPad = 2;
    this._mainStep = 5; // vertical height of each entry in the series / band
    this._mainMargin = { top: 5, right: 3, bottom: 3, left: 3 };
    this._mainHeight =
      this._mainPointsHeight +
      this._mainLineHeight +
      this._stateData.length * (this._mainStep + this._mainStepPad) +
      this._mainMargin.top +
      this._mainMargin.bottom;
    this._mainWidth = this._mainTimelineDiv.offsetWidth;

    if (this._mainWidth <= 0) {
      return;
    }
    this._mainSvg.attr("viewBox", `0 0 ${this._mainWidth} ${this._mainHeight}`);

    // Define the axes
    this._mainX = d3
      .scaleLinear()
      .domain([this._minFrame, this._maxFrame])
      .range([0, this._mainWidth]);

    const minPixels = 6;
    const pixelsPerFrame = this._mainWidth / (this._maxFrame - this._minFrame);
    const minFrameDeltaForPixels = Math.round(minPixels / pixelsPerFrame);

    var mainY = d3.scaleLinear().domain([0, 1.0]).range([0, -this._mainStep]);

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._mainSvg.selectAll("*").remove();

    //
    // Localizations are represented as triangles along the graph
    //
    const gLocalizations = this._mainSvg
      .append("g")
      .selectAll("g")
      .data(this._pointsData)
      .join("g")
      .attr("transform", `translate(0,${this._mainMargin.top})`);

    var triangle = d3.symbol().type(d3.symbolTriangle).size(50);

    gLocalizations
      .append("g")
      .attr("stroke-width", 1)
      .selectAll("path")
      .data(this._pointsData)
      .join("path")
      .attr("transform", (d) => `translate(${this._mainX(d.frame)}, ${2})`)
      .attr("fill", (d) => d.color)
      .attr("d", (d) => triangle(d.species));

    //
    // States are represented as area graphs
    //

    // We want to apply a minimum pixel width so that it's always displayed.
    // Loop through the dataset. And if the distance between a true duration is
    // not sufficient, artifically increase the size of it so it's visible.
    for (var entry of this._stateData) {
      for (let idx = 0; idx < entry.graphData.length; idx++) {
        entry.graphData[idx].mainFrame = entry.graphData[idx].frame;
        if (idx == 0 || idx == entry.graphData.length - 1) {
          continue;
        } else {
          let currPoint = entry.graphData[idx];
          let nextPoint = entry.graphData[idx + 1];
          if (currPoint.actualValue == true && nextPoint.actualValue == false) {
            let frameDelta = nextPoint.frame - currPoint.frame;
            if (frameDelta < minFrameDeltaForPixels) {
              entry.graphData[idx].mainFrame =
                nextPoint.frame - minFrameDeltaForPixels;
            }
          }
        }
      }
    }

    var area = d3
      .area()
      .curve(d3.curveStepAfter)
      .x((d) => this._mainX(d.mainFrame))
      .y0(0)
      .y1((d) => mainY(d.value));

    var mainStateDataset = this._stateData.map((d) =>
      Object.assign(
        {
          clipId: this._d3UID(d.type, d.name, "mainClip"),
          pathId: this._d3UID(d.type, d.name, "mainPath"),
        },
        d
      )
    );

    const gState = this._mainSvg
      .append("g")
      .selectAll("g")
      .data(mainStateDataset)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          `translate(0,${
            i * (this._mainStep + this._mainStepPad) +
            this._mainMargin.top +
            this._mainPointsHeight
          })`
      );

    gState
      .append("clipPath")
      .attr("id", (d) => d.clipId.id)
      .append("rect")
      .attr("width", this._mainWidth)
      .attr("height", this._mainStep);

    gState
      .append("defs")
      .append("path")
      .attr("id", (d) => d.pathId.id)
      .attr("d", (d) => area(d.graphData));

    gState
      .append("rect")
      .attr("clip-path", (d) => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", this._mainWidth)
      .attr("height", this._mainStep);

    gState
      .append("g")
      .attr("clip-path", (d) => d.clipId)
      .selectAll("use")
      .data((d) => new Array(1).fill(d))
      .join("use")
      .attr("fill", (d) => d.color)
      .attr("transform", (d, i) => `translate(0,${(i + 1) * this._mainStep})`)
      .attr("xlink:href", (d) => d.pathId.href);

    // Numerical data are represented as line graphs
    var mainLineDataset = this._numericalData.map((d) =>
      Object.assign(
        {
          clipId: this._d3UID(d.type, d.name, "mainClip"),
          pathId: this._d3UID(d.type, d.name, "mainPath"),
          name: d.name,
        },
        d
      )
    );

    var mainLineY = d3
      .scaleLinear()
      .domain([-0.1, 1.1])
      .range([0, -this._mainLineHeight]);

    var mainLine = d3
      .line()
      .curve(d3.curveStepAfter)
      .x((d) => this._mainX(d.frame))
      .y((d) => mainLineY(d.value));

    const startOfMainLineGraph =
      this._stateData.length * (this._mainStep + this._mainStepPad) +
      this._mainMargin.top +
      this._mainPointsHeight;

    if (mainLineDataset.length > 0) {
      this._mainSvg
        .append("rect")
        .attr("transform", `translate(0,${startOfMainLineGraph})`)
        .attr("fill", "#262e3d")
        .attr("width", this._mainWidth)
        .attr("height", this._mainLineHeight);
    }

    this._mainLineG = this._mainSvg
      .append("g")
      .selectAll("g")
      .data(mainLineDataset)
      .join("g")
      .attr("transform", `translate(0,${startOfMainLineGraph})`);

    this._mainLineG
      .append("clipPath")
      .attr("id", (d) => d.clipId.id)
      .append("rect")
      .attr("width", this._mainWidth)
      .attr("height", this._mainLineHeight);

    this._mainLineG
      .append("defs")
      .append("path")
      .attr("id", (d) => d.pathId.id)
      .attr("d", (d) => {
        let nonNullsAndNaNsOnly = d.graphData.filter(
          (entry) => entry.value != null && !isNaN(entry.value)
        );
        return mainLine(nonNullsAndNaNsOnly);
      });

    this._mainLineG
      .append("g")
      .attr("clip-path", (d) => d.clipId)
      .selectAll("use")
      .data((d) => new Array(1).fill(d))
      .join("use")
      .attr("opacity", "0.7")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => 1.0)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("fill", "none")
      .attr("transform", `translate(0,${this._mainLineHeight})`)
      .attr("xlink:href", (d) => d.pathId.href)
      .style("stroke-dasharray", "1, 2");

    this._mainLineTextBackground = this._mainLineG
      .append("rect")
      .attr("opacity", "0.0");

    this._mainLineText = this._mainLineG
      .append("text")
      .attr("x", 4)
      .attr("y", this._mainLineHeight / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#fafafa")
      .attr("opacity", "0.0");

    if (this._selectedStateGraphData) {
      // We want to apply a minimum pixel width so that it's always displayed.
      // Loop through the dataset. And if the distance between a true duration is
      // not sufficient, artifically increase the size of it so it's visible.
      for (var entry of this._selectedStateGraphData) {
        for (let idx = 0; idx < entry.graphData.length; idx++) {
          entry.graphData[idx].mainFrame = entry.graphData[idx].frame;
          if (idx == 0 || idx == entry.graphData.length - 1) {
            continue;
          } else {
            let currPoint = entry.graphData[idx];
            let nextPoint = entry.graphData[idx + 1];
            if (
              currPoint.actualValue == true &&
              nextPoint.actualValue == false
            ) {
              let frameDelta = nextPoint.frame - currPoint.frame;
              if (frameDelta < minFrameDeltaForPixels) {
                entry.graphData[idx].mainFrame =
                  nextPoint.frame - minFrameDeltaForPixels;
              }
            }
          }
        }
      }

      var selectedStateDataset = this._selectedStateGraphData.map((d) =>
        Object.assign(
          {
            clipId: this._d3UID(d.type, d.name, "selectedClip"),
            pathId: this._d3UID(d.type, d.name, "selectedPath"),
          },
          d
        )
      );

      const selectedG = this._mainSvg
        .append("g")
        .selectAll("g")
        .data(selectedStateDataset)
        .join("g")
        .attr("transform", (d) => {
          var step = 0;
          for (let idx = 0; idx < this._stateData.length; idx++) {
            if (this._stateData[idx].type == d.type) {
              if (this._stateData[idx].name == d.name) {
                step = idx;
                break;
              }
            }
          }
          if (step == 0) {
            var pad = 0;
          } else {
            var pad = this._mainStepPad;
          }
          return `translate(0,${
            (step + 1) * this._mainStep +
            step * pad +
            this._mainMargin.top +
            this._mainPointsHeight
          })`;
        });

      selectedG
        .append("clipPath")
        .attr("id", (d) => d.clipId.id)
        .append("rect")
        .attr("width", this._mainWidth)
        .attr("height", this._mainStep);

      selectedG
        .append("defs")
        .append("path")
        .attr("id", (d) => d.pathId.id)
        .attr("d", (d) => area(d.graphData));

      selectedG
        .append("g")
        .attr("clip-path", (d) => d.clipId)
        .selectAll("use")
        .data((d) => new Array(1).fill(d))
        .join("use")
        .attr("fill", (d) => d.color)
        .attr("xlink:href", (d) => d.pathId.href);
    }

    this._mainFrameLine = this._mainSvg
      .append("line")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    this._mainSvg
      .on("mousemove", function (event) {
        event.preventDefault();

        // Remember the y-axis is 0 to -1
        const pointer = d3.pointer(event, that);
        const pointerFrame = that._mainX.invert(pointer[0]);
        const pointerValue =
          mainLineY.invert(pointer[1] - startOfMainLineGraph) + 1.0;

        var selectedData;
        var currentDistance;
        var selectedDistance = Infinity;
        for (
          let datasetIdx = 0;
          datasetIdx < mainLineDataset.length;
          datasetIdx++
        ) {
          let d = mainLineDataset[datasetIdx];

          for (let idx = 0; idx < d.graphData.length; idx++) {
            if (d.graphData[idx].frame > pointerFrame) {
              if (idx > 0) {
                currentDistance = Math.abs(
                  pointerValue - d.graphData[idx - 1].value
                );
                if (currentDistance < selectedDistance) {
                  selectedData = d;
                  selectedDistance = currentDistance;
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
      .on("mouseleave", function () {
        that._unhighlightMainLines();
      });

    // Setup the brush to focus/zoom on the main timeline if the focus timeline is displayed
    // and there is data
    if (this._focusTimelineDiv.style.display != "none") {
      this._mainBrush = d3
        .brushX()
        .extent([
          [0, 0.5],
          [
            this._mainWidth - 0,
            this._mainHeight - this._mainMargin.bottom + 0.5,
          ],
        ])
        .on("brush", this._mainBrushed.bind(this));

      this._mainBrushG = this._mainSvg.append("g").call(this._mainBrush);

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
    this._mainLineG
      .selectAll("use")
      .join("use")
      .attr("opacity", (d) => (d.name === selectedName ? "0.7" : "0.4"))
      .attr("stroke", (d) => (d.name === selectedName ? "#fafafa" : d.color))
      .attr("stroke-width", (d) => (d.name === selectedName ? 1.5 : 0.5))
      .style("stroke-dasharray", (d) =>
        d.name === selectedName ? null : "1, 2"
      );

    this._mainLineText.attr("opacity", "1.0").text(selectedName);

    var textBBox = this._mainLineText.node().getBBox();

    this._mainLineTextBackground.attr("opacity", "0.2");
    this._mainLineTextBackground.attr("x", textBBox.x - textBBox.width / 4);
    this._mainLineTextBackground.attr("y", textBBox.y);
    this._mainLineTextBackground.attr(
      "width",
      textBBox.width + textBBox.width / 2
    );
    this._mainLineTextBackground.attr("height", textBBox.height);
    this._mainLineTextBackground.attr("fill", "#151b28");
  }

  /**
   * Unhighlights all the lines in the main timeline. This is the default.
   */
  _unhighlightMainLines() {
    this._mainLineG
      .selectAll("use")
      .join("use")
      .attr("opacity", "0.7")
      .attr("stroke", (d) => d.color)
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
  _mainBrushed({ selection }) {
    if (!selection) {
      return;
    }

    // Selection is an array of startX and stopX
    // Use this to update the x-axis of the focus panel
    const focusStep = 25; // vertical height of each entry in the series / band
    const focusStepPad = 4;
    const focusMargin = { top: 20, right: 5, bottom: 3, left: 5 };

    var focusPointsHeight = focusStep + focusStepPad;
    if (this._pointsData.length == 0) {
      focusPointsHeight = 0;
    }

    const focusHeight =
      focusPointsHeight +
      this._numericalData.length * (focusStep + focusStepPad) +
      this._stateData.length * (focusStep + focusStepPad) +
      focusMargin.top +
      focusMargin.bottom;
    const focusWidth = this._mainWidth;
    this._focusSvg.attr("viewBox", `0 0 ${focusWidth} ${focusHeight}`);

    // Define the axes
    var minFrame = Math.round(this._mainX.invert(selection[0]));
    var maxFrame = Math.round(this._mainX.invert(selection[1]));
    var focusX = d3
      .scaleLinear()
      .domain([minFrame, maxFrame])
      .range([0, focusWidth]);

    var focusY = d3.scaleLinear().domain([0, 1.0]).range([0, -focusStep]);

    const minPixels = 6;
    const pixelsPerFrame = focusWidth / (maxFrame - minFrame);
    const minFrameDeltaForPixels = Math.round(minPixels / pixelsPerFrame);

    this.dispatchEvent(
      new CustomEvent("zoomedTimeline", {
        composed: true,
        detail: {
          minFrame: minFrame,
          maxFrame: maxFrame,
        },
      })
    );

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._focusSvg.selectAll("*").remove();

    // x-axis ticks
    if (this.inFrameDisplayMode()) {
      var focusXAxis = (g) =>
        g
          .attr("transform", `translate(0,${focusMargin.top})`)
          .call(
            d3
              .axisTop(focusX)
              .ticks()
              .tickSizeOuter(0)
              .tickFormat(d3.format("d"))
          )
          .call((g) =>
            g
              .selectAll(".tick")
              .filter(
                (d) =>
                  focusX(d) < focusMargin.left ||
                  focusX(d) >= focusWidth - focusMargin.right
              )
              .remove()
          )
          .call((g) => g.select(".domain").remove());
    } else if (this.inRelativeTimeDisplayMode()) {
      var focusXAxis = (g) =>
        g
          .attr("transform", `translate(0,${focusMargin.top})`)
          .call(
            d3
              .axisTop(focusX)
              .ticks()
              .tickSizeOuter(0)
              .tickFormat((d) => {
                return this._createRelativeTimeString(d);
              })
          )
          .call((g) =>
            g
              .selectAll(".tick")
              .filter(
                (d) =>
                  focusX(d) < focusMargin.left ||
                  focusX(d) >= focusWidth - focusMargin.right
              )
              .remove()
          )
          .call((g) => g.select(".domain").remove());
    } else if (this.inUTCDisplayMode()) {
      var focusXAxis = (g) =>
        g
          .attr("transform", `translate(0,${focusMargin.top})`)
          .call(
            d3
              .axisTop(focusX)
              .ticks()
              .tickSizeOuter(0)
              .tickFormat((d) => {
                return this._createUTCString(d, "time");
              })
          )
          .call((g) =>
            g
              .selectAll(".tick")
              .filter(
                (d) =>
                  focusX(d) < focusMargin.left * 2 ||
                  focusX(d) >= focusWidth - focusMargin.right * 2
              )
              .remove()
          )
          .call((g) => g.select(".domain").remove());
    }

    // States are represented as area graphs
    var focusArea = d3
      .area()
      .curve(d3.curveStepAfter)
      .x((d) => focusX(d.focusFrame))
      .y0(0)
      .y1((d) => focusY(d.value));

    var focusLine = d3
      .line()
      .curve(d3.curveStepAfter)
      .x((d) => focusX(d.frame))
      .y((d) => focusY(d.value));

    // Localizations are represented as triangles along the graph
    const gLocalizations = this._focusSvg
      .append("g")
      .selectAll("g")
      .data(this._pointsData)
      .join("g")
      .attr("transform", `translate(0,${focusMargin.top})`);

    var triangle = d3.symbol().type(d3.symbolTriangle).size(150);

    gLocalizations
      .append("rect")
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    gLocalizations
      .append("g")
      .attr("stroke-width", 1)
      .selectAll("path")
      .data(this._pointsData)
      .join("path")
      .attr(
        "transform",
        (d) => `translate(${focusX(d.frame)}, ${focusStep - 10})`
      )
      .attr("fill", (d) => d.color)
      .attr("d", triangle());

    gLocalizations
      .append("text")
      .attr("x", 4)
      .attr("y", focusStep / 2)
      .attr("dy", "0.5em")
      .attr("fill", "#fafafa")
      .style("font-size", "12px")
      .text((d) => d.name);

    // We want to apply a minimum pixel width so that it's always displayed.
    // Loop through the dataset. And if the distance between a true duration is
    // not sufficient, artifically increase the size of it so it's visible.
    for (var entry of this._stateData) {
      for (let idx = 0; idx < entry.graphData.length; idx++) {
        let currPoint = entry.graphData[idx];
        currPoint.focusFrame = currPoint.frame;
        currPoint.focusActualValue = currPoint.actualValue;
        if (idx == 0 || idx == entry.graphData.length - 1) {
          continue;
        } else {
          let nextPoint = entry.graphData[idx + 1];
          currPoint.focusActualValue = `${currPoint.actualValue} (${currPoint.frame} - ${nextPoint.frame})`;
          if (currPoint.actualValue == true && nextPoint.actualValue == false) {
            let frameDelta = nextPoint.frame - currPoint.frame;
            if (frameDelta < minFrameDeltaForPixels) {
              currPoint.focusFrame = nextPoint.frame - minFrameDeltaForPixels;
            }
          }
        }
      }
    }

    var focusStateDataset = this._stateData.map((d) =>
      Object.assign(
        {
          clipId: this._d3UID(d.type, d.name, "focusClip"),
          pathId: this._d3UID(d.type, d.name, "focusPath"),
          textId: this._d3UID(d.type, d.name, "focusText"),
        },
        d
      )
    );

    const focusG = this._focusSvg
      .append("g")
      .selectAll("g")
      .data(focusStateDataset)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          `translate(0,${
            i * (focusStep + focusStepPad) + focusPointsHeight + focusMargin.top
          })`
      );

    focusG
      .append("clipPath")
      .attr("id", (d) => d.clipId.id)
      .append("rect")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    if (minFrame > -1) {
      focusG
        .append("defs")
        .append("path")
        .attr("id", (d) => d.pathId.id)
        .attr("d", (d) => focusArea(d.graphData));
    }

    focusG
      .append("rect")
      .attr("clip-path", (d) => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    focusG
      .append("g")
      .attr("clip-path", (d) => d.clipId)
      .selectAll("use")
      .data((d) => new Array(1).fill(d))
      .join("use")
      .attr("fill", (d) => d.color)
      .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
      .attr("xlink:href", (d) => d.pathId.href);

    if (this._selectedStateGraphData) {
      // We want to apply a minimum pixel width so that it's always displayed.
      // Loop through the dataset. And if the distance between a true duration is
      // not sufficient, artifically increase the size of it so it's visible.
      for (var entry of this._selectedStateGraphData) {
        for (let idx = 0; idx < entry.graphData.length; idx++) {
          let currPoint = entry.graphData[idx];
          currPoint.focusFrame = currPoint.frame;
          currPoint.focusActualValue = currPoint.actualValue;
          if (idx == 0 || idx == entry.graphData.length - 1) {
            continue;
          } else {
            let nextPoint = entry.graphData[idx + 1];
            if (
              currPoint.actualValue == true &&
              nextPoint.actualValue == false
            ) {
              currPoint.focusActualValue = `${currPoint.actualValue} (${currPoint.frame} - ${nextPoint.frame})`;
              let frameDelta = nextPoint.frame - currPoint.frame;
              if (frameDelta < minFrameDeltaForPixels) {
                currPoint.mainFrame = nextPoint.frame - minFrameDeltaForPixels;
              }
            }
          }
        }
      }

      var selectedStateDataset = this._selectedStateGraphData.map((d) =>
        Object.assign(
          {
            clipId: this._d3UID(d.type, d.name, "selectedFocusClip"),
            pathId: this._d3UID(d.type, d.name, "selectedFocusPath"),
          },
          d
        )
      );

      const selectedG = this._focusSvg
        .append("g")
        .selectAll("g")
        .data(selectedStateDataset)
        .join("g")
        .attr("transform", (d) => {
          var step = 0;
          for (let idx = 0; idx < this._stateData.length; idx++) {
            if (this._stateData[idx].type == d.type) {
              if (this._stateData[idx].name == d.name) {
                step = idx;
                break;
              }
            }
          }
          if (step == 0) {
            var pad = 0;
          } else {
            var pad = this._mainStepPad;
          }
          return `translate(0,${
            (step + 1) * (focusStep + focusStepPad) +
            focusPointsHeight +
            focusMargin.top -
            focusStepPad
          })`;
        });

      selectedG
        .append("clipPath")
        .attr("id", (d) => d.clipId.id)
        .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

      selectedG
        .append("defs")
        .append("path")
        .attr("id", (d) => d.pathId.id)
        .attr("d", (d) => focusArea(d.graphData));

      selectedG
        .append("g")
        .attr("clip-path", (d) => d.clipId)
        .selectAll("use")
        .data((d) => new Array(1).fill(d))
        .join("use")
        .attr("fill", (d) => d.color)
        .attr("xlink:href", (d) => d.pathId.href);
    }

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusG
      .append("text")
      .attr("x", 4)
      .attr("y", focusStep / 2)
      .attr("dy", "0.5em")
      .attr("fill", "#fafafa")
      .style("font-size", "12px")
      .text((d) => d.name);

    const focusStateValues = focusG
      .append("text")
      .attr("class", "focusStateValues")
      .attr("x", focusWidth * 0.4)
      .attr("y", focusStep / 2)
      .attr("dy", "0.5em")
      .style("font-size", "12px")
      .attr("fill", "#fafafa");

    // States are represented as line graphs
    var focusLineDataset = this._numericalData.map((d) =>
      Object.assign(
        {
          clipId: this._d3UID(d.type, d.name, "focusClip"),
          pathId: this._d3UID(d.type, d.name, "focusPath"),
          textId: this._d3UID(d.type, d.name, "focusText"),
        },
        d
      )
    );

    const focusGLine = this._focusSvg
      .append("g")
      .selectAll("g")
      .data(focusLineDataset)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          `translate(0,${
            (i + this._stateData.length) * (focusStep + focusStepPad) +
            focusPointsHeight +
            focusMargin.top
          })`
      );

    focusGLine
      .append("clipPath")
      .attr("id", (d) => d.clipId.id)
      .append("rect")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    if (minFrame > -1) {
      focusGLine
        .append("defs")
        .append("path")
        .attr("id", (d) => d.pathId.id)
        .attr("d", (d) => focusLine(d.graphData));
    }

    focusGLine
      .append("rect")
      .attr("clip-path", (d) => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    focusGLine
      .append("g")
      .attr("clip-path", (d) => d.clipId)
      .selectAll("use")
      .data((d) => new Array(1).fill(d))
      .join("use")
      .attr("pointer-events", "none")
      .attr("stroke", (d, i) => d.color)
      .attr("fill", (d, i) => "none")
      .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
      .attr("xlink:href", (d) => d.pathId.href);

    focusGLine
      .selectAll("rect")
      .on("mouseover", function (event, d) {
        that._highlightMainLine(d.name);
      })
      .on("mouseout", function (event, d) {
        that._unhighlightMainLines();
      });

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusGLine
      .append("text")
      .style("font-size", "12px")
      .attr("pointer-events", "none")
      .attr("x", 4)
      .attr("y", focusStep / 2)
      .attr("dy", "0.5em")
      .attr("fill", "#fafafa")
      .text((d) => d.name);

    const focusLineValues = focusGLine
      .append("text")
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
      var focusXAxisG = this._focusSvg
        .append("g")
        .style("font-size", "12px")
        .call(focusXAxis);

      var focusFrameTextBackground = focusXAxisG
        .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

      var focusFrameText = focusXAxisG
        .append("text")
        .style("font-size", "12px")
        .attr("x", focusWidth * 0.4)
        .attr("y", -focusStep / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#fafafa");
    }

    // Create the vertical line hover
    const mouseLine = this._focusSvg
      .append("line")
      .attr("pointer-events", "none")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    var that = this;
    this._focusSvg.on("click", function (event, d) {
      const selectedFrame = Math.round(focusX.invert(d3.pointer(event)[0]));

      if (selectedFrame >= that._minFrame && selectedFrame <= that._maxFrame) {
        that.dispatchEvent(
          new CustomEvent("selectFrame", {
            detail: {
              frame: selectedFrame,
            },
          })
        );
      }
    });
    this._focusSvg.on("mouseover", function () {
      d3.select(this).style("cursor", "pointer");
      mouseLine.attr("opacity", "0.5");
      that._mainFrameLine.attr("opacity", "0.5");
    });
    this._focusSvg.on("mouseout", function () {
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
    this._focusSvg.on("mousemove", function (event, d) {
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
        } else if (that.inRelativeTimeDisplayMode()) {
          focusFrameText.text(that._createRelativeTimeString(currentFrame));
        } else if (that.inUTCDisplayMode()) {
          focusFrameText.text(that._createUTCString(currentFrame));
        }

        var textBBox = focusFrameText.node().getBBox();

        focusFrameTextBackground.attr("opacity", "1.0");
        focusFrameTextBackground.attr("x", textBBox.x - textBBox.width / 4);
        focusFrameTextBackground.attr("y", textBBox.y);
        focusFrameTextBackground.attr(
          "width",
          textBBox.width + textBBox.width / 2
        );
        focusFrameTextBackground.attr("height", textBBox.height);
        focusFrameTextBackground.attr("fill", "#151b28");
      }

      let idx;

      focusLineValues.attr("opacity", "1.0");
      focusLineValues.text(function (d) {
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
      focusStateValues.text(function (d) {
        for (idx = 0; idx < d.graphData.length; idx++) {
          if (d.graphData[idx].focusFrame > currentFrame) {
            if (idx > 0) {
              return String(d.graphData[idx - 1].focusActualValue);
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
    if (minFrame != this._minFrame && this._maxFrame != maxFrame) {
      // Reset the zoom if the play window has changed
      this._zoomTransform = null;
    }

    this._minFrame = minFrame;
    this._maxFrame = maxFrame;
    this.updateData();
    this.redraw();
  }

  /**
   *
   * @param {bool} display True if the main timeline should be displayed. False otherwise.
   */
  showMain(display) {
    if (display) {
      this._mainTimelineDiv.style.display = "block";
    } else {
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
        this._mainBrushWindow = [this._minFrame, this._maxFrame];
      }

      this._focusTimelineDiv.style.display = "block";
    } else {
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
    this._selectedStateGraphData = [];

    this._pointsData = [];

    if (data) {
      const dataType = this._data._dataTypes[data.type];

      if (
        dataType.id.includes("state") &&
        (dataType.interpolation == "latest" ||
          dataType.interpolation == "attr_style_range")
      ) {
        this.setSelectedStateGraphData();
      } else if (
        dataType.id.includes("state") &&
        dataType.association == "Media"
      ) {
        // #TODO Do we want to show anything for media associated states?
      } else {
        this._pointsData.push({
          name: `Selected ${dataType.name}`,
          frame: data.frame,
          color: this._timelineSettings.getSelectedColor(),
        });
      }
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
