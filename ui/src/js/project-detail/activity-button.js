class ActivityButton extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "btn");
    this._shadow.appendChild(label);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    label.appendChild(svg);

    const poly = document.createElementNS(svgNamespace, "polyline");
    poly.setAttribute("points", "22 12 18 12 15 21 9 3 6 12 2 12");
    svg.appendChild(poly);

    const span = document.createElement("span");
    span.setAttribute("class", "px-1");
    span.textContent = "Activity";
    label.appendChild(span);
  }
}

customElements.define("activity-button", ActivityButton);
