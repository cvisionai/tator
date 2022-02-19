import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { Utilities } from "../util/utilities.js";

export class MediaMore extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.setAttribute("class", "btn-clear h2 text-gray hover-text-white");
    summary.style.lineHeight = 0;
    details.appendChild(summary);

    const moreIcon = document.createElement("more-icon");
    summary.appendChild(moreIcon);

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "files__main files-wrap");
    details.appendChild(styleDiv);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "more d-flex flex-column f2");
    styleDiv.appendChild(this._div);

    this._algorithmMenu = document.createElement("algorithm-menu");
    this._div.appendChild(this._algorithmMenu);

    const otherButtons = document.createElement("div");
    otherButtons.setAttribute("class", "d-flex flex-column px-4 py-3 lh-condensed");
    this._div.appendChild(otherButtons);

    this._download = document.createElement("download-button");
    this._download.setAttribute("text", "Download file");
    otherButtons.appendChild(this._download);

    this._annotations = document.createElement("download-button");
    this._annotations.setAttribute("text", "Download metadata");
    otherButtons.appendChild(this._annotations);

    this._rename = document.createElement("rename-button");
    this._rename.setAttribute("text", "Rename file");
    otherButtons.appendChild(this._rename);

    this._del = document.createElement("delete-button");
    this._del.init("Delete file");
    otherButtons.appendChild(this._del);

    this._algorithmMenu.addEventListener("click", () => {
      details.removeAttribute("open");
    });

    this._download.addEventListener("click", () => {
      details.removeAttribute("open");
    });

    this._annotations.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("annotations"));
    });

    this._rename.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("rename"));
    });

    this._del.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("delete"));
    });
  }

  static get observedAttributes() {
    return ["name", "processing"];
  }

  set media(val)
  {
    const request = Utilities.getDownloadRequest(val);
    if (request == null)
    {
      this._download.style.display = "none";
    }
    else
    {
      this._download.request = request;
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._download.setAttribute("name", newValue);
        break;
      case "processing":
        if (newValue === null) {
          this._algorithmMenu.style.display = "block";
          this._download.style.display = "block";
          this._annotations.style.display = "block";
          this._rename.style.display = "block";
          this._del.style.display = "block";
          this.project = this._project;
        } else {
          this._algorithmMenu.style.display = "none";
          this._download.style.display = "none";
          this._annotations.style.display = "none";
          this._rename.style.display = "none";
          this._del.style.display = "none";
          this.project = this._project;
        }
        break;
    }
  }

  set project(val) {
    this._project = val;
    if (!hasPermission(val.permission, "Can Execute")) {
      this._algorithmMenu.style.display = "none";
    }
    if (!(hasPermission(val.permission, "Can Transfer") && val.enable_downloads)) {
      this._download.style.display = "none";
      this._annotations.style.display = "none";
      this._del.style.display = "none";
    }
    if (!hasPermission(val.permission, "Can Edit")) {
      this._rename.style.display = "none";
    }
  }

  set algorithms(val) {
    this._algorithmMenu.algorithms = val;
  }
}

customElements.define("media-more", MediaMore);
