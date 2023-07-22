import { TatorElement } from "../tator-element.js";

export class LinkInput extends TatorElement {
  constructor() {
    super();

    this.label = document.createElement("label");
    this.label.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-1"
    );
    this._shadow.appendChild(this.label);

    this._labelText = document.createTextNode("");
    this.label.appendChild(this._labelText);

    this._link = document.createElement("a");
    this._link.setAttribute("target", "_blank");
    this._link.setAttribute("class", "col-8 text-underline text-purple");
    this.label.appendChild(this._link);
  }

  static get observedAttributes() {
    return ["label", "name", "href"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._labelText.nodeValue = newValue;
        break;
      case "href":
        this._link.setAttribute("href", newValue);
        this._link.textContent = newValue;
        break;
    }
  }
}

customElements.define("link-input", LinkInput);
