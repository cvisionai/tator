import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class EntityPrevButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex flex-justify-center px-2 py-2 rounded-2 f2 text-white entity__button"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Previous";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M20.943 23.057l-7.057-7.057 7.057-7.057c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-8 8c-0.521 0.521-0.521 1.365 0 1.885l8 8c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885z"
    );
    svg.appendChild(path);
  }
}

customElements.define("entity-prev-button", EntityPrevButton);
