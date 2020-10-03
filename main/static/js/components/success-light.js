class SuccessLight extends TatorElement {
  constructor() {
    super();

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "tator-success-light");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "32px");
    svg.setAttribute("width", "32px");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#54e37a");
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
    path.setAttribute("d","M 12 1 C 6 1 1 6 1 12 C 1 18 6 23 12 23 C 18 23 23 18 23 12 C 23 6 18 1 12 1");
    svg.appendChild(path);

    const path2 = document.createElementNS(svgNamespace, "path");
    path2.setAttribute("d", "M 17 7 L 10 16 L 6 13");
    svg.appendChild(path2);

    window.tator_success_light = this;
  }

  message(message, color)
  {
    if (color)
    {
      this._svg.setAttribute("stroke", color);
    }
    else
    {
      this._svg.setAttribute("stroke", "#54e37a");
    }
    this._title.textContent = message;
    this._svg.style.display = null;
  }

  hide()
  {
    this._svg.style.display = "none";
  }
}

customElements.define("success-light", SuccessLight);
