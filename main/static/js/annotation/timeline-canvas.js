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
  }

  set rangeInput(val) {
    this._range = val;
  }

  set annotationData(val) {
    this._data = val;
    this._data.addEventListener("freshData", evt => {
      this._updateCanvas(this._currentTypeId);
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

  clear() {
    const context = this._canvas.getContext("2d");
    context.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  draw(typeId) {
    this._updateCanvas(typeId);
  }

  _updateCanvas(typeId) {
    if (typeId in this._data._dataTypes) {
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isTLState) {
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
        this.clear();
        const numFrames = parseFloat(this._range.getAttribute("max"));
        this._canvasWidth=2000;
        this._canvasFactor=this._canvasWidth/numFrames;
        this._canvas.setAttribute("width", this._canvasWidth);
        this._canvas.setAttribute("height", col_count);
        this._canvas.style.height=`${3*col_count}px`;
        this._context = this._canvas.getContext("2d");
        for (const column of sorted_columns) {
          if (column.dtype == "bool") {
            this._currentTypeId = typeId;
            const data = this._data._dataByType.get(typeId);
            this._plotBoolState(column.name, data, col_idx, col_count);
            col_idx += 1;
          }
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
        this._context.fillStyle = "#262e3d";
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
