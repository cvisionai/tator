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
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper col-7 d-flex");
    this._shadow.appendChild(this.mainWrapper);

    //
    // Define the main section of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "analysis--main col-7");
    this.mainWrapper.appendChild(this.main);

    // Dynamic
    this.setScrollHeight()

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

    /* Card Gallery */
    // Gallery of cards showing filter results
    this._filterResults = document.createElement("annotations-gallery");
    this.main.appendChild(this._filterResults);

    /* Right Navigation Pane - Annotation Detail Viewer */
    // Gallery navigation panel  
    this._panelContainer = document.createElement("div");
    this._panelContainer.setAttribute("class", "entity-panel--container col-5 py-3") //@TODO .slide = open by default
    this.mainWrapper.appendChild(this._panelContainer);

    // Panel top bar
    this._topBar = document.createElement("div");
    this._topBar.setAttribute("class", "entity-panel--container--top-bar py-6 px-3");
    this._panelContainer.appendChild(this._topBar);

    // Panel name
    this._topBarH3 = document.createElement("h3");
    this._topBarH3.setAttribute("class", "entity-panel--container--top-bar--h3  text-semibold h3 ");
    this._topBarH3.appendChild( document.createTextNode("Annotation Viewer") );
    this._topBar.appendChild(this._topBarH3);

    // Panel text
    this._topBarP = document.createElement("p");
    this._topBarP.setAttribute("class", "entity-panel--container--top-bar--p text-gray py-2 ");
    this._topBarP.appendChild( document.createTextNode("Hover over localizations in gallery to preview annotations. Click to pin in the viewer.") );
    this._topBar.appendChild(this._topBarP);    

    /* Other */
    // Class to hide and showing loading spinner
    // @TODO what is standard use?
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
    this._paginationState._start = 1;
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

    // Pass panel and localization types to gallery
    this._filterResults._initPanel( { 
      panelContainer : this._panelContainer, 
      localizationTypes : this.localizationTypes 
    } );

    // If state is stored in URL, update default states
    this._getQueryParams();

    // Init Card Gallery and Right Panel
    this._cardGallery({panelContainer : this.panelContainer});

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

  setScrollHeight(){
    console.log(window.innerHeight);
    this.main.style.height = window.innerHeight;

    window.addEventListener("resize", () => {
      this.main.style.height = window.innerHeight;
    })
  }

}

customElements.define("analytics-annotations", AnalyticsAnnotations);