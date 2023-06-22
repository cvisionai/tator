import { TatorElement } from "../tator-element.js";

export class SettingsNav extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("settings-nav-template").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Handlers
    this.navLinkContainer = this._shadow.getElementById("settings-nav--nav");
  }

  connectedCallback() {
    this.setupMap();
  }

  setupMap() {
    this.navByName = new Map();
    for (let child of this.navLinkContainer.children) {
      this.navByName.set(child.getAttribute("type"), child);
    }
  }
}

customElements.define("settings-nav", SettingsNav);
