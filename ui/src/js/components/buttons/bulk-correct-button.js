import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";

export class BulkCorrectButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    this._button.appendChild(svg);

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Bulk edit";
    svg.appendChild(this._title);

    this._path1 = document.createElementNS(svgNamespace, "path");
    this._path1.setAttribute("d", "M12 20h9");
    svg.appendChild(this._path1);

    this._path2 = document.createElementNS(svgNamespace, "path");
    this._path2.setAttribute(
      "d",
      "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
    );
    svg.appendChild(this._path2);

    this._button.addEventListener("click", () => {
      this._button.classList.toggle("enabled");
    });

    this._span = document.createElement("span");
    this._span.setAttribute("class", "px-2");
    this._span.hidden = true;
    this._button.appendChild(this._span);
  }

  static get observedAttributes() {
    return ["text", "url", "name", "request"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "text":
        this._span.textContent = newValue;
        this._span.hidden = false;
        this._button.setAttribute(
          "class",
          "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
        );
        break;
      case "url":
        this._button.setAttribute("href", newValue);
        break;
      case "name":
        this._button.setAttribute("download", newValue);
        break;
    }
  }
}

customElements.define("bulk-correct-button", BulkCorrectButton);
