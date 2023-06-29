import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class VolumeControl extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("div");
    button.setAttribute(
      "class",
      "d-flex btn-clear px-2 h2 text-gray hover-text-white"
    );
    button.setAttribute("title", "Volume Controls");
    button.style.position = "relative";
    button.style.cursor = "pointer";
    this._shadow.appendChild(button);
    this._volume = 50;
    this._button = button;
    this.setupIcons();

    // By default use max volume icon
    button.appendChild(this._maxVol);

    this.setupControls();
    this._shown = false;
    this._animating = false;

    button.addEventListener("click", (evt) => {
      if (this._animating == true) {
        return;
      }
      if (this._shown) {
        this.fadeOut();
      } else {
        this.fadeIn();
        evt.stopPropagation();
        this._timeout = setTimeout(this.fadeOut.bind(this), 2500);
      }
    });
  }

  fadeOut() {
    clearTimeout(this._timeout);
    let opacity = 100;
    let animation = () => {
      this._animating = true;
      opacity = opacity - 3.5;
      if (opacity <= 0) {
        this._animating = false;
        this.hide();
      } else {
        this._div.style.opacity = opacity / 100;
        requestAnimationFrame(animation);
      }
    };
    animation();
  }

  fadeIn() {
    this._div.style.display = "flex";
    // Center horizontally
    const left = -this._div.clientWidth / 2;
    this._div.style.left = `${left}px`;
    this._shown = true;
    clearTimeout(this._timeout);
    let opacity = 0;
    let animation = () => {
      this._animating = true;
      opacity = opacity + 3.5;
      if (opacity < 100) {
        this._div.style.opacity = opacity / 100;
        requestAnimationFrame(animation);
      } else {
        this._animating = false;
      }
    };
    animation();
  }

  hide() {
    this._div.style.display = "none";
    this._shown = false;
  }

  setupIcons() {
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

    this._maxVol = svg;
    this._minVol = svg.cloneNode();
    this._noVol = svg.cloneNode();
    this._mute = svg.cloneNode();

    // Setup different volume icons
    // All volumes have a speaker
    let poly = document.createElementNS(svgNamespace, "polygon");
    poly.setAttribute("points", "11 5 6 9 2 9 2 15 6 15 11 19 11 5");
    this._maxVol.appendChild(poly.cloneNode());
    this._minVol.appendChild(poly.cloneNode());
    this._noVol.appendChild(poly.cloneNode());
    this._mute.appendChild(poly.cloneNode());

    // Max vol has a longer path (2 lines), min has 1 line, no has none
    let path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
    );
    this._maxVol.appendChild(path);
    path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M15.54 8.46a5 5 0 0 1 0 7.07");
    this._minVol.appendChild(path);

    // Mute has an X instead of lines represented by... svg lines
    let line = document.createElementNS(svgNamespace, "line");
    line.setAttribute("x1", "23");
    line.setAttribute("y1", "9");
    line.setAttribute("x2", "17");
    line.setAttribute("y2", "15");
    this._mute.appendChild(line);
    line = document.createElementNS(svgNamespace, "line");
    line.setAttribute("x1", "17");
    line.setAttribute("y1", "9");
    line.setAttribute("x2", "23");
    line.setAttribute("y2", "15");
    this._mute.appendChild(line);
  }

  setupControls() {
    this._div = document.createElement("div");
    this._div.setAttribute("class", "py-2 px-2");
    this._div.style.align = "center";
    this._div.style.position = "absolute";
    this._div.style.top = "-70px";

    // TODO: Move this into css
    this._div.style.background = "#151b28";
    this._div.style.display = "none";
    this._button.appendChild(this._div);

    this._div.addEventListener("click", (evt) => {
      evt.stopPropagation();
      return false;
    });

    const volume = document.createElement("input");
    volume.style.cursor = "pointer";
    volume.setAttribute("type", "range");
    volume.setAttribute("class", "range flex-grow");
    volume.setAttribute("step", "1");
    volume.setAttribute("max", "0");
    volume.setAttribute("max", "100");
    volume.setAttribute("value", this._volume);
    this._control = volume;
    this._div.appendChild(volume);

    volume.addEventListener("change", () => {
      this.volumeUpdated();
      volume.blur();
      this._timeout = setTimeout(this.fadeOut.bind(this), 1500);
    });

    volume.addEventListener("input", () => {
      this.volumeUpdated();
      clearTimeout(this._timeout);
    });
  }

  // Set the volume (clips to 0-100)
  set volume(vol) {
    this._control.value = Math.max(0, Math.min(100, vol));
    this.volumeUpdated();
  }

  volumeUpdated() {
    this._volume = Number(this._control.value);
    let currentIcon = this._button.children[0];
    let newIcon = this._maxVol;
    if (this._volume > 50) {
      newIcon = this._maxVol;
    } else if (this._volume > 0) {
      newIcon = this._minVol;
    } else {
      newIcon = this._mute;
    }
    if (newIcon != currentIcon) {
      this._button.replaceChild(newIcon, currentIcon);
    }

    this.dispatchEvent(
      new CustomEvent("volumeChange", {
        detail: { volume: this._volume },
        composed: true,
      })
    );
  }
}

customElements.define("volume-control", VolumeControl);
