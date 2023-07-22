import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";
import { GalleryPanelLocalization } from "./entity-panel-localization.js";

export class EntityGalleryPanelTop extends TatorElement {
  constructor() {
    super();

    // Panel top bar
    this._topBar = document.createElement("div");
    //this._topBar.setAttribute("class", "entity-panel--container--top-bar");
    this._shadow.appendChild(this._topBar);

    // topbar arrow
    this._topBarArrow = document.createElement("span");
    this._topBarArrow.setAttribute("class", "top-bar-arrow");
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "f2 icon-chevron-right");
    //svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "40px");
    svg.setAttribute("width", "40px");
    this._topBarArrow.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M12.943 24.943l8-8c0.521-0.521 0.521-1.365 0-1.885l-8-8c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l7.057 7.057-7.057 7.057c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z"
    );
    svg.appendChild(path);
    this._topBar.appendChild(this._topBarArrow);

    // Text box
    this._box = document.createElement("div");
    this._box.setAttribute("class", "px-3 pt-4");
    this._topBar.appendChild(this._box);

    // Panel name
    this._topBarH3 = document.createElement("h3");
    this._topBarH3.setAttribute(
      "class",
      "entity-panel--container--top-bar--h3 text-semibold h3 "
    );
    this._headingText = document.createElement("span");
    this._headingText.appendChild(document.createTextNode("No Selection."));
    this._topBarH3.appendChild(this._headingText);
    this._box.appendChild(this._topBarH3);

    // Panel ID
    this._topBarID = document.createElement("span");
    this._topBarID.setAttribute(
      "class",
      "entity-panel--container--top-bar--id text-normal text-gray h3 "
    );
    this._topBarH3.appendChild(this._topBarID);

    // Optional static image
    this._staticImage = document.createElement("img");
    this._staticImage.setAttribute("crossorigin", "anonymous");
    this._staticImage.hidden = true;
    this._box.appendChild(this._staticImage);

    /* Media Prev/Next and Go To Frame*/
    // Hidden until initialized
    this._navigation = document.createElement("entity-panel-navigation");
    this._navigation.classList.add("hidden");
    this._navigation.controls.marginTop = "-20px";
    this._box.appendChild(this._navigation);

    // If the panel is showing a localization default is true
    this.localizationType = true;

    /*
     * Create 1 panel, and init it / reuse it from card sending it cardObj data (currently done on card creation)
     */
    this._panel = document.createElement("entity-gallery-panel");
    this._panel.hidden = true;
    this._box.appendChild(this._panel);
  }

  static get observedAttributes() {
    return ["localization-type"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "localization-type":
        //console.log("Panel top setting for localizationType was "+oldValue+" is now: "+newValue)
        this.localizationType = newValue;
        break;
    }
  }

  init({
    pageModal,
    modelData,
    panelContainer,
    customContentHandler = false,
    isMediaSection = false,
    contents,
  }) {
    if (isMediaSection) {
      // no heading and no data handling within panel top
      this._headingText.innerHTML = "";
      this._staticImage.innerHTML = "";
      this._topBarArrow.classList.add("left");
      this.openHandler = customContentHandler;
      this._box.appendChild(contents);
    } else if (!customContentHandler) {
      if (this._locImage == undefined) {
        this._locImage = document.createElement("entity-panel-localization");
        this._box.insertBefore(this._locImage, this._staticImage);
      }
      this._locImage.init({ pageModal, modelData, panelContainer });
    } else {
      this.openHandler = customContentHandler;
    }
  }

  setImage(imageSource) {
    this._staticImage.setAttribute("src", imageSource);
    //this._staticImage.hidden = false;
  }

  openHandler(evtDetail, cardElements, cardIndexes) {
    if (this.localizationType) {
      this.locDataHandler(evtDetail);
    }
    this.headingHandler(evtDetail);
    this.panelDataHandler(evtDetail);
    this.navigationHandler(evtDetail, cardElements, cardIndexes);
  }

  navigationHandler(evtDetail, cardElements, cardIndexes) {
    if (this._navigation.getInit() && evtDetail.openFlag) {
      this._navigation.classList.remove("hidden");
      this._navigation.handle({
        cardElements,
        cardIndexes,
        cardObj: evtDetail.cardObj,
      });
    } else {
      this._navigation.classList.add("hidden");
    }
  }

  panelDataHandler(evtDetail) {
    if (evtDetail.openFlag) {
      this._panel.init({ cardObj: evtDetail.cardObj });
      this._panel.hidden = false;
    } else {
      this._panel.hidden = true;
    }
  }

  locDataHandler(evtDetail) {
    if (evtDetail.openFlag) {
      // We're opening the panel with new card click
      this._locImage.initAndShowData({ cardObj: evtDetail.cardObj });
      this._locImage.classList.remove("hidden");
    } else {
      this._locImage.classList.add("hidden");
    }
  }

  headingHandler(evtDetail) {
    // console.log("Heading handler");
    if (evtDetail.openFlag) {
      // We're opening the panel with new card click
      let cardObj = evtDetail.cardObj;
      /* Get panel name */
      let panelName = "";
      // Localization or Media Type name
      if (cardObj.stateInfo) {
        panelName = cardObj.stateInfo.entityType.name;
      } else {
        panelName = evtDetail.cardObj.entityType.name;
      }
      this._headingText.innerHTML = panelName;
      this._topBarID.innerHTML = ` | ID: ${evtDetail.cardObj.id}`;
    } else {
      this._headingText.innerHTML = `No selection.`;
      this._topBarID.innerHTML = ``;
    }
  }
}

customElements.define("entity-gallery-panel-top", EntityGalleryPanelTop);
