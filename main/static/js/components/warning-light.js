class WarningLight extends TatorElement {
  constructor() {
    super();

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "tator-warning-light");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "32px");
    svg.setAttribute("width", "32px");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#d8cd1d"); // yellow from _variables.scss
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    svg.style.display = "none";
    svg.style.marginRight = "10px";
    this._shadow.appendChild(svg);
    this._svg = svg;

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Warning";
    svg.appendChild(this._title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z");
    svg.appendChild(path);

    const line_0 = document.createElementNS(svgNamespace, "line");
    line_0.setAttribute("x1", "12");
    line_0.setAttribute("y1", "9");
    line_0.setAttribute("x2", "12");
    line_0.setAttribute("y2", "13");
    svg.appendChild(line_0);

    const line_1 = document.createElementNS(svgNamespace, "line");
    line_1.setAttribute("x1", "12");
    line_1.setAttribute("y1", "17");
    line_1.setAttribute("x2", "12.01");
    line_1.setAttribute("y2", "17");
    svg.appendChild(line_1);
    window.tator_warning_light = this;
  }

  message(message, color)
  {
    if (color)
    {
      this._svg.setAttribute("stroke", color);
    }
    else
    {
      this._svg.setAttribute("stroke", "#d8cd1d"); // yellow from _variables.scss
    }
    this._title.textContent = message;
    this._svg.style.display = null;
  }

  hide()
  {
    this._svg.style.display = "none";
  }
}

customElements.define("warning-light", WarningLight);
