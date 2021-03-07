/**
 * Page that displays a grid view of selected annotations
 */
class AnalyticsAnnotations extends TatorPage {
  constructor() {
    super();

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

    //
    // Define the main section of the page
    //
    const main = document.createElement("main");
    main.setAttribute("class", "d-flex");
    this._shadow.appendChild(main);

    const filterDiv = document.createElement("div");
    filterDiv.setAttribute("class", "analysis__filter py-3 px-6");
    main.appendChild(filterDiv);

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

    // Gallery of cards showing filter results
    this._filterResults = document.createElement("annotations-gallery");
    this._shadow.appendChild(this._filterResults);

    // Class to hide and showing loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild( this.loading.getImg() );

    // Init vars for filter state 
    // @TODO checkback to integration w/ this._filterView
    this._filterState = {};
    this._filterState.filtered = false;
    this._filterState.params = "";

    // Init vars for pagination state
    this._paginationState = {};
    this._paginationState._pageSize = 10;
    this._paginationState._start = 0;
    this._paginationState._stop = 10;
    this._paginationState._page = 0;
    
  }

  _init() {

    // Database interface. This should only be used by the viewModel/interface code.
    this.projectId = Number(this.getAttribute("project-id"));
    this._modelData = new TatorData(this.projectId);

    // Filter interface
    this._filterDataView = new FilterData(this._modelData);
    this._filterDataView.init().then((localizationTypes) => {
      this.localizationTypes = localizationTypes;
      this._filterView.dataView = this._filterDataView;
    });

    // Card Data class collects raw model and parses into view-model format
    this.cardData = new CardData({
      projectId : this.projectId,
      modelData : this._modelData,
      localizationTypes : this.localizationTypes
    });

    // If state is stored in URL, update default states
    this._getQueryParams();

    // Init Card Gallery
    this._cardGallery({}); 

    // Listen for pagination events
    this._filterResults._paginator.addEventListener("selectPage", this._paginateFilterResults.bind(this));

    // Listen for filter events
    this._filterView._filterDialog.addEventListener("newFilterSet", this._updateFilterResults.bind(this));

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

    // Update filter state from URL query params
    if(urlParams.get("filter")) {
      let decoded = decodeURI(urlParams.get("filter"));
      this._filterState.params = decoded != null ? decoded : "" ;
      this._filterState.filtered = true;
    } else {
      this._filterState.filtered = false;
    }

    // Update pagination state from query params
    if(urlParams.get("pageSize")) this._paginationState._pageSize = urlParams.get("pg_size");
    if(urlParams.get("start")) this._paginationState._start = urlParams.get("start");
    if(urlParams.get("stop")) this._paginationState._stop = urlParams.get("stop");
    if(urlParams.get("page")) this._paginationState._page = urlParams.get("page");
  }

  _cardGallery({
    filterState = this._filterState, 
    paginationState = this._paginationState
  } = {}){
    console.log(filterState);
    console.log(paginationState);
    this.loading.showSpinner();
    // Initial view-modal "Cardlist" from fetched localizations
    this.cardData.makeCardList( { filterState, paginationState } )
    .then((cardList) => {
      this.loading.hideSpinner();
      this.removeAttribute("has-open-modal");
      // CardList inits Gallery component with cards & pagination on page
      this._filterResults.show( { cardList } );
    });
  }

  // Handler for filter submission
  _updateFilterResults(e){
    let params = this._localizationParams(e.detail.filterString);
    this._filterState.filtered = true;
    this._filterState.params = params;
    this._cardGallery({});
  }

  // Handler for pagination click
  _paginateFilterResults(e){
    e.preventDefault();
    console.log(e.detail);
    this._paginationState._start = e.detail.start;
    this._paginationState._stop = e.detail.stop;
    this._cardGallery({});
  }

  // @TODO - Do we need to convert any params here to work for our API calls?
  _localizationParams(string){
    console.log("Convert this to usable query params? or ok ::: "+string);
    return string;
  }

}

customElements.define("analytics-annotations", AnalyticsAnnotations);
