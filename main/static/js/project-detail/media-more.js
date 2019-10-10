class MediaMore extends TatorElement {
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

    this._mediaMove = document.createElement("media-move");
    this._div.appendChild(this._mediaMove);

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
    this._del.setAttribute("text", "Delete file");
    otherButtons.appendChild(this._del);

    this._cancel = document.createElement("cancel-button");
    this._cancel.setAttribute("text", "Cancel processing");
    this._cancel.setAttribute("class", "py-2");
    this._cancel.style.display = "none"; 
    otherButtons.appendChild(this._cancel);

    this._algorithmMenu.addEventListener("click", () => {
      details.removeAttribute("open");
    });

    this._mediaMove.addEventListener("move", () => {
      details.removeAttribute("open");
    });

    this._mediaMove.addEventListener("moveToNew", () => {
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

    this._cancel.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("cancel"));
    });
  }

  static get observedAttributes() {
    return ["media-url", "name", "processing"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "media-url":
        this._download.setAttribute("url", newValue);
        break;
      case "name":
        this._download.setAttribute("name", newValue);
        break;
      case "processing":
        if (newValue === null) {
          this._algorithmMenu.style.display = "block";
          this._mediaMove.style.display = "block";
          this._download.style.display = "block";
          this._annotations.style.display = "block";
          this._rename.style.display = "block";
          this._del.style.display = "block";
          this._cancel.style.display = "none";
          this.permission = this._permission;
        } else {
          this._algorithmMenu.style.display = "none";
          this._mediaMove.style.display = "none";
          this._download.style.display = "none";
          this._annotations.style.display = "none";
          this._rename.style.display = "none";
          this._del.style.display = "none";
          this._cancel.style.display = "block";
          this.permission = this._permission;
        }
        break;
    }
  }

  set permission(val) {
    this._permission = val;
    if (!hasPermission(val, "Can Execute")) {
      this._algorithmMenu.style.display = "none";
      this._cancel.style.display = "none";
    }
    if (!hasPermission(val, "Can Transfer")) {
      this._download.style.display = "none";
      this._annotations.style.display = "none";
      this._del.style.display = "none";
    }
    if (!hasPermission(val, "Can Edit")) {
      this._mediaMove.style.display = "none";
      this._rename.style.display = "none";
    }
  }

  set algorithms(val) {
    this._algorithmMenu.algorithms = val;
  }

  set sections(val) {
    this._mediaMove.sections = val;
  }
}

customElements.define("media-more", MediaMore);
