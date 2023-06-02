import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class FrameAdjustment extends TatorElement {
  constructor() {
    super();
  }
  init(id, titleText, path1Val, path2Val) {
    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 f3 text-gray hover-text-white"
    );
    this._button = button;
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", id);
    svg.setAttribute("viewBox", "0 0 38 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = titleText;
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", path1Val);
    svg.appendChild(path);

    const path1 = document.createElementNS(svgNamespace, "path");
    path1.setAttribute("d", path2Val);
    svg.appendChild(path1);

    this._disabled = false;
    this.addEventListener("click", (evt) => {
      if (this._disabled) {
        evt.stopImmediatePropagation();
        return false;
      }
    });
  }

  static get observedAttributes() {
    return ["disabled"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "disabled":
        if (newValue === null) {
          this._button.removeAttribute("disabled");
          this._disabled = false;
        } else {
          this._button.setAttribute("disabled", "");
          this._disabled = true;
        }
        break;
    }
  }
}

class FrameNext extends FrameAdjustment {
  constructor() {
    super();
    this.init(
      "icon-frame-next",
      "Next Frame (\u{2192})",
      "M10.24 29.867v-26.454c0-1.666 1.998-2.687 3.549-1.814l23.502 13.227c1.478 0.832 1.478 2.796 0 3.628l-23.502 13.227c-1.552 0.873-3.549-0.148-3.549-1.814z",
      "M2.56 32c-1.414 0-2.56-1.146-2.56-2.56v-25.6c0-1.414 1.146-2.56 2.56-2.56s2.56 1.146 2.56 2.56v25.6c0 1.414-1.146 2.56-2.56 2.56z"
    );
  }
}

class FramePrev extends FrameAdjustment {
  constructor() {
    super();
    this.init(
      "icon-frame-previous",
      "Previous Frame (\u{2190})",
      "M28.16 2.133v26.454c0 1.666-1.998 2.687-3.549 1.814l-23.502-13.227c-1.478-0.832-1.478-2.796 0-3.628l23.502-13.227c1.552-0.873 3.549 0.148 3.549 1.814z",
      "M35.84 0c1.414 0 2.56 1.146 2.56 2.56v25.6c0 1.414-1.146 2.56-2.56 2.56s-2.56-1.146-2.56-2.56v-25.6c0-1.414 1.146-2.56 2.56-2.56z"
    );
  }
}

customElements.define("frame-next", FrameNext);
customElements.define("frame-prev", FramePrev);
