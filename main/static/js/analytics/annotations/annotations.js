/**
 * Page that displays a grid view of selected annotations
 */
class AnalyticsAnnotations extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "d-flex");
    this._shadow.appendChild(main);

    //
    // Define the main section of the page
    //
    const div = document.createElement("div");
    div.setAttribute("class", "is-open px-6 py-6");
    main.appendChild(div);

    this._filterView = document.createElement("filter-interface");
    div.appendChild(this._filterView);
  }

  _init() {

    // Database interface. This should only be used by the viewModel/interface code.
    const projectId = Number(this.getAttribute("project-id"));
    this._modelData = new TatorData(projectId);

    // Filter interface
    this._filterDataView = new FilterData(this._modelData);
    this._filterView.dataView = this._filterDataView;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-id":
        this._init();
        break;
      case "token":
        break;
    }
  }

  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
  }

}

customElements.define("analytics-annotations", AnalyticsAnnotations);