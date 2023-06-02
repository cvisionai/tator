import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class SectionNext extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "files__next d-flex flex-items-center px-0 btn-clear text-uppercase text-purple hover-text-white"
    );

    const span = document.createElement("span");
    span.setAttribute("class", "px-2");
    span.textContent = "Next";
    this._button.appendChild(span);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "f1 icon-chevron-right");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M12.943 24.943l8-8c0.521-0.521 0.521-1.365 0-1.885l-8-8c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l7.057 7.057-7.057 7.057c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z"
    );
    svg.appendChild(path);
  }

  connectedCallback() {
    this._shadow.appendChild(this._button);
  }
}

customElements.define("section-next", SectionNext);
