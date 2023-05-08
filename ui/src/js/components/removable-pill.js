import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class RemovablePill extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "form-control input-sm d-flex flex-items-center rounded-1"
    );
    this._shadow.appendChild(div);
    this._div = div;

    this._name = document.createTextNode("");
    div.appendChild(this._name);

    const button = document.createElement("button");
    button.setAttribute("class", "btn-clear px-1 d-flex text-gray");
    div.appendChild(button);
    this._button = button;

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-x");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Close";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z"
    );
    svg.appendChild(path);

    this._id = null;

    button.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("removeId", {
          detail: { id: this._id },
        })
      );
    });
  }

  set removable(val) {
    if (val) {
      this._button.style.display = null;
    } else {
      this._button.style.display = "none";
    }
  }

  init(name, id) {
    this._name.nodeValue = name;
    this._id = id;
  }

  getId() {
    return this._id;
  }
}

customElements.define("removable-pill", RemovablePill);
