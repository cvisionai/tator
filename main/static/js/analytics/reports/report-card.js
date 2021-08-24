class ReportCard extends TatorElement {
  constructor() {
    super();

    this._li = document.createElement("li");
    this._li.style.cursor = "pointer";
    this._li.setAttribute("class", "section d-flex flex-items-center flex-justify-between px-2 rounded-1");
    this._shadow.appendChild(this._li);

    this._link = document.createElement("a");
    this._link.setAttribute("class", "section__link d-flex flex-items-center text-gray");
    this._li.appendChild(this._link);

    this._title = document.createElement("h2");
    this._title.setAttribute("class", "section__name py-1 px-1 css-truncate");
    this._link.appendChild(this._title);

    this._date = document.createElement("span");
    this._date.setAttribute("class", "text-gray f2");
    //this._linkDiv.appendChild(this._date);

    this._user = document.createElement("span");
    this._user.setAttribute("class", "text-gray f2");
    //this._linkDiv.appendChild(this._user);
  }

  init(report) {
    this._report = report;
    this._title.textContent = report.name;
    this._date.textContent = report.created_datetime;
    this._user.textContent = report.user;

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    this._link.insertBefore(svg, this._title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z");
    svg.appendChild(path);

    const poly = document.createElementNS(svgNamespace, "polyline");
    poly.setAttribute("points", "13 2 13 9 20 9");
    svg.appendChild(poly);
  }

  set active(enabled) {
    if (enabled) {
      this._li.classList.add("is-active");
    } else {
      this._li.classList.remove("is-active");
    }
  }
}

customElements.define("report-card", ReportCard);
