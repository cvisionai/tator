  // The loc-in-page will be like annotation page in that...
  // - sets up an image or video canvas w/ loc drawn
  // - has listeners and tool controls
  // But, different because
  // - media data is provided not fetched here
  // - canvas is sized to a page, or modal sizing
  // - has limited tooling available
  // @TODO in progress

class LocalizationInPage extends TatorElement {
  constructor() {
    super();

    // Create canvas 1
    this._mainCanvas = document.createElement("image-canvas");
    this._shadow.appendChild( this._mainCanvas );

    // data
    this.panelData = document.createElement("annotation-panel-data");

    // Keep this inactive until we have data
    this._mainCanvas.hidden = true;

    //
    this.savedMediaData = {};
  }

  init({ pageModal, modelData }){
    this.pageModal = pageModal;
    this.panelData.init(modelData);
  }

  initAndShowData( {cardObj} ){
    // Identitifier used to get the canvas' media data
    let mediaId = cardObj.mediaId;

    // @TODO optimize later - only init this the first time
    // if(typeof this.savedMediaData[mediaId] !== "undefined" && this.savedMediaData[mediaId] !== null){
    //  --> init the canvas from saved data   
    // } else {
    // --> Get mediaData and save it to this card object

      //
      this.panelData.getMediaData( mediaId ).then((data) => {

        // Inits image-only canvas
        this._mainCanvas.mediaInfo = data.mediaInfo;

        // save this data in local memory until we need it again
        this.savedMediaData[mediaId] = data;
      });
    // }  
  }

  _popModalWithPlayer(e){
    e.preventDefault();

    // Title
    let text = document.createTextNode( "test" );
    this.pageModal._titleDiv.append(text);
    
    // Main Body
    this._initPlayer();
    this.pageModal._main.appendChild( this._mainCanvas );

    // When we close modal, remove the player
    this.pageModal.addEventListener("close", this._removePlayer.bind(this));

    this.pageModal.setAttribute("is-open", "true")      
  }

  _removePlayer(){
    // Clear this panel player and title from modal
    this.pageModal._titleDiv.innerHTML = "";
    this.pageModal._main.innerHTML = "";
  }

}
customElements.define("localization-in-page", LocalizationInPage);