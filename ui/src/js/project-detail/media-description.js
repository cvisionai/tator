import { TatorElement } from "../components/tator-element.js";

export class MediaDescription extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "file__description d-flex py-1 f3 text-gray");
    this._shadow.appendChild(div);

    this._ext = document.createTextNode("");
    div.appendChild(this._ext);

    const progDiv = document.createElement("div");
    progDiv.setAttribute("class", "px-3 d-flex flex-items-center");
    div.appendChild(progDiv);

    this._progress = document.createElement("progress");
    this._progress.setAttribute("class", "progress");
    this._progress.setAttribute("id", "progress");
    this._progress.setAttribute("max", "100");
    this._progress.style.display = "none";
    progDiv.appendChild(this._progress);

    this._label = document.createElement("label");
    this._label.setAttribute("class", "d-flex px-2");
    this._label.setAttribute("for", "progress");
    progDiv.appendChild(this._label);
  }

  static get observedAttributes() {
    return ["extension"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "extension":
        this._ext.nodeValue = newValue;
        break;
    }
  }

  setProgress(state, percent, msg) {
    if (percent === null || percent == 100) {
      this._progress.style.display = "none";
    } else {
      this._progress.style.display = "block";
      this._progress.setAttribute("value", Math.round(percent));
    }
    if (msg) {
      this._label.textContent = msg;
    } else {
      this._label.textContent = "";
    }
  }
}

customElements.define("media-description", MediaDescription);
