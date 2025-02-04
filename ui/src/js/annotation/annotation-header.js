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
    this._close.style.height = "24px";
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
    this._otherText.innerHTML = `
    <div class="d-flex flex-items-center">
      <svg width="16" height="16" viewBox="0 0 24 24" class="no-fill mr-1" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
      </svg>
      <span class="text-white">${this._version?.name}</span>
    </div>
    <div class="d-flex flex-items-center ml-3">
      <svg width="16" height="16" viewBox="0 0 24 24" class="no-fill mr-1" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M8 4l0 16" /><path d="M16 4l0 16" /><path d="M4 8l4 0" /><path d="M4 16l4 0" /><path d="M4 12l16 0" /><path d="M16 8l4 0" /><path d="M16 16l4 0" />
      </svg>
      <span class="text-white">${this._frame}</span>
    </div>`;
  }
}

customElements.define("annotation-header", AnnotationHeader);
