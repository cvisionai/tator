import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class ToolsAppletButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("style", "position:relative;");
    this._button.setAttribute(
      "class",
      "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white"
    );
    this._shadow.appendChild(this._button);

    this._svg = document.createElement("span");
    this._button.appendChild(this._svg);

    this._title = "";
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
