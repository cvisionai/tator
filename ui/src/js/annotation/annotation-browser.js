import { TatorElement } from "../components/tator-element.js";

export class AnnotationBrowser extends TatorElement {
  constructor() {
    super();

    var wrapper = document.createElement("div");
    wrapper.setAttribute(
      "class",
      "mt-3 mx-3 annotation_browser_wrapper rounded-2"
    );
    this._shadow.appendChild(wrapper);

    var header = document.createElement("div");
    header.setAttribute(
      "class",
      "d-flex flex-grow px-3 py-1 rounded-2 flex-justify-center"
    );
    wrapper.appendChild(header);

    this._minimizeButton = document.createElement("button");
    this._minimizeButton.setAttribute(
      "class",
      "annotation-browser-btn flex-justify-left f3"
    );
    this._minimizeButton.style.width = "70px";
    header.appendChild(this._minimizeButton);

    this._headerLabel = document.createElement("div");
    this._headerLabel.setAttribute(
      "class",
      "px-3 f2 text-bold d-flex flex-items-center flex-justify-center flex-grow"
    );
    this._headerLabel.textContent = "Annotation Browser";
    header.appendChild(this._headerLabel);

    this._settingsButton = document.createElement("button");
    this._settingsButton.setAttribute("class", "annotation-browser-btn");
    header.appendChild(this._settingsButton);

    this._settingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
        <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path>
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
        </svg>`;

    this._panels = document.createElement("div");
    this._panels.setAttribute("class", "annotation__panels px-3 pt-2");
    this._panels.style.display = "none";
    wrapper.appendChild(this._panels);

    this._media = document.createElement("media-panel");
    this._media.style.display = "block";
    this._panels.appendChild(this._media);

    this._framePanels = {};
    this._entityPanels = {};
    this._selectEntity = null;

    this._media.addEventListener("open", (evt) => {
      const typeId = evt.detail.typeId;
      this._openForTypeId(typeId);
    });

    this._minimizeButton.addEventListener("click", () => {
      this._minimizeButton.blur();
      if (this._panels.style.display == "none") {
        this._expandBrowser();
      } else {
        this._collapseBrowser();
      }
    });

    this._settingsButton.addEventListener("click", () => {
      this._settingsButton.blur();
      this.dispatchEvent(
        new CustomEvent("openBrowserSettings", {
          composed: true,
        })
      );
    });

    document.addEventListener("keydown", (evt) => {
      if (this._shortcutsDisabled) {
        return;
      }

      if (document.body.classList.contains("shortcuts-disabled")) {
        return;
      }

      if (evt.key == "e") {
        for (const typeName in this._entityPanels) {
          if (this._entityPanels[typeName].style.display == "block") {
            this._entityPanels[typeName].redraw();
          }
        }
      }
    });

    this.addEventListener("select", (evt) => {
      let objType = evt.detail.data.type;
      this._openForTypeId(objType);
    });

    this._expandBrowser();
  }

  _expandBrowser() {
    this._media.showEntities();

    if (this._panels.style.display != "none") {
      return;
    }

    this._panels.style.display = "block";
    this._minimizeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="12" height="12" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
      </svg><div class="text-dark-gray ml-1">Hide</div>`;
    this._headerLabel.style.display = "flex";
    this._settingsButton.style.display = "flex";
    window.dispatchEvent(new Event("resize"));
  }

