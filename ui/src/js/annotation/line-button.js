import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class LineButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-line");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Line (L)";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M27.333 1.333c-1.867 0-3.333 1.467-3.333 3.333 0 0.667 0.267 1.333 0.533 1.867l-18 18c-0.533-0.267-1.2-0.533-1.867-0.533-1.867 0-3.333 1.467-3.333 3.333s1.467 3.333 3.333 3.333 3.333-1.467 3.333-3.333c0-0.667-0.267-1.333-0.533-1.867l18-18c0.533 0.267 1.2 0.533 1.867 0.533 1.867 0 3.333-1.467 3.333-3.333s-1.467-3.333-3.333-3.333zM4.667 29.333c-1.067 0-2-0.933-2-2s0.933-2 2-2 2 0.933 2 2-0.933 2-2 2zM27.333 6.667c-1.067 0-2-0.933-2-2s0.933-2 2-2 2 0.933 2 2-0.933 2-2 2z");
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

customElements.define("line-button", LineButton);
