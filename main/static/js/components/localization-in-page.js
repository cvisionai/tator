class LocalizationInPage extends TatorElement {
    constructor(){
        super();


        const div = document.createElement("div");
        div.setAttribute("class", "d-flex flex-items-center");
        this._shadow.appendChild(div);

        this._versionButton = document.createElement("version-button");
        this._versionButton.setAttribute("class", "px-2");
        div.appendChild(this._versionButton);

        this._settings = document.createElement("annotation-settings");
        div.appendChild(this._settings);

        this._main = document.createElement("main");
        this._main.setAttribute("class", "d-flex");
        this._shadow.appendChild(this._main);

        this._versionDialog = document.createElement("version-dialog");
        this._main.appendChild(this._versionDialog);

        this._bookmarkDialog = document.createElement("name-dialog");
        this._main.appendChild(this._bookmarkDialog);

        this._sidebar = document.createElement("annotation-sidebar");
        this._main.appendChild(this._sidebar);

        this._undo = document.createElement("undo-buffer");

        this._data = document.createElement("annotation-data");

        this._browser = document.createElement("annotation-browser");
        this._browser.undoBuffer = this._undo;
        this._browser.annotationData = this._data;
        this._main.appendChild(this._browser);

        this._progressDialog = document.createElement("progress-dialog");
        this._main.appendChild(this._progressDialog);

        this._progressDialog.addEventListener("close", evt => {
        this.removeAttribute("has-open-modal", "");
        this._progressDialog.removeAttribute("is-open", "");
        });

        // window.addEventListener("error", (evt) => {
        // this._loading.style.display = "none";
        // window.alert("System error detected");
        // Utilities.warningAlert("System error detected","#ff3e1d", true);
        // });
    }

    _init({ annotationObject,
        panelContainer }){
        
        this.annotationObject = annotationObject;
        this.panelContainer = panelContainer;

        let type_data = this.annotationObject.mediaTypeData;
        this._browserMediaType = type_data;
        this._undoMediaType = type_data;

        console.log(`Project ID: ${type_data.project}`);
        this.projectId = type_data.project;

        let data = this.annotationObject.mediaTypeInfo;
        
        let player;
        this._mediaIds = [];
        this._numberOfMedia = 1;
        this._mediaDataCount = 0;

        if (type_data.dtype == "video") {
            player = document.createElement("annotation-player");
            this._player = player;
            this._player.mediaType = type_data;
            this.setDomParents();
            
            player.mediaInfo = data;
            this._setupInitHandlers(player);
            this._getMetadataTypes(player, player._video._canvas);
            this._player.canvas = player._video;
            // this._settings._capture.addEventListener(
            //     'captureFrame',
            //     (e) =>
            //       {
            //         player._video.captureFrame(e.detail.localizations);
            //       });
            } else if (type_data.dtype == "image" ){
              player = document.createElement("annotation-image");
              this._player = player;
              this._player.mediaType = type_data;
              //player.style.minWidth="70%";
              this.setDomParents();
              player.mediaInfo = data;
              //this._main.insertBefore(player, this._browser);
              this._setupInitHandlers(player);
              this._getMetadataTypes(player, player._image._canvas);
              this._player.canvas = player._image;
            //   this._settings._capture.addEventListener(
            //     'captureFrame',
            //     (e) =>
            //       {
            //         player._image.captureFrame(e.detail.localizations);
            //       });
        }
    }

    // setMediaTypeData(){
    //     // data from /MediaType/{id}
    //    return this._player.mediaType = this.annotationObject.mediaTypeData;
    // }

    // setMediaInfo(){
    //      // info from /Media/{id}
    //      return this._player.mediaInfo = this.annotationObject.mediaInfo;
    // }

    setDomParents(){
        // @param object like - "object": this._headerDiv
        //  @param alignTo like - "alignTo":  this._browser
        return this._player.addDomParent({ 
            object : this, 
            alignTo : this.panelContainer
        });
    }

    // Variation of _setupInitHandlers from annotation-page.js
    _setupInitHandlers(canvas) {
        this._canvas = canvas;
    
        const _removeLoading = () => {
          if (this._dataInitialized && this._canvasInitialized) {
            try
            {
              this._loading.style.display = "none";
              this.removeAttribute("has-open-modal");
              window.dispatchEvent(new Event("resize"));
            }
            catch(exception)
            {
              //pass
            }
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
    
    
        canvas.addEventListener("displayLoading", () => {
          // #TODO Revisit. has-open-modal is too aggressive
          //this.setAttribute("has-open-modal", "");
        });
        canvas.addEventListener("hideLoading", () => {
          // #TODO Revisit. has-open-modal is too aggressive
          //this.removeAttribute("has-open-modal");
        });
    
        canvas.addEventListener("playing", () => {
          this._settings.disableRateChange();
          this._settings.disableQualityChange();
        });
        canvas.addEventListener("paused", () => {
          this._settings.enableRateChange();
          this._settings.enableQualityChange();
        });
    
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
    
        this._settings._toggle_text.addEventListener("click", evt => {
          canvas.toggleTextOverlays(this._settings._toggle_text.get_toggle_status());
          canvas.refresh();
        })
    
        // this._settings.addEventListener("rateChange", evt => {
        //   if ("setRate" in canvas) {
        //     canvas.setRate(evt.detail.rate);
        //   }
        // });
    
        // this._settings.addEventListener("qualityChange", evt => {
        //   if ("setQuality" in canvas) {
        //     canvas.setQuality(evt.detail.quality);
        //   }
        // });
    
        // canvas.addEventListener("zoomChange", evt => {
        //   this._settings.setAttribute("zoom", evt.detail.zoom);
        // });
    
        // this._settings.addEventListener("zoomPlus", () => {
        //   if ("zoomPlus" in canvas) {
        //     canvas.zoomPlus();
        //   }
        // });
    
        // this._settings.addEventListener("zoomMinus", () => {
        //   if ("zoomMinus" in canvas) {
        //     canvas.zoomMinus();
        //   }
        // });
    
        this._versionDialog.addEventListener("close", evt => {
          this.removeAttribute("has-open-modal", "");
        });
    
        this._versionDialog.addEventListener("versionSelect", evt => {
          this._data.setVersion(evt.detail.version).then(() => {
            this._settings.setAttribute("version", evt.detail.version.id);
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
    
        // this._bookmarkDialog.addEventListener("close", evt => {
        //   if (this._bookmarkDialog._confirm) {
        //     const searchParams = new URLSearchParams(window.location.search);
        //     let uri = window.location.pathname;
        //     uri += "?" + this._settings._queryParams(searchParams).toString();
        //     const name = this._bookmarkDialog._input.value;
        //     fetch("/rest/Bookmarks/" + this.getAttribute("project-id"), {
        //       method: "POST",
        //       credentials: "same-origin",
        //       headers: {
        //         "X-CSRFToken": getCookie("csrftoken"),
        //         "Accept": "application/json",
        //         "Content-Type": "application/json"
        //       },
        //       body: JSON.stringify({
        //         name: name,
        //         uri: uri,
        //       }),
        //     });
        //   }
        //   this.removeAttribute("has-open-modal", "");
        // });
      }

    // Variation of _getMetadataTypes from annotation-page.js
    _getMetadataTypes(canvas, canvasElement, block_signals, subelement_id, update) {
        const projectId = this.projectId;
        //const projectId = Number(this.getAttribute("project-id"));
        let mediaId = Number(this.getAttribute("media-id"));
        if (subelement_id)
        {
          mediaId = subelement_id;
        }
        const query = "?media_id=" + mediaId;
        const favoritePromise = fetch("/rest/Favorites/" + projectId, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        });
        const versionPromise = fetch("/rest/Versions/" + projectId + "?media_id=" + mediaId, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        });
        const membershipPromise = fetch(`/rest/Memberships/${projectId}`, {
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
          favoritePromise,
          membershipPromise,
        ])
        .then(([localizationResponse, stateResponse, versionResponse, favoriteResponse,
                membershipResponse]) => {
          const localizationData = localizationResponse.json();
          const stateData = stateResponse.json();
          const versionData = versionResponse.json();
          const favoriteData = favoriteResponse.json();
          const membershipData = membershipResponse.json();
          Promise.all([localizationData, stateData, versionData, favoriteData, membershipData])
          .then(([localizationTypes, stateTypes, versions, favorites, memberships]) => {
            // Only display positive version numbers.
            versions = versions.filter(version => version.number >= 0);
    
            for (const version of versions) {
              this._versionLookup[version.id] = version;
            }
    
            // If there is a default version pick that one, otherwise use the first one.
            this._version == null;
            let default_version = versions[0].id;
            for (const membership of memberships) {
              if (membership.user == this.getAttribute("user-id")) {
                if (membership.default_version) {
                  default_version = membership.default_version;
                }
              }
            }
    
            // Finde the index of the default version.
            let selected_version_idx = 0;
            for (const [idx, version] of versions.entries()) {
              if (version.id == default_version) {
                this._version = this._versionLookup[default_version];
                selected_version_idx = idx;
              }
            }
    
            // Initialize version dialog.
            this._versionDialog.init(versions, selected_version_idx);
            if (versions.length == 0) {
              this._versionButton.style.display = "none";
            } else {
              this._versionButton.text = this._version.name;
            }
    
            var dataTypes = localizationTypes.concat(stateTypes)
    
            // Replace the data type IDs so they are guaranteed to be unique.
            for (let [idx,dataType] of dataTypes.entries()) {
              dataType.id = dataType.dtype + "_" + dataType.id;
              let isLocalization=false;
              let isTrack=false;
              let isTLState=false;
              if ("dtype" in dataType) {
                isLocalization = ["box", "line", "dot"].includes(dataType.dtype);
              }
              if ("association" in dataType) {
                isTrack = (dataType.association == "Localization");
              }
              if ("interpolation" in dataType) {
                isTLState = (dataType.interpolation == "latest");
              }
              dataType.isLocalization = isLocalization;
              dataType.isTrack = isTrack;
              dataType.isTLState = isTLState;
            }
            this._data.init(dataTypes, this._version, projectId, mediaId, update, !block_signals);
            this._data.addEventListener("freshData", evt => {
              if (this._newEntityId) {
                for (const elem of evt.detail.data) {
                  if (elem.id == this._newEntityId) {
                    this._browser.selectEntity(elem);
    
                    if (this._player.selectTimelineData) {
                      this._player.selectTimelineData(elem);
                    }
    
                    this._newEntityId = null;
                    break;
                  }
                }
              }
            });
            this._mediaDataCount += 1;
    
            // Pull the data / iniitliaze the app if we are using the multi-view player and
            // if all of the media has already registered their data types
            if (this._mediaDataCount == this._numberOfMedia && this._player.mediaType.dtype == "multi") {
              this._data.initialUpdate();
            }
    
            canvas.undoBuffer = this._undo;
            canvas.annotationData = this._data;
            const byType = localizationTypes.reduce((sec, obj) => {
              (sec[obj.dtype] = sec[obj.dtype] || []).push(obj);
              return sec;
            }, {});
    
            if (block_signals == true)
            {
              return;
            }
    
            // For states specifically, if we are using the multi-view, we will
            // create the state across all media
            var stateMediaIds;
            if (this._player.mediaType.dtype == "multi") {
              stateMediaIds = this._mediaIds;
            }
    
            this._browser.init(dataTypes, this._version, stateMediaIds, this._player.mediaType.dtype != "image");
    
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
    
              // Force selecting this new entity in the browser if a new object was created
              // when the data is retrieved (ie freshData event)
              if (evt.detail.method == "POST") {
                this._newEntityId = evt.detail.id;
              }
    
              this._data.updateTypeLocal(
                evt.detail.method,
                evt.detail.id,
                evt.detail.body,
                evt.detail.dataType,
              );
            });
            this._browser.addEventListener("select", evt => {
              if (evt.detail.byUser) {
                if (evt.detail.dataType.isLocalization) {
                  canvas.selectLocalization(evt.detail.data, false, false, !evt.detail.goToEntityFrame);
                } else if (evt.detail.dataType.isTrack) {
                  // select track takes care of frame jump
                  canvas.selectTrack(evt.detail.data, undefined, !evt.detail.goToEntityFrame);
                }
                else if ('frame' in evt.detail.data) {
                  if (evt.detail.goToEntityFrame) {
                    canvas.goToFrame(parseInt(evt.detail.data.frame));
                  }
                }
    
                if (this._player.selectTimelineData) {
                  this._player.selectTimelineData(evt.detail.data);
                }
    
                if (this._player.mediaType.dtype == "multi") {
                  if (evt.detail.goToEntityFrame) {
                    this._player.goToFrame(evt.detail.data.frame);
                  }
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
              save.init(projectId, mediaId, dataType, this._undo, this._version, favorites);
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
    
            for (const dataType of stateTypes) {
              const save = document.createElement("save-dialog");
              save.init(projectId, mediaId, dataType, this._undo, this._version, favorites);
              this._settings.setAttribute("version", this._version.id);
              this._main.appendChild(save);
              this._saves[dataType.id] = save;
    
              // For states specifically, if we are using the multi-view, we will
              // create the state across all media
              if (this._player.mediaType.dtype == "multi") {
                save.stateMediaIds = this._mediaIds;
              }
    
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
              const canvasPosition = evt.detail.canvasElement.getBoundingClientRect();
    
              // Get the save dialog for this type. It gets created
              // with a metamode flag that changes based on mode. If
              // it has been created once in a given meta mode, reuse
              // the attributes from previous runs.
              // (Fixes Pulse #324572460)
              var save = this._getSave(objDescription);
              // Because we can be annotating multiple media_ids, set the dialog save
              // to the id the draw event came from
              save._mediaId = evt.detail.mediaId;
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
    
            this._setupContextMenuDialogs(canvas, canvasElement, stateTypes);
    
            canvas.addEventListener("maximize", () => {
              this._browser.style.display = "none";
            });
    
            canvas.addEventListener("minimize", () => {
              this._browser.style.display = "block";
            });
          });
       });
      }

      /// Turn on or off ability to edit annotations
  async enableEditing(mask) {
    // Check state of lock button.
    let enable = this._settings._lock._pathLocked.style.display == "none";

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

customElements.define("localization-in-page", LocalizationInPage);