  _collapseBrowser() {
    this._panels.style.display = "none";
    this._minimizeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="20" height="12" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
      </svg><div class="text-dark-gray">Show Panel</div>`;
    this._headerLabel.style.display = "none";
    this._settingsButton.style.display = "none";
    window.dispatchEvent(new Event("resize"));
  }

  init(dataTypes, version, stateMediaIds, isVideo, browserSettings) {
    this._browserSettings = browserSettings;
    this._version = version;
    this._media.dataTypes = dataTypes;
    this._media.browserSettings = this._browserSettings;
    for (const dataType of dataTypes) {
      if (dataType.visible) {
        const entity = document.createElement("entity-browser");
        entity.dataType = dataType;
        entity.canvas = this._canvas;
        entity.noFrames = !isVideo;
        entity.mediaType = this._media._mediaType;
        entity.media = this._media._mediaData;
        entity.browserSettings = this._browserSettings;

        if (typeof this._permission !== "undefined") {
          entity.permission = this._permission;
        }
        entity.undoBuffer = this._undo;
        entity.annotationData = this._data;
        entity.style.display = "none";
        this._panels.appendChild(entity);
        this._entityPanels[dataType.id] = entity;
        entity.addEventListener("close", (evt) => {
          this._media.style.display = "block";
          for (const typeId in this._framePanels) {
            var count = this._framePanels[typeId].getEntityCount();
            if (count == 0) {
              this._framePanels[typeId].style.display = "none";
            } else {
              this._framePanels[typeId].style.display = "block";
            }
          }
        });

        entity.addEventListener("goToTrack", (evt) => {
          this.selectEntity(evt.detail.track, true);
        });

        entity.addEventListener("goToLocalization", (evt) => {
          this.selectLocalizationFromTrack(evt.detail.track, evt.detail.frame);
        });
      }
    }
    for (const dataType of dataTypes) {
      const isFrameState = dataType.association == "Frame";
      const isInterpolated = dataType.interpolation !== "none";
      if (isFrameState && isInterpolated) {
        if (dataType.interpolation === "latest") {
          const frame = document.createElement("frame-panel");
          frame.browserSettings = this._browserSettings;
          frame.style.display = "none";

          frame.addEventListener("dataUpdated", () => {
            if (
              this._media.style.display == "block" ||
              this._openedTypeId == dataType.id
            ) {
              var count = frame.getEntityCount();
              if (count > 0) {
                frame.style.display = "block";
              } else {
                frame.style.display = "none";
              }
            }
          });

          frame.setAttribute("media-id", this._mediaId);

          if (stateMediaIds) {
            frame.stateMediaIds = stateMediaIds;
          }

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
  }

  closeAll() {
    for (let key in this._entityPanels) {
      this._entityPanels[key]._closeAll();
    }
  }

  selectEntityOnUpdate(entityId, entityTypeId, immediate = false) {
    for (const typeId in this._entityPanels) {
      if (typeId == entityTypeId) {
        this._entityPanels[typeId].selectEntityOnUpdate(entityId, immediate);
      }
    }
  }

  set canvas(val) {
    this._canvas = val;
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
    this._openedTypeId = typeId;
    for (const key in this._framePanels) {
      if (key == typeId) {
        if (this._framePanels[key].getEntityCount() > 0) {
          this._framePanels[key].style.display = "block";
        } else {
          this._framePanels[key].style.display = "none";
        }
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
    for (const typeId in this._entityPanels) {
      this._entityPanels[typeId].frameChange(frame);
    }
  }

  selectLocalizationFromTrack(track, frame) {
    for (const dataTypeId in this._data._dataTypes) {
      const dataType = this._data._dataTypes[dataTypeId];
      if (!dataType.isTrack) {
        const data = this._data._dataByType.get(dataTypeId);

        // Note: This is a candidate for optimization in the future.
        for (const loc of data) {
          if (track.localizations.includes(loc.id)) {
            if (loc.frame == frame) {
              this.selectEntity(loc, true, true);
            }
          }
        }
      }
    }
  }

  /**
   *
   * @param {Object} obj
   * @param {bool} forceOpen
   * @param {bool} forceLocalization - only valid if forceOpen is true
   */
  selectEntity(obj, forceOpen = false, forceLocalization = false) {
    var typeId = obj.type;
    var objDataType = this._data._dataTypes[typeId];
    var selectObj = obj;

    // Find the associated track if the given object is a localization
    var associatedState = null;
    if (objDataType.isLocalization && this._data._trackDb.has(obj.id)) {
      associatedState = this._data._trackDb.get(obj.id);
    }

    // This variable can be changed in the future if there's a project setting to
    // force a default behavior when selecting a track
    var selectTrackInstead = !forceLocalization;
    if (!forceOpen) {
      // If the user has a state panel open and a track's localization was selected,
      // the panel should not be changed. It should stay on the state panel.
      //
      // If the user has the localization panel open and a track was selected,
      // the panel should not be changed. It should stay on the localization panel.
      for (const key in this._entityPanels) {
        const panel = this._entityPanels[key];
        const dataType = this._data._dataTypes[key];
        if (
          dataType.isTrack &&
          panel.style.display == "block" &&
          associatedState != null
        ) {
          typeId = associatedState.type;
          selectObj = associatedState;
          selectTrackInstead = false;
          break;
        } else if (
          dataType.isLocalization &&
          panel.style.display == "block" &&
          associatedState != null
        ) {
          selectTrackInstead = false;
          break;
        }
      }
    }

    if (selectTrackInstead && associatedState != null) {
      typeId = associatedState.type;
      selectObj = associatedState;
    }

    this._openForTypeId(typeId);
    if (typeId in this._entityPanels) {
      this._entityPanels[typeId].selectEntity(selectObj);
    } else {
      console.warn("No entity browser for object.");
    }
  }

  deleteSelectedEntity() {
    for (const typeName in this._entityPanels) {
      if (this._entityPanels[typeName].style.display == "block") {
        this._entityPanels[typeName].deleteEntity();
      }
    }
  }

  /**
   * @param {Object} evt
   *    event emitted from annotation-data "freshData"
   */
  updateData(evt) {
    for (const dataTypeId in this._entityPanels) {
      this._entityPanels[dataTypeId].updateData(evt);
    }
  }
}

customElements.define("annotation-browser", AnnotationBrowser);
