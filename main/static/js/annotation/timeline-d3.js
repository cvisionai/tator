/**
 * Events dispatched from this element:
 * #TODO Eventually should allow select?
 */
class TimelineD3 extends TatorElement {
  constructor() {
    super();

    this._mainTimelineDiv = document.createElement("div");
    this._mainTimelineDiv.setAttribute("class", "py-2");
    this._mainTimelineDiv.id = "main-timeline";
    this._shadow.appendChild(this._mainTimelineDiv);

    this._focusTimelineDiv = document.createElement("div");
    this._focusTimelineDiv.setAttribute("class", "");
    this._focusTimelineDiv.id = "focus-timeline";
    this._shadow.appendChild(this._focusTimelineDiv);

    this._mainSvg = d3.select(this._shadow).select("#main-timeline")
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .style("font", "10px sans-serif")
      .style("color", "#a2afcd");

    this._focusSvg = d3.select(this._shadow).select("#focus-timeline")
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .style("font", "10px sans-serif")
      .style("color", "#a2afcd");

    this._focusLine = this._focusSvg.append("g").attr("display", "none");

    // Initially hide the focus timeline. Some external UI element will control
    // whether or not to display this.
    this.showFocus(false);
  }

  /**
   * Set a pointer to the global data storage and setup event listeners when
   * there is new data.
   * @param {AnnotationData} val - Tator data singleton that contains the annotations
   */
  set annotationData(val) {
    this._data = val;

    this._data.addEventListener("freshData", evt => {
      this._updateData();
    });

    this._data.addEventListener("initialized", evt => {
      this._updateData();
    });
  }

  /**
   * Sets the object that will eventually contain the frame range to display.
   * This will be used to define the maximum frame.
   *
   * @param {Object} val - Object that needs to have a "max" attribute that will return a frame
   *                       An example of this is the SeekBar TatorElement
   */
  set rangeInput(val) {
    this._rangeInput = val;
  }

  /**
   * Called whenever there's been a notification of new data. This will update the GUI.
   */
  _updateData() {

    // Recreate the state and numerical datasets
    this._numericalData = [];
    this._stateData = [];

    for (let typeId in this._data._dataTypes) {

      // Grab the dataType and if this is not a state type, then ignore it
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isLocalization) {
        continue;
      }

      if (dataType.interpolation == "latest") {
        let data = this._data._dataByType.get(typeId);

        // Get the attributes we care about (the bools) and save off that data
        // in the format expected by the graphics
        let sortedAttributeTypes = dataType.attribute_types;
        sortedAttributeTypes.sort((a,b) => {return a.order - b.order});
        for (let attrType of sortedAttributeTypes) {
          if (attrType.dtype == "bool") {

            // Collect all the data for this attribute
            let frames = [];
            let actualValues = [];
            let graphData = [];
            for (let elem of data) {
              let value = elem.attributes[attrType.name]
              let graphValue;
              if (!value) {
                value = false;
                graphValue = 0.0;
              }
              else {
                graphValue = 1.0;
              }
              actualValues.push(value);
              frames.push(elem.frame);
              graphData.push({frame: elem.frame, value: graphValue, actualValue: value});
            }

            // If there's data then add it to the plot dataset
            if (graphData.length > 0) {

              // Add a point at the last frame to draw the state all the way to the end
              let lastFrame = parseFloat(this._rangeInput.getAttribute("max"));
              frames.push(lastFrame);
              actualValues.push(actualValues[actualValues.length - 1]);
              graphData.push({...graphData[graphData.length - 1]});
              graphData[graphData.length - 1].frame = lastFrame;
              graphData.sort((a,b) => {return a.frame - b.frame});

              this._stateData.push({
                name: attrType.name,
                //frames: frames,
                graphData: graphData,
                //actualValues: actualValues
              });
            }
          }
        }
      }
      else if (dataType.interpolation == "attr_style_range") {

      }
    }

    // With the datasets updated, update the timeline plots
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

    console.log("_updateSvgData");

