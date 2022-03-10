import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class PointButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-point");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Point (P)";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M27.2 10c-1.867 0-3.333-1.467-3.333-3.333s1.467-3.333 3.333-3.333 3.333 1.467 3.333 3.333-1.467 3.333-3.333 3.333zM27.2 4.667c-1.067 0-2 0.933-2 2s0.933 2 2 2 2-0.933 2-2-0.933-2-2-2zM16.933 28.667c-0.020 0.001-0.044 0.002-0.068 0.002-0.415 0-0.781-0.211-0.996-0.531l-0.003-0.004c-1.733-1.733-4.267-4.533-5.067-5.333h-0.133l-7.467 0.133c-0.667 0-1.2-0.4-1.467-0.933s-0.133-1.2 0.267-1.733l13.867-13.867c0.4-0.4 1.067-0.533 1.733-0.4 0.533 0.267 0.933 0.8 0.933 1.467v19.6c0 0.667-0.4 1.2-0.933 1.467-0.267 0.133-0.533 0.133-0.667 0.133zM10.533 21.467c0.4 0 0.8 0.133 1.067 0.4 0.8 0.8 3.467 3.6 5.067 5.333 0.133 0.133 0.133 0.133 0.267 0 0 0 0.133-0.133 0.133-0.267v-19.333c0-0.133-0.133-0.133-0.133-0.267h-0.267l-13.733 13.867c-0.133 0.133-0.133 0.133 0 0.267 0 0 0.133 0.133 0.267 0.133l7.333-0.133z");
    svg.appendChild(path);
  }

  static get observedAttributes() {
    return ["class", "disabled"];
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
      case "disabled":
        if (newValue === null) {
          this._button.removeAttribute("disabled");
        } else {
          this._button.setAttribute("disabled", "");
        }
        break;
    }
  }
}

customElements.define("point-button", PointButton);
