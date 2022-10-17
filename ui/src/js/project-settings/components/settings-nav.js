import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class SettingsNav extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("settings-nav-template").content;
    this._shadow.appendChild(template.cloneNode(true));

    console.log("Add template content: settings-nav-template");

    // // Handlers
    // this.div = this._shadow.getElementById("settings-nav--div");
    this.navLinkContainer = this._shadow.getElementById("settings-nav--nav");
  }

  connectedCallback() {
    console.log("connectedCallback settings nav");
    this.setupMap();
    // store.subscribe(state => state.selection, this.showSelection.bind(this));
  }




  setupMap() {
    this.navByName = new Map();
    for (let child of this.navLinkContainer.children) {
      this.navByName.set(child.getAttribute("type"), child)
    }
  }

}

customElements.define("settings-nav", SettingsNav);
