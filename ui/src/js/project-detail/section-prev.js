import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class SectionPrev extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "files__previous d-flex flex-items-center px-0 btn-clear text-uppercase text-purple hover-text-white"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "f1 icon-chevron-left");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M20.943 23.057l-7.057-7.057 7.057-7.057c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-8 8c-0.521 0.521-0.521 1.365 0 1.885l8 8c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885z"
    );
    svg.appendChild(path);

    const span = document.createElement("span");
    span.setAttribute("class", "px-2");
    span.textContent = "Previous";
    button.appendChild(span);
  }
}

customElements.define("section-prev", SectionPrev);
