class InventoryBreadcrumbs extends TatorElement {
  constructor() {
    super();

    this.projectId = window.location.pathname.split("/")[1];

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__breadcrumbs d-flex flex-items-center f3");
    this._shadow.appendChild(div);

    this._analyticsText = document.createElement("span");
    this._analyticsText.setAttribute("class", "h2");
    this.analyticsText.textContent = "Species Verfication";
    div.appendChild(this._analyticsText);

    this.chevron2 = document.createElement("chevron-right");
    this.chevron2.setAttribute("class", "px-2");
    this.chevron2.hidden = true;
    div.appendChild(this.chevron2);

    this._resultsCount = document.createElement("span");
    this._resultsCount.setAttribute("class", "f1 px-2 text-white");
    div.appendChild(this._resultsCount);
  }

  static get observedAttributes() {
    return ["analytics-name", "results-count"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "results-count":
        this.chevron2.hidden = false;
        this._resultsCount.textContent = `Showing ${newValue} results`;
        break;
      case "analytics-name":
        if (newValue != "Dashboard") {
          this._analyticsText.textContent = newValue;
        } else {
          this.chevron2.hidden = true;
        }
        break;
    }
  }

  _detailUrl() {
    return `${window.location.origin}/${this.projectId}/project-detail`;
  }
}

customElements.define("inventory-breadcrumbs", InventoryBreadcrumbs);
