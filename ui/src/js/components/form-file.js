import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class FormFile extends TatorElement {
  constructor() {
    super();

    const col = document.createElement("div");
    col.setAttribute("class", "d-flex flex-column py-2");
    this._shadow.appendChild(col);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "text-semibold py-3");
    col.appendChild(this._span);

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "d-flex flex-items-center py-1 position-relative"
    );
    col.appendChild(div);

    const label = document.createElement("label");
    label.setAttribute("class", "col-12");
    div.appendChild(label);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control col-12");
    this._input.setAttribute("readonly", "readonly");
    label.appendChild(this._input);

    const file = document.createElement("label");
    file.setAttribute("class", "d-flex flex-items-center select-in-input f2");
    div.appendChild(file);

    const span = document.createElement("span");
    span.setAttribute("class", "sr-only");
    file.appendChild(span);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-folder");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    file.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Browse";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
    );
    svg.appendChild(path);

    const browse = document.createElement("input");
    browse.setAttribute("class", "sr-only");
    browse.setAttribute("type", "file");
    file.appendChild(browse);

    browse.addEventListener("change", (evt) => {
      if (evt.target.files.length == 1) {
        this._input.value = evt.target.files[0].name;
      }
    });
  }

  static get observedAttributes() {
    return ["name", "placeholder"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._span.textContent = newValue;
        break;
      case "placeholder":
        this._input.setAttribute("placeholder", newValue);
        break;
    }
  }

  get file() {
    const val = null;
    if (evt.target.files.length == 1) {
      val = this._input.file;
    }
    return val;
  }
}

customElements.define("form-file", FormFile);
