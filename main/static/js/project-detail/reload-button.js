class ReloadButton extends TatorElement {
  constructor() {
    super();

    this._label = document.createElement("label");
    this._label.setAttribute("class", "h3 text-gray hover-text-white");
    this._label.style.cursor = "pointer";
    this._shadow.appendChild(this._label);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-upload");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    this._label.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Reload";
    svg.appendChild(title);

    const poly = document.createElementNS(svgNamespace, "polyline");
    poly.setAttribute("points", "23 4 23 10 17 10");
    svg.appendChild(poly);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M20.49 15a9 9 0 1 1-2.12-9.36L23 10");
    svg.appendChild(path);
  }

  ready() {
    this._label.classList.remove("is-rotating");
  }

  busy() {
    this._label.classList.add("is-rotating");
  }
}

customElements.define("reload-button", ReloadButton);
