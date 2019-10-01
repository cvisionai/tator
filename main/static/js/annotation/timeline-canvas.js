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
        for (const column of dataType.columns) {
          if (column.dtype == "bool") {
            this._currentTypeId = typeId;
            const data = this._data._dataByType.get(Number(typeId));
            this._plotBoolState(column.name, data);
            break;
          }
        }
      }
    }
  }

  _plotBoolState(attributeName, data) {
    this.clear();
    const numFrames = parseFloat(this._range.getAttribute("max"));
    this._canvasWidth=2000;
    this._canvasFactor=this._canvasWidth/numFrames;
    this._canvas.setAttribute("width", this._canvasWidth);
    this._canvas.setAttribute("height", "1");
    const context = this._canvas.getContext("2d");
    const values = [];
    const frames = [];
    for (const elem of data) {
      const value = elem.attributes[attributeName];
      const frame = elem.association.frame;
      if (value) {
        context.fillStyle = "#696cff";
      } else {
        context.fillStyle = "#262e3d";
      }
      context.fillRect(frame*this._canvasFactor, 0, this._canvasWidth, 1);
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
