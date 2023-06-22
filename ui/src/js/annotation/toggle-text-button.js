import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class ToggleTextButton extends TatorElement {
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
    this._title.textContent = "Turn off text overlays";
    svg.appendChild(this._title);

    const shape1 = document.createElementNS(svgNamespace, "line");
    shape1.setAttribute("x1", "7");
    shape1.setAttribute("y1", "7");
    shape1.setAttribute("x2", "17");
    shape1.setAttribute("y2", "7");
    svg.appendChild(shape1);

    const shape2 = document.createElementNS(svgNamespace, "line");
    shape2.setAttribute("x1", "12");
    shape2.setAttribute("y1", "8");
    shape2.setAttribute("x2", "12");
    shape2.setAttribute("y2", "18");
    svg.appendChild(shape2);

    const shape3 = document.createElementNS(svgNamespace, "line");
    shape3.setAttribute("x1", "1");
    shape3.setAttribute("y1", "1");
    shape3.setAttribute("x2", "23");
    shape3.setAttribute("y2", "23");
    svg.appendChild(shape3);

    const shape4 = document.createElementNS(svgNamespace, "rect");
    shape4.setAttribute("x", "1");
    shape4.setAttribute("y", "1");
    shape4.setAttribute("width", "22");
    shape4.setAttribute("height", "22");
    shape4.setAttribute("rx", "2.18");
    shape4.setAttribute("ry", "2.18");
    shape4.setAttribute("stroke-width", "2");
    svg.appendChild(shape4);

    this.off_shapes = [];
    this.off_shapes.push(shape3);

    this.toggle = true;

    button.addEventListener("click", () => {
      if (this.current_state == "off") {
        this.toggle = true;
      } else {
        this.toggle = false;
      }
    });
  }

  set toggle(val) {
    if (val === true) {
      this.current_state = "on";
      this._title.textContent = "Turn off text overlays";
      for (let shape of this.off_shapes) {
        shape.style.display = "none";
      }
    } else {
      this.current_state = "off";
      this._title.textContent = "Turn on text overlays";
      for (let shape of this.off_shapes) {
        shape.style.display = "block";
      }
    }
  }

  get_toggle_status() {
    return this.current_state == "on";
  }
}

customElements.define("toggle-text-button", ToggleTextButton);
