import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class ZoomControl extends TatorElement {
  constructor() {
    super();

    const zoomDiv = document.createElement("div");
    zoomDiv.setAttribute(
      "class",
      "annotation__setting d-flex flex-items-center px-1 rounded-1"
    );
    this._shadow.appendChild(zoomDiv);

    const minus = document.createElement("button");
    minus.setAttribute(
      "class",
      "btn-clear d-flex rounded-1 f2 text-gray hover-text-white"
    );
    zoomDiv.appendChild(minus);

    const minusSvg = document.createElementNS(svgNamespace, "svg");
    minusSvg.setAttribute("id", "icon-zoom-in");
    minusSvg.setAttribute("viewBox", "0 0 32 32");
    minusSvg.setAttribute("height", "1em");
    minusSvg.setAttribute("width", "1em");
    minus.appendChild(minusSvg);

    const minusTitle = document.createElementNS(svgNamespace, "title");
    minusTitle.textContent = "Zoom In";
    minusSvg.appendChild(minusTitle);
    const minusPath = document.createElementNS(svgNamespace, "path");
    minusPath.setAttribute(
      "d",
      "M21.388 21.141c-0.045 0.035-0.089 0.073-0.132 0.116s-0.080 0.085-0.116 0.132c-1.677 1.617-3.959 2.611-6.473 2.611-2.577 0-4.909-1.043-6.6-2.733s-2.733-4.023-2.733-6.6 1.043-4.909 2.733-6.6 4.023-2.733 6.6-2.733 4.909 1.043 6.6 2.733 2.733 4.023 2.733 6.6c0 2.515-0.993 4.796-2.612 6.475zM28.943 27.057l-4.9-4.9c1.641-2.053 2.624-4.657 2.624-7.491 0-3.313-1.344-6.315-3.515-8.485s-5.172-3.515-8.485-3.515-6.315 1.344-8.485 3.515-3.515 5.172-3.515 8.485 1.344 6.315 3.515 8.485 5.172 3.515 8.485 3.515c2.833 0 5.437-0.983 7.491-2.624l4.9 4.9c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885zM10.667 16h8c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-8c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333z"
    );
    minusSvg.appendChild(minusPath);

    this._zoom = document.createElement("span");
    this._zoom.textContent = "100%";
    zoomDiv.appendChild(this._zoom);

    const plus = document.createElement("button");
    plus.setAttribute(
      "class",
      "btn-clear d-flex rounded-1 f2 text-gray hover-text-white"
    );
    zoomDiv.appendChild(plus);

    const plusSvg = document.createElementNS(svgNamespace, "svg");
    plusSvg.setAttribute("id", "icon-zoom-out");
    plusSvg.setAttribute("viewBox", "0 0 32 32");
    plusSvg.setAttribute("height", "1em");
    plusSvg.setAttribute("width", "1em");
    plus.appendChild(plusSvg);

    const plusTitle = document.createElementNS(svgNamespace, "title");
    plusTitle.textContent = "Zoom Out";
    plusSvg.appendChild(plusTitle);

    const plusPath = document.createElementNS(svgNamespace, "path");
    plusPath.setAttribute(
      "d",
      "M21.388 21.141c-0.045 0.035-0.089 0.073-0.132 0.116s-0.080 0.085-0.116 0.132c-1.677 1.617-3.959 2.611-6.473 2.611-2.577 0-4.909-1.043-6.6-2.733s-2.733-4.023-2.733-6.6 1.043-4.909 2.733-6.6 4.023-2.733 6.6-2.733 4.909 1.043 6.6 2.733 2.733 4.023 2.733 6.6c0 2.515-0.993 4.796-2.612 6.475zM28.943 27.057l-4.9-4.9c1.641-2.053 2.624-4.657 2.624-7.491 0-3.313-1.344-6.315-3.515-8.485s-5.172-3.515-8.485-3.515-6.315 1.344-8.485 3.515-3.515 5.172-3.515 8.485 1.344 6.315 3.515 8.485 5.172 3.515 8.485 3.515c2.833 0 5.437-0.983 7.491-2.624l4.9 4.9c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885zM10.667 16h2.667v2.667c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333v-2.667h2.667c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-2.667v-2.667c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333v2.667h-2.667c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333z"
    );
    plusSvg.appendChild(plusPath);

    minus.addEventListener("click", () => {
      this.dispatchEvent(new Event("zoomMinus", { composed: true }));
    });

    plus.addEventListener("click", () => {
      if (this.getAttribute("zoom") < 1600) {
        this.dispatchEvent(new Event("zoomPlus", { composed: true }));
      }
    });
  }

  static get observedAttributes() {
    return ["zoom"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "zoom":
        this._zoom.textContent = newValue + "%";
    }
  }
}

customElements.define("zoom-control", ZoomControl);
