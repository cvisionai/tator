import { TatorElement } from "../components/tator-element.js";

export class NewProject extends TatorElement {
  constructor() {
    super();

    const link = document.createElement("a");
    link.setAttribute(
      "class",
      "add-new d-flex flex-items-center px-4 text-gray rounded-2"
    );
    link.style.cursor = "pointer";
    this._shadow.appendChild(link);

    const span = document.createElement("span");
    span.setAttribute(
      "class",
      "add-new__icon d-flex flex-items-center flex-justify-center text-white circle"
    );
    span.textContent = "+";
    link.appendChild(span);

    const text = document.createElement("span");
    text.setAttribute("class", "px-3");
    text.textContent = "New Project";
    link.appendChild(text);
  }
}

customElements.define("new-project", NewProject);
