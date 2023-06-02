import { TatorElement } from "../tator-element.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import "../../annotation/attribute-panel.js";

export class EntityGalleryPanelForm extends TatorElement {
  constructor() {
    super();

    this._hookButtonDiv = document.createElement("div");
    this._hookButtonDiv.hidden = true;
    this._shadow.appendChild(this._hookButtonDiv);

    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);

    // #TODO This is a band-aid. We need to modify attribute-panel to not include
    // specific REST calls or utilize a modified form of the SettingsHelper
    this._attributes = document.createElement("attribute-panel");
    this._attributes.enableBuiltInAttributes = true;
    this._attributes.enableHiddenAttributes = true;
    this._attributes.permission = "View Only"; // start as view only - set to user permission on page
    this._div.appendChild(this._attributes);

    this._attributes.addEventListener(
      "change",
      this._emitChangedData.bind(this)
    );

    this._hooksPanel = document.createElement("div");
    this._hooksPanel.setAttribute("class", "col-12");
    this._hooksPanel.hidden = true;
    this._shadow.appendChild(this._hooksPanel);

    // On construction check for applets after everything else is init
    this.setupApplets();
  }

  static get observedAttributes() {
    return ["permission"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "permission":
        this._attributes.permission = newValue;
        break;
    }
  }

  /**
   * #TODO In the future, we might want to actually display multiple types (e.g. media + loc)
   * @param {object} data - cardData (add more info)
   * @param {Media/Localization} attributePanelData
   */
  _init({
    data,
    attributePanelData,
    associatedMedia,
    associatedMediaType,
    allowDelete = false,
  }) {
    if (associatedMedia && associatedMediaType) {
      this._attributes.setAssociatedMedia(associatedMedia, associatedMediaType);
    }

    if (data.entityType) data.entityType.isTrack = false;
    this._attributes.dataType = data.entityType;
    this._attributes.displaySlider(false);
    this._attributes.displayGoToTrack(false);
    this._attributes.displayGoToLocalization(false);

    this._data = data;

    if (attributePanelData.attributes !== null) {
      this._attributes.setValues(attributePanelData);
      this._attributes.style.display = "block";
    } else {
      console.warn("Missing attributes.", attributePanelData);
    }
  }

  async setupApplets() {
    try {
      const projectId = window.location.pathname.split("/")[1];
      const response = await fetchCredentials("/rest/Applets/" + projectId);
      const applets = await response.json();

      for (let applet of applets) {
        if (applet.categories.includes("gallery-panel-tools")) {
          const appletPanel = document.createElement(
            "tools-applet-gallery-panel"
          );
          appletPanel.saveApplet(applet, this);
        }
      }
    } catch (err) {
      console.warn("Applet could not be setup for entity form.", err);
    }
  }

  _emitChangedData() {
    var values = this._attributes.getValues();
    if (values !== null) {
      const detail = {
        detail: {
          id: this._data.id,
          values: values,
        },
      };
      this.dispatchEvent(new CustomEvent("save", detail));
    }
  }

  updateValues({ newValues }) {
    this._attributes.setValues(newValues);
  }

  setValues(data) {
    this._attributes.setValues(data);
  }

  /**
   * @param {*} panel panel to append to hooks panel div
   * @returns
   */
  addAppletPanel(panel) {
    this._hooksPanel.appendChild(panel);
  }
}

customElements.define("entity-panel-form", EntityGalleryPanelForm);
