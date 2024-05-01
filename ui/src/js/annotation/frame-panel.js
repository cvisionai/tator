import { TatorElement } from "../components/tator-element.js";

export class FramePanel extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(div);

    const headerDiv = document.createElement("div");
    headerDiv.setAttribute(
      "class",
      "d-flex flex-grow py-3 rounded-2 flex-justify-between flex-items-center"
    );
    div.appendChild(headerDiv);

    this._name = document.createElement("h3");
    this._name.setAttribute("class", "text-semibold");
    headerDiv.appendChild(this._name);

    this._moreLessButton = document.createElement("div");
    this._moreLessButton.setAttribute("class", "f3 text-dark-gray px-3");
    this._moreLessButton.style.cursor = "pointer";
    this._moreLessButton.textContent = "Less -";
    headerDiv.appendChild(this._moreLessButton);

    const attrDiv = document.createElement("div");
    div.appendChild(attrDiv);

    this._attributes = document.createElement("attribute-panel");
    attrDiv.appendChild(this._attributes);

    this._moreLessButton.addEventListener("click", () => {
      this._moreLessButton.blur();
      if (this._moreLessButton.textContent.includes("More")) {
        this._attributes.showMore();
        this._moreLessButton.textContent = "Less -";
      } else {
        this._attributes.showLess();
        this._moreLessButton.textContent = "More +";
      }
    });
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

  set browserSettings(val) {
    this._browserSettings = val;
    this._attributes.browserSettings = this._browserSettings;

    let moreLessToggle = this._browserSettings.getMoreLess(this._dataType);
    if (moreLessToggle == "more") {
      this._moreLessButton.textContent = "Less -";
    } else if (moreLessToggle == "less") {
      this._moreLessButton.textContent = "More +";
    }
  }

  set dataType(val) {
    this._dataType = val;
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
        const index = data.findIndex((elem) => elem.frame === this._frame);
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
          if (this._data.getVersion().bases.indexOf(state.version) >= 0) {
            let newObject = {};
            newObject.parent = state.id;
            newObject.attributes = { ...values };
            newObject.version = this._data.getVersion().id;
            newObject.type = Number(state.type.split("_")[1]);
            newObject.media_ids = state.media;
            newObject.frame = state.frame;
            newObject.localization_ids = state.localizations;
            console.info(JSON.stringify(newObject));
            this._undo.post("States", newObject, val);
          } else {
            this._undo.patch("State", state.id, { attributes: values }, val);
          }
        }
      }
    });
    this._data.addEventListener("freshData", (evt) => {
      const typeObj = evt.detail.typeObj;
      if (typeObj.id === val.id && this._frame !== null) {
        console.log("DEBUG: OK updating attributes!", typeObj);
        this._updateAttributes(evt.detail.data);
      }
    });

    if (this._browserSettings) {
      let moreLessToggle = this._browserSettings.getMoreLess(this._dataType);
      if (moreLessToggle == "more") {
        this._moreLessButton.textContent = "Less -";
      } else if (moreLessToggle == "less") {
        this._moreLessButton.textContent = "More +";
      }
    }
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
    const frameDiffs = data.map((elem, idx) => [
      Math.abs(elem.frame - this._frame),
      idx,
    ]);
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
    return data[beforeIdx];
  }

  getEntityCount() {
    return this._count;
  }
}

customElements.define("frame-panel", FramePanel);
