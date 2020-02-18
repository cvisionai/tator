class AnnotationPage extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", "/static/images/loading.svg");
    this._shadow.appendChild(this._loading);

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
        fetch("/rest/EntityMedia/" + newValue, {
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

          fetch("/rest/EntityTypeMedia/" + data.meta, {
            method: "GET",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            }
          })
          .then((response) => response.json())
          .then(data => {
            this._browser.mediaType = data;
            this._undo.mediaType = data;
            this._player.mediaTypes = data['type'];
          });
          let player;
          if ("thumb_gif_url" in data) {
            player = document.createElement("annotation-player");
            this._player = player;
            player.addDomParent({"object": this._headerDiv,
                                 "alignTo":  this._browser});
            player.mediaInfo = data;
            this._main.insertBefore(player, this._browser);
            this._setupInitHandlers(player);
            this._getMetadataTypes(player, player._video._canvas);
            this._settings._capture.addEventListener(
              'captureFrame',
              (e) =>
                {
                  player._video.captureFrame(e.detail.localizations);
                });
          } else {
            player = document.createElement("annotation-image");
            this._player = player;
            player.style.minWidth="70%";
            player.addDomParent({"object": this._headerDiv,
                                 "alignTo":  this._browser});
            player.mediaInfo = data;
            this._main.insertBefore(player, this._browser);
            this._setupInitHandlers(player);
            this._getMetadataTypes(player, player._image._canvas);
            this._settings._capture.addEventListener(
              'captureFrame',
              (e) =>
                {
                  player._image.captureFrame(e.detail.localizations);
                });
          }
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
    const _handleQueryParams = () => {
      if (this._dataInitialized && this._canvasInitialized) {
        const searchParams = new URLSearchParams(window.location.search);
        const haveEntity = searchParams.has("selected_entity");
        const haveEntityType = searchParams.has("selected_entity_type");
        const haveType = searchParams.has("selected_type");
        const haveFrame = searchParams.has("frame");
        if (haveEntity && haveEntityType) {
          const typeId = Number(searchParams.get("selected_entity_type"));
          const entityId = Number(searchParams.get("selected_entity"));
          this._settings.setAttribute("entity-type", typeId);
          this._settings.setAttribute("entity-id", entityId);
          const data = this._data._dataByType.get(typeId);
          for (const elem of data) {
            if (elem.id == entityId) {
              this._browser.selectEntity(elem);
              break;
            }
          }
        }
        if (haveType) {
          const typeId = Number(searchParams.get("selected_type"));
          this._settings.setAttribute("type-id", typeId);
          this._browser._openForTypeId(typeId);
        }
        if (haveFrame) {
          const frame = Number(searchParams.get("frame"));
          canvas.goToFrame(frame);
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

    canvas.addEventListener("canvasReady", () => {
      this._canvasInitialized = true;
      _handleQueryParams();
      _removeLoading();
    });

    this._settings.addEventListener("rateChange", evt => {
      if ("setRate" in canvas) {
        canvas.setRate(evt.detail.rate);
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
      this._data.setVersion(evt.detail.version, evt.detail.edited);
      this._versionButton.text = evt.detail.version.name;
      this._version = evt.detail.version;
      for (const key in this._saves) {
        this._saves[key].version = this._version;
      }
      this.enableEditing(evt.detail.edited);
    });

    this._versionButton.addEventListener("click", () => {
      this._versionDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });
  }

  _getMetadataTypes(canvas, canvasElement) {
    const projectId = this.getAttribute("project-id");
    const mediaId = this.getAttribute("media-id");
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
      getMetadataType("EntityStateTypes"),
      versionPromise,
    ])
    .then(([localizationResponse, stateResponse, versionResponse]) => {
      const localizationData = localizationResponse.json();
      const stateData = stateResponse.json();
      const versionData = versionResponse.json();
      Promise.all([localizationData, stateData, versionData])
      .then(([localizationTypes, stateTypes, versions]) => {
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

        this._versionDialog.init(versions);
        this._version = versions[versions.length - 1];
        if (versions.length == 0) {
          this._versionButton.style.display = "none";
        } else {
          this._versionButton.text = this._version.name;
        }
        const dataTypes = localizationTypes.concat(stateTypes)
        this._data.init(dataTypes, this._version);
        this._browser.init(dataTypes, this._version);
        canvas.undoBuffer = this._undo;
        canvas.annotationData = this._data;
        const byType = localizationTypes.reduce((sec, obj) => {
          (sec[obj.type.dtype] = sec[obj.type.dtype] || []).push(obj);
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
                frame = parseInt(evt.detail.data.association.frame);
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
        this._saves = {};

        for (const dataType of localizationTypes) {
          const save = document.createElement("save-dialog");
          save.init(projectId, mediaId, dataType, this._undo, this._version);
          this._main.appendChild(save);
          this._saves[dataType.type.id] = save;

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
    const save = this._saves[objDescription.type.id];
    save.canvasPosition = canvasPosition;
    save.dragInfo = dragInfo;
    save.requestObj = requestObj;
    save.metaMode = metaMode;
    save.classList.add("is-open");
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");
  }

  _getSave(objDescription) {
    return this._saves[objDescription.type.id];
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

  enableEditing(enable) {
    let permission;
    if (enable) {
      // Set privileges to user's level.
      permission = this._permission;
    } else {
      // Turn off editing.
      permission = "View Only";
    }
    this._player.permission = permission;
    this._browser.permission = permission;
    this._sidebar.permission = permission;
  }
}

customElements.define("annotation-page", AnnotationPage);
