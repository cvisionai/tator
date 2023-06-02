import { TatorElement } from "../../components/tator-element.js";
import { svgNamespace } from "../../components/tator-element.js";

export class FileTypeButton extends TatorElement {
  constructor() {
    super();

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "annotation__breadcrumbs");
    this._shadow.appendChild(styleDiv);

    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-outline btn-small d-flex flex-grow");
    styleDiv.appendChild(button);

    const span = document.createElement("span");
    span.setAttribute("class", "d-flex flex-items-center");
    button.appendChild(span);

    this._icon = document.createElement("div");
    this._icon.style.margin = "auto";
    this._icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
    span.appendChild(this._icon);

    this._text = document.createElement("span");
    this._text.setAttribute("class", "px-2 text-white");
    this._text.textContent = "Not Initialized";
    span.appendChild(this._text);

    const chevron = document.createElementNS(svgNamespace, "svg");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("height", "1em");
    chevron.setAttribute("width", "1em");
    button.appendChild(chevron);

    const chevronPath = document.createElementNS(svgNamespace, "path");
    chevronPath.setAttribute(
      "d",
      "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z"
    );
    chevron.appendChild(chevronPath);
  }

  set text(val) {
    this._text.textContent = val;
  }

  get text() {
    return this._text.textContent;
  }
}

customElements.define("file-type-button", FileTypeButton);