    const mainStep = 5; // vertical height of each entry in the series / band
    const mainMargin = ({top: 20, right: 3, bottom: 3, left: 3});
    const mainHeight =
      this._numericalData.length * (mainStep + 1) +
      this._stateData.length * (mainStep + 1) +
      mainMargin.top + mainMargin.bottom;
    const mainWidth = 800;
    this._mainWidth = mainWidth;
    this._mainSvg.attr("viewBox",`0 0 ${mainWidth} ${mainHeight}`);

    // Define the axes
    var mainX = d3.scaleLinear()
      .domain([0, parseFloat(this._rangeInput.getAttribute("max"))])
      .range([0, mainWidth])
    this._mainX = mainX;

    var mainY = d3.scaleLinear()
      .domain([0, 1.0])
      .range([0, -mainStep]);

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._mainSvg.selectAll('*').remove();

    // Frame number x-axis ticks
    var xAxis = g => g
      .attr("transform", `translate(0,${mainMargin.top})`)
      .call(d3.axisTop(mainX).ticks(mainWidth / 100).tickSizeOuter(0).tickFormat(d3.format("d")))
      .call(g => g.selectAll(".tick").filter(d => mainX(d) < mainMargin.left || mainX(d) >= mainWidth - mainMargin.right).remove())
      .call(g => g.select(".domain").remove());

    // States are represented as area graphs
    var area = d3.area()
      .curve(d3.curveStepAfter)
      .x(d => mainX(d.frame))
      .y0(0)
      .y1(d => mainY(d.value));

    var mainStateDataset = this._stateData.map(d => Object.assign({
      clipId: this._d3UID(),
      pathId: this._d3UID(),
    }, d));

