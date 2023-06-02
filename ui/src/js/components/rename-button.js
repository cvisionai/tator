import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class RenameButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-edit");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M12 21h9c0.552 0 1-0.448 1-1s-0.448-1-1-1h-9c-0.552 0-1 0.448-1 1s0.448 1 1 1zM15.793 2.793l-12.5 12.5c-0.122 0.121-0.217 0.28-0.263 0.465l-1 4c-0.039 0.15-0.042 0.318 0 0.485 0.134 0.536 0.677 0.862 1.213 0.728l4-1c0.167-0.041 0.33-0.129 0.465-0.263l12.5-12.5c0.298-0.298 0.524-0.643 0.677-1.012 0.159-0.383 0.237-0.79 0.237-1.195s-0.079-0.813-0.237-1.195c-0.153-0.369-0.379-0.714-0.677-1.012s-0.643-0.524-1.012-0.677c-0.383-0.159-0.79-0.238-1.196-0.238s-0.813 0.079-1.195 0.237c-0.369 0.153-0.714 0.379-1.012 0.677zM17.207 4.207c0.109-0.109 0.232-0.189 0.363-0.243 0.136-0.057 0.283-0.085 0.43-0.085s0.294 0.029 0.43 0.085c0.131 0.054 0.254 0.135 0.363 0.243s0.189 0.232 0.243 0.363c0.057 0.136 0.085 0.283 0.085 0.43s-0.029 0.294-0.085 0.43c-0.054 0.131-0.135 0.254-0.243 0.363l-12.304 12.304-2.115 0.529 0.529-2.115z"
    );
    svg.appendChild(path);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "px-2");
    button.appendChild(this._span);

    button.addEventListener("click", () => {
      this.dispatchEvent(new Event("click"));
    });
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

customElements.define("rename-button", RenameButton);
