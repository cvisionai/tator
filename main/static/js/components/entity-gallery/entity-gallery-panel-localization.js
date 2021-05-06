class GalleryPanelLocalization extends TatorElement {
  constructor() {
    super();

    // @TODO
    this._main = document.createElement("main");
    this._undo = document.createElement("undo-buffer");
    this._data = document.createElement("annotation-data");
    this._versionLookup = {};

    // Create image canvas
    this._imageCanvas = document.createElement("annotation-image");
    this._imageCanvas._data = this._data;
    this._imageCanvas._undo = this._undo;
    this._shadow.appendChild(this._imageCanvas);

    // Create video canvas
    this._videoCanvas = document.createElement("annotation-player");
    this._videoCanvas._data = this._data;
    this._videoCanvas._undo = this._undo;
    this._shadow.appendChild(this._videoCanvas);

    // data
    this.panelData = document.createElement("annotation-panel-data");

    // Keep these inactive / out of sight until we have data
    this._imageCanvas.hidden = true;
    this._videoCanvas.hidden = true;

    // #TODO Might want to explore looking at disabling shorcuts within the annotator itself.
    //       Right now, it only responds to this shortcuts-disabled class.
    document.body.classList.add("shortcuts-disabled");

    //
    this.savedMediaData = {};
  }

  init({ pageModal, modelData, panelContainer }) {
    this.pageModal = pageModal;
    this.modelData = modelData;
    this.panelContainer = panelContainer;
    this.panelData.init(modelData);
  }

  initAndShowData({ cardObj }) {
    // Identitifier used to get the canvas' media data
    const mediaId = cardObj.mediaId;
    const locId = cardObj.id;
    this._localization = Object.assign({}, cardObj.localization);

    // @TODO optimize later - only init this the first time
    if (typeof this.savedMediaData[mediaId] !== "undefined" && this.savedMediaData[mediaId] !== null) {
      //  --> init the canvas from saved data
      let data = this.savedMediaData[mediaId];
      let dtype = this.savedMediaData[mediaId].mediaTypeData.dtype;

      this._setupCanvas({dtype, mediaId, locId, data});

    } else {
      // --> Get mediaData and save it to this card object
      this.panelData.getMediaData(mediaId).then((data) => {
        let dtype = data.mediaTypeData.dtype;
        this._setupCanvas({dtype, mediaId, locId, data});

        // save this data in local memory until we need it again
        this.savedMediaData[mediaId] = data;
      });
    }
  }

  _setupCanvas({dtype, mediaId, locId, data}) {
    this._player = (dtype == "image") ? this._setupImageCanvas() : this._setupVideoCanvas();
    this._player.addDomParent({
      "object": this.panelContainer,
      "alignTo": this._shadow
    });


    // provide media data to canvas
    this._player.mediaType = data.mediaTypeData;
    this._player.mediaInfo = data.mediaInfo;

    // init canvas @todo these need refinement
    this._setupInitHandlers(this._player, this._data, this._undo);
    this._getMetadataTypes(this._player, this._player[`_${dtype}`]._canvas, null, null, true, mediaId);
  }

  _setupImageCanvas() {
    this._shadow.removeChild(this._imageCanvas);
    this._imageCanvas = document.createElement("annotation-image");
    this._imageCanvas._data = this._data;
    this._imageCanvas._undo = this._undo;
    this._shadow.appendChild(this._imageCanvas);

    // Inits image-only canvas as player
    this._player = this._imageCanvas;

    // Setup image canvas
    this._imageCanvas.hidden = false;
    this._videoCanvas.hidden = true;

    return this._imageCanvas;
  }

  _setupVideoCanvas(mediaId, data) {
    this._shadow.removeChild(this._videoCanvas);
    this._videoCanvas = document.createElement("annotation-player");
    this._videoCanvas._controls.style.display = "none";
    this._videoCanvas._video.disableScrubBuffer();
    this._videoCanvas._data = this._data;
    this._videoCanvas._undo = this._undo;
    this._shadow.appendChild(this._videoCanvas);

    // Inits image-only canvas as player
    this._player = this._videoCanvas;

    this._imageCanvas.hidden = true;
    this._videoCanvas.hidden = false;

    return this._videoCanvas;
  }

  _popModalWithPlayer(e, modal = this.pageModal) {
    e.preventDefault();

    if (typeof modal == "undefined") this.pageModal = document.createElement("modal-dialog");

    // Title
    let text = document.createTextNode("test");
    this.pageModal._titleDiv.append(text);

    // Main Body
    this.pageModal._main.appendChild(this._shadow);

    // When we close modal, remove the player
    this.pageModal.addEventListener("close", this._removePlayer.bind(this));

    this.pageModal.setAttribute("is-open", "true")
  }

  _removePlayer() {
    // Clear this panel player and title from modal
    this.pageModal._titleDiv.innerHTML = "";
    this.pageModal._main.innerHTML = "";
  }

  /*
     * This is a method of annotation-page modified
     * to work for annotation-panel (localization-in-page @TODO update this name)
     * @TODO - may need to pass more data here in this case we have some and don't need to fetch?
    */
  _getMetadataTypes(
    canvas,
    canvasElement,
    block_signals,
    subelement_id,
    update,
    mediaId
  ) {
    const projectId = this.modelData._project;
    //let mediaId = Number(this.getAttribute("media-id"));
    if (subelement_id) {
      mediaId = subelement_id;
    }
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
            console.log("Localization Types");
            console.log(localizationTypes);

            var dataTypes = localizationTypes.concat(stateTypes)

            // Replace the data type IDs so they are guaranteed to be unique.
            for (let [idx, dataType] of dataTypes.entries()) {
              dataType.id = dataType.dtype + "_" + dataType.id;
              let isLocalization = false;
              let isTrack = false;
              let isTLState = false;
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


            // Get the version object associated with this localization
            versions = versions.filter(version => version.number >= 0);
            for (const version of versions) {
              this._versionLookup[version.id] = version;
            }

            let selected_version;
            for (const [idx, version] of versions.entries()) {
              if (version.id == this._localization.version) {
                selected_version = this._versionLookup[version.id];
              }
            }

            this._data.init(dataTypes, selected_version, projectId, mediaId, update, !block_signals);
            canvas.undoBuffer = this._undo;
            canvas.annotationData = this._data;

            // Annotation data acquires the localization slightly differently.
            // Retrieve the localization from this buffer because the annotator assumes
            // the localization is in that format.
            for (let locType of localizationTypes) {
              if (locType.id.split("_")[1] == this._localization.meta) {
                this._localization.meta = locType.id;
                break;
              }
            }
          });
      });
  }

  _setupInitHandlers(canvas, annotationData, undo) {
    this._canvas = canvas;
    this._data = annotationData;
    this._undo = undo;

    const _removeLoading = () => {
      if (this._dataInitialized && this._canvasInitialized) {
        try {
          this._loading.style.display = "none";
          this.removeAttribute("has-open-modal");
          window.dispatchEvent(new Event("resize"));
        }
        catch (exception) {
          //pass
        }
      }
    }

    this._data.addEventListener("initialized", () => {
      this._dataInitialized = true;
      _removeLoading();
    });

    canvas.addEventListener("displayLoading", () => {
      // #TODO Revisit. has-open-modal is too aggressive
      //this.setAttribute("has-open-modal", "");
    });
    canvas.addEventListener("hideLoading", () => {
      // #TODO Revisit. has-open-modal is too aggressive
      //this.removeAttribute("has-open-modal");
    });

    canvas.addEventListener("canvasReady", () => {
      this._canvasInitialized = true;
      _removeLoading();

      // #TODO ???? Is this the right spot??? Assumes the getMetaDataType is good
      canvas.selectLocalization(this._localization, true);
    });
  }



}
customElements.define("entity-gallery-panel-localization", GalleryPanelLocalization);