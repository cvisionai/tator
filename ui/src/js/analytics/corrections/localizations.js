import { TatorPage } from "../../components/tator-page.js";
import { TatorData } from "../../util/tator-data.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { FilterData } from "../../components/filter-data.js";

/**
 * Page that displays a grid view of selected annotations
 */
export class AnalyticsLocalizationsCorrections extends TatorPage {
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
    this._breadcrumbs.setAttribute("analytics-name", "Corrections");

    this._settings = document.createElement("analytics-settings");
    this._settings.style.marginLeft = "50px";
    div.appendChild(this._settings);

    // this._settings._bulkCorrect.hidden = false;
        // entity-gallery-bulk-edit
    // Part of Gallery: Communicates between card + page
    this._bulkEdit = document.createElement("entity-gallery-bulk-edit");
    this._shadow.appendChild(this._bulkEdit);

    // Wrapper to allow r.side bar to slide into left
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper col-12 d-flex");
    this._shadow.appendChild(this.mainWrapper);
    this.mainWrapper.style.paddingBottom = "200px";

    //
    // Define the main section of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "enitity-gallery--main col-12");
    this.mainWrapper.appendChild(this.main);

    // this._bulkEditModal = this._bulkEdit._bulkEditModal; //document.createElement("modal-dialog");
    // this.mainWrapper.appendChild(this._bulkEdit._editPanel);
    // this._bulkEdit._editPanel.addEventListener("select-click", this._bulkEdit._editPanel._bulkEditModal.closeCallback)
    // this._settings._bulkCorrect.addEventListener("click", this._bulkEdit._showSelectionPanel.bind(this._bulkEdit))  

    //
    /* Card Gallery */
    // Gallery of cards showing filter results
    this._filterResults = document.createElement("annotations-corrections-gallery");
    this.main.appendChild(this._filterResults);

    

    // Localizations Filter
    /* Filter interface part of gallery */
    this._filterView = document.createElement("filter-interface");
    this._filterResults._filterDiv.appendChild(this._filterView);

    // Custom gallery more menu added into filter interface tools ares
    this._filterView._moreNavDiv.appendChild(this._filterResults._moreMenu);

    //
    /* Right Navigation Pane - Annotation Detail Viewer */
    this.aside = document.createElement("aside");
    this.aside.setAttribute("class", "hidden entity-panel--container slide-close col-3")
    this.mainWrapper.appendChild(this.aside);

    // Gallery navigation panel
    this._panelContainer = document.createElement("entity-panel-container");
    this.aside.appendChild(this._panelContainer);

    // Use in panel navigation
    this._panelContainer._panelTop._navigation.init();



