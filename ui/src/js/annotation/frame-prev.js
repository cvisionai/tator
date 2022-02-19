import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class FramePrev extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute("class", "btn-clear d-flex px-2 f3 text-gray hover-text-white");
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-frame-previous");
    svg.setAttribute("viewBox", "0 0 38 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Previous Frame (\u{2190})";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M28.16 2.133v26.454c0 1.666-1.998 2.687-3.549 1.814l-23.502-13.227c-1.478-0.832-1.478-2.796 0-3.628l23.502-13.227c1.552-0.873 3.549 0.148 3.549 1.814z");
    svg.appendChild(path);

    const path1 = document.createElementNS(svgNamespace, "path");
    path1.setAttribute("d", "M35.84 0c1.414 0 2.56 1.146 2.56 2.56v25.6c0 1.414-1.146 2.56-2.56 2.56s-2.56-1.146-2.56-2.56v-25.6c0-1.414 1.146-2.56 2.56-2.56z");
    svg.appendChild(path1);
  }
}

customElements.define("frame-prev", FramePrev);
