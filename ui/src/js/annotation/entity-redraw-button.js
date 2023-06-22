import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class EntityRedrawButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex flex-justify-center px-2 py-2 rounded-2 f2 text-white entity__button"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Redraw";
    svg.appendChild(title);

    const path1 = document.createElementNS(svgNamespace, "path");
    path1.setAttribute("d", "M12 20h9");
    svg.appendChild(path1);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
    );
    svg.appendChild(path);
  }
}

customElements.define("entity-redraw-button", EntityRedrawButton);