    //
    /* Other */
    // Class to hide and showing loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Modal parent - to pass to page components
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));


  }

  async _init() {
    // Database interface. This should only be used by the viewModel/interface code.
    this.projectId = Number(this.getAttribute("project-id"));
    this._modelData = new TatorData(this.projectId);

    // Init after modal is defined
    this._bulkEdit.init(this);

    // Card Data export class collects raw model and parses into view-model format
    this.cardData = document.createElement("annotation-card-data");
    await this.cardData.init(this._modelData);

    this.cardData.addEventListener("setCardImage", (evt) => {
      this._filterResults.updateCardImage(evt.detail.id, evt.detail.image);
    });

    // Pass panel and localization types to gallery
    this._filterResults._initPanel({
      panelContainer: this._panelContainer,
      pageModal: this.modal,
      modelData: this._modelData,
      cardData: this.cardData,
      bulkEdit: this._bulkEdit
    });

    // Initialize the settings with the URL. The settings will be used later on.
    this._settings.processURL();

    // Set lock value
    this._settings._lock.hidden = true; // #TODO

    // if (this._settings.hasAttribute("lock")) {
    //   let settingsLock = this._settings.getAttribute("lock");

    //   if (settingsLock === "1") {
    //     this._settings._lock.unlock();
    //     this._panelContainer.setAttribute("permissionValue", "Can Edit");
    //   }
    // }

    // Init vars for filter state
    this._filterConditions = this._settings.getFilterConditionsObject();
    this._bulkEdit.checkForFilters(this._filterConditions);
    this._useCachedResults = false;

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



    // Init Card Gallery and Right Panel
    await this._cardGallery(
      this._filterConditions,
      this._paginationState
    );

    // Filter interface
    this._filterDataView = new FilterData(
      this._modelData, ["annotation-analytics-view"], ["MediaStates", "LocalizationStates"]);

    // Init panel side behavior
    this._panelContainer.init({
      main: this.main,
      aside: this.aside,
      pageModal: this.modal,
      modelData: this._modelData,
      gallery: this._filterResults
    });

    // Settings lock value
    // this._settings._lock.addEventListener("click", evt => {
    //   const locked = this._settings._lock._pathLocked.style.display != "none";
    //   const permissionValue = locked ? "View Only" : "Can Edit";
    //   const panelPermissionEvt = new CustomEvent("permission-update", { detail: { permissionValue } })
    //   this._panelContainer.dispatchEvent(panelPermissionEvt);

    //   if (locked) {
    //     this._settings.setAttribute("lock", 0);
    //   } else {
    //     this._settings.setAttribute("lock", 1);
    //   }
    //   //window.history.pushState({}, "", this._settings.getURL());
    // });



    // this.loading.showSpinner();
    // this.showDimmer();
    this._modelData.init().then(() => {
      this._filterDataView.init(); // requires model data to be init
      this._filterView.dataView = this._filterDataView;
      this._filterView.setFilterConditions(this._filterConditions);

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

  _cardGallery(filterConditions, paginationState) {
    this.showDimmer();
    this.loading.showSpinner();

    /**
     * Always use a cached list when fetching cards for any pagination state
     */
    // if (this._filterView._useCachedResults) {
      // Initial view-modal "Cardlist" from fetched localizations
      return this.cardData.makeCardListFromBulk(filterConditions, paginationState).then((cardList) => {
        // CardList inits Gallery component with cards & pagination on page
        this._filterResults.show(cardList);
        this.loading.hideSpinner();
        this.hideDimmer();
      });      
    // } else {
    //   // Initial view-modal "Cardlist" from fetched localizations
    //   this.cardData.makeCardList(filterConditions, paginationState).then((cardList) => {
    //     // CardList inits Gallery component with cards & pagination on page
    //     this._filterResults.show(cardList);
    //     this.loading.hideSpinner();
    //     this.hideDimmer();
    //   });
    // }
    
  }

  // Reset the pagination back to page 0
  async _updateFilterResults(evt) {
    this._filterConditions = evt.detail.conditions;
    // console.log("UPDATE FILTER RESULTS");
    this._bulkEdit.checkForFilters(this._filterConditions);

    var filterURIString = encodeURIComponent(JSON.stringify(this._filterConditions));
    this._paginationState.init = true;

    // @TODO reset to default page size? or keep if something was chosen?
    this._paginationState.pageSize = this._filterResults._paginator.getPageSize();
    this._paginationState.start = 0;
    this._paginationState.page = 1;
    this._paginationState.stop = this._paginationState.pageSize;

    // updated the card gallery
    await this._cardGallery(
      this._filterConditions,
      this._paginationState
    );

    this._settings.setAttribute("filterConditions", filterURIString);
    this._settings.setAttribute("pagesize", this._paginationState.pageSize);
    this._settings.setAttribute("page", this._paginationState.page);
    window.history.pushState({}, "", this._settings.getURL());
  }

  // Handler for pagination click
  async _paginateFilterResults(evt) {
    // set state
    this._paginationState.start = evt.detail.start;
    this._paginationState.stop = evt.detail.stop;
    this._paginationState.page = evt.detail.page;
    this._paginationState.pageSize = evt.detail.pageSize;
    this._paginationState.init = false;

    // get the gallery
    await this._cardGallery(
      this._filterConditions,
      this._paginationState
    );

    // make sure view lined up top and bottom
    this._filterResults._paginator.setValues(this._paginationState);
    this._filterResults._paginator_top.setValues(this._paginationState);

    this._settings.setAttribute("pagesize", this._paginationState.pageSize);
    this._settings.setAttribute("page", this._paginationState.page);
    window.history.pushState({}, "", this._settings.getURL());
  }

  // Page dimmer handler
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("analytics-localizations-corrections", AnalyticsLocalizationsCorrections);
