import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class ToolsAppletButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("style", "position:relative; z-index: 100;")
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    this._svg = document.createElement("span");
    this._button.appendChild(this._svg);

    this._title = "";

    // this._svg = document.createElementNS(svgNamespace, "svg");
    // this._svg.setAttribute("id", "icon-pan");
    // this._svg.setAttribute("viewBox", "0 0 32 32");
    // this._svg.setAttribute("height", "1em");
    // this._svg.setAttribute("width", "1em");
    // this._button.appendChild(this._svg);

    // this._title = document.createElementNS(svgNamespace, "title");
    // this._title.textContent = "";
    // this._svg.appendChild(this._title);

    // this._path = document.createElementNS(svgNamespace, "path");
    // this._path.setAttribute("d", "M14.667 5.885v8.781h-8.781l1.724-1.724c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-4 4c-0.128 0.128-0.224 0.275-0.289 0.432-0.068 0.163-0.101 0.337-0.101 0.511 0 0.341 0.131 0.683 0.391 0.943l4 4c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885l-1.724-1.724h8.781v8.781l-1.724-1.724c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l4 4c0.128 0.128 0.275 0.224 0.432 0.289s0.329 0.101 0.511 0.101c0.173 0 0.348-0.033 0.511-0.101 0.157-0.065 0.304-0.161 0.432-0.289l4-4c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-1.724 1.724v-8.781h8.781l-1.724 1.724c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0l4-4c0.128-0.128 0.224-0.275 0.289-0.432 0.2-0.483 0.104-1.060-0.289-1.453l-4-4c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l1.724 1.724h-8.781v-8.781l1.724 1.724c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885l-4-4c-0.128-0.128-0.275-0.224-0.432-0.289s-0.329-0.101-0.511-0.101c-0.173 0-0.348 0.033-0.511 0.101-0.157 0.065-0.304 0.161-0.432 0.289l-4 4c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z");
    // this._svg.appendChild(this._path);
  }

  static get observedAttributes() {
    return ["class"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "class":
        if (this.classList.contains("is-selected")) {
          this._button.classList.add("is-selected");
        } else {
          this._button.classList.remove("is-selected");
        }
        break;
    }
  }

  setIcon(svgHTML) {
    this._svg.innerHTML = svgHTML;
  }
}

customElements.define("tools-applet-button", ToolsAppletButton);
