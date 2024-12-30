import { TatorElement } from "../components/tator-element.js";

export class SaveDialog extends TatorElement {
  constructor() {
    super();

    this._outerDiv = document.createElement("div");
    this._outerDiv.setAttribute(
      "class",
      "annotation__panel--popup annotation__panel rounded-2 px-2"
    );
    this._outerDiv.style.zIndex = 3;
    this._outerDiv.style.marginBottom = "0px";
    this._shadow.appendChild(this._outerDiv);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "px-3");
    this._outerDiv.appendChild(this._div);

    const header = document.createElement("div");
    header.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between py-3"
    );
    this._div.appendChild(header);

    this._nameDiv = document.createElement("div");
    this._nameDiv.setAttribute("class", "h2 text-semibold");
    header.appendChild(this._nameDiv);

    const close = document.createElement("modal-close");
    header.appendChild(close);
    this._modalClose = close;

    this._hookButtonDiv = document.createElement("div");
    this._hookButtonDiv.setAttribute("class", "hooks-button-div");
    this._hookButtonDiv.hidden = true;
    header.appendChild(this._hookButtonDiv);

    this._savePanel = document.createElement("div");
    this._savePanel.setAttribute("class", "col-12");
    this._div.appendChild(this._savePanel);

    this._hooksPanel = document.createElement("div");
    this._hooksPanel.setAttribute("class", "col-12 hooks-panel-div");
    this._hooksPanel.hidden = true;
    this._div.appendChild(this._hooksPanel);

    const buttons = document.createElement("div");
    buttons.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between py-3 save-dialog-bottom-border"
    );
    this._savePanel.appendChild(buttons);

    this._save = document.createElement("button");
    this._save.setAttribute(
      "class",
      "btn btn-clear background-green d-flex flex-grow mx-3"
    );
    this._save.setAttribute("disabled", "");
    this._save.textContent = "Save";
    buttons.appendChild(this._save);

    const cancel = document.createElement("button");
    cancel.setAttribute(
      "class",
      "btn btn-clear btn-outline d-flex flex-grow mx-3"
    );
    cancel.textContent = "Cancel";
    buttons.appendChild(cancel);

    this._entityPanel = document.createElement("div");
    this._entityPanel.setAttribute("class", "py-3 px-3 rounded-2 mb-3");
    this._outerDiv.appendChild(this._entityPanel);

    this._type = document.createElement("enum-input");
    this._type.setAttribute("name", "Select Type");
    this._type.setAttribute("class", "text-white f2 py-2 text-semibold");
    this._type.label.classList.add("mb-3");
    this._entityPanel.appendChild(this._type);

    this._favesDiv = document.createElement("div");
    this._favesDiv.setAttribute(
      "class",
      "annotation__panel-group py-2 px-3 text-gray f2 favorites-panel mb-3"
    );
    this._entityPanel.appendChild(this._favesDiv);

    this._favorites = document.createElement("favorites-panel");
    this._favesDiv.appendChild(this._favorites);

    const attrDiv = document.createElement("div");
    attrDiv.setAttribute("class", "save-dialog-attribute-panel px-3 py-1");
    this._entityPanel.appendChild(attrDiv);

    this._attributes = document.createElement("attribute-panel");
    attrDiv.appendChild(this._attributes);
    this._attributes.displayFrameVersionOnly();

    this._attributes.addEventListener("change", () => {
      this._values = this._attributes.getValues();
      if (this._values === null) {
        this._save.setAttribute("disabled", "");
      } else {
        this._save.removeAttribute("disabled");
      }
    });

    this._favorites.addEventListener("load", (evt) => {
      this._attributes._track = null;

      var attrs = evt.detail;
      console.log(attrs);
      var filteredAttrs = attrs;
      if (this._dataType.interpolation == "attr_style_range") {
        filteredAttrs = {};
        for (const info of this._dataType.attribute_types) {
          if (attrs.hasOwnProperty(info.name)) {
            filteredAttrs[info.name] = attrs[info.name];
            if (info.style) {
              if (
                info.style.includes("start_frame") ||
                info.style.includes("end_frame")
              ) {
                filteredAttrs[info.name] = this._requestObj.frame;
              }
            }
          }
        }
      }
      console.log(filteredAttrs);
      this._attributes.setValues({
        attributes: filteredAttrs,
        id: -1,
        frame: this._requestObj.frame,
      });
      this._attributes.setVersionInfo(this._version.name, this._version.id);
      this._values = this._attributes.getValues();
      if (this._values === null) {
        this._save.setAttribute("disabled", "");
      } else {
        this._save.removeAttribute("disabled");
      }
    });

    this._favorites.addEventListener("store", (evt) => {
      this._favorites.store(this._values);
    });

    this._save.addEventListener("click", () => {
      this._values = this._attributes.getValues();
      this.saveObject(this._requestObj, this._values);
      if (this._metaMode) {
        // Update the meta cache
        this._metaCache = Object.assign({}, this._values);
      }
      this._attributes.reset();
      this._trackId = null;
    });

    cancel.addEventListener("click", () => {
      cancel.blur();
      this.dispatchEvent(new Event("cancel"));
      this._attributes.reset();
    });

    close.addEventListener("click", () => {
      cancel.blur();
      this.dispatchEvent(new Event("cancel"));
      this._attributes.reset();
    });

    // Used for continuous track append.
    this._trackId = null;

    this._frame = 0;
  }

  init(projectId, mediaId, dataTypes, defaultType, undo, version, favorites) {
    this._projectId = projectId;
    this._mediaId = mediaId;
    this._undo = undo;
    this._version = version;
    this._favoritesData = favorites;
    this._attributes.setVersionInfo(this._version.name, this._version.id);
    this._attributes._standardWidgetsDiv.classList.remove("mx-4");
    this._attributes._standardWidgetsDiv.classList.add("mt-2");

    // Set choices on type selector.
    this._type.choices = dataTypes.map((type) => {
      return { label: type.name, value: JSON.stringify(type) };
    });
    this._type.addEventListener("change", this._setDataType.bind(this));
    this._type.default = defaultType.name;
    this._type.reset();
    this._setDataType();

    this._attributes.dispatchEvent(new Event("change"));
  }

  set stateMediaIds(val) {
    this._stateMediaIds = val;
  }

  // Save the underlying object to the database
  saveObject(requestObj, values) {
    // Defensively program against null attribute values
    if (values == undefined || values == null) {
      values = {};
    }

    this.dispatchEvent(
      new CustomEvent("save", {
        detail: values,
      })
    );

    if (
      this._dataType.isTrack &&
      typeof requestObj.localization_ids === "undefined"
    ) {
      const localizationBody = {
        type: Number(this._dataType.localizationType.id.split("_")[1]),
        name: this._dataType.localizationType.name,
        version: this._version.id,
        media_id: this._mediaId,
        ...requestObj,
        attributes: { ...values },
      };
      this._undo
        .post(
          "Localizations",
          localizationBody,
          this._dataType.localizationType
        )
        .then((localizationResponse) => {
          if (this._trackId === null) {
            // Track needs to be created.
            const trackBody = {
              type: Number(this._dataType.id.split("_")[1]),
              name: this._dataType.name,
              version: this._version.id,
              media_ids: [this._mediaId],
              localization_ids: localizationResponse.id,
              attributes: { ...values },
            };
            return this._undo.post("States", trackBody, this._dataType);
          } else {
            this.dispatchEvent(
              new CustomEvent("addDetectionToTrack", {
                detail: {
                  localizationType: this._dataType.localizationType.id,
                  trackType: this._dataType.id,
                  frame: requestObj.frame,
                  mainTrackId: this._trackId,
                  detectionId: localizationResponse.id[0],
                  selectTrack: false,
                },
              })
            );
          }
        })
        .then((trackResponse) => {
          if (trackResponse) {
            this._trackId = trackResponse.id[0];
          }
        });
    } else {
      var body = {
        type: Number(this._dataType.id.split("_")[1]),
        name: this._dataType.name,
        version: this._version.id,
        ...requestObj,
        attributes: { ...values },
      };

      if (this._dataType.dtype.includes("state")) {
        if (this._stateMediaIds) {
          body.media_ids = this._stateMediaIds;
        } else {
          body.media_ids = [this._mediaId];
        }
        this._undo.post("States", body, this._dataType);
      } else {
        body.media_id = this._mediaId;
        this._undo.post("Localizations", body, this._dataType);
      }
    }
  }

  set version(val) {
    this._version = val;
    this._attributes.setVersionInfo(this._version.name, this._version.id);
  }

  // Used to dynamically update frame attribute
  updateFrame(val) {
    // Update the frame, set widget value
    this._frame = val;
    this._attributes.setFrameInfo(this._frame);

    // Update _requestObj's frame (object used to save)
    if (this._requestObj) {
      this._requestObj.frame = this._frame;
    }
  }

  set canvasPosition(val) {
    this._canvasPosition = val;
    this._updatePosition();
  }

  set dragInfo(val) {
    this._dragInfo = val;
    this._updatePosition();
  }

  set metaMode(val) {
    this._metaMode = val;
    if (val == false) {
      this._metaCache = null;
    }
  }

  get metaMode() {
    return this._metaMode;
  }

  get metaCache() {
    return this._metaCache;
  }

  set requestObj(val) {
    this._requestObj = val;

    if (this._dataType.interpolation == "attr_style_range") {
      this._attributes.setFrameRange(val.frame, val.frame);
    }
    this._attributes.setFrameInfo(val.frame);
  }

  addRecent(val) {
    this._recent.add(val);
  }

  _updatePosition() {
    const dragDefined = typeof this._dragInfo !== "undefined";
    const canvasDefined = typeof this._canvasPosition !== "undefined";
    if (dragDefined && canvasDefined) {
      const boxRight = Math.max(this._dragInfo.start.x, this._dragInfo.end.x);
      let thisTop = this._canvasPosition.top;
      let thisLeft = boxRight + 20 + this._canvasPosition.left;

      // Prevent being drawn off screen
      thisTop = Math.max(thisTop, 50);
      thisLeft = Math.max(thisLeft, 50);
      this.style.top = thisTop + "px";
      this.style.left = thisLeft + "px";
    }
  }

  /**
   * Change the dialog to match the current datatype
   *
   * 1. Update the title
   * 2. Update the attribute panel
   * 3. Update the favorites
   * 4. Set the save button's disabled status
   */
  _setDataType() {
    this._dataType = JSON.parse(this._type.getValue());
    var category = "Localization";
    if (this._dataType.dtype.includes("state")) {
      category = "State";
      if (this._dataType.isTrack) {
        category = "Track";
      }
    }

    this._nameDiv.textContent = `Save ${category}`;

    this._attributes._track = null;
    this._attributes.dataType = this._dataType;
    this._attributes.displayTrackUI(false);

    if (
      !this._dataType.hasOwnProperty("attribute_types") ||
      this._dataType.attribute_types.length < 1
    ) {
      this._favesDiv.style.display = "none";
    } else {
      this._favesDiv.style.display = "block";
    }

    this._favorites.init(this._dataType, this._favoritesData);

    this._values = this._attributes.getValues();
    if (this._values === null) {
      this._save.setAttribute("disabled", "");
    } else {
      this._save.removeAttribute("disabled");
    }
  }

  /**
   * @param {*} panel panel to append to hooks panel div
   * @returns
   */
  addAppletPanel(panel) {
    this._hooksPanel.appendChild(panel);
  }
}

customElements.define("save-dialog", SaveDialog);
