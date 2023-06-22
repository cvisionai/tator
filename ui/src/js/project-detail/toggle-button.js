import { TatorElement } from "../components/tator-element.js";

export class ToggleButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    this._shadow.appendChild(button);
    this._span = document.createElement("span");
    this._span.setAttribute("class", "px-2");
    button.appendChild(this._span);
  }

  static get observedAttributes() {
    return ["text"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "text":
        this._span.textContent = newValue;
    }
  }
}

customElements.define("toggle-button", ToggleButton);
