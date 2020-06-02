class VolumeControl extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("div");
    button.setAttribute("class", "d-flex btn-clear px-2 h2 text-gray hover-text-white");
    button.style.position="relative";
    this._shadow.appendChild(button);
    this._volume = 75;

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
    this._button = button;

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Adjust Volume";
    svg.appendChild(title);

    const poly = document.createElementNS(svgNamespace, "polygon");
    poly.setAttribute("points", "11 5 6 9 2 9 2 15 6 15 11 19 11 5");
    svg.appendChild(poly);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07");
    svg.appendChild(path);

    this._shown = false;

    button.addEventListener("click", (evt) => {
      if (this._shown)
      {
        button.removeChild(this._div);
        this._shown = false;
      }
      else
      {
        this.showControls();
      }
    });
  }

  showControls()
  {
    this._shown = true;
    this._div = document.createElement("div");
    this._div.setAttribute("class", "py-2 px-2");
    this._div.style.align="center";
    this._div.style.position="absolute";
    this._div.style.top = "-80px";

    // TODO: Move this into css
    this._div.style.background = "#151b28";
    this._div.style.display = "flex";
    this._button.appendChild(this._div);

    this._div.addEventListener("click", (evt) => {
      evt.stopPropagation();
      return false;
    });

    const volume = document.createElement("input");
    volume.setAttribute("type", "range");
    volume.setAttribute("class", "range flex-grow");
    volume.setAttribute("step", "1");
    volume.setAttribute("max", "0");
    volume.setAttribute("max", "100");
    volume.setAttribute("value", this._volume);
    this._div.appendChild(volume);

    // Center horizontally
    const left = (-this._div.clientWidth/2) + this._button.clientWidth/2;
    this._div.style.left = `${left}px`;
  }
}

customElements.define("volume-control", VolumeControl);
