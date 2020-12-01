class TimelineCanvas extends TatorElement {
  constructor() {
    super();

    this._canvas = document.createElement("canvas");
    this._shadow.appendChild(this._canvas);

    this._multiCanvasDiv = document.createElement("div");
    this._shadow.appendChild(this._multiCanvasDiv);
    this._multiCanvas = [];

    this._clickHandlers = {};

    this._canvas.addEventListener("click", evt => {
      if (this._currentTypeId in this._clickHandlers) {
        this._clickHandlers[this._currentTypeId](evt);
      }
    });
    this._canvas.style.width="100%";
    this._canvas.style.height="3px";
    this._canvasWidth = 2000;

    this.stateInterpolationType = "latest"; // "latest" or "attr_style_range"

    this._grayColor = "#262e3d"

    this._highlightColors = [
      {highlight: "#FFDF6C", background: "#9e8c49"},
    ]
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

  set annotationData(val) {
    this._data = val;
    this._data.addEventListener("freshData", evt => {
      if (this._currentTypeId) {
        // Update the state interpolation latest timeline
        this._updateCanvas(this._currentTypeId);
      }
      else if (this._interpolation === "attr_style_range") {
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
            const text = document.createElement("span");
            text.setAttribute("class", "f3 text-gray px-1 py-1");
            text.textContent = dataType.name;

            if (this._showLabels === true) {
              text.style.display = "block";
            }
            else {
              text.style.display = "none";
            }

            this._multiCanvasDiv.append(text);

            const canvas = document.createElement("canvas");
            canvas.setAttribute("class", "py-1");
            canvas.style.width="100%";
            canvas.style.height="3px";
            this._multiCanvasDiv.append(canvas);

            const context = canvas.getContext("2d");

            const multiCanvasData = {
              typeId: typeId,
              text: text,
              canvas: canvas,
              context: context,
            };

            this._multiCanvas.push(multiCanvasData);
          }
        }

        // Let parent know that the multi-canvas is being used.
        this.dispatchEvent(new CustomEvent("multiCanvas", {
          detail: {
            active: this._multiCanvas.length > 0
          }
        }));

        // Next, reset the canvas before drawing.
        this._resetMultiCanvas();

        // Draw the states
        for (const typeId in this._data._dataTypes) {
          this._updateCanvas(typeId);
        }
      }
    });
    this._data.addEventListener("initialized", evt => {
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
      if (val) {
        canvasData.text.style.display = "block";
      }
      else {
        canvasData.text.style.display = "none";
      }
    }

    this._showLabels = val
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
      data.canvas.style.height=`${3*1}px`;
      data.canvasFactor = this._canvasWidth/numFrames;
    }
  }

  _resetCanvas(numColumns) {
    this.clear();
    const numFrames = parseFloat(this._range.getAttribute("max"));
    this._canvasFactor=this._canvasWidth/numFrames;
    this._canvas.setAttribute("width", this._canvasWidth);
    this._canvas.setAttribute("height", numColumns);
    this._canvas.style.height=`${3*numColumns}px`;
    this._context = this._canvas.getContext("2d");
  }

  _updateCanvas(typeId) {

    if (typeId in this._data._dataTypes) {
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isTLState && this._interpolation === "latest") {
        var sorted_columns = dataType.attribute_types;
        sorted_columns.sort((a,b) => {return a.order < b.order});
        var col_count=0;
        for (const column of sorted_columns)
        {
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
      }
      else if (dataType.interpolation === "attr_style_range" && this._interpolation === dataType.interpolation) {
        const allData = this._data._dataByType.get(typeId);

        var startFrameAttr;
        var endFrameAttr;
        var startFrameCheckAttr;
        var endFrameCheckAttr;

        for (const attr of dataType.attribute_types) {
          const style = attr['style'];
          const name = attr['name'];
          if (style === "start_frame") {
            startFrameAttr = name;
          }
          else if (style === "end_frame") {
            endFrameAttr = name;
          }
          else if (style === "start_frame_check") {
            startFrameCheckAttr = name;
          }
          else if (style === "end_frame_check") {
            endFrameCheckAttr = name;
          }
        }

        for (const canvasData of this._multiCanvas) {
          if (canvasData.typeId == typeId) {

            this._plotAllAttributeRanges(
              allData,
              startFrameAttr,
              endFrameAttr,
              startFrameCheckAttr,
              endFrameCheckAttr,
              canvasData);

            if (this._selectedData) {
              const allData = this._data._dataByType.get(typeId);
              for (const elem of allData) {
                if (elem.id == this._selectedData.id) {
                  this._plotHighlightedRange(
                    elem,
                    startFrameAttr,
                    endFrameAttr,
                    startFrameCheckAttr,
                    endFrameCheckAttr,
                    canvasData);
                }
              }
            }
          }
        }
      }
    }
  }

  _plotAllAttributeRanges(allData, startFrameAttr, endFrameAttr, startFrameCheckAttr, endFrameCheckAttr, canvasData) {

    // Draw the background time range if there's data and the type is set up appropriately
    var invalidData = true;
    if (startFrameAttr && endFrameAttr) {
      if (allData) {
        if (allData.length > 0) {
          canvasData.context.fillStyle = this._grayColor;
          canvasData.context.fillRect(0, 0, this._canvasWidth, 1);
          invalidData = false;
        }
      }
    }

    if (invalidData) {
      return;
    }

    // Draw the colored time ranges
    for (const data of allData) {
      var startFrame = data.attributes[startFrameAttr];
      var endFrame = data.attributes[endFrameAttr];

      if (data.attributes[startFrameCheckAttr] === false) {
        startFrame = 0;
      }

      if (data.attributes[endFrameCheckAttr] === false) {
        endFrame = parseFloat(this._range.getAttribute("max"));
      }

      if (startFrame > -1 && endFrame > -1 && startFrame < endFrame) {
        canvasData.context.fillStyle = this._highlightColors[0].background;
        canvasData.context.fillRect(
            startFrame*canvasData.canvasFactor,
            0,
            endFrame*canvasData.canvasFactor - startFrame*canvasData.canvasFactor,
            1);
      }
    }
  }

  _plotHighlightedRange(data, startFrameAttr, endFrameAttr, startFrameCheckAttr, endFrameCheckAttr, canvasData) {

    if (startFrameAttr && endFrameAttr) {
      var startFrame = data.attributes[startFrameAttr];
      var endFrame = data.attributes[endFrameAttr];

      if (data.attributes[startFrameCheckAttr] === false) {
        startFrame = 0;
      }

      if (data.attributes[endFrameCheckAttr] === false) {
        endFrame = parseFloat(this._range.getAttribute("max"));
      }

      if (startFrame > -1 && endFrame > -1 && startFrame < endFrame) {
        canvasData.context.fillStyle = this._highlightColors[0].highlight;
        canvasData.context.fillRect(
            startFrame*canvasData.canvasFactor,
            0,
            endFrame*canvasData.canvasFactor - startFrame*canvasData.canvasFactor,
            1);
      }
    }
  }

  _plotBoolState(attributeName, data, col_idx, col_count) {
    if (col_count < 1 || col_idx >= col_count)
    {
      console.warning("Can't plot data with no columns")
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
        }
        else
        {
          this._context.fillStyle = "#1b9ffb";
        }

      } else {
        this._context.fillStyle = this._grayColor; // Not highlighted color
      }
      this._context.fillRect(frame*this._canvasFactor, 0+col_idx, this._canvasWidth, 1+col_idx);
      values.push(value);
      frames.push(frame);
    }
    this._clickHandlers[this._currentTypeId] = evt => {
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
        this.dispatchEvent(new CustomEvent("select", {
          detail: data[index],
          composed: true,
        }));
      }
    }
  }
}

customElements.define("timeline-canvas", TimelineCanvas);
