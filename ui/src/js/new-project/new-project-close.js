import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class NewProjectClose extends TatorElement {
  constructor() {
    super();

    const link = document.createElement("a");
    link.setAttribute("class", "new-project__action d-flex flex-column flex-items-center px-0 h2 text-gray hover-text-white");
    link.setAttribute("href", "/projects");
    this._shadow.appendChild(link);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "h1");
    svg.setAttribute("id", "icon-x");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    link.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Close";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z");
    svg.appendChild(path);

    const span = document.createElement("span")
    span.setAttribute("class", "f3");
    span.textContent = "ESC";
    link.appendChild(span);
  }
}

customElements.define("new-project-close", NewProjectClose);
