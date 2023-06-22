import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class FastForwardButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute("class", "video__fast-forward btn-clear h3 text-white");
    this._shadow.appendChild(button);
    this._button = button;

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-fast-forward");
    svg.setAttribute("viewBox", "0 0 58 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Fast Forward";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M27.6 29.778v-27.556c0-1.736 1.986-2.799 3.529-1.889l23.369 13.778c1.469 0.866 1.469 2.913 0 3.779l-23.369 13.778c-1.543 0.91-3.529-0.154-3.529-1.889z"
    );
    svg.appendChild(path);

    const path1 = document.createElementNS(svgNamespace, "path");
    path1.setAttribute(
      "d",
      "M2 29.778v-27.556c0-1.736 1.986-2.799 3.529-1.889l23.369 13.778c1.469 0.866 1.469 2.913 0 3.779l-23.369 13.778c-1.543 0.91-3.529-0.154-3.529-1.889z"
    );
    svg.appendChild(path1);
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

customElements.define("fast-forward-button", FastForwardButton);
