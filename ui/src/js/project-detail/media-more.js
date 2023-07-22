import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { Utilities } from "../util/utilities.js";

export class MediaMore extends TatorElement {
  constructor() {
    super();

    const summary = document.createElement("div");
    summary.setAttribute("class", "btn-clear h2 text-gray hover-text-white");
    summary.style.lineHeight = 0;
    this._shadow.appendChild(summary);

    this._moreIcon = document.createElement("more-icon");
    this._moreIcon.style.margin = "3px";
    this._moreIcon.style.opacity = 0.5; // More visible on hover, but show all the time
    summary.appendChild(this._moreIcon);

    this._details = document.createElement("div");
    this._details.setAttribute("class", "position-relative");
    this._details.hidden = true;
    this._shadow.appendChild(this._details);

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "files__main files-wrap");
    this._details.appendChild(styleDiv);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "more d-flex flex-column f2");
    styleDiv.appendChild(this._div);

    // this._noActionsMsg = document.createElement("div");
    // this._noActionsMsg.setAttribute("class", "hidden");
    // this._div.appendChild(this._noActionsMsg);

    this._algorithmMenu = document.createElement("algorithm-menu");
    this._div.appendChild(this._algorithmMenu);

    const otherButtons = document.createElement("div");
    otherButtons.setAttribute(
      "class",
      "d-flex flex-column px-4 py-3 lh-condensed"
    );
    this._div.appendChild(otherButtons);

    this._textSpan = document.createElement("div");
    this._textSpan.setAttribute("class", "text-gray");
    otherButtons.appendChild(this._textSpan);

    this._download = document.createElement("download-button");
    this._download.setAttribute("text", "Download file");
    otherButtons.appendChild(this._download);

    this._annotations = document.createElement("download-button");
    this._annotations.setAttribute("text", "Download metadata");
    otherButtons.appendChild(this._annotations);

    this._rename = document.createElement("rename-button");
    this._rename.setAttribute("text", "Rename file");
    otherButtons.appendChild(this._rename);

    this._mediaMoveButton = document.createElement("media-move-button");
    this._mediaMoveButton.setAttribute("text", "Move to folder");
    otherButtons.appendChild(this._mediaMoveButton);

    this._del = document.createElement("delete-button");
    this._del.init("Delete file", "text-red");
    otherButtons.appendChild(this._del);

    this._moreIcon.addEventListener("mouseenter", () => {
      this._moreIcon.style.opacity = 1;
    });

    this._moreIcon.addEventListener("mouseleave", () => {
      this._moreIcon.style.opacity = 0.5;
    });

    this._moreIcon.addEventListener("click", this.toggleDetails.bind(this));
    window.addEventListener("click", (evt) => {
      const path = evt.composedPath();
      if (
        path[0].id !== "icon-more-horizontal" &&
        path[0].parentElement &&
        path[0].parentElement.id !== "icon-more-horizontal"
      ) {
        this.hideDetails();
      } else if (
        this._media &&
        path[0].attributes.getNamedItem("mediaId") &&
        path[0].attributes.getNamedItem("mediaId").value !==
          String(this._media.id)
      ) {
        this.hideDetails();
      } else if (
        this._media &&
        path[0].parentElement &&
        path[0].parentElement.attributes.getNamedItem("mediaId") &&
        path[0].parentElement.attributes.getNamedItem("mediaId").value !==
          String(this._media.id)
      ) {
        this.hideDetails();
      } else {
        // console.log("Conditions not met....");
      }
    });

    this._algorithmMenu.addEventListener("click", this.hideDetails.bind(this));

    this._download.addEventListener("click", this.hideDetails.bind(this));

    this._annotations.addEventListener("click", () => {
      this.hideDetails();
      this.dispatchEvent(new Event("annotations"));
    });

    this._rename.addEventListener("click", () => {
      this.hideDetails();
      this.dispatchEvent(new Event("rename"));
    });

    this._mediaMoveButton.addEventListener("click", () => {
      this.hideDetails();
      this.dispatchEvent(new Event("move"));
    });

    this._del.addEventListener("click", () => {
      this.hideDetails();
      this.dispatchEvent(new Event("delete"));
    });
  }

  set media(val) {
    const downloadInfo = Utilities.getDownloadInfo(val);
    this._media = val;

    // if (this._media && this._media.id) {
    //   this._textSpan.textContent = "ID: " + this._media.id;
    //   this._moreIcon._svg.setAttribute("mediaId", `${this._media.id}`)
    // }

    if (downloadInfo["request"] == null) {
      this._download.style.display = "none";
      this.setAttribute(
        "downloadPermission",
        "Download in menu disabled due to permissions."
      );
    } else {
      this._download.request = downloadInfo["request"];
      this._download.setAttribute("size", downloadInfo["size"]);
    }

    let hide = true;
    if (this._media.media_files !== null) {
      if (
        "streaming" in this._media.media_files ||
        "layout" in this._media.media_files ||
        "concat" in this._media.media_files ||
        "image" in this._media.media_files
      ) {
        // File is OK!
        hide = false;
      }
    } else {
      this.setAttribute(
        "filesOK",
        "MediaFiles definition is missing, could be in error state."
      );
    }

    this.toggleAllButDelete(hide);
  }

  /**
   * Values set on more menu
   * - media: (set function) hides and shows certain buttons, sets "_download.request"
   * - nane: sets name of download
   * - processing: hide / shown the options
   */
  static get observedAttributes() {
    return ["name", "processing", "open"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        if (newValue !== null) {
          this._download.setAttribute("name", newValue);
        } else {
          this._download.setAttribute("name", "");
        }
        break;
      case "processing":
        console.log(`Processing value: ${newValue}`);
        // if (newValue === null) {
        //   const hide = false;
        //   this.toggleAll(hide);
        //   this.project = this._project;
        // } else {
        //   const hide = true;
        //   this.toggleAll(hide);
        //   this.project = this._project;
        // }
        break;
      case "open":
        // console.log(newValue);
        if (newValue != null) {
          this._details.hidden = false;
        } else {
          this._details.hidden = true;
        }
    }
  }

  toggleAllButDelete(hideBool) {
    this._algorithmMenu.hidden = hideBool;
    this._download.hidden = hideBool;
    this._annotations.hidden = hideBool;
    this._rename.hidden = hideBool;
    this._mediaMoveButton.hidden = hideBool;
  }

  toggleAll(hideBool) {
    this.toggleAllButDelete(hideBool);
    this._del.hidden = hideBool;
  }

  // Use project to determine permission for each button
  set project(val) {
    this._project = val;
    // Uses the class "hidden" which overiddes the hidden true/false set in toggle functions
    if (this._project.permission == "View Only") {
      this._algorithmMenu.classList.add("hidden");
      this._rename.classList.add("hidden");
      this._mediaMoveButton.classList.add("hidden");
      this._del.classList.add("hidden");
    } else {
      if (!hasPermission(val.permission, "Can Execute")) {
        this._algorithmMenu.classList.add("hidden");
      }
      if (
        !(hasPermission(val.permission, "Can Transfer") && val.enable_downloads)
      ) {
        this._download.classList.add("hidden");
        this._annotations.classList.add("hidden");
        this._del.classList.add("hidden");
      }
      if (!hasPermission(val.permission, "Can Edit")) {
        this._rename.classList.add("hidden");
        this._mediaMoveButton.classList.add("hidden");
      }
      this._div.hidden = false;
    }
  }

  toggleDetails() {
    this._details.hidden = !this._details.hidden;
  }
  hideDetails() {
    if (!this._details.hidden) {
      this._details.hidden = true;
    }
  }

  set algorithms(val) {
    this._algorithmMenu.algorithms = val;
  }
}

customElements.define("media-more", MediaMore);
