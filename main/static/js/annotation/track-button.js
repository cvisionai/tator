class TrackButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-track");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Track (T)";
    svg.appendChild(title);

    const rect = document.createElementNS(svgNamespace, "rect");
    rect.setAttribute("x", "9.2");
    rect.setAttribute("y", "0.786");
    rect.setAttribute("width", "14.16");
    rect.setAttribute("height", "14.16");
    svg.appendChild(rect);

    const poly1 = document.createElementNS(svgNamespace, "polyline");
    poly1.setAttribute("points", "6.70 4.25 4.99 4.25 4.99 18.77 19.50 18.77 19.50 17.43");
    svg.appendChild(poly1);

    const poly2 = document.createElementNS(svgNamespace, "polyline");
    poly2.setAttribute("points", "2.52 8.22 0.83 8.22 0.83 22.57 15.18 22.57 15.18 21.26");
    svg.appendChild(poly2);
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
        } else {
          this._button.setAttribute("disabled", "");
        }
        break;
    }
  }
}

customElements.define("track-button", TrackButton);
