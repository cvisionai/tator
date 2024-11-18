import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class PermissionSettingsNavLink extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("settings-nav-link").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Template handles for page
    // Remove add button and sub items
    this._subNavGroup = this._shadow.getElementById("sub-nav");
    this._subNavGroup.removeChild(
      this._shadow.getElementById("sub-nav--section")
    );
    this._headingGroup = this._shadow.getElementById("sub-nav--heading-group");
    this._headingGroup.removeChild(
      this._shadow.getElementById("sub-nav--plus-link")
    );
    this._headingButton = this._shadow.getElementById(
      "sub-nav--heading-button"
    );
    this._headingIcon = this._shadow.getElementById("sub-nav--icon");
    this._subNavLabel = this._shadow.getElementById("sub-nav--label");
  }

  static get observedAttributes() {
    return ["type"];
  }

  attributeChangedCallback(prop, oldValue, newValue) {
    if (prop === "type") {
      this._type = newValue;
      this.setAttribute("id", `nav-for-${this._type}`);
      this._headingButton.setAttribute("type", this._type);
    }
  }

  connectedCallback() {
    this._headingGroup.addEventListener("click", this._goTo.bind(this));

    store.subscribe(
      (state) => state.selectedType,
      this.toggleHighlight.bind(this)
    );
  }

  /**
   *
   * @param {string} newSelection
   * @param {string} oldSelection
   */
  async toggleHighlight(newSelectedType, oldSelectedType) {
    const affectsMe =
      this._type == newSelectedType.typeName ||
      this._type == oldSelectedType.typeName;

    if (affectsMe) {
      if (
        oldSelectedType.typeName === this._type &&
        oldSelectedType.typeName !== newSelectedType.typeName
      ) {
        this.unhighlightHeading();
      } else {
        this.highlightHeading();
      }
    }
  }

  highlightHeading() {
    if (this._headingGroup) {
      this._headingGroup.setAttribute("selected", "true");
    } else {
      console.warn("No nav heading found to higlight in settings nav.");
    }
  }

  unhighlightHeading() {
    if (this._headingGroup) {
      this._headingGroup.setAttribute("selected", "false");
    }
  }

  _goTo() {
    window.location.hash = this._type + "-All";
  }
}

customElements.define(
  "permission-settings-nav-link",
  PermissionSettingsNavLink
);
