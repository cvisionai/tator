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

    this._close = document.createElement("button");
    this._close.setAttribute(
      "class",
      "px-3 py-1 d-flex flex-items-center f4 text-uppercase text-gray annotation-subheader-close"
    );
    this._close.innerHTML = `
      <div class="px-1">Exit</div>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
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
}

customElements.define("annotation-header", AnnotationHeader);
