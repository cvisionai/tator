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
      this.goToFrameButton = document.createElement("entity-frame-link-button");
      this.goToFrameButton.button.setAttribute("tooltip", "View In Annotator");
      this.goToFrameButton.button.setAttribute("target", "_blank");
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

  /**
   * Updates both the entity and the media data with the given card object
   * @param {Object} cardObj
   */
  init(cardObj){
    this.cardObj = cardObj;

    // Setup linkout and the entity data for panel here
    this._mediaLink = this.cardObj.mediaLink;
    this._mediaLinkEl.setAttribute("href", this._mediaLink );
    this.goToFrameButton.button.setAttribute("href", this._mediaLink);

    this.entityData._init(this.cardObj, this.cardObj.localization, this.cardObj.mediaInfo.media);
    this.mediaData._init(this.cardObj.mediaInfo, this.cardObj.mediaInfo.media);
  }

  setMediaData(cardObj) {
    this.cardObj = cardObj;
    this.mediaData.setValues(this.cardObj.mediaInfo);
  }
}

customElements.define("entity-gallery-panel", EntityGalleryPanel);