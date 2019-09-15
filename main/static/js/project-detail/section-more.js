class SectionMore extends TatorElement {
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

    const otherButtons = document.createElement("div");
    otherButtons.setAttribute("class", "d-flex flex-column px-4 py-3 lh-condensed");
    this._div.appendChild(otherButtons);

    this._download = document.createElement("download-button");
    this._download.setAttribute("text", "Download section");
    otherButtons.appendChild(this._download);

    const annotations = document.createElement("download-button");
    annotations.setAttribute("text", "Download metadata");
    otherButtons.appendChild(annotations);

    const rename = document.createElement("rename-button");
    rename.setAttribute("text", "Rename section");
    otherButtons.appendChild(rename);

    const del = document.createElement("delete-button");
    del.setAttribute("text", "Delete section");
    otherButtons.appendChild(del);

    this._algorithmMenu.addEventListener("click", () => {
      details.removeAttribute("open");
    });

    this._download.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("download"));
    });

    annotations.addEventListener("click", () => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("annotations"));
    });

    rename.addEventListener("click", evt => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("rename", {composed: true}));
    });

    del.addEventListener("click", evt => {
      details.removeAttribute("open");
      this.dispatchEvent(new Event("delete", {composed: true}));
    });
  }

  set algorithms(val) {
    this._algorithmMenu.algorithms = val;
  }
}

customElements.define("section-more", SectionMore);
