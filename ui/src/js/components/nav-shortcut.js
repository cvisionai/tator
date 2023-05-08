import { TatorElement } from "./tator-element.js";

export class NavShortcut extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between py-1 f2"
    );
    this._shadow.appendChild(this._div);

    this._text = document.createTextNode("");
    this._div.appendChild(this._text);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "nav__shortcut");
    this._div.appendChild(this._span);

    this._letter = document.createElement("span");
    this._letter.setAttribute(
      "class",
      "d-inline-flex flex-items-center flex-justify-center rounded-1 text-gray"
    );
    this._span.appendChild(this._letter);
  }

  static get observedAttributes() {
    return ["name", "letter", "modifier"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._text.nodeValue = newValue;
        break;
      case "letter":
        this._letter.textContent = newValue;
        break;
      case "modifier":
        const modifier = document.createElement("span");
        modifier.setAttribute(
          "class",
          "d-inline-flex flex-items-center flex-justify-center rounded-1 text-gray"
        );
        modifier.textContent = newValue;
        this._span.insertBefore(modifier, this._letter);
        break;
    }
  }
}

customElements.define("nav-shortcut", NavShortcut);
