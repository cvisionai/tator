class VolumeControl extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class","position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.setAttribute("class", "d-flex flex-items-center rounded-1");
    details.appendChild(summary);

    const button = document.createElement("div");
    button.setAttribute("class", "d-flex btn-clear px-2 h2 text-gray hover-text-white");
    summary.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("fill", "none");
    // override CSS for this icon
    svg.style.fill = "none";
    svg.style.display = "block";
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Adjust Volume";
    svg.appendChild(title);

    const poly = document.createElementNS(svgNamespace, "polygon");
    poly.setAttribute("points", "11 5 6 9 2 9 2 15 6 15 11 19 11 5");
    svg.appendChild(poly);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07");
    svg.appendChild(path);

    const div = document.createElement("div");
    div.setAttribute("class", "more py-2 px-2");
    div.style.width="30px";
    div.style.align="center";
    details.appendChild(div);

    const volume = document.createElement("input");
    volume.setAttribute("type", "range");
    volume.setAttribute("class", "range flex-grow");
    volume.setAttribute("step", "1");
    volume.setAttribute("max", "0");
    volume.setAttribute("max", "100");
    volume.setAttribute("value", "75");
    div.appendChild(volume);
  }
}

customElements.define("volume-control", VolumeControl);
