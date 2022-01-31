class ZoomInButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-zoom-in");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Zoom In (+)";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M21.388 21.141c-0.045 0.035-0.089 0.073-0.132 0.116s-0.080 0.085-0.116 0.132c-1.677 1.617-3.959 2.611-6.473 2.611-2.577 0-4.909-1.043-6.6-2.733s-2.733-4.023-2.733-6.6 1.043-4.909 2.733-6.6 4.023-2.733 6.6-2.733 4.909 1.043 6.6 2.733 2.733 4.023 2.733 6.6c0 2.515-0.993 4.796-2.612 6.475zM28.943 27.057l-4.9-4.9c1.641-2.053 2.624-4.657 2.624-7.491 0-3.313-1.344-6.315-3.515-8.485s-5.172-3.515-8.485-3.515-6.315 1.344-8.485 3.515-3.515 5.172-3.515 8.485 1.344 6.315 3.515 8.485 5.172 3.515 8.485 3.515c2.833 0 5.437-0.983 7.491-2.624l4.9 4.9c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885zM10.667 16h2.667v2.667c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333v-2.667h2.667c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-2.667v-2.667c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333v2.667h-2.667c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333z");
    svg.appendChild(path);
  }

  static get observedAttributes() {
    return ["class"];
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
    }
  }
}

customElements.define("zoom-in-button", ZoomInButton);
