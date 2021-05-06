class EntityGalleryPanel extends TatorElement {
    constructor() {
      super();

      // Panel Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "entity-panel px-3");
      this._main.style.marginTop = "-20px"
      this._shadow.appendChild(this._main);

      // View in media
      this._mediaLinkEl = document.createElement("a");
      this._mediaLinkEl.appendChild(document.createTextNode("View In Annotator"));
      this._mediaLinkEl.setAttribute("class", "text-gray hover-text-white f3 clickable float-right");
      this._mediaLinkEl.setAttribute("href", "#");
      this._mediaLinkEl.setAttribute("target", "_blank");
      this._main.appendChild(this._mediaLinkEl);            

      // Entity Data heading
      const entityHeading = document.createElement("h3");
      entityHeading.setAttribute("class", "py-3 text-semibold");
      entityHeading.appendChild(document.createTextNode("Entity Data"));
      this._main.appendChild(entityHeading);

      // Entity Data in Form
      this.entityData = document.createElement("entity-gallery-panel-form");
      this._main.appendChild(this.entityData);

      // Go to frame icon button
      this.goToFrameButton = document.createElement("entity-frame-button");
      this.goToFrameButton.button.setAttribute("class", "btn-clear px-2 py-2 rounded-2 f2 text-white entity__button");
      this.goToFrameButton.button.setAttribute("tooltip", "View In Annotator");
      this.goToFrameButton.setAttribute("target", "_blank");
      this.goToFrameButton.style.marginRight = "16px";

      // #TODO Encapsulate this class into a LocalizationGalleryPanel
      const mediaHeading = document.createElement("h3");
      mediaHeading.setAttribute("class", "py-3 text-semibold");
      mediaHeading.style.margintop = "10px";
      mediaHeading.appendChild(this.goToFrameButton);
      mediaHeading.appendChild(document.createTextNode("Associated Media"));
      this._main.appendChild(mediaHeading)
      
      this.mediaData = document.createElement("entity-gallery-panel-form");
      this._main.appendChild(this.mediaData);
    }

  async init( {
    cardObj
  }){
    this.cardObj = cardObj;
  
    // Setup linkout and the entity data for panel here
    this._mediaLink = this.cardObj.mediaLink;
    this._mediaLinkEl.setAttribute("href", this._mediaLink );
    this.goToFrameButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.open(this._mediaLink);
    });
    
    // Init the forms with data
    this.entityData._init(this.cardObj);
    this.mediaData._init(this.cardObj.mediaInfo);
  }

}

customElements.define("entity-gallery-panel", EntityGalleryPanel);