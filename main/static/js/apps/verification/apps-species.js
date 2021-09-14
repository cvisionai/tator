class AppsSpecies extends TatorPage {
  constructor() {

    super();

    //
    // Header Section
    //
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-6 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);

    this._breadcrumbs = document.createElement("analytics-breadcrumbs");
    div.appendChild(this._breadcrumbs);
    this._breadcrumbs.setAttribute("analytics-name", "Collections Gallery");

    //
    // Settings
    //
    this._settings = document.createElement("analytics-settings");
    this._settings.style.marginLeft = "50px";
    this._settings._lock.hidden = true;
    div.appendChild(this._settings);

    //
    // Define the main section of the page
    //
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper col-12 d-flex");
    this._shadow.appendChild(this.mainWrapper);

    this.main = document.createElement("main");
    this.main.setAttribute("class", "collections-gallery--main col-12");
    this.mainWrapper.appendChild(this.main);

    //
    // Gallery that will contain the state information
    //
    this._collectionsGallery = document.createElement("apps-species-gallery");
    this.main.appendChild(this._collectionsGallery);

    //
    // Right entity panel
    //
    this.aside = document.createElement("aside");
    this.aside.setAttribute("class", "entity-panel--container gray-panel slide-close col-6")
    this.mainWrapper.appendChild(this.aside);

    this._panelContainer = document.createElement("apps-species-panel-container");
    this._panelContainer._panelTop._navigation.init();
    this.aside.appendChild(this._panelContainer);

    // Modal parent - to pass to page components

    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // Instantiate the filter interface. But it won't be shown.
    this._filterView = document.createElement("filter-interface");
  }

  _init() {

    this.loading.showSpinner();
    this.showDimmer();

    // Gather the URL parameters which will setup this page.
    this.processURL();
    if (this.pageType != "resolve" && this.pageType != "verify") {
      window.alert("Invalid page type provided.")
      return;
    }

    // Setup the filter
    this._filterConditions = [];

    // Initialize the interface to the database
    this.projectId = Number(this.getAttribute("project-id"));
    this._modelData = new TatorData(this.projectId);
    this._modelData.init().then(() => {

      // Collections data view
      this._collectionsData = document.createElement("collections-data");
      this._collectionsData.init(this._modelData);

      // Init panel side behavior
      this._panelContainer.init({
        main: this.main,
        aside: this.aside,
        pageModal: this.modal,
        modelData: this._modelData,
        gallery: this._collectionsGallery
      });

      // Pass panel and localization types to gallery
      this._collectionsGallery.init({
        parentPage: this,
        pageType: this.pageType,
        verifyType: this.verifyType
      });

      this._filterDataView = new FilterData(
        this._modelData,
        ["collections-analytics-view"],
        ["Localizations"]);

      this._filterDataView.init();
      this._filterView.dataView = this._filterDataView;

      this._collectionsGallery.updateFilterResults(this.idnum);

      this.loading.hideSpinner();
      this.hideDimmer();
    });
  }

  processURL() {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("pageType")) {
      this.pageType = searchParams.get("pageType");
    }
    if (searchParams.has("idnum")) {
      this.idnum = searchParams.get("idnum");
    }
    if (searchParams.has("verifyType")) {
      this.verifyType = searchParams.get("verifyType");
    }
    else {
      this.verifyType = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-name":
        this._breadcrumbs.setAttribute("project-name", newValue);
        break;
      case "project-id":
        this._init();
        break;
    }
  }

  static get observedAttributes() {
    return ["project-name", "project-id"].concat(TatorPage.observedAttributes);
  }

  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("apps-species", AppsSpecies);