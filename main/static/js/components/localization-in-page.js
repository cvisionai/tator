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
    this._mainCanvas = document.createElement("canvas");
    //this._mainCanvas = document.createElement("entity-panel-canvas");
    this._shadow.appendChild( this._mainCanvas );

    // // Create canvas 2
    // this._previewCanvas = document.createElement("entity-panel-canvas");
    // this._shadow.appendChild(this._previewCanvas);

    //
    this.savedData = {};
  }

  init({ pageModal }){
    this.pageModal = pageModal;
  }

  data(type, d) {
    this.setAttribute("media-id", d.mediaId)
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

  initAndShowData(){
    // @TODO optimize later - only init this the first time
    //if(typeof this.cardObj.mediaData !== "undefined" && this.cardObj.mediaData !== null){
      // Get mediaData and save it to this card object
      let mediaId = this.cardObj.mediaId;
      
      this.panelData.getMediaData( mediaId ).then((data) => {

        // Inits image-only canvas
        this._mainCanvas.mediaInfo = data.mediaInfo;

        this.savedData[mediaId] = data;

        // After init, or if this has already been defined return 
        return this._mainCanvas;
      });
      
  }

  _removePlayer(){
    // Clear this panel player and title from modal
    this.pageModal._titleDiv.innerHTML = "";
    this.pageModal._main.innerHTML = "";
  }

}
customElements.define("localization-in-page", LocalizationInPage);


// @TODO do I need to make another canvas handler?
// class EntityPanelCanvas extends AnnotationCanvas {

//   constructor() {
//     super();

//   }
// }
// customElements.define("entity-panel-canvas", EntityPanelCanvas);