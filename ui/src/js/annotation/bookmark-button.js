import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class BookmarkButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Create Bookmark";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z");
    svg.appendChild(path);
  }
}

customElements.define("bookmark-button", BookmarkButton);
