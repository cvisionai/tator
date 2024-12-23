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

    // Set an image size here that works for both 144 or 360
    this._img = document.createElement("canvas");
    this._img.width = 240;
    this._img.height = 240;
    this._ctx = this._img.getContext("2d");
    this._previewBox.appendChild(this._img);

    this._info = {};
  }

  get img_height() {
    return this._img.height;
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
    let newWidth = this._img.height * aspectRatio;
    if (this._img.width != newWidth) {
      this._img.width = newWidth;
      // Fill it black on initialization
      this._ctx.fillStyle = "black";
      this._ctx.fillRect(0, 0, this._img.width, this._img.height);
    }
  }

  set image(val) {
    this._ctx.drawImage(val, 0, 0, this._img.width, this._img.height);
    this._img.style.display = "block";
  }

  set annotations(val) {
    // Dictionary by type
    for (const typeId of val.keys()) {
      for (const localization of val.get(typeId)) {
        if (localization.type.indexOf("box") >= 0) {
          this._ctx.globalAlpha = 0.7;
          this._ctx.strokeStyle = "rgb(64,224,208)";
          this._ctx.lineWidth = 3;
          this._ctx.strokeRect(
            localization.x * this._img.width,
            localization.y * this._img.height,
            localization.width * this._img.width,
            localization.height * this._img.height
          );

          // Fill with a 50% alpha color
          this._ctx.fillStyle = "rgb(64,224,208)";
          this._ctx.globalAlpha = 0.2;
          this._ctx.fillRect(
            localization.x * this._img.width,
            localization.y * this._img.height,
            localization.width * this._img.width,
            localization.height * this._img.height
          );
        } else if (localization.type.indexOf("dot") >= 0) {
          this._ctx.globalAlpha = 0.7;
          this._ctx.fillStyle = "rgb(64,224,208)";
          this._ctx.beginPath();
          this._ctx.arc(
            localization.x * this._img.width,
            localization.y * this._img.height,
            5,
            0,
            2 * Math.PI
          );
          this._ctx.fill();
        } else if (localization.type.indexOf("line") >= 0) {
          this._ctx.globalAlpha = 0.7;
          this._ctx.strokeStyle = "rgb(64,224,208)";
          this._ctx.lineWidth = 3;
          this._ctx.beginPath();
          this._ctx.moveTo(
            localization.x * this._img.width,
            localization.y * this._img.height
          );
          this._ctx.lineTo(
            (localization.x + localization.u) * this._img.width,
            (localization.y + localization.v) * this._img.height
          );
          this._ctx.stroke();
        } else if (localization.type.indexOf("poly") >= 0) {
          this._ctx.globalAlpha = 0.7;
          this._ctx.strokeStyle = "rgb(64,224,208)";
          this._ctx.lineWidth = 3;
          this._ctx.beginPath();
          this._ctx.moveTo(
            localization.points[0][0] * this._img.width,
            localization.points[0][1] * this._img.height
          );
          for (let idx = 1; idx < localization.points.length; idx++) {
            this._ctx.lineTo(
              localization.points[idx][0] * this._img.width,
              localization.points[idx][1] * this._img.height
            );
          }
          this._ctx.closePath();
          this._ctx.stroke();

          // Fill with a 50% alpha color
          this._ctx.fillStyle = "rgb(64,224,208)";
          this._ctx.globalAlpha = 0.2;
          this._ctx.fill();
        }

        // Reset alpha
        this._ctx.globalAlpha = 1;
      }
    }
  }
  set info(val) {
    if (this._info.frame === val.frame) {
      this._previewBox.style.left = `${val.x}px`;
      this._previewBox.style.top = `${val.y}px`;
      this.show();
    }

    this._info = val;
    if (val !== null && val !== -1) {
      this._frame.textContent = `  (${val.frame})`;
      this._time.textContent = val.time;
      this._previewBox.style.left = `${val.x}px`;
      this._previewBox.style.top = `${val.y}px`;

      // If a preview image was supplied, display else hide the canvas
      if (val.image) {
        this._img.style.display = "block";
      } else {
        this._img.style.display = "none";
      }
    }
  }

  get info() {
    return this._info;
  }

  set cancelled(val) {
    this._cancelled = val;
  }

  get cancelled() {
    return this._cancelled;
  }
}

customElements.define("media-seek-preview", MediaSeekPreview);
