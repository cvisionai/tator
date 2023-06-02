import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class SmallSVGButton extends TatorElement {
  constructor() {
    super();
    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 f3 text-gray hover-text-white"
    );
    this._shadow.appendChild(button);
    this._button = button;

    this._svgDiv = document.createElement("div");
    this._svgDiv.setAttribute("class", "d-flex");
    this._svgDiv.style.margin = "auto";
    button.appendChild(this._svgDiv);

    this._title = document.createElementNS(svgNamespace, "title");
    this._svgDiv.appendChild(this._title);

    button.addEventListener("click", () => {
      button.blur();
    });
  }

  init(html, title, id) {
    this._svgDiv.innerHTML = html;
    this._title.textContent = title;
    this._svgDiv.id = id;
  }
}

customElements.define("small-svg-button", SmallSVGButton);
