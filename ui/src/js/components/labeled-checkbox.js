import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class LabeledCheckbox extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-items-center py-3 f2");
    this._shadow.appendChild(label);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "checkbox");
    this._input.setAttribute("type", "checkbox");
    label.appendChild(this._input);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-check");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    label.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M19.293 5.293l-10.293 10.293-4.293-4.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5 5c0.391 0.391 1.024 0.391 1.414 0l11-11c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0z"
    );
    svg.appendChild(path);

    const span = document.createElement("span");
    span.setAttribute("class", "px-3");
    label.appendChild(span);

    this._text = document.createTextNode("");
    span.appendChild(this._text);

    this._input.addEventListener("change", (evt) => {
      const change = new Event("change");
      this.dispatchEvent(change);
    });
  }

  set checked(state) {
    this._input.checked = state;
  }

  get checked() {
    return this._input.checked;
  }

  static get observedAttributes() {
    return ["text"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "text":
        this._text.nodeValue = newValue;
    }
  }
}

customElements.define("labeled-checkbox", LabeledCheckbox);
