import { TatorElement } from "../components/tator-element.js";

export class AnnotationHeader extends TatorElement {
  constructor() {
    super();

    const header = document.createElement("header");
    header.setAttribute(
      "class",
      "annotation-subheader d-flex flex-items-center flex-justify-between mb-1"
    );
    this._shadow.appendChild(header);

    this._titleText = document.createElement("div");
    this._titleText.setAttribute(
      "class",
      "d-flex flex-row flex-items-center h3 text-white py-2 px-2"
    );
    this._titleText.style.margin = "auto";
    header.appendChild(this._titleText);

    this._otherText = document.createElement("div");
    this._otherText.setAttribute(
      "class",
      "d-flex flex-items-center f2 text-semibold text-gray mr-3"
    );
    header.appendChild(this._otherText);

    this._close = document.createElement("button");
    this._close.setAttribute(
      "class",
      "py-1 mx-3 d-flex flex-items-center f4 text-uppercase text-gray annotation-subheader-close btn-clear btn-border rounded-2"
    );
    this._close.setAttribute("title", "Exit Applet");
    this._close.innerHTML = `
      <div class="px-1">Exit</div>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
      <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    header.appendChild(this._close);

    this._close.addEventListener("click", () => {
      this._close.blur();
      this.dispatchEvent(new Event("close"));
    });
  }

  static get observedAttributes() {
    return ["title"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "title":
        this._titleText.textContent = newValue;
        break;
    }
  }

  set version(val) {
    this._version = val;
    this.updateOtherText();
  }

  set frame(val) {
    this._frame = val;
    this.updateOtherText();
  }

  updateOtherText() {
    this._otherText.innerHTML = `<div>Version: ${this._version?.name}</div><div class="ml-3">Frame: ${this._frame}</div>`;
  }
}

customElements.define("annotation-header", AnnotationHeader);
