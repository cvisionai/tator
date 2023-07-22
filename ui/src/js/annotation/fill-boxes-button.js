import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class FillBoxesButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    button.appendChild(svg);

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Unfill boxes";
    svg.appendChild(this._title);

    this._filled_elements = [];
    let path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M 1 1 L 1 17 L 17 17 L 17 1 Z");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("fill-opacity", "0.4");
    svg.appendChild(path);
    this._filled_elements.push(path);
    path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M 7 7 L 7 23 L 23 23 L 23 7 Z");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("fill-opacity", "0.4");
    svg.appendChild(path);
    this._filled_elements.push(path);

    this._unfilled_elements = [];
    path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M 1 1 L 1 17 L 17 17 L 17 1 Z");
    path.setAttribute("fill", "none");
    path.style.display = "none";
    svg.appendChild(path);
    this._unfilled_elements.push(path);
    path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M 7 7 L 7 23 L 23 23 L 23 7 Z");
    path.setAttribute("fill", "none");
    path.style.display = "none";
    svg.appendChild(path);
    this._unfilled_elements.push(path);

    this.current_state = "fill";

    button.addEventListener("click", () => {
      if (this.current_state == "fill") {
        this.unfill();
      } else {
        this.fill();
      }
    });
  }

  unfill() {
    this.current_state = "unfill";
    for (let path of this._unfilled_elements) {
      path.style.display = "block";
    }
    for (let path of this._filled_elements) {
      path.style.display = "none";
    }
    this._title.textContent = "Fill Boxes";
  }

  fill() {
    this.current_state = "fill";
    for (let path of this._unfilled_elements) {
      path.style.display = "none";
    }
    for (let path of this._filled_elements) {
      path.style.display = "block";
    }
    this._title.textContent = "Unfill Boxes";
  }

  get_fill_boxes_status() {
    return this.current_state == "fill";
  }
}

customElements.define("fill-boxes-button", FillBoxesButton);
