import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class NavBack extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "nav__close btn-clear d-flex flex-items-center px-0 h2 text-gray"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-chevron-left");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Back";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M15.707 17.293l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-6 6c-0.391 0.391-0.391 1.024 0 1.414l6 6c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414z"
    );
    svg.appendChild(path);

    const span = document.createElement("span");
    span.setAttribute("class", "f3 text-uppercase");
    span.textContent = "Back";
    button.appendChild(span);
  }
}

customElements.define("nav-back", NavBack);
