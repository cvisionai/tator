import { TatorElement } from "../components/tator-element.js";

export class TimelineCanvas extends TatorElement {
  constructor() {
    super();

    this._canvas = document.createElement("canvas");
    this._shadow.appendChild(this._canvas);

    this._multiCanvasDiv = document.createElement("div");
    this._shadow.appendChild(this._multiCanvasDiv);
    this._multiCanvas = [];

    this._clickHandlers = {};

    this._canvas.addEventListener("click", (evt) => {
      if (this._currentTypeId in this._clickHandlers) {
        this._clickHandlers[this._currentTypeId](evt);
      }
    });
    this._canvas.style.width = "100%";
    this._canvas.style.height = "3px";
    this._canvasWidth = 2000;

    this.stateInterpolationType = "latest"; // "latest" or "attr_style_range"

    this._grayColor = "#262e3d";

    this._highlightColors = [{ highlight: "#FFDF6C", background: "#696147" }];
  }

  /**
   * Mechanism to switch the timeline canvas from the traditional "latest" interpolation type
   * to the "attr_style_range" type (and other future types)
   *
   * :param val: Valid strings - "latest"|"attr_style_range"
   */
  set stateInterpolationType(val) {
    this._interpolation = val;

    if (this._interpolation === "attr_style_range") {
      this._canvas.style.display = "none";
    }
  }

  set rangeInput(val) {
    this._range = val;
  }

  _addToMultiCanvasData(
    name,
    typeId,
    startFrameAttr,
    endFrameAttr,
    startFrameCheckAttr,
    endFrameCheckAttr,
    inVideoCheckAttr
  ) {
    const text = document.createElement("span");
    text.setAttribute("class", "f3 text-gray px-1 py-1");
    text.textContent = name + "(s)";
    text.style.display = "none";

    this._multiCanvasDiv.append(text);

    const canvas = document.createElement("canvas");
    canvas.setAttribute("class", "py-1");
    canvas.style.width = "100%";
    canvas.style.height = "3px";
    this._multiCanvasDiv.append(canvas);

    const context = canvas.getContext("2d");

    const multiCanvasData = {
      typeId: typeId,
      text: text,
      canvas: canvas,
      context: context,
      startFrameAttr: startFrameAttr,
      endFrameAttr: endFrameAttr,
      startFrameCheckAttr: startFrameCheckAttr,
      endFrameCheckAttr: endFrameCheckAttr,
      inVideoCheckAttr: inVideoCheckAttr,
    };

    this._multiCanvas.push(multiCanvasData);
  }

