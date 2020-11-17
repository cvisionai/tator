class TimelineCanvas extends TatorElement {
  constructor() {
    super();

    this._canvas = document.createElement("canvas");
    this._shadow.appendChild(this._canvas);

    this._clickHandlers = {};

    this._canvas.addEventListener("click", evt => {
      if (this._currentTypeId in this._clickHandlers) {
        this._clickHandlers[this._currentTypeId](evt);
      }
    });
    this._canvas.style.width="100%";
    this._canvas.style.height="3px";

    this.stateInterpolationType = "latest";
  }

  set stateInterpolationType(val) {
    this._interpolation = val;

    if (this._interpolation === "attr_style_range")
    {
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
      else if (this._selectedData) {
        // Update the state attr_style_range timeline
        this._updateCanvas(this._selectedData.meta);
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

  selectData(val) {
    this._selectedData = val;
    this._updateCanvas(val.meta);
  }

  clear() {
    const context = this._canvas.getContext("2d");
    context.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  draw(typeId) {
    this._updateCanvas(typeId);
  }

  _resetCanvas(numColumns) {
    this.clear();
    const numFrames = parseFloat(this._range.getAttribute("max"));
    this._canvasWidth=2000;
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
      else if (dataType.interpolation && this._selectedData) {
        if (dataType.interpolation === "attr_style_range" && this._interpolation === dataType.interpolation) {
          this._resetCanvas(1);
          const allData = this._data._dataByType.get(typeId);
          for (const elem of allData) {
            if (elem.id == this._selectedData.id) {
              this._plotAttributeRange(elem, dataType);
            }
          }
        }
      }
    }
  }

  /**
   * Note: This assumes that there is a start_frame and potentially a end_frame.
   *       If either of these values are missing or are negative, then ignore coloring the timeline canvas.
   */
  _plotAttributeRange(data, dataType) {

    // Can just do this on initialization or something, #TODO
    var startFrameAttr;
    var endFrameAttr;
    for (const attr of dataType.attribute_types) {
      if (attr['style']) {
        if (attr['style'] === "start_frame") {
          startFrameAttr = attr['name'];
        }
        else if (attr['style'] === "end_frame") {
          endFrameAttr = attr['name'];
        }
      }
    }

    if (startFrameAttr && endFrameAttr) {
      var startFrame = data.attributes[startFrameAttr];
      var endFrame = data.attributes[endFrameAttr];

      if (startFrame && endFrame) {
        if (startFrame > -1 && endFrame > -1 && startFrame < endFrame) {
          this._canvas.style.display = "block";

          this._context.fillStyle = "#262e3d";
          this._context.fillRect(0, 0, this._canvasWidth, 1);

          this._context.fillStyle = "#fcbf19";
          this._context.fillRect(startFrame*this._canvasFactor, 0, this._canvasWidth, 1);

          this._context.fillStyle = "#262e3d";
          this._context.fillRect(endFrame*this._canvasFactor, 0, this._canvasWidth, 1);
        }
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
        this._context.fillStyle = "#262e3d"; // Not highlighted color
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
