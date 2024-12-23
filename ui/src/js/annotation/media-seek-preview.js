import { TatorElement } from "../components/tator-element.js";

export class MediaSeekPreview extends TatorElement {
  constructor() {
    super();

    this._previewBox = document.createElement("div");
    this._previewBox.setAttribute("class", "tooltip-seek-preview");
    this._previewBox.hidden = true;
    this._previewBox.style.userSelect = "none";
    this._shadow.appendChild(this._previewBox);

    const nameDiv = document.createElement("div");
    nameDiv.style.display = "flex";
    nameDiv.style.justifyContent = "center";
    this._previewBox.appendChild(nameDiv);

    //  const nameLabel = document.createElement('span');
    //  nameLabel.textContent = "Filename: ";
    //  nameDiv.appendChild(nameLabel);

    this._frame = document.createElement("span");
    this._frame.setAttribute("class", "text-gray");
    this._time = document.createElement("span");
    this._time.setAttribute("class", "text-white");
    nameDiv.appendChild(this._time);
    nameDiv.appendChild(this._frame);

    // Image is aspirational
    this._img = document.createElement('canvas');
    this._img.width = 360;
    this._img.height = 360;
    this._ctx = this._img.getContext('2d');
    this._previewBox.appendChild(this._img);
  }

  show() {
    this._previewBox.style.display = "block";
  }

  hide() {
    this._previewBox.style.display = "none";
  }

  set mediaInfo(val) {
    // Calculate the aspect ratio and update the canvas size accordingly
    const aspectRatio = val.width / val.height;
    this._img.width = 360;
    this._img.height = 360 / aspectRatio;

    // Fill it black on initialization
    this._ctx.fillStyle = 'black';
    this._ctx.fillRect(0, 0, this._img.width, this._img.height);
  }

  set info(val) {
    if (this._info == val && val !== null && val !== -1) this.show();

    this._info = val;
    if (val !== null && val !== -1) {
      this._frame.textContent = `  (${val.frame})`;
      this._time.textContent = val.time;
      this._previewBox.style.left = `${val.x}px`;
      this._previewBox.style.top = `${val.y}px`;
      this.show();
    }
  }
}

customElements.define("media-seek-preview", MediaSeekPreview);