  set annotationData(val) {
    this._data = val;
    this._data.addEventListener("freshData", (evt) => {
      if (this._currentTypeId) {
        // Update the state interpolation latest timeline
        this._updateCanvas(this._currentTypeId);
      } else if (this._interpolation === "attr_style_range") {
        // Update the state attr_style_range timeline

        for (const canvasData of this._multiCanvas) {
          canvasData.canvas.remove();
          canvasData.text.remove();
        }

        // Grab the number of state types that are attr_style_range
        this._multiCanvas = [];
        for (const typeId in this._data._dataTypes) {
          const dataType = this._data._dataTypes[typeId];

          if (dataType.interpolation === "attr_style_range") {
            // To support attr_style_range, there must at least be one set of
            // start_frame|end_frame style attributes. Grab the start_frame/end_frame info.
            //
            // There can actually be multiple start_frame|end_frame pairs. If this is the case,
            // there has to be a range associated. If not, then don't show anything and throw a
            // warning. #TODO Is this the appropriate response?
            //
            var startFrameAttr;
            var endFrameAttr;
            var startFrameCheckAttr;
            var endFrameCheckAttr;
            var inVideoCheckAttr;
            var inVideoCheckAttrList = [];
            var startFrameAttrList = [];
            var endFrameAttrList = [];
            var rangeList = [];

            for (const attr of dataType.attribute_types) {
              const style = attr["style"];

              if (style) {
                const styleOptions = style.split(" ");
                const name = attr["name"];

                if (styleOptions.includes("start_frame")) {
                  startFrameAttrList.push(name);
                } else if (styleOptions.includes("end_frame")) {
                  endFrameAttrList.push(name);
                } else if (styleOptions.includes("start_frame_check")) {
                  startFrameCheckAttr = name;
                } else if (styleOptions.includes("end_frame_check")) {
                  endFrameCheckAttr = name;
                } else if (styleOptions.includes("in_video_check")) {
                  inVideoCheckAttrList.push(name);
                } else if (styleOptions.includes("range_set")) {
                  rangeList.push({
                    name: name,
                    data: attr["default"],
                    order: attr["order"],
                  });
                }
              }
            }

            if (
              startFrameAttrList.length == 1 &&
              endFrameAttrList.length == 1
            ) {
              startFrameAttr = startFrameAttrList[0];
              endFrameAttr = endFrameAttrList[0];
              inVideoCheckAttr = null;

              this._addToMultiCanvasData(
                dataType.name,
                typeId,
                startFrameAttr,
                endFrameAttr,
                startFrameCheckAttr,
                endFrameCheckAttr,
                inVideoCheckAttr
              );
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

                if (rangeTokens.length < 2 && rangeTokens.length > 3) {
                  console.error(
                    "Incorrect datatype setup with attr_style_range interpolation."
                  );
                  break;
                }

                startFrameAttr = rangeTokens[0];
                endFrameAttr = rangeTokens[1];
                inVideoCheckAttr = null;

                if (rangeTokens.length == 3) {
                  if (inVideoCheckAttrList.includes(rangeTokens[2])) {
                    inVideoCheckAttr = rangeTokens[2];
                  }
                }

                if (!startFrameAttrList.includes(startFrameAttr)) {
                  console.error(
                    "Incorrect datatype setup with attr_style_range interpolation."
                  );
                  break;
                }

                if (!endFrameAttrList.includes(endFrameAttr)) {
                  console.error(
                    "Incorrect datatype setup with attr_style_range interpolation."
                  );
                  break;
                }

                this._addToMultiCanvasData(
                  rangeInfo.name,
                  typeId,
                  startFrameAttr,
                  endFrameAttr,
                  null,
                  null,
                  inVideoCheckAttr
                );
              }
            } else {
              console.error(
                "Incorrect datatype setup with attr_style_range interpolation."
              );
              continue;
            }
          }
        }

        this.showLabels = this._showLabels;

        // Let parent know that the multi-canvas is being used.
        this.dispatchEvent(
          new CustomEvent("multiCanvas", {
            detail: {
              active: this._multiCanvas.length > 0,
            },
          })
        );

        // Next, reset the canvas before drawing.
        this._resetMultiCanvas();

        // Draw the states
        for (const typeId in this._data._dataTypes) {
          this._updateCanvas(typeId);
        }
      }

      if (evt.detail.finalized)
      {
        evt.detail.finalized();
      }
    });
    this._data.addEventListener("initialized", (evt) => {
      this._initialized = true;
      for (const typeId in this._data._dataTypes) {
        this._updateCanvas(typeId);
        if (this._currentTypeId == typeId) {
          break;
        }
      }
    });
  }

  /**
   * True shows labels for each attr_style_range canvas. False otherwise.
   */
  set showLabels(val) {
    for (const canvasData of this._multiCanvas) {
      const allData = this._data._dataByType.get(canvasData.typeId);

      if (val && allData.length > 0) {
        canvasData.text.style.display = "block";
      } else {
        canvasData.text.style.display = "none";
      }
    }

    this._showLabels = val;
  }

  /**
   * This method is used by the attr_style_range timeline type.
   *
   * Preconditions:
   *    this._multiCanvas must have been set
   */
  selectData(val) {
    if (this._interpolation === "attr_style_range") {
      this._selectedData = val;
      for (const canvasData of this._multiCanvas) {
        this._updateCanvas(canvasData.typeId);
      }
    }
  }

  clear() {
    const context = this._canvas.getContext("2d");
    context.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  draw(typeId) {
    this._updateCanvas(typeId);
  }

  /**
   * Preconditions: this._multiCanvas must have been set
   */
  _resetMultiCanvas() {
    const numFrames = parseFloat(this._range.getAttribute("max"));
    for (const data of this._multiCanvas) {
      data.context.clearRect(0, 0, data.canvas.width, data.canvas.height);
      data.canvas.setAttribute("width", this._canvasWidth);
      data.canvas.setAttribute("height", 1);
      data.canvas.style.height = `${3 * 1}px`;
      data.canvasFactor = this._canvasWidth / numFrames;
    }
  }

  _resetCanvas(numColumns) {
    this.clear();
    const numFrames = parseFloat(this._range.getAttribute("max"));
    this._canvasFactor = this._canvasWidth / numFrames;
    this._canvas.setAttribute("width", this._canvasWidth);
    this._canvas.setAttribute("height", numColumns);
    this._canvas.style.height = `${3 * numColumns}px`;
    this._context = this._canvas.getContext("2d");
  }

  _updateCanvas(typeId) {
    if (typeId in this._data._dataTypes) {
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isTLState && this._interpolation === "latest") {
        var sorted_columns = dataType.attribute_types;
        sorted_columns.sort((a, b) => {
          return a.order < b.order;
        });
        var col_count = 0;
        for (const column of sorted_columns) {
          if (column.dtype == "bool") {
            col_count += 1;
          }
        }
        var col_idx = 0;
        this._resetCanvas(col_count);
        for (const column of sorted_columns) {
          if (column.dtype == "bool") {
            this._currentTypeId = typeId;
            const data = this._data._dataByType.get(typeId);
            this._plotBoolState(column.name, data, col_idx, col_count);
            col_idx += 1;
          }
        }
      } else if (
        dataType.interpolation === "attr_style_range" &&
        this._interpolation === dataType.interpolation
      ) {
        const allData = this._data._dataByType.get(typeId);

        for (const canvasData of this._multiCanvas) {
          if (canvasData.typeId == typeId) {
            this._plotAllAttributeRanges(allData, canvasData);

            if (this._selectedData) {
              const allData = this._data._dataByType.get(typeId);
              for (const elem of allData) {
                if (elem.id == this._selectedData.id) {
                  this._plotHighlightedRange(elem, canvasData);
                }
              }
            }
          }
        }
      }
    }
  }

  _drawRange(data, canvasData, color) {
    var startFrame = data.attributes[canvasData.startFrameAttr];
    var endFrame = data.attributes[canvasData.endFrameAttr];

    const maxFrame = parseFloat(this._range.getAttribute("max"));
    const maxWidth = maxFrame * canvasData.canvasFactor;
    const minRangeWidth = maxWidth * 0.002;

    if (canvasData.startFrameCheckAttr && canvasData.endFrameCheckAttr) {
      // Start frame check and end frame check attributes exist.
      // #TODO This capability may go away in lieu of just using -1 values.
      if (data.attributes[canvasData.startFrameCheckAttr] === false) {
        startFrame = 0;
      }
      if (data.attributes[canvasData.endFrameCheckAttr] === false) {
        endFrame = maxFrame;
      }
    } else {
      // Start/end frame check attributes don't exist.
      // Just assume if there's a -1, it's going to stretch
      if (startFrame == -1) {
        startFrame = 0;
      }

      if (endFrame == -1) {
        endFrame = maxFrame;
      }
    }

    if (canvasData.inVideoCheckAttr) {
      // A "in video check" attribute is there. Don't draw if this value is false.
      if (data.attributes[canvasData.inVideoCheckAttr] === false) {
        return;
      }
    }

    if (startFrame > -1 && endFrame > -1 && startFrame <= endFrame) {
      var width =
        endFrame * canvasData.canvasFactor -
        startFrame * canvasData.canvasFactor;
      if (width < minRangeWidth) {
        width = minRangeWidth;
      }

      var startPoint = startFrame * canvasData.canvasFactor;
      if (startPoint + width > maxWidth) {
        startPoint = maxWidth - width;
      }

      canvasData.context.fillStyle = color;
      canvasData.context.fillRect(startPoint, 0, width, 1);
    }
  }

  _plotAllAttributeRanges(allData, canvasData) {
    // Draw the background time range if there's data and the type is set up appropriately
    var invalidData = true;
    if (canvasData.startFrameAttr && canvasData.endFrameAttr) {
      if (allData) {
        if (allData.length > 0) {
          canvasData.context.fillStyle = this._grayColor;
          canvasData.context.fillRect(0, 0, this._canvasWidth, 1);
          invalidData = false;
        }
      }
    }

    if (invalidData) {
      canvasData.canvas.style.display = "none";
      return;
    }

    canvasData.canvas.style.display = "block";

    // Draw the colored time ranges
    for (const data of allData) {
      this._drawRange(data, canvasData, this._highlightColors[0].background);
    }
  }

  _plotHighlightedRange(data, canvasData) {
    if (canvasData.startFrameAttr && canvasData.endFrameAttr) {
      this._drawRange(data, canvasData, this._highlightColors[0].highlight);
    }
  }

  _plotBoolState(attributeName, data, col_idx, col_count) {
    if (col_count < 1 || col_idx >= col_count) {
      console.warning("Can't plot data with no columns");
      return;
    }
    const numFrames = parseFloat(this._range.getAttribute("max"));

    const values = [];
    const frames = [];
    for (const elem of data) {
      const value = elem.attributes[attributeName];
      const frame = elem.frame;
      if (value) {
        //Alternate based on col number
        if (col_idx % 2 == 0) {
          this._context.fillStyle = "#696cff";
        } else {
          this._context.fillStyle = "#1b9ffb";
        }
      } else {
        this._context.fillStyle = this._grayColor; // Not highlighted color
      }
      this._context.fillRect(
        frame * this._canvasFactor,
        0 + col_idx,
        this._canvasWidth,
        1 + col_idx
      );
      values.push(value);
      frames.push(frame);
    }
    this._clickHandlers[this._currentTypeId] = (evt) => {
      const scale = numFrames / this._canvas.offsetWidth;
      const x = scale * (evt.clientX - this._canvas.offsetLeft);
      let index;
      for (const [idx, frame] of frames.entries()) {
        if (frame <= x) {
          index = idx;
        } else {
          break;
        }
      }
      if (typeof index !== "undefined") {
        this.dispatchEvent(
          new CustomEvent("select", {
            detail: data[index],
            composed: true,
          })
        );
      }
    };
  }
}

customElements.define("timeline-canvas", TimelineCanvas);
