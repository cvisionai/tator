import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class NavClose extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "nav__close btn-clear d-flex px-0 h2 text-gray"
    );
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-x");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Close";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z"
    );
    svg.appendChild(path);

    this._button.addEventListener("click", () => {
      this.dispatchEvent(new Event("navClose", { composed: true }));
    });
  }
}

customElements.define("nav-close", NavClose);
