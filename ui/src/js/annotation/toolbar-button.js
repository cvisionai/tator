import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

/// Generic toolbar button implementation
export class ToolbarButton extends TatorElement {
  constructor() {
    super();
  }

  init(titleText, svgPath, viewbox) {
    if (viewbox == undefined) {
      viewbox = "0 0 32 32";
    }
    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white"
    );
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-box");
    svg.setAttribute("viewBox", viewbox);
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = titleText;
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", svgPath);
    svg.appendChild(path);

    this._disabled = false;

    this.addEventListener("click", (evt) => {
      if (this._disabled) {
        evt.stopImmediatePropagation();
        return false;
      }
    });
  }

  initWithSvg(titleText, svgElement) {
    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white"
    );
    this._shadow.appendChild(this._button);

    this._button.appendChild(svgElement);
    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = titleText;
    svgElement.appendChild(title);
  }

  static get observedAttributes() {
    return ["class", "disabled"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "class":
        if (this.classList.contains("is-selected")) {
          this._button.classList.add("is-selected");
        } else {
          this._button.classList.remove("is-selected");
        }
        break;
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

/// Specific implementations built on svg + name
class EditButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Edit",
      "M6.476 6.476l16.379 6.824-6.511 2.211c-0.38 0.131-0.696 0.427-0.833 0.833l-2.211 6.511zM17.347 19.232l7.044 7.044c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885l-7.044-7.044 7.824-2.657c0.697-0.237 1.071-0.995 0.833-1.691-0.128-0.377-0.408-0.659-0.749-0.801l-22.627-9.427c-0.68-0.283-1.46 0.039-1.744 0.719-0.143 0.341-0.132 0.709 0 1.025l9.427 22.627c0.283 0.68 1.064 1.001 1.744 0.719 0.367-0.153 0.629-0.451 0.749-0.801z"
    );
  }
}

class BoxButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Box",
      "M28 24.133v-16.267c1.55-0.287 2.709-1.629 2.709-3.241 0-1.819-1.474-3.293-3.293-3.293-0.029 0-0.058 0-0.086 0.001l0.004-0c-1.733 0-3.067 1.333-3.333 2.933h-16c-0.267-1.6-1.6-2.933-3.333-2.933-1.803 0.031-3.252 1.499-3.252 3.306 0 1.571 1.095 2.886 2.563 3.223l0.022 0.004v16.133c-1.467 0.267-2.667 1.6-2.667 3.2 0 2 1.467 3.467 3.333 3.467 1.467 0 2.8-1.067 3.2-2.4h16.267c0.4 1.333 1.733 2.4 3.2 2.4 1.803-0.031 3.252-1.499 3.252-3.306 0-1.571-1.095-2.886-2.563-3.223l-0.022-0.004zM24 26.933h-16c-0.133-1.467-1.2-2.533-2.667-2.8v-16.267c1.2-0.267 2.133-1.2 2.533-2.4h16.267c0.4 1.2 1.333 2.133 2.533 2.4v16.133c-1.333 0.4-2.4 1.467-2.667 2.933zM27.333 2.667c1.067 0 2 0.933 2 2s-0.933 2-2 2-2-0.933-2-2 0.933-2 2-2zM2.667 4.667c0-1.067 0.933-2 2-2s2 0.933 2 2-0.933 2-2 2-2-0.933-2-2zM4.667 29.333c-1.067 0-2-0.933-2-2s0.933-2 2-2 2 0.933 2 2-0.933 2-2 2zM27.333 29.333c-1.067 0-2-0.933-2-2s0.933-2 2-2 2 0.933 2 2-0.933 2-2 2z"
    );
  }
}
class LineButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Line",
      "M27.333 1.333c-1.867 0-3.333 1.467-3.333 3.333 0 0.667 0.267 1.333 0.533 1.867l-18 18c-0.533-0.267-1.2-0.533-1.867-0.533-1.867 0-3.333 1.467-3.333 3.333s1.467 3.333 3.333 3.333 3.333-1.467 3.333-3.333c0-0.667-0.267-1.333-0.533-1.867l18-18c0.533 0.267 1.2 0.533 1.867 0.533 1.867 0 3.333-1.467 3.333-3.333s-1.467-3.333-3.333-3.333zM4.667 29.333c-1.067 0-2-0.933-2-2s0.933-2 2-2 2 0.933 2 2-0.933 2-2 2zM27.333 6.667c-1.067 0-2-0.933-2-2s0.933-2 2-2 2 0.933 2 2-0.933 2-2 2z"
    );
  }
}
class PointButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Point",
      "M27.2 10c-1.867 0-3.333-1.467-3.333-3.333s1.467-3.333 3.333-3.333 3.333 1.467 3.333 3.333-1.467 3.333-3.333 3.333zM27.2 4.667c-1.067 0-2 0.933-2 2s0.933 2 2 2 2-0.933 2-2-0.933-2-2-2zM16.933 28.667c-0.020 0.001-0.044 0.002-0.068 0.002-0.415 0-0.781-0.211-0.996-0.531l-0.003-0.004c-1.733-1.733-4.267-4.533-5.067-5.333h-0.133l-7.467 0.133c-0.667 0-1.2-0.4-1.467-0.933s-0.133-1.2 0.267-1.733l13.867-13.867c0.4-0.4 1.067-0.533 1.733-0.4 0.533 0.267 0.933 0.8 0.933 1.467v19.6c0 0.667-0.4 1.2-0.933 1.467-0.267 0.133-0.533 0.133-0.667 0.133zM10.533 21.467c0.4 0 0.8 0.133 1.067 0.4 0.8 0.8 3.467 3.6 5.067 5.333 0.133 0.133 0.133 0.133 0.267 0 0 0 0.133-0.133 0.133-0.267v-19.333c0-0.133-0.133-0.133-0.133-0.267h-0.267l-13.733 13.867c-0.133 0.133-0.133 0.133 0 0.267 0 0 0.133 0.133 0.267 0.133l7.333-0.133z"
    );
  }
}
class PolyButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Poly",
      "M39 0c-1.654 0-3 1.346-3 3 0 0.888 0.396 1.679 1.011 2.229l-8.8 14.031c-0.371-0.165-0.78-0.26-1.211-0.26-0.868 0-1.644 0.376-2.193 0.967l-9.073-5.745c0.168-0.374 0.266-0.786 0.266-1.222 0-1.654-1.346-3-3-3s-3 1.346-3 3c0 0.904 0.41 1.706 1.044 2.256l-6.895 10.975c-0.354-0.148-0.742-0.231-1.149-0.231-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3c0-0.888-0.395-1.678-1.010-2.228l6.904-10.99c0.343 0.138 0.715 0.218 1.106 0.218 0.859 0 1.629-0.367 2.176-0.947l9.078 5.748c-0.161 0.368-0.254 0.772-0.254 1.199 0 1.654 1.346 3 3 3s3-1.346 3-3c0-0.863-0.371-1.636-0.957-2.184l8.81-14.046c0.354 0.147 0.741 0.23 1.147 0.23 1.654 0 3-1.346 3-3s-1.346-3-3-3zM5 29c0 1.103-0.897 2-2 2s-2-0.897-2-2 0.897-2 2-2 2 0.897 2 2zM13 15c-1.103 0-2-0.897-2-2s0.897-2 2-2 2 0.897 2 2-0.897 2-2 2zM27 24c-1.103 0-2-0.897-2-2s0.897-2 2-2 2 0.897 2 2-0.897 2-2 2zM39 5c-1.103 0-2-0.897-2-2s0.897-2 2-2 2 0.897 2 2-0.897 2-2 2z",
      "0 0 42 32"
    );
  }
}
class TrackButton extends ToolbarButton {
  constructor() {
    super();
    this.initWithSvg("Track", document.createElement("track-icon"));
  }
}
class ZoomInButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Zoom In",
      "M21.388 21.141c-0.045 0.035-0.089 0.073-0.132 0.116s-0.080 0.085-0.116 0.132c-1.677 1.617-3.959 2.611-6.473 2.611-2.577 0-4.909-1.043-6.6-2.733s-2.733-4.023-2.733-6.6 1.043-4.909 2.733-6.6 4.023-2.733 6.6-2.733 4.909 1.043 6.6 2.733 2.733 4.023 2.733 6.6c0 2.515-0.993 4.796-2.612 6.475zM28.943 27.057l-4.9-4.9c1.641-2.053 2.624-4.657 2.624-7.491 0-3.313-1.344-6.315-3.515-8.485s-5.172-3.515-8.485-3.515-6.315 1.344-8.485 3.515-3.515 5.172-3.515 8.485 1.344 6.315 3.515 8.485 5.172 3.515 8.485 3.515c2.833 0 5.437-0.983 7.491-2.624l4.9 4.9c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885zM10.667 16h2.667v2.667c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333v-2.667h2.667c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-2.667v-2.667c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333v2.667h-2.667c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333z"
    );
  }
}
class ZoomOutButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Zoom Out",
      "M21.388 21.141c-0.045 0.035-0.089 0.073-0.132 0.116s-0.080 0.085-0.116 0.132c-1.677 1.617-3.959 2.611-6.473 2.611-2.577 0-4.909-1.043-6.6-2.733s-2.733-4.023-2.733-6.6 1.043-4.909 2.733-6.6 4.023-2.733 6.6-2.733 4.909 1.043 6.6 2.733 2.733 4.023 2.733 6.6c0 2.515-0.993 4.796-2.612 6.475zM28.943 27.057l-4.9-4.9c1.641-2.053 2.624-4.657 2.624-7.491 0-3.313-1.344-6.315-3.515-8.485s-5.172-3.515-8.485-3.515-6.315 1.344-8.485 3.515-3.515 5.172-3.515 8.485 1.344 6.315 3.515 8.485 5.172 3.515 8.485 3.515c2.833 0 5.437-0.983 7.491-2.624l4.9 4.9c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885zM10.667 16h8c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-8c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333z"
    );
  }
}
class PanButton extends ToolbarButton {
  constructor() {
    super();
    this.init(
      "Pan",
      "M14.667 5.885v8.781h-8.781l1.724-1.724c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-4 4c-0.128 0.128-0.224 0.275-0.289 0.432-0.068 0.163-0.101 0.337-0.101 0.511 0 0.341 0.131 0.683 0.391 0.943l4 4c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885l-1.724-1.724h8.781v8.781l-1.724-1.724c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l4 4c0.128 0.128 0.275 0.224 0.432 0.289s0.329 0.101 0.511 0.101c0.173 0 0.348-0.033 0.511-0.101 0.157-0.065 0.304-0.161 0.432-0.289l4-4c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-1.724 1.724v-8.781h8.781l-1.724 1.724c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0l4-4c0.128-0.128 0.224-0.275 0.289-0.432 0.2-0.483 0.104-1.060-0.289-1.453l-4-4c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l1.724 1.724h-8.781v-8.781l1.724 1.724c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885l-4-4c-0.128-0.128-0.275-0.224-0.432-0.289s-0.329-0.101-0.511-0.101c-0.173 0-0.348 0.033-0.511 0.101-0.157 0.065-0.304 0.161-0.432 0.289l-4 4c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z"
    );
  }
}

customElements.define("toolbar-button", ToolbarButton);
customElements.define("edit-button", EditButton);
customElements.define("box-button", BoxButton);
customElements.define("line-button", LineButton);
customElements.define("point-button", PointButton);
customElements.define("poly-button", PolyButton);
customElements.define("track-button", TrackButton);
customElements.define("zoom-in-button", ZoomInButton);
customElements.define("zoom-out-button", ZoomOutButton);
customElements.define("pan-button", PanButton);
