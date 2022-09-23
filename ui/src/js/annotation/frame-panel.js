import { TatorElement } from "../components/tator-element.js";

export class FramePanel extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(div);

    this._name = document.createElement("h3");
    this._name.setAttribute("class", "py-3 text-semibold");
    div.appendChild(this._name);

    this._attributes = document.createElement("attribute-panel");
    div.appendChild(this._attributes);
  }

  set permission(val) {
    this._attributes.permission = val;
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  set stateMediaIds(val) {
    this._stateMediaIds = val;
  }

  set annotationData(val) {
    this._data = val;
  }

  set version(val) {
    this._version = val;
  }

  set dataType(val) {
    this._name.textContent = val.name;
    this._typeId = val.id;
    this._method = val.interpolation;
    this._attributes.dataType = val;
    this._attributes.addEventListener("change", () => {
      if (this._blockingWrites) {
        return;
      }
      const values = this._attributes.getValues();
      if (values !== null) {
        this._blockingUpdates = true;
        const data = this._data._dataByType.get(val.id);
        const index = data.findIndex(elem => elem.frame === this._frame);
        if (index === -1) {
          const mediaId = Number(this.getAttribute("media-id"));
          const body = {
            type: Number(val.id.split("_")[1]),
            name: val.name,
            media_ids: [mediaId],
            frame: this._frame,
            version: this._version.id,
            ...values,
          };

          if (this._stateMediaIds) {
            body.media_ids = this._stateMediaIds;
          }

          this._undo.post("States", body, val);
        } else {
          const state = data[index];
          if (this._data.getVersion().bases.indexOf(state.version) >= 0)
          {
            let newObject = {};
            newObject.parent = state.id;
            newObject = Object.assign(newObject, values);
            newObject.version = this._data.getVersion().id;
            newObject.type = Number(state.meta.split("_")[1]);
            newObject.media_ids = state.media;
            newObject.frame = state.frame;
            newObject.localization_ids = state.localizations;
            console.info(JSON.stringify(newObject));
            this._undo.post("States", newObject, val);
          }
          else
          {
            this._undo.patch("State", state.id, {"attributes": values}, val);
          }
        }
      }
    });
    this._data.addEventListener("freshData", evt => {
      const typeObj = evt.detail.typeObj;
      if ((typeObj.id === val.id) && (this._frame !== null)) {
        this._updateAttributes(evt.detail.data);
      }
    });
  }

  frameChange(frame) {
    this._frame = frame;
    if (this._typeId && this._data) {
      const data = this._data._dataByType.get(this._typeId);
      this._updateAttributes(data);
    }
  }

  _updateAttributes(data) {
    if (this._blockingUpdates) {
      this._blockingUpdates = false;
      return;
    }
    if (data) {
      this._count = data.length;
      if (data.length > 0) {
        this._blockingWrites = true;
        const values = this._getInterpolated(data);
        this._attributes.setValues(values);
        this._blockingWrites = false;
      }
      this.dispatchEvent(new Event("dataUpdated"));
    }
  }

  _getInterpolated(data) {
    data.sort((a, b) => a.frame - b.frame);
    const frameDiffs = data.map(
      (elem, idx) => [Math.abs(elem.frame - this._frame), idx]
    );
    const nearestIdx = frameDiffs.reduce((r, a) => (a[0] < r[0] ? a : r))[1];
    let beforeIdx, afterIdx;
    const frameDiff = data[nearestIdx].frame - this._frame;
    if (frameDiff < 0) {
      beforeIdx = nearestIdx;
      afterIdx = Math.min(beforeIdx + 1, data.length - 1);
    } else if (frameDiff > 0) {
      afterIdx = nearestIdx;
      beforeIdx = Math.max(afterIdx - 1, 0);
    } else {
      beforeIdx = nearestIdx;
      afterIdx = nearestIdx;
    }
    let attrs;
    let id;
    let version;
    let created_by;
    switch (this._method) {
      case "latest":
        attrs = data[beforeIdx].attributes;
        id = data[beforeIdx].id;
        version = data[beforeIdx].version;
        created_by = data[beforeIdx].created_by;
        break;
      //TODO: Implement other interpolation methods
    }
    return {attributes: attrs, id: id, version: version,created_by:created_by};
  }

  getEntityCount() {
    return this._count;
  }
}

customElements.define("frame-panel", FramePanel);
