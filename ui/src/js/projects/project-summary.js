import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { store } from "./store.js";
import TatorSymbol from "../../images/tator-logo-symbol-only.png";

export class ProjectSummary extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("project-summary").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._link = this._shadow.getElementById("project-link");
    this._img = this._shadow.getElementById("thumbnail");
    this._name = this._shadow.getElementById("name");
    this._numFiles = this._shadow.getElementById("num-files");
    this._duration = this._shadow.getElementById("duration");
    this._avatars = this._shadow.getElementById("avatars");
    this._moreButton = this._shadow.getElementById("more-button");
    this._settingsButton = this._shadow.getElementById("settings-button");
    this._removeButton = this._shadow.getElementById("remove-button");
  }

  set info(val) {
    if (val.thumb) {
      this._img.setAttribute("src", val.thumb);
      this._img.setAttribute("style", "object-fit:cover");
    } else {
      this._img.setAttribute("src", TatorSymbol);
      this._img.setAttribute("style", "object-fit:contain");
    }

    const url = `/${val.id}/project-detail`;
    this._link.setAttribute("href", url);

    const settingsUrl = `/${val.id}/project-settings`;
    this._settingsButton.setAttribute("href", settingsUrl);

    this._name.textContent = val.name;
    this._makeAvatars(val.usernames);
    this._setNumFiles(val.num_files);
    this._setDuration(val.duration);

    // Hide buttons if permissions too low
    if (!hasPermission(val.permission, "Full Control")) {
      this._moreButton.style.display = "none";
    }
    if (!hasPermission(val.permission, "Creator")) {
      this._removeButton.style.display = "none";
    }

    this._removeButton.addEventListener("click", (evt) => {
      const remove = new CustomEvent("remove", {
        detail: {
          projectId: val.id,
          projectName: val.name,
        },
      });
      this.dispatchEvent(remove);
    });
  }

  _makeAvatars(usernames) {
    // Populate avatars
    let first = true;
    const maxAvatars = 4;
    for (const [index, username] of usernames.entries()) {
      const span = document.createElement("span");
      span.setAttribute(
        "class",
        "avatar circle d-flex flex-items-center flex-justify-center f3"
      );
      if (!first) {
        span.setAttribute("style", "background-color: #696cff");
      }
      let initials;
      if (index >= maxAvatars) {
        initials = "+" + String(usernames.length - maxAvatars);
      } else {
        initials = username.match(/\b\w/g) || [];
        initials = (
          (initials.shift() || "") + (initials.pop() || "")
        ).toUpperCase();
      }
      span.textContent = initials;
      this._avatars.appendChild(span);
      first = false;
      if (index >= maxAvatars) {
        break;
      }
    }
  }

  _setDuration(seconds) {
    let duration = seconds;
    let label1 = "seconds";
    if (duration > 3600) {
      duration = duration / 3600;
      label1 = "hours";
    } else if (duration > 60) {
      duration = duration / 60;
      label1 = "minutes";
    }
    this._duration.textContent = Number(duration).toFixed(1) + " " + label1;
  }

  _setNumFiles(numFiles) {
    let fileLabel = " files";
    if (numFiles == 1) {
      fileLabel = " file";
    }
    this._numFiles.textContent = numFiles + fileLabel;
  }
}

customElements.define("project-summary", ProjectSummary);
