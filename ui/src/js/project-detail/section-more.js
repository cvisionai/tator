import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";

export class SectionMore extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.setAttribute("class", "btn-clear h2 text-gray hover-text-white");
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

    this._otherButtons = document.createElement("div");
    this._otherButtons.setAttribute(
      "class",
      "d-flex flex-column px-4 py-3 lh-condensed"
    );
    this._div.appendChild(this._otherButtons);

    this._cardLink = document.createElement("div");
    this._otherButtons.appendChild(this._cardLink);

    const bulkDiv = document.createElement("div");
    bulkDiv.setAttribute("id", "bulkCorrectButtonDiv");
    this._otherButtons.appendChild(bulkDiv);

    this._bulkEditMedia = document.createElement("bulk-correct-button");
    // this._bulkEditMedia.setAttribute("id", "bulkCorrectButton");
    this._bulkEditMedia.setAttribute("text", "Bulk edit/move/delete");
    bulkDiv.appendChild(this._bulkEditMedia);

    this._download = document.createElement("download-button");
    this._download.setAttribute("text", "Download media files");
    this._otherButtons.appendChild(this._download);

    this._annotations = document.createElement("download-button");
    this._annotations.setAttribute("text", "Download metadata");
    this._otherButtons.appendChild(this._annotations);

    this._rename = document.createElement("rename-button");
    this._rename.setAttribute("text", "Rename folder");
    this._otherButtons.appendChild(this._rename);

    this._deleteSection = document.createElement("delete-button");
    this._deleteSection.init("Delete folder");
    this._otherButtons.appendChild(this._deleteSection);

    this._deleteMedia = document.createElement("delete-button");
    this._deleteMedia.init("Delete media files", "text-red");
    this._otherButtons.appendChild(this._deleteMedia);

    window.addEventListener("click", (e) => {
      if (e.composedPath()[0].id != "icon-more-horizontal") {
        details.removeAttribute("open");
      }
    });

    this._bulkEditMedia.addEventListener("click", () => {
      details.removeAttribute("open");
      // console.log("dispatch bulk edit!")
      this.dispatchEvent(new Event("bulk-edit"));
    });

    // this._cardLink.addEventListener("click", () => {
    //   details.removeAttribute("open");
    //   this.dispatchEvent(new Event("bulk-edit"));
    // });

    this._algorithmMenu.addEventListener("click", () => {
      details.removeAttribute("open");
    });

    this._download.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("download"));
    });

    this._annotations.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("downloadAnnotations"));
    });

    this._rename.addEventListener("click", (evt) => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("rename", { composed: true }));
    });

    this._deleteSection.addEventListener("click", (evt) => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("deleteSection", { composed: true }));
    });

    this._deleteMedia.addEventListener("click", (evt) => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("deleteMedia", { composed: true }));
    });
  }

  set section(val) {
    if (val === null) {
      this._rename.style.display = "none";
      this._deleteSection.style.display = "none";
      this._deleteMedia.style.display = "none";
    } else {
      // console.log(val);

      if (val.lucene_search == null) {
        // not a saved search
        this._rename.setAttribute("text", "Rename folder");
        this._deleteSection.init("Delete folder");
      } else {
        // is a saved search
        this._rename.setAttribute("text", "Rename saved search");
        this._deleteSection.init("Delete saved search");
      }

      this._rename.style.display = "block";
      this._deleteSection.style.display = "block";
      this._deleteMedia.style.display = "block";
    }
    // End of day permission makes the call...
    this.showHideWithPermission();
  }

  set project(val) {
    this._project = val;
    this.showHideWithPermission();
  }

  showHideWithPermission() {
    const permission = this._project.permission;
    const enableDownloads = this._project.enable_downloads;

    if (!hasPermission(permission, "Can Execute")) {
      this._algorithmMenu.style.display = "none";
    }

    if (!(hasPermission(permission, "Can Transfer") && enableDownloads)) {
      this._download.style.display = "none";
      this._annotations.style.display = "none";
      this._deleteSection.style.display = "none";
      this._deleteMedia.style.display = "none";
    }

    if (permission === "View Only") {
      this._rename.style.display = "none";
      this._deleteSection.style.display = "none";
      this._deleteMedia.style.display = "none";
      this._bulkEditMedia.style.display = "none";
      this._download.style.display = "block";
      this._annotations.style.display = "block";
    }
  }

  set algorithms(val) {
    this._algorithmMenu.algorithms = val;
  }
}

customElements.define("section-more", SectionMore);
