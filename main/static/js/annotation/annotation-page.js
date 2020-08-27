class AnnotationPage extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", "/static/images/loading.svg");
    this._shadow.appendChild(this._loading);
    this._versionLookup = {};

    document.body.setAttribute("class", "no-padding-bottom");

    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-6 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);

    this._breadcrumbs = document.createElement("annotation-breadcrumbs");
    div.appendChild(this._breadcrumbs);

    this._versionButton = document.createElement("version-button");
    this._versionButton.setAttribute("class", "px-2");
    div.appendChild(this._versionButton);

    this._settings = document.createElement("annotation-settings");
    header.appendChild(this._settings);

    this._main = document.createElement("main");
    this._main.setAttribute("class", "d-flex");
    this._shadow.appendChild(this._main);

    this._versionDialog = document.createElement("version-dialog");
    this._main.appendChild(this._versionDialog);

    this._sidebar = document.createElement("annotation-sidebar");
    this._main.appendChild(this._sidebar);

    this._undo = document.createElement("undo-buffer");

    this._data = document.createElement("annotation-data");

    this._browser = document.createElement("annotation-browser");
    this._browser.undoBuffer = this._undo;
    this._browser.annotationData = this._data;
    this._main.appendChild(this._browser);
    this._versionEditable = true;
  }

  static get observedAttributes() {
    return ["project-name", "project-id", "media-id"].concat(TatorPage.observedAttributes);
  }

  connectedCallback() {
    this.setAttribute("has-open-modal", "");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-name":
        this._breadcrumbs.setAttribute("project-name", newValue);
        break;
      case "project-id":
        this._settings.setAttribute("project-id", newValue);
        this._undo.setAttribute("project-id", newValue);
        break;
      case "media-id":
        this._settings.setAttribute("media-id", newValue);
        fetch("/rest/Media/" + newValue, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        })
        .then(response => response.json())
        .then(data => {
          this._breadcrumbs.setAttribute("media-name", data.name);
          this._breadcrumbs.setAttribute("section-name", data.attributes.tator_user_sections);
          this._browser.mediaInfo = data;
          this._undo.mediaInfo = data;
          this._settings.mediaInfo = data;

          fetch("/rest/MediaType/" + data.meta, {
            method: "GET",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            }
          })
          .then((response) => response.json())
          .then(type_data => {
            this._browser.mediaType = type_data;
            this._undo.mediaType = type_data;
            let player;
            if (data.thumbnail_gif) {
              player = document.createElement("annotation-player");
              this._player = player;
              this._player.mediaType = type_data;
              player.addDomParent({"object": this._headerDiv,
                                   "alignTo":  this._browser});
              player.mediaInfo = data;
              this._main.insertBefore(player, this._browser);
              this._setupInitHandlers(player);
              this._getMetadataTypes(player, player._video._canvas);
              this._browser.canvas = player._video;
              this._settings._capture.addEventListener(
                'captureFrame',
                (e) =>
                  {
                    player._video.captureFrame(e.detail.localizations);
                  });
            } else {
              player = document.createElement("annotation-image");
              this._player = player;
              this._player.mediaType = type_data;
              player.style.minWidth="70%";
              player.addDomParent({"object": this._headerDiv,
                                   "alignTo":  this._browser});
              player.mediaInfo = data;
              this._main.insertBefore(player, this._browser);
              this._setupInitHandlers(player);
              this._getMetadataTypes(player, player._image._canvas);
              this._browser.canvas = player._image;
              this._settings._capture.addEventListener(
                'captureFrame',
                (e) =>
                  {
                    player._image.captureFrame(e.detail.localizations);
                  });
            }
          });
          fetch("/rest/Project/" + data.project, {
            method: "GET",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            }
          })
          .then(response => response.json())
          .then(data => {
            this._permission = data.permission;
            this.enableEditing(true);
          });

        })
        .catch(err => console.error("Failed to retrieve media data: " + err));
        break;
    }
  }

  _setupInitHandlers(canvas) {
    this._canvas = canvas;
    const _handleQueryParams = () => {
      if (this._dataInitialized && this._canvasInitialized) {
        const searchParams = new URLSearchParams(window.location.search);
        const haveEntity = searchParams.has("selected_entity");
        const haveEntityType = searchParams.has("selected_entity_type");
        const haveType = searchParams.has("selected_type");
        const haveFrame = searchParams.has("frame");
        const haveVersion = searchParams.has("version");
        const haveLock = searchParams.has("lock");
        const haveFillBoxes = searchParams.has("fill_boxes");
        if (haveEntity && haveEntityType) {
          const typeId = Number(searchParams.get("selected_entity_type"));
          const entityId = Number(searchParams.get("selected_entity"));
          this._settings.setAttribute("entity-type", typeId);
          this._settings.setAttribute("entity-id", entityId);
          for (const dtype of ['state', 'box', 'line', 'dot']) {
            let modifiedTypeId = dtype + "_" + typeId;
            if (this._data._dataByType.has(modifiedTypeId)) {
              const data = this._data._dataByType.get(modifiedTypeId);
              for (const elem of data) {
                if (elem.id == entityId) {
                  this._browser.selectEntity(elem);
                  break;
                }
              }
            }
          }
        } else if (haveType) {
          const typeId = Number(searchParams.get("selected_type"));
          this._settings.setAttribute("type-id", typeId);
          for (const dtype of ['state', 'box', 'line', 'dot']) {
            let modifiedTypeId = dtype + "_" + typeId;
            if (this._data._dataByType.has(modifiedTypeId)) {
              this._browser._openForTypeId(modifiedTypeId);
            }
          }
        }
        if (haveVersion)
        {
          let edited = true;
          let version_id = searchParams.get("version");
          if(searchParams.has("edited") && Number(searchParams.get("edited")) == 0)
          {
            edited = false;
          }
          let evt = {"detail": {"version": this._versionLookup[version_id], "edited": edited}};
          this._versionDialog._handleSelect(evt);
        }
        if (haveLock) {
          const lock = Number(searchParams.get("lock"));
          if (lock) {
            this._settings._lock.lock();
          }
        }
        if (haveFillBoxes) {
          const fill_boxes = Number(searchParams.get("fill_boxes"));
          if (fill_boxes) {
            this._settings._fill_boxes.fill();
          }
          else {
            this._settings._fill_boxes.unfill();
          }
          canvas.toggleBoxFills(this._settings._fill_boxes.get_fill_boxes_status());
        }
      }
    }

    const _removeLoading = () => {
      if (this._dataInitialized && this._canvasInitialized) {
        this._shadow.removeChild(this._loading);
        this.removeAttribute("has-open-modal");
        window.dispatchEvent(new Event("resize"));
      }
    }

    this._data.addEventListener("initialized", () => {
      this._dataInitialized = true;
      _handleQueryParams();
      _removeLoading();
    });


    let maskEdits = (evt) => {
      this.enableEditing(!evt.detail.enabled);
      console.info("Setting edit mask to " + evt.detail.enabled);
    };
    // Disable edits via the player + annotation browser
    // only during a network operation
    canvas.addEventListener("temporarilyMaskEdits", maskEdits);
    this._undo.addEventListener("temporarilyMaskEdits", maskEdits);

    canvas.addEventListener("canvasReady", () => {
      this._canvasInitialized = true;
      _handleQueryParams();
      _removeLoading();
    });

    this._settings._lock.addEventListener("click", evt=> {
      this.enableEditing(true);
    });

    this._settings._fill_boxes.addEventListener("click", evt => {
      canvas.toggleBoxFills(this._settings._fill_boxes.get_fill_boxes_status());
      canvas.refresh();
    })

    this._settings.addEventListener("rateChange", evt => {
      if ("setRate" in canvas) {
        canvas.setRate(evt.detail.rate);
      }
    });

    this._settings.addEventListener("qualityChange", evt => {
      if ("setQuality" in canvas) {
        canvas.setQuality(evt.detail.quality);
      }
    });

    canvas.addEventListener("zoomChange", evt => {
      this._settings.setAttribute("zoom", evt.detail.zoom);
    });

    this._settings.addEventListener("zoomPlus", () => {
      if ("zoomPlus" in canvas) {
        canvas.zoomPlus();
      }
    });

    this._settings.addEventListener("zoomMinus", () => {
      if ("zoomMinus" in canvas) {
        canvas.zoomMinus();
      }
    });

    this._versionDialog.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    this._versionDialog.addEventListener("versionSelect", evt => {
      this._versionEditable = evt.detail.edited;
      this._data.setVersion(evt.detail.version, evt.detail.edited).then(() => {
        this._settings.setAttribute("version", evt.detail.version.id);
        this._settings.setAttribute("edited", Number(evt.detail.edited));
        this._canvas.refresh();
      });
      this._browser.version = evt.detail.version;
      this._versionButton.text = evt.detail.version.name;
      this._version = evt.detail.version;
      for (const key in this._saves) {
        this._saves[key].version = this._version;
      }
      this.enableEditing();
    });

    this._versionButton.addEventListener("click", () => {
      this._versionDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });
  }

  _getMetadataTypes(canvas, canvasElement) {
    const projectId = Number(this.getAttribute("project-id"));
    const mediaId = Number(this.getAttribute("media-id"));
    const query = "?media_id=" + mediaId;
    const versionPromise = fetch("/rest/Versions/" + projectId + "?media_id=" + mediaId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const getMetadataType = endpoint => {
      const url = "/rest/" + endpoint + "/" + projectId + query;
      return fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });
    };
    Promise.all([
      getMetadataType("LocalizationTypes"),
      getMetadataType("StateTypes"),
      versionPromise,
    ])
    .then(([localizationResponse, stateResponse, versionResponse]) => {
      const localizationData = localizationResponse.json();
      const stateData = stateResponse.json();
      const versionData = versionResponse.json();
      Promise.all([localizationData, stateData, versionData])
      .then(([localizationTypes, stateTypes, versions]) => {
        for (let version of versions)
        {
          this._versionLookup[version['id']] = version;
        }
        // Skip version if number of annotations is zero and show_empty is false.
        const dispVersions = versions.filter(version => {
          return !(
            version.num_created == 0 &&
            version.num_modified == 0 &&
            version.show_empty == false
          );
        });
        if (dispVersions.length > 0) {
          versions = dispVersions;
        } else {
          versions = [versions[0]];
        }

        // If there is a version with the same name as the user
        // pick that one.
        this._version == null;
        let selected_version_idx = 0;
        for (let v of  versions)
        {
          if (v.name == this.getAttribute("username"))
          {
            this._version = v;
            break;
          }
          selected_version_idx++;
        }

        
        // TODO: Whats the right way to do a default here
        if (this._version == null)
        {
          this._version = versions[versions.length - 1];
          selected_version_idx = versions.length - 1;
        }
        this._versionDialog.init(versions, selected_version_idx);
        if (versions.length == 0) {
          this._versionButton.style.display = "none";
        } else {
          this._versionButton.text = this._version.name;
        }
        const dataTypes = localizationTypes.concat(stateTypes)
        // Replace the data type IDs so they are guaranteed to be unique.
        for (const dataType of dataTypes) {
          dataType.id = dataType.dtype + "_" + dataType.id;
        }
        this._data.init(dataTypes, this._version, projectId, mediaId);
        this._browser.init(dataTypes, this._version);
        canvas.undoBuffer = this._undo;
        canvas.annotationData = this._data;
        const byType = localizationTypes.reduce((sec, obj) => {
          (sec[obj.dtype] = sec[obj.dtype] || []).push(obj);
          return sec;
        }, {});
        this._sidebar.localizationTypes = byType;
        this._sidebar.addEventListener("default", evt => {
          this.clearMetaCaches();
          canvas.defaultMode();
        });
        this._sidebar.addEventListener("newMeta", evt => {
          this.clearMetaCaches();
          canvas.newMetadataItem(evt.detail.typeId, evt.detail.metaMode);
        });
        this._sidebar.addEventListener("zoomIn", evt => {
          canvas.zoomIn();
        });
        this._sidebar.addEventListener("zoomOut", evt => {
          canvas.zoomOut();
        });
        this._sidebar.addEventListener("pan", evt => {
          canvas.pan();
        });
        canvas.addEventListener("drawComplete", (evt) => {
          if (evt.detail.metaMode == false)
          {
            this._sidebar.selectDefault();
          }
          this._browser.blur();
        });
        canvas.addEventListener("frameChange", evt => {
          this._browser.frameChange(evt.detail.frame);
          this._settings.setAttribute("frame", evt.detail.frame);
        });
        canvas.addEventListener("select", evt => {
          this._browser.selectEntity(evt.detail);
          this._settings.setAttribute("entity-id", evt.detail.id);
          this._settings.setAttribute("entity-type", evt.detail.meta);
          this._settings.setAttribute("type-id", evt.detail.meta);
        });
        this._undo.addEventListener("update", evt => {
          this._data.updateTypeLocal(
            evt.detail.method,
            evt.detail.id,
            evt.detail.body,
            evt.detail.dataType,
          );
        });
        this._browser.addEventListener("select", evt => {
          if (evt.detail.byUser) {
            if ("goToFrame" in canvas) {
              let frame = undefined;
              if (evt.detail.dataType.isLocalization) {
                frame = parseInt(evt.detail.data.frame);
              } else if (evt.detail.dataType.isTrack) {
                frame = undefined;
              }
              else {
                frame = parseInt(evt.detail.data.frame);
              }
              // Only jump to a frame if it is known
              if (frame != undefined)
              {
                canvas.goToFrame(frame);
              }
            }
            if (evt.detail.dataType.isLocalization) {
              canvas.selectLocalization(evt.detail.data);
            } else if (evt.detail.dataType.isTrack) {
              // select track takes care of frame jump
              canvas.selectTrack(evt.detail.data);
            }
          }
          this._settings.setAttribute("entity-id", evt.detail.data.id);
          this._settings.setAttribute("entity-type", evt.detail.data.meta);
          this._settings.setAttribute("type-id", evt.detail.data.meta);
        });
        this._browser.addEventListener("capture", evt => {
          if ('_video' in canvas)
          {
            canvas._video.makeDownloadableLocalization(evt.detail.data);
          }
          else
          {
            canvas._image.makeDownloadableLocalization(evt.detail.data);
          }
        });
        this._browser.addEventListener("open", evt => {
          if ("drawTimeline" in canvas) {
            canvas.drawTimeline(evt.detail.typeId);
          }
          this._settings.setAttribute("type-id", evt.detail.typeId);
        });
        this._browser.addEventListener("close", evt => {
          this._settings.removeAttribute("type-id");
          
          // The canvas can either be the annotation player or image. The player is the only
          // annotation that has the concepts of tracks, so the following check is performed.
          if (typeof canvas.deselectTrack === "function") {
            canvas.deselectTrack();
          }
          canvas.selectNone();
        });
        this._browser.addEventListener("frameChange", evt => {
          if ('track' in evt.detail)
          {
            canvas.selectTrack(evt.detail.track, evt.detail.frame);
          }
          else
          {
            canvas.goToFrame(evt.detail.frame);
          }
        });
        this._browser.addEventListener("patchMeta", evt => {
          this.clearMetaCaches();
          canvas.newMetadataItem(evt.detail.typeId, false, evt.detail.obj);
        });
        this._saves = {};

        for (const dataType of localizationTypes) {
          const save = document.createElement("save-dialog");
          save.init(projectId, mediaId, dataType, this._undo, this._version);
          this._settings.setAttribute("version", this._version.id);
          this._main.appendChild(save);
          this._saves[dataType.id] = save;

          save.addEventListener("cancel", () => {
            this._closeModal(save);
            canvas.refresh();
          });

          save.addEventListener("save", () => {
            this._closeModal(save);
          });
        }

        canvas.addEventListener("create", evt => {
          const metaMode = evt.detail.metaMode;
          const objDescription = evt.detail.objDescription;
          const dragInfo = evt.detail.dragInfo;
          const requestObj = evt.detail.requestObj;
          const canvasPosition = canvasElement.getBoundingClientRect();

          // Get the save dialog for this type. It gets created
          // with a metamode flag that changes based on mode. If
          // it has been created once in a given meta mode, reuse
          // the attributes from previous runs.
          // (Fixes Pulse #324572460)
          var save = this._getSave(objDescription);
          if (metaMode && save.metaMode)
          {
            save.saveObject(requestObj, save.metaCache);
          }
          else
          {
            this._openModal(objDescription, dragInfo, canvasPosition,
                            requestObj,metaMode);
            this._makePreview(objDescription, dragInfo, canvasPosition);
          }
        });

        canvas.addEventListener("maximize", () => {
          this._browser.style.display = "none";
        });

        canvas.addEventListener("minimize", () => {
          this._browser.style.display = "block";
        });
      });
    });
  }

  _closeModal(save) {
    if (save.classList.contains("is-open"))
    {
      save.classList.remove("is-open");
      this.removeAttribute("has-open-modal");
      document.body.classList.remove("shortcuts-disabled");
      this._main.removeChild(this._preview);
    }
  }

  _openModal(objDescription, dragInfo, canvasPosition, requestObj, metaMode) {
    const save = this._saves[objDescription.id];
    save.canvasPosition = canvasPosition;
    save.dragInfo = dragInfo;
    save.requestObj = requestObj;
    save.metaMode = metaMode;
    save.classList.add("is-open");
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");
  }

  _getSave(objDescription) {
    return this._saves[objDescription.id];
  }

  clearMetaCaches() {
    Object.values(this._saves).forEach(save => {
      save.metaMode = false;
    });
  }

  _makePreview(objDescription, dragInfo, canvasPosition) {
    this._preview = document.createElement("div");
    this._preview.style.overflow = "hidden";
    this._preview.style.position = "absolute";
    const prevTop = Math.min(dragInfo.start.y, dragInfo.end.y);
    const prevLeft = Math.min(dragInfo.start.x, dragInfo.end.x);
    this._preview.style.top = (canvasPosition.top + prevTop) + "px";
    this._preview.style.left = (canvasPosition.left + prevLeft) + "px";
    this._preview.style.width = (Math.abs(dragInfo.start.x - dragInfo.end.x) - 6) + "px";
    this._preview.style.height = (Math.abs(dragInfo.start.y - dragInfo.end.y) - 6) + "px";
    this._preview.style.borderStyle = "solid";
    this._preview.style.borderWidth = "3px";
    this._preview.style.borderColor = "white";
    this._preview.style.zIndex = 2;
    this._main.appendChild(this._preview);

    const img = new Image();
    img.src = dragInfo.url;
    img.style.position = "absolute";
    img.style.top = -prevTop - 3 + "px";
    img.style.left = -prevLeft - 3 + "px";
    img.style.width = canvasPosition.width + "px";
    img.style.height = canvasPosition.height + "px";
    this._preview.appendChild(img);
  };

  /// Turn on or off ability to edit annotations
  async enableEditing(mask) {
    // Check state of lock button.
    let enable = this._settings._lock._pathLocked.style.display == "none";

    // Check if version is editable.
    enable &= this._versionEditable;

    // Check input.
    if (typeof mask !== "undefined") {
      enable &= mask;
    }

    let permission;
    if (enable) {
      // Set privileges to user's level.
      permission = this._permission;
    } else {
      // Turn off editing.
      permission = "View Only";
    }
    while ((typeof this._player == "undefined")
        || (typeof this._browser == "undefined")
        || (typeof this._sidebar == "undefined")) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this._player.permission = permission;
    this._browser.permission = permission;
    this._sidebar.permission = permission;
  }
}

customElements.define("annotation-page", AnnotationPage);
