import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";
import { SvgDefinition } from "../svg-definitions/all-svg.js";

export class LocalizationGalleryButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    this._shadow.appendChild(this._button);

    const height = "1em";
    const width = "1em";
    const dashboardIcon = new SvgDefinition({
      iconName: "grid-icon",
      height,
      width,
    });
    this._button.appendChild(dashboardIcon);

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Localizations gallery";
    dashboardIcon.appendChild(this._title);

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

customElements.define(
  "localizations-gallery-button",
  LocalizationGalleryButton
);
