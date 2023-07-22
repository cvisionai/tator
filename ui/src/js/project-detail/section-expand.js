import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class SectionExpand extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "files__expand d-flex flex-items-center px-0 btn-clear text-uppercase text-purple hover-text-white"
    );
    this._shadow.appendChild(this._button);

    this._span = document.createElement("span");
    this._button.appendChild(this._span);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-chevron-down");
    svg.setAttribute("class", "px-2 f1");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Expand";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M7.057 12.943l8 8c0.521 0.521 1.365 0.521 1.885 0l8-8c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-7.057 7.057-7.057-7.057c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885z"
    );
    svg.appendChild(path);
  }

  static get observedAttributes() {
    return ["num-files", "start", "stop", "is-expanded"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "num-files":
        this._updateText();
        break;
      case "start":
        this._updateText();
        break;
      case "stop":
        this._updateText();
        break;
      case "is-expanded":
        if (newValue === null) {
          this._button.classList.remove("is-expanded");
        } else {
          this._button.classList.add("is-expanded");
        }
        break;
    }
  }

  _updateText() {
    const hasNumFiles = this.hasAttribute("num-files");
    const hasStart = this.hasAttribute("start");
    const hasStop = this.hasAttribute("stop");
    if (hasNumFiles && hasStart && hasStop) {
      const numFiles = this.getAttribute("num-files");
      const start = this.getAttribute("start");
      const stop = this.getAttribute("stop");
      let flabel = " files";
      if (numFiles == 1) {
        flabel = " file";
      }
      this._span.textContent =
        "Showing " + start + " to " + stop + " of " + numFiles + flabel;
    }
  }
}

customElements.define("section-expand", SectionExpand);