    const gState = this._mainSvg.append("g")
      .selectAll("g")
      .data(mainStateDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${i * (mainStep + 2) + mainMargin.top})`);

    gState.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", mainWidth)
        .attr("height", mainStep);

    gState.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => area(d.graphData));

    gState.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", mainWidth)
      .attr("height", mainStep);

    gState.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("fill", (d, i) => "#797991")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * mainStep})`)
        .attr("xlink:href", d => d.pathId.href);

    // Numerical data are represented as line graphs
    var mainLineDataset = this._numericalData.map(d => Object.assign({
      clipId: this._d3UID(),
      pathId: this._d3UID(),
    }, d));

    var line = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => mainX(d.frame))
      .y(d => mainY(d.value));

    const gLine = this._mainSvg.append("g")
      .selectAll("g")
      .data(mainLineDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${(i + this._stateData.length) * (mainStep + 2) + mainMargin.top})`);

    gLine.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", mainWidth)
        .attr("height", mainStep);

    gLine.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => line(d.values));

    gLine.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", mainWidth)
      .attr("height", mainStep);

    gLine.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("stroke", (d, i) => "#797991")
        .attr("fill", (d, i) => "none")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * mainStep})`)
        .attr("xlink:href", d => d.pathId.href)

    this._mainSvg.append("g")
      .call(xAxis);

    // Setup the brush to focus/zoom on the main timeline
    this._mainBrush = d3.brushX()
      .extent([[mainMargin.left, 0.5], [mainWidth - mainMargin.right, mainHeight - mainMargin.bottom + 0.5]])
      .on("end", this._mainBrushEnded.bind(this))
      .on("brush", this._mainBrushed.bind(this));

    // The brush will default to nothing being selected
    this._mainBrushG = this._mainSvg.append("g")
      .call(this._mainBrush)
      .call(this._mainBrush.move, [-1, -1]);
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
    const focusStep = 20; // vertical height of each entry in the series / band
    const focusMargin = ({top: 20, right: 5, bottom: 20, left: 5});
    const focusHeight =
      this._numericalData.length * (focusStep + 1) +
      this._stateData.length * (focusStep + 1) +
      focusMargin.top + focusMargin.bottom;
    const focusWidth = this._mainWidth;
    this._focusSvg.attr("viewBox",`0 0 ${focusWidth} ${focusHeight}`);

    // Define the axes
    var focusX = d3.scaleLinear()
      .domain([this._mainX.invert(selection[0]), this._mainX.invert(selection[1])])
      .range([0, focusWidth]);

    var focusY = d3.scaleLinear()
      .domain([0, 1.0])
      .range([0, -focusStep]);

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._focusSvg.selectAll('*').remove();

    // X-axis that will be displayed to visualize the frame numbers
    var focusXAxis = g => g
      .attr("transform", `translate(0,${focusMargin.top})`)
      .call(d3.axisTop(focusX).ticks(focusWidth / 100).tickSizeOuter(0).tickFormat(d3.format("d")))
      .call(g => g.selectAll(".tick").filter(d => focusX(d) < focusMargin.left || focusX(d) >= focusWidth - focusMargin.right).remove())
      .call(g => g.select(".domain").remove());

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
        .attr("transform", (d, i) => `translate(0,${i * (focusStep + 4) + focusMargin.top})`);

    focusG.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

    focusG.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => focusArea(d.graphData));

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
        .attr("dy", "0.35em")
        .attr("fill", "#fafafa")
        .text(d => d.name);

    focusG.append("text")
        .attr("class", "focusStateValues")
        .attr("x", focusWidth * 0.1)
        .attr("y", focusStep / 2)
        .attr("dy", "0.35em")
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
        .attr("transform", (d, i) => `translate(0,${(i + this._stateData.length) * (focusStep + 4 ) + focusMargin.top})`);

    focusGLine.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

    focusGLine.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => focusLine(d.values));

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
        .attr("stroke", (d, i) => "#797991")
        .attr("fill", (d, i) => "none")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
        .attr("xlink:href", d => d.pathId.href)

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusGLine.append("text")
        .attr("x", 4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa")
        .text(d => d.name);

    focusGLine.append("text")
        .attr("class", "focusLineValues")
        .attr("x", focusWidth * 0.1)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa");

    // Apply the x-axis ticks at the end, after the other graphics have been filled in
    if (selection[0] >= 0) {
      this._focusSvg.append("g")
        .call(focusXAxis);
    }

    // Create the vertical line hover
    const mouseLine = this._focusSvg.append("line")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    this._focusSvg.on("mouseover", function(event, d) {
        mouseLine.attr("opacity", "1.0");
    });
    this._focusSvg.on("mouseout", function(event, d) {
        mouseLine.attr("opacity", "0");
    });
    this._focusSvg.on("mousemove", function(event, d) {
        mouseLine
          .attr("opacity", "0.5")
          .attr("x1", d3.pointer(event)[0])
          .attr("x2", d3.pointer(event)[0])
          .attr("y1", -focusStep - focusMargin.bottom)
          .attr("y2", focusHeight);

        let idx;
        let texts;
        let currentFrame = focusX.invert(d3.pointer(event)[0]);

        texts = d3.selectAll(".focusLineValues").data(focusLineDataset)
        texts.attr("opactiy", "1.0")
        texts.text(function(d) {
          for (idx = 0; idx < d.length; idx++) {
            if (d[idx].frame > currentFrame) {
              if (idx > 0) {
                return str(d[idx - 1].actualValue);
              }
            }
          }
          return "";
        });

        texts = d3.selectAll(".focusStateValues").data(focusStateDataset);
        texts.attr("opactiy", "1.0");
        texts.text(function(d) {
          for (idx = 0; idx < d.length; idx++) {
            if (d[idx].frame > currentFrame) {
              if (idx > 0) {
                return str(d[idx - 1].actualValue);
              }
            }
          }
          return "";
        });
    });
  }

  /**
   * Callback for "end" with d3.brushX
   * @param {array} selection Mouse pointer event
   */
  _mainBrushEnded ({selection}) {
    if (!selection) {
      this._mainBrushG.call(this._mainBrush.move, [-1, -1]);
    }
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
  showFocus(display) {
    if (display) {
      this._focusTimelineDiv.style.display = "block";
    }
    else {
      this._focusTimelineDiv.style.display = "none";
    }
  }

  /**
   * #TODO Implement in the future. This will highlight a particular region
   */
  selectData(data) {
    return;
  }

}

customElements.define("timeline-d3", TimelineD3);
