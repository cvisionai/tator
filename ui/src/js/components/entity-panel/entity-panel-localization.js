import { TatorElement } from "../tator-element.js";
import { AnnotationImage } from "../../annotation/annotation-image.js";
import { AnnotationData } from "../../annotation/annotation-data.js";
import { UndoBuffer } from "../../annotation/undo-buffer.js";

export class GalleryPanelLocalization extends TatorElement {
  constructor() {
    super();

    this._main = document.createElement("main");
    this._versionLookup = {};
    this.panelData = document.createElement("annotation-panel-data");
    this.savedMediaData = {};
    this._imageCanvas = document.createElement("annotation-image");
    this._player = this._imageCanvas;
    this._player.addDomParent({
      "object": this.panelContainer,
      "alignTo": this._shadow
    });
    this._shadow.appendChild(this._imageCanvas);
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

    // Make a copy since we will be modifying this for annotator object
    if (cardObj.localization != null) {
      this._localization = Object.assign({}, cardObj.localization);
    }
    else {
      this._localization = null;
    }

    if (typeof this.savedMediaData[mediaId] !== "undefined" && this.savedMediaData[mediaId] !== null) {
      //  --> init the canvas from saved data
      let mediaData = this.savedMediaData[mediaId];
      this._setupCanvas(mediaData);

    } else {
      // --> Get mediaData and save it to this card object
      this.panelData.getMediaData(mediaId).then((data) => {
        this._setupCanvas(data);
        // save this data in local memory until we need it again
        this.savedMediaData[mediaId] = data;
      });
    }
  }

  _setupCanvas(mediaData) {
    this._setupImageCanvas();
    this._getData(mediaData);
  }

  _clearExistingCanvas() {
    delete this._undo;
    delete this._data;
  }

  _setupImageCanvas() {

    this._clearExistingCanvas();

    this._undo = document.createElement("undo-buffer");
    this._data = document.createElement("annotation-data");
    this._imageCanvas.annotationData = this._data;
    this._imageCanvas.undoBuffer = this._undo;
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

  _getData(mediaData) {

    var dataTypes = [];
    var locTypes = this.modelData.getStoredLocalizationTypes();
    for (const locType of locTypes) {
      dataTypes.push(Object.assign({}, locType));
    }
    var versions = this.modelData.getStoredVersions();

    // Replace the data type IDs so they are guaranteed to be unique.
    for (let dataType of dataTypes) {
      dataType.id = dataType.dtype + "_" + dataType.id;
      dataType.isLocalization = true;
      dataType.isTrack = false;
      dataType.isTLState = false;
    }

    // Get the version object associated with this localization
    versions = versions.filter(version => version.number >= 0);
    for (const version of versions) {
      this._versionLookup[version.id] = version;
    }

    let selected_version = null;
    for (const version of versions) {
      if (this._localization != null && version.id == this._localization.version) {
        selected_version = this._versionLookup[version.id];
      }
    }
    if (selected_version == null) {
      for (const version of versions) {
        if (version.name == "Baseline") {
          selected_version = version;
          break;
        }
      }
    }

    // Annotation data acquires the localization slightly differently.
    // Retrieve the localization from this buffer because the annotator assumes
    // the localization is in that format.
    var locDataType;
    for (let dataType of dataTypes) {
      if (this._localization != null && dataType.id.split("_")[1] == this._localization.meta) {
        this._localization.meta = dataType.id;
        locDataType = dataType;
        break;
      }
    }

    this._data.init(dataTypes, selected_version, this.modelData.getProjectId(), mediaData.mediaInfo.id, false, false);
    if (mediaData.mediaTypeData.dtype == "video") {
      if (this._localization != null) {
        this._player.videoFrame = this._localization.frame;
      }
      else {
        this._player.videoFrame = 0;
      }
    }
    this._player.mediaInfo = mediaData.mediaInfo;

    this._player.addEventListener("canvasReady", () => {
        this._player.undoBuffer = this._undo;
        this._player.annotationData = this._data;

        if (this._localization != null) {
          this._data.updateTypeWithData(locDataType, this._localization)
          this._player.selectLocalization(this._localization);
        }
    });
  }
}
customElements.define("entity-panel-localization", GalleryPanelLocalization);
