import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class MediaNavPreview extends TatorElement {
  constructor() {
    super();

    this._previewBox = document.createElement("div");
    this._previewBox.setAttribute("class", "tooltip-nav-preview");
    this._previewBox.hidden = true;
    this._shadow.appendChild(this._previewBox);

    this._img = document.createElement("img");
    this._img.setAttribute("style", "max-width: 100%;");
    this._img.setAttribute("crossorigin", "anonymous");
    this._previewBox.appendChild(this._img);

    const idDiv = document.createElement("div");
    this._previewBox.appendChild(idDiv);

    const idLabel = document.createElement("span");
    idLabel.textContent = "ID: ";
    idDiv.appendChild(idLabel);

    this._id = document.createElement("span");
    idDiv.appendChild(this._id);

    const nameDiv = document.createElement("div");
    this._previewBox.appendChild(nameDiv);

    //  const nameLabel = document.createElement('span');
    //  nameLabel.textContent = "Filename: ";
    //  nameDiv.appendChild(nameLabel);

    this._name = document.createElement("span");
    this._name.setAttribute("class", "css-truncate");
    nameDiv.appendChild(this._name);

    this.startTimeDiv = document.createElement("div");
    this.startTimeDiv.hidden = true;
    this._previewBox.appendChild(this.startTimeDiv);

    const startTimeLabel = document.createElement("span");
    startTimeLabel.textContent = "Start time: ";
    this.startTimeDiv.appendChild(startTimeLabel);

    this._startTime = document.createElement("span");
    this.startTimeDiv.appendChild(this._startTime);

    this.durationDiv = document.createElement("div");
    this.durationDiv.hidden = true;
    this._previewBox.appendChild(this.durationDiv);

    const durationLabel = document.createElement("span");
    durationLabel.textContent = "Duration: ";
    this.durationDiv.appendChild(durationLabel);

    this._duration = document.createElement("span");
    this.durationDiv.appendChild(this._duration);

    this.endTimeDiv = document.createElement("div");
    this.endTimeDiv.hidden = true;
    this._previewBox.appendChild(this.endTimeDiv);

    const endTimeLabel = document.createElement("span");
    endTimeLabel.textContent = "End time: ";
    this.endTimeDiv.appendChild(endTimeLabel);

    this._endTime = document.createElement("span");
    this.endTimeDiv.appendChild(this._endTime);

    this._info = null;
  }

  show() {
    this._previewBox.hidden = false;
  }

  hide() {
    this._previewBox.hidden = true;
  }

  set info(val) {
    if (this._info == val && val !== null && val !== -1) this.show();

    this._info = val;
    if (val !== null && val !== -1) {
      fetchCredentials(`/rest/Media/${val}?presigned=28800`, {}, true)
        .then((resp) => {
          return resp.json();
        })
        .then((data) => {
          //
          if (data.media_files && data.media_files.thumbnail_gif) {
            this._img.src = `${data.media_files.thumbnail_gif[0].path}`;
          } else if (data.media_files && data.media_files.thumbnail) {
            this._img.src = `${data.media_files.thumbnail[0].path}`;
          } else {
            this._img.hidden = true;
          }

          this._id.textContent = data.id;
          this._name.textContent = data.name;

          if (
            data.fps &&
            data.fps !== null &&
            data.num_frames &&
            data.num_frames !== null
          ) {
            // calculate duration
            const seconds = Number(data.num_frames) / Number(data.fps);
            const duration = new Date(seconds * 1000)
              .toISOString()
              .substring(11, 19);
            this._duration.textContent = duration;
            this.durationDiv.hidden = false;
          }
          // this._name.textContent = data.name;

          this.show();
        });
    }
  }
}

customElements.define("media-nav-preview", MediaNavPreview);
