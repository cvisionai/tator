class EntityGalleryPanel extends TatorElement {
    constructor() {
      super();

      // Panel Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "entity-panel px-3");
      this._main.style.marginTop = "-20px"
      this._shadow.appendChild(this._main);

      // Optional static image
      this._staticImage = document.createElement("img");
      this._staticImage.hidden = true;
      this._main.appendChild(this._staticImage);

      // View in media
      this._mediaLinkEl = document.createElement("a");
      this._mediaLinkEl.appendChild(document.createTextNode("View In Annotator"));
      this._mediaLinkEl.setAttribute("class", "text-gray hover-text-white f3 clickable float-right");
      this._mediaLinkEl.setAttribute("href", "#");
      this._mediaLinkEl.setAttribute("target", "_blank");
      this._main.appendChild(this._mediaLinkEl);            

      // Entity Data heading
      this.entityHeading = document.createElement("h3");
      this.entityHeading.setAttribute("class", "py-3 text-semibold");
      this.entityHeading.appendChild(document.createTextNode("Entity Data"));
      this.entityHeading.hidden = true;
      this._main.appendChild(this.entityHeading);

      // Entity Data in Form
      this.entityData = document.createElement("entity-gallery-panel-form");
      this.entityData.hidden = true;
      this._main.appendChild(this.entityData);

      // State Data heading (if state)
      this.stateHeading = document.createElement("h3");
      this.stateHeading.setAttribute("class", "py-3 text-semibold");
      this.stateHeading.appendChild(document.createTextNode("State Data"));
      this.stateHeading.hidden = true;
      this._main.appendChild(this.stateHeading);

      // State Data in Form
      this.stateData = document.createElement("entity-gallery-panel-form");
      this.stateData.hidden = true;
      this._main.appendChild(this.stateData);

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

  async init( {
    cardObj,
    includeStateData = false
  }){
    this.cardObj = cardObj;
  
    // Setup linkout and the entity data for panel here
    this._mediaLink = this.cardObj.mediaLink;
    this._mediaLinkEl.setAttribute("href", this._mediaLink );
    this.goToFrameButton.button.setAttribute("href", this._mediaLink);
    
    // Init the forms with data
    if (!this.cardObj.stateInfo) {
      // Show localization entity data
      this.showEntityData();
      this.entityData._init({
        data: this.cardObj, 
        attributePanelData: this.cardObj.localization, 
        associatedMedia: this.cardObj.mediaInfo.media
      });
    }

    // Any card with state information
    if(this.cardObj.stateInfo){
      this.showStateData();
      this.stateData._init({
        data: this.cardObj.stateInfo, 
        attributePanelData: this.cardObj.stateInfo.state, 
      });
    }  

    // Any card with media information
    if(this.cardObj.mediaInfo){
      this.mediaData._init({
        data: this.cardObj.mediaInfo, 
        attributePanelData: this.cardObj.mediaInfo.media
      });
    }
  }

  setImage(imageSource){
    this._staticImage.setAttribute("src", imageSource);
  }

  showStateData(){
    this.stateHeading.hidden = false;
    this.stateData.hidden = false;
  }

  showEntityData(){
    this.entityHeading.hidden = false;
    this.entityData.hidden = false;
  }

}

customElements.define("entity-gallery-panel", EntityGalleryPanel);