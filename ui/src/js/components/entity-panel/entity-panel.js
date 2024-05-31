import { TatorElement } from "../tator-element.js";

export class EntityGalleryPanel extends TatorElement {
  constructor() {
    super();

    // Panel
    this._main = document.createElement("div");
    this._main.setAttribute("class", "entity-panel px-3");
    // this._main.style.marginTop = "-20px"
    this._shadow.appendChild(this._main);

    // Entity Data heading
    this._entityHeading = document.createElement("h3");
    this._entityHeading.setAttribute("class", "py-3 text-semibold");
    this._entityHeading.hidden = true;
    this._main.appendChild(this._entityHeading);

    // Entity Data in Form
    this.entityData = document.createElement("entity-panel-form");
    this.entityData.hidden = true;
    this._main.appendChild(this.entityData);

    // State Data heading (if state)
    this._stateHeading = document.createElement("h3");
    this._stateHeading.setAttribute("class", "py-3 text-semibold");
    this._stateHeading.hidden = true;
    this._main.appendChild(this._stateHeading);

    // State Data in Form
    this.stateData = document.createElement("entity-panel-form");
    this.stateData.hidden = true;
    this._main.appendChild(this.stateData);

    // Go to frame icon button
    this.goToFrameButton = document.createElement("entity-frame-link-button");
    this.goToFrameButton.button.setAttribute("tooltip", "View In Annotator");
    this.goToFrameButton.button.setAttribute("target", "_blank");
    this.goToFrameButton.style.marginLeft = "8px";

    // #TODO Encapsulate this export class into a LocalizationGalleryPanel
    this._mediaHeading = document.createElement("h3");
    this._mediaHeading.setAttribute("class", "py-3 text-semibold");
    this._mediaHeading.style.margintop = "10px";
    this._main.appendChild(this._mediaHeading);

    const mediaSubHeading = document.createElement("h2");
    mediaSubHeading.setAttribute("class", "f2 text-gray py-2");
    mediaSubHeading.appendChild(document.createTextNode("View In Annotator"));
    mediaSubHeading.appendChild(this.goToFrameButton);
    this._main.appendChild(mediaSubHeading);

    this.mediaData = document.createElement("entity-panel-form");
    this.mediaData._attributes._frameWidget.style.display = "none";
    this.mediaData._attributes._versionWidget.style.display = "none";
    this._main.appendChild(this.mediaData);
  }

  set permission(val) {
    this.entityData.setAttribute("permission", val);
    this.stateData.setAttribute("permission", val);
    this.mediaData.setAttribute("permission", val);
  }

  /**
   * Updates both the entity and the media data with the given card object
   * @param {Object} cardObj
   */
  async init({ cardObj }) {
    this.setAttribute("selected-id", cardObj.id);
    this.cardObj = cardObj;
    console.log("Panel init with new id", this.cardObj);
    // Setup linkout and the entity data for panel here
    this._mediaLink = this.cardObj.mediaLink;
    //this._mediaLinkEl.setAttribute("href", this._mediaLink);
    this.goToFrameButton.button.setAttribute("href", this._mediaLink);

    // Init the forms with data
    if (
      !(
        this.cardObj.stateInfo &&
        this.cardObj.stateType &&
        this.cardObj.stateType == "Media"
      )
    ) {
      /* Panel heading with type name */
      this._entityHeading.innerHTML = this.cardObj.entityType.name;

      /* Unhide & Init panel form */
      this.showEntityData();
      this.entityData._init({
        data: this.cardObj,
        attributePanelData: this.cardObj.localization,
        associatedMedia: this.cardObj.mediaInfo.media,
        associatedMediaType: this.cardObj.mediaInfo.entityType,
        allowDelete: true,
      });
    }

    // Any card with state information
    if (this.cardObj.stateInfo) {
      /* Panel heading with type name */
      this._stateHeading.innerHTML = this.cardObj.stateInfo.entityType.name;

      /* Unhide & Init panel form */
      this.showStateData();
      this.stateData._init({
        data: this.cardObj.stateInfo,
        attributePanelData: this.cardObj.stateInfo.state,
      });
    }

    // Any card with media information
    if (this.cardObj.mediaInfo) {
      /* Panel heading with type name */
      this._mediaHeading.innerHTML = this.cardObj.mediaInfo.entityType.name;

      /* Init panel form */
      this.mediaData._init({
        data: this.cardObj.mediaInfo,
        attributePanelData: this.cardObj.mediaInfo.media,
      });
    }
  }

  // setImage(imageSource) {
  //   this._staticImage.setAttribute("src", imageSource);
  // }

  showStateData() {
    this._stateHeading.hidden = false;
    this.stateData.hidden = false;
  }

  showEntityData() {
    this._entityHeading.hidden = false;
    this.entityData.hidden = false;
  }

  setMediaData(cardObj) {
    this.cardObj = cardObj;
    this.mediaData.setValues(this.cardObj.mediaInfo);
  }
}

customElements.define("entity-gallery-panel", EntityGalleryPanel);
