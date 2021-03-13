/**
 * Page that displays a grid view of selected annotations
 */
class AnalyticsAnnotations extends TatorPage {
  constructor() {
    super();

    // Allow css access to body
    const body = document.getElementsByTagName("BODY")[0];
    body.setAttribute("class", "analysis-annotations-body");

    //
    // Header
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
    this._breadcrumbs.setAttribute("analytics-name", "Annotation Gallery");

    // Wrapper to allow r.side bar to slide into left
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper col-12 d-flex");
    this._shadow.appendChild(this.mainWrapper);

    //
    // Define the main section of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "analysis--main col-9");
    this.mainWrapper.appendChild(this.main);

    const filterDiv = document.createElement("div");
    filterDiv.setAttribute("class", "analysis__filter py-3 px-6");
    this.main.appendChild(filterDiv);

    this._filterView = document.createElement("filter-interface");
    this._filterView.setDialogParent(this._shadow);
    filterDiv.appendChild(this._filterView);

    // Respond to events from the filter interface
    this._filterView.addEventListener("openedFilterDialog", () => {
      this.setAttribute("has-open-modal", "");
    });
    this._filterView.addEventListener("closedFilterDialog", () => {
      this.removeAttribute("has-open-modal");
    });

    //
    /* Card Gallery */
    // Gallery of cards showing filter results
    this._filterResults = document.createElement("annotations-gallery");
    this.main.appendChild(this._filterResults);

    //
    /* Right Navigation Pane - Annotation Detail Viewer */
    // Gallery navigation panel  
    this._panelContainer = document.createElement("div");
    this._panelContainer.setAttribute("class", "entity-panel--container col-3");
    this.mainWrapper.appendChild(this._panelContainer);

    // Close side panel bar with arrow and panel title
    this._panelTop = document.createElement("entity-attr-panel-top");
    this._panelContainer.appendChild(this._panelTop);

    // listener to close panelContainer
    this._panelTop._toggleRightOnClick( { lside: this.main, rside : this._panelContainer } );

    //
    /* Other */
    // Class to hide and showing loading spinner
    // @TODO what is standard use?
    this.loading = new LoadingSpinner();
    this._shadow.appendChild( this.loading.getImg() );
  }

  _init() {

    this.loading.showSpinner();
    this.setAttribute("has-open-modal", "");

    // Database interface. This should only be used by the viewModel/interface code.
    this.projectId = Number(this.getAttribute("project-id"));
    this._modelData = new TatorData(this.projectId);
    this._modelData.init().then(() => {

      // Init vars for pagination state
      this._paginationState = {
        pageSize: this._filterResults._paginator.getPageSize(),
        start: 0,
        stop: this._filterResults._paginator.getPageSize() - 1,
        init: true
      };

      // Filter interface
      this._filterDataView = new FilterData(this._modelData);
      this._filterDataView.init();
      this._filterView.dataView = this._filterDataView;

      // Card Data class collects raw model and parses into view-model format
      this.cardData = document.createElement("annotation-card-data");
      this.cardData.init(this._modelData);

    // Pass panel and localization types to gallery
    this._filterResults._initPanel( { 
      panelControls : this._panelTop, 
      panelContainer : this._panelContainer, 
      localizationTypes : this.localizationTypes 
    } );

      // Pass panel and localization types to gallery
      this._filterResults._initPanel( {
        panelContainer : this._panelContainer,
        localizationTypes : this.localizationTypes
      } );

      // If state is stored in URL, update default states
      this._getQueryParams();

      // Init Card Gallery and Right Panel
      this._cardGallery(this._filterParams, this._paginationState);

      // Listen for pagination events
      this._filterResults._paginator.addEventListener("selectPage", this._paginateFilterResults.bind(this));

      // Listen for filter events
      this._filterView.addEventListener("filterParameters", this._updateFilterResults.bind(this));

    });
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

  // @TODO start of integrating query params into pages
  _getQueryParams(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    // Update pagination state from query params
    if(urlParams.get("pageSize")) this._paginationState.pageSize = urlParams.get("pg_size");
    if(urlParams.get("start")) this._paginationState.start = urlParams.get("start");
    if(urlParams.get("stop")) this._paginationState.stop = urlParams.get("stop");
  }

  _cardGallery(filterParams, paginationState) {
    this.loading.showSpinner();
    this.setAttribute("has-open-modal", "");

    // Initial view-modal "Cardlist" from fetched localizations
    this.cardData.makeCardList(filterParams, paginationState)
    .then((cardList) => {
      // CardList inits Gallery component with cards & pagination on page
      this._filterResults.show(cardList);
      this.loading.hideSpinner();
      this.removeAttribute("has-open-modal");
    });
  }

  // Handler for filter submission
  // Reset the pagination back to page 0
  _updateFilterResults(evt){
    this._filterParams = evt.detail.conditions;
    this._paginationState.init = true;
    this._paginationState.pageSize = this._filterResults._paginator.getPageSize();
    this._paginationState.start = 0;
    this._paginationState.stop = this._paginationState.pageSize - 1;
    this._cardGallery(this._filterParams, this._paginationState);
  }

  // Handler for pagination click
  _paginateFilterResults(evt){
    this._paginationState.start = evt.detail.start;
    this._paginationState.stop = evt.detail.stop;
    this._paginationState.init = false;
    this._cardGallery(this._filterParams, this._paginationState);
  }

<<<<<<< HEAD
  setScrollHeight(){
    console.log("window.innerHeight: " + window.innerHeight);
    this.main.style.height = window.innerHeight;

    window.addEventListener("resize", () => {
      this.main.style.height = window.innerHeight;
    })
  }

=======
>>>>>>> rside behavior
}

customElements.define("analytics-annotations", AnalyticsAnnotations);
