class AnnotationBreadcrumbs extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__breadcrumbs d-flex flex-items-center px-2 f3 text-gray");
    this._shadow.appendChild(div);

    this._projectText = document.createElement("a");
    this._projectText.setAttribute("class", "text-gray");
    div.appendChild(this._projectText);

    const chevron1 = document.createElement("chevron-right");
    chevron1.setAttribute("class", "px-2");
    div.appendChild(chevron1);

    this._sectionText = document.createElement("a");
    this._sectionText.setAttribute("class", "text-gray");
    div.appendChild(this._sectionText);

    const chevron2 = document.createElement("chevron-right");
    chevron2.setAttribute("class", "px-2");
    div.appendChild(chevron2);

    this._fileText = document.createElement("span");
    this._fileText.setAttribute("class", "text-white text-semibold");
    div.appendChild(this._fileText);
  }

  static get observedAttributes() {
    return ["project-name", "section-name", "media-name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-name":
        this._projectText.textContent = newValue;
        this._projectText.setAttribute("href", this._detailUrl());
        break;
      case "section-name":
        const url = this._detailUrl() + "#" + newValue;
        this._sectionText.textContent = newValue;
        this._sectionText.setAttribute("href", url);
        break;
      case "media-name":
        this._fileText.textContent = newValue;
        break;
    }
  }

  _detailUrl() {
    const project = window.location.pathname.split("/")[1];
    const url = window.location.origin + "/" + project + "/project-detail";
    return url;
  }
}

customElements.define("annotation-breadcrumbs", AnnotationBreadcrumbs);
