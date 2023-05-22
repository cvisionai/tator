import { TatorElement } from "../tator-element.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class GalleryPanelLocalization extends TatorElement {
  constructor() {
    super();

    this._panelImage = document.createElement("entity-panel-image");
    this._shadow.appendChild(this._panelImage);

    this.savedMediaData = new Map();
    this.savedImageSource = new Map();

    this._supportsAvif=false;

    // There is no browser API call for 'is format supported' for images like for video content
    /// This attempts to load a small AVIF file as a test
    this._avifCheckDone=false; //Sequence variable to allow for out of order execution.
    var avif_test = new Image();
    avif_test.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
    try
    {
      avif_test.decode().then(() =>
      {
        this._supportsAvif = true;
        this._avifCheckDone = true;
        if (this._mediaFiles)
        {
          this._loadFromMediaFiles();
        }
      }).catch(()=>
      {
        this._supportsAvif = false;
        this._avifCheckDone = true;
        if (this._mediaFiles)
        {
          this._loadFromMediaFiles();
        }
      }
      );
    }
    catch(e)
    {
      // Console doesn't supporot AVIF
    }
  }

  init({ pageModal, modelData, panelContainer }) {
    this.pageModal = pageModal;
    this.modelData = modelData;
    this.panelContainer = panelContainer;
  }

  async initAndShowData({ cardObj }) {
    // Identitifier used to get the canvas' media data
    const mediaId = cardObj.mediaId;
    let mediaData = null;
    let localizationData = null;

    // Make a copy since we will be modifying this for annotator object
    if (cardObj.localization != null) {
      localizationData = Object.assign({}, cardObj.localization);
    }
    
    if (this.savedMediaData.has(mediaId)) {
      //  --> init the canvas from saved data
      mediaData = this.savedMediaData.get(mediaId)
    } else {
      // --> Get mediaData and save it to this card object
      const resp = await fetchCredentials(`/rest/Media/${mediaId}?presigned=28800`);
      mediaData = await resp.json();

      // save this data in local memory until we need it again
      this.savedMediaData.set(mediaId, mediaData);
    }

    this._setupImage(mediaData, localizationData);
  }

  _clearImage() {
    this._panelImage.data = null;
  }

  async _setupImage(mediaData, localizationData) {
    this._clearImage();
    let imageSource = null;
    let drawColor = "rgb(64, 224, 208)";

    // Get mediaTypes
    let mediaType = null;
    for (let m of this.modelData._mediaTypes) {
      if (m.id == mediaData.type) {
        mediaType = m.dtype
      }
    }

    // Get localizationTypes
    let localizationType = null;
    for (let l of this.modelData._localizationTypes) {
      if (l.id == localizationData.type) {
        localizationType = l.dtype
        if (l.colorMap && l.colorMap.default) {
          drawColor = Array.isArray(l.colorMap.default) ? `rgb(${l.colorMap.default.join(", ")})` : l.colorMap.default
        }
      }
    }
    
    mediaData.typeName = mediaType;
    localizationData.typeName = localizationType;

    if (mediaData.typeName === "video" && !this.savedImageSource.has(localizationData.id)) {
      // get the frame
      const resp = await fetch(`/rest/GetFrame/${mediaData.id}?frames=${localizationData.frame}`);
      const sourceBlob = await resp.blob();
      imageSource = URL.createObjectURL(sourceBlob);
      this.savedImageSource.set(localizationData.id, imageSource);
    } else if (this.savedImageSource.has(localizationData.id)) {
      imageSource = this.savedImageSource.get(localizationData.id, imageSource); 
    } else {
      imageSource = this.getImageUrl(mediaData);
      this.savedImageSource.set(localizationData.id, imageSource);
    }

    const data = {
      mediaData,
      localizationData,
      imageSource,
      drawColor
    }

    this._panelImage.data = data;
  }

  getImageUrl(mediaData){
    // Discover all image files that we support
    let best_idx = 0;
    for (let idx = 0; idx < mediaData.media_files.image.length; idx++){
      if (mediaData.media_files.image[idx].mime == "image/avif" && this._supportsAvif == true){
        best_idx = idx;
        break;
      } else if (mediaData.media_files.image[idx].mime != "image/avif") {
        best_idx = idx;
      }
    }
    
    return mediaData.media_files.image[best_idx].path;
  }
}
customElements.define("entity-panel-localization", GalleryPanelLocalization);
