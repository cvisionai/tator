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

    // Init Card Gallery with default : 0-20 of All Localizations
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

  _cardGallery({filtered = false, params = "", start = 0, stop = 10} = {}){
    this.setAttribute("has-open-modal", "");
    this.loading.showSpinner();
    // Initial view-modal "Cardlist" from fetched localizations
    this.cardData.makeCardList({params, start, stop})
    .then((cardList) => {
      this.loading.hideSpinner();
      this.removeAttribute("has-open-modal");
      // CardList inits Gallery component with cards & pagination on page
      this._filterResults.show( {filtered, start, stop, cardList} );
    });
  }

  _updateFilterResults(e){
    let params = this._localizationParams(e.detail.filterString);
    this._cardGallery({
      filtered : true,
      params
    });
  }

  _paginateFilterResults(e){
    console.log(e.detail);
  }

  _localizationParams(string){
    console.log("Convert this to usable query params? or ok ::: "+string);
    return "";
  }

}

customElements.define("analytics-annotations", AnalyticsAnnotations);