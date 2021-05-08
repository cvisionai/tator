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

    this._settings = document.createElement("analytics-settings");
    this._settings.style.marginLeft = "50px";
    div.appendChild(this._settings);

    // Wrapper to allow r.side bar to slide into left
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper col-12 d-flex");
    this._shadow.appendChild(this.mainWrapper);

    //
    // Define the main section of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "enitity-gallery--main col-12");
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
    this.aside = document.createElement("aside");
    this.aside.setAttribute("class", "entity-panel--container slide-close col-3")
    this.mainWrapper.appendChild(this.aside);

    // Gallery navigation panel
    this._panelContainer = document.createElement("entity-panel-container");
    this.aside.appendChild(this._panelContainer);

    //
    /* Other */
    // Class to hide and showing loading spinner
    // @TODO what is standard use?
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Modal parent - to pass to page components
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild( this.modal );
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  _init() {

    this.loading.showSpinner();
    this.showDimmer();

    // Initialize the settings with the URL. The settings will be used later on.
    this._settings.processURL();

    // Database interface. This should only be used by the viewModel/interface code.
    this.projectId = Number(this.getAttribute("project-id"));
    this._modelData = new TatorData(this.projectId);
    this._modelData.init().then(() => {

      // Init vars for filter state
      this._filterState = {
        conditionsObject: this._settings.getFilterConditionsObject()
      };

      // Init vars for pagination state
      let pageSize = this._settings.getPageSize();
      if (Number.isNaN(pageSize)) {
        pageSize = this._filterResults._paginator.getPageSize();
      }

      let page = this._settings.getPage();
      if (Number.isNaN(page)) {
        page = 1;
      }

      let pageStart = (page - 1) * pageSize;
      let pageStop = pageStart + pageSize;
      this._paginationState = {
        pageSize: pageSize,
        page: page,
        start: pageStart,
        stop: pageStop,
        init: true
      };

      // Filter interface
      this._filterDataView = new FilterData(this._modelData);
      this._filterDataView.init();
      this._filterView.dataView = this._filterDataView;
      this._filterView.setFilterConditions(this._filterState.conditionsObject);

      // Card Data class collects raw model and parses into view-model format
      this.cardData = document.createElement("annotation-card-data");
      this.cardData.init(this._modelData);

      this.cardData.addEventListener("setCardImage", (evt) => {
        this._filterResults.updateCardImage(evt.detail.id, evt.detail.image);
      });

      // Init panel side behavior
      this._panelContainer.init({ main: this.main, aside : this.aside, pageModal : this.modal, modelData : this._modelData });

      // Update the card with the localization's associated media
      this.cardData.addEventListener("setMedia", (evt) => {
        this._filterResults.updateCardMedia(evt.detail.id, evt.detail.media);
      });
      
      // Pass panel and localization types to gallery
      this._filterResults._initPanel( {
        panelContainer : this._panelContainer,
        pageModal : this.modal,
        modelData : this._modelData
      } );

      // Init history & check if state is stored in URL, update default states
      this.history = new FilterHistoryManagement({ _paginationState : this._paginationState, _filterState : this._filterState });
      //this._checkHistoryState();

      // Init Card Gallery and Right Panel
      this._cardGallery({ 
        filterState : this._filterState, 
        paginationState : this._paginationState
      });

      // Listen for pagination events
      this._filterResults._paginator.addEventListener("selectPage", this._paginateFilterResults.bind(this));
      this._filterResults._paginator_top.addEventListener("selectPage", this._paginateFilterResults.bind(this));

      this._filterResults._paginator.setValues(this._paginationState);
      this._filterResults._paginator_top.setValues(this._paginationState);

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


  _checkHistoryState(){
    // If there was a param string, these objects would not be empty
    const statesObj = this.history._readQueryParams();
    console.log(statesObj);
    // If the history returns non-empty objects, update our local state
    if(statesObj.filtState !== {} && statesObj.filtState !== null) 
    {
      this._filterState = statesObj.filtState;
    }
    if(statesObj.pagState !== {} && statesObj.pagState !== null)
    {
      this._paginationState = statesObj.pagState;
    } 
  }

  _cardGallery({ filterState, paginationState}) {
    this.loading.showSpinner();
    this.showDimmer();

    // Initial view-modal "Cardlist" from fetched localizations
    this.cardData.makeCardList({filterState, paginationState})

    .then((cardList) => {
      // CardList inits Gallery component with cards & pagination on page
      this._filterResults.show(cardList);
      this.loading.hideSpinner();
      this.hideDimmer();
    });
  }

  // Reset the pagination back to page 0
  _updateFilterResults(evt){
    this._filterState.conditionsObject = evt.detail.conditions;

    var filterURIString = encodeURIComponent(JSON.stringify(this._filterState.conditionsObject));
    this._paginationState.init = true;

    // @TODO reset to default page size? or keep if something was chosen?
    this._paginationState.pageSize = this._filterResults._paginator.getPageSize();
    this._paginationState.start = 0;
    this._paginationState.page = 1;
    this._paginationState.stop = this._paginationState.pageSize;
    
    // updated the card gallery
    this._cardGallery({ 
      filterState : this._filterState, 
      paginationState : this._paginationState
    });

    this._settings.setAttribute("filterConditions", filterURIString);
    this._settings.setAttribute("pagesize", this._paginationState.pageSize);
    this._settings.setAttribute("page", this._paginationState.page);
    window.history.pushState({}, "", this._settings.getURL());
  }

  // Handler for pagination click
  _paginateFilterResults(evt){
    // set state
    this._paginationState.start = evt.detail.start;
    this._paginationState.stop = evt.detail.stop;
    this._paginationState.page = evt.detail.page;
    this._paginationState.pageSize = evt.detail.pgsize;
    this._paginationState.init = false;

    // get the gallery
    this._cardGallery({ 
      filterState : this._filterState, 
      paginationState : this._paginationState
    });

    // make sure view lined up top and bottom
    this._filterResults._paginator.setValues(this._paginationState);
    this._filterResults._paginator_top.setValues(this._paginationState);

    this._settings.setAttribute("pagesize", this._paginationState.pageSize);
    this._settings.setAttribute("page", this._paginationState.page);
    window.history.pushState({}, "", this._settings.getURL());
  }

  // Page dimmer handler
  showDimmer(){
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer(){
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("analytics-annotations", AnalyticsAnnotations);
