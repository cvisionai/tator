class AnnotationBrowser extends TatorElement {
  constructor() {
    super();

    this._panels = document.createElement("div");
    this._panels.setAttribute("class", "annotation__panels py-3 px-3");
    this._shadow.appendChild(this._panels);

    this._media = document.createElement("media-panel");
    this._panels.appendChild(this._media);

    this._framePanels = {};
    this._entityPanels = {};

    this._media.addEventListener("open", evt => {
      const typeId = evt.detail.typeId;
      this._openForTypeId(typeId);
    });
  }

  init(dataTypes, version) {
    this._version = version;
    this._media.dataTypes = dataTypes;
    for (const dataType of dataTypes) {
      if (dataType.visible) {
        const entity = document.createElement("entity-browser");
        entity.dataType = dataType;
        entity.canvas = this._canvas;
        if (typeof this._permission !== "undefined") {
          entity.permission = this._permission;
        }
        entity.undoBuffer = this._undo;
        entity.annotationData = this._data;
        entity.style.display = "none";
        this._panels.appendChild(entity);
        this._entityPanels[dataType.id] = entity;
        entity.addEventListener("close", evt => {
          this._media.style.display = "block";
          for (const typeId in this._framePanels) {
            this._framePanels[typeId].style.display = "block";
          }
        });
      }
    }
    for (const dataType of dataTypes) {
      const isFrameState = dataType.association == "Frame";
      const isInterpolated = dataType.interpolation !== "none";
      if (isFrameState && isInterpolated) {
        const frame = document.createElement("frame-panel");
        frame.setAttribute("media-id", this._mediaId);
        frame.undoBuffer = this._undo;
        frame.annotationData = this._data;
        frame.version = this._version;
        frame.dataType = dataType;
        if (typeof this._permission !== "undefined") {
          frame.permission = this._permission;
        }
        this._panels.appendChild(frame);
        this._framePanels[dataType.id] = frame;
      }
    }
  }

  set canvas(val) {
    this._canvas = val;x
  }

  set permission(val) {
    this._permission = val;
    for (const key in this._framePanels) {
      this._framePanels[key].permission = val;
    }
    for (const key in this._entityPanels) {
      this._entityPanels[key].permission = val;
    }
    this._media.permission = val;
  }

  set mediaInfo(val) {
    this._media.mediaInfo = val;
    this._mediaId = val.id;
  }

  set mediaType(val) {
    this._media.mediaType = val;
  }

  set undoBuffer(val) {
    this._undo = val;
    this._media.undoBuffer = val;
  }

  set annotationData(val) {
    this._data = val;
    this._media.annotationData = val;
  }

  set version(val) {
    this._version = val;
    for (const key in this._framePanels) {
      this._framePanels[key].version = val;
    }
  }

  _openForTypeId(typeId) {
    for (const key in this._framePanels) {
      if (key == typeId) {
        this._framePanels[key].style.display = "block";
      } else {
        this._framePanels[key].style.display = "none";
      }
    }
    for (const key in this._entityPanels) {
      if (key == typeId) {
        this._media.style.display = "none";
        this._entityPanels[key].style.display = "block";
      } else {
        this._entityPanels[key].style.display = "none";
      }
    }
  }

  frameChange(frame) {
    for (const typeId in this._framePanels) {
      this._framePanels[typeId].frameChange(frame);
    }
  }

  selectEntity(obj) {
    const typeId = obj.meta;
    this._openForTypeId(typeId);
    if (typeId in this._entityPanels)
    {
      this._entityPanels[typeId].selectEntity(obj);
    }
    else
    {
      console.warn("No entity browser for object.");
    }
  }
}

customElements.define("annotation-browser", AnnotationBrowser);
