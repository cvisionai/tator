import { TatorPage } from "../../../components/tator-page.js";
import { TatorData } from "../../../util/tator-data.js";
import { LoadingSpinner } from "../../../components/loading-spinner.js";
import { FilterData } from "../../../components/filter-data.js";
import { Utilities } from "../../../util/utilities.js";

/**
 * Page that displays a grid view of selected annotations
 */
export class AnalyticsPage extends TatorPage {
  constructor() {
    super();

    //
    // Header
    //
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute(
      "class",
      "annotation__header d-flex flex-items-center flex-justify-between px-6 f3"
    );
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(this._div);

    this._breadcrumbs = document.createElement("analytics-breadcrumbs");
    this._div.appendChild(this._breadcrumbs);

    this._settings = document.createElement("analytics-settings");
    this._settings.style.marginLeft = "50px";
    this._div.appendChild(this._settings);

    // entity-gallery-bulk-edit
    // Part of Gallery: Communicates between card + page
    this._bulkEdit = document.createElement("entity-gallery-bulk-edit");
    this._bulkEdit._editPanel.hidden = false;
    this._shadow.appendChild(this._bulkEdit);

    this.deleteBulkModal = document.createElement("delete-bulk-modal");
    this._shadow.appendChild(this.deleteBulkModal);

    const deleteSelectedButton = document.createElement("delete-button");
    deleteSelectedButton.setAttribute("name", "Delete selected localizations");
    deleteSelectedButton._span.textContent = "Delete selected localizations";
    this._bulkEdit._editPanel._otherTools.appendChild(deleteSelectedButton);

    // Wrapper to allow r.side bar to slide into left
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute(
      "class",
      "analysis--main--wrapper col-12 d-flex"
    );
    this._shadow.appendChild(this.mainWrapper);

    //TODO
    // this.mainWrapper.style.paddingBottom = "200px";

    //
    // Define the main section of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "enitity-gallery--main col-12");
    this.mainWrapper.appendChild(this.main);

    //
    /* Card Gallery */
    // Gallery of cards showing filter results
    // this._filterResults = this._getGallery();

    //
    /* Right Navigation Pane - Annotation Detail Viewer */
    this.aside = document.createElement("aside");
    this.aside.setAttribute(
      "class",
      "entity-panel--container slide-close col-3"
    );
    this.aside.hidden = true;
    this.mainWrapper.appendChild(this.aside);

    // Gallery navigation panel
    this._panelContainer = document.createElement("entity-panel-container");
    this.aside.appendChild(this._panelContainer);

    // Use in panel navigation
    this._panelContainer._panelTop._navigation.init();

    // Event listeners
    this.deleteBulkModal.addEventListener(
      "confirmFileDelete",
      this._deleteSuccess.bind(this)
    );
    deleteSelectedButton.addEventListener(
      "click",
      this._deleteSelection.bind(this)
    );

    this._bulkEdit.addEventListener(
      "bulk-attributes-edited",
      this.handleOutsideUpdate.bind(this)
    );

    //
    /* Other */
    // Class to hide and showing loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    //
    // Modal parent - to pass to page components
    this.modalNotify = document.createElement("modal-notify");
    this._shadow.appendChild(this.modalNotify);
    this.modalNotify.addEventListener("open", this.showDimmer.bind(this));
    this.modalNotify.addEventListener("close", this.hideDimmer.bind(this));

    // Modal parent - to pass to page components
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  async _init(project) {
    this._breadcrumbs.setAttribute("project-name", project.name);

    // Database interface. This should only be used by the viewModel/interface code.
    this.projectId = project.id;
    this.deleteBulkModal.setAttribute("project-id", this.projectId);
    this.deleteBulkModal.addEventListener("close", this.hideDimmer.bind(this));
    this._modelData = new TatorData(this.projectId);

    // Card Data export class collects raw model and parses into view-model format
    this.cardData = document.createElement("annotation-card-data");
    await this.cardData.init(this._modelData);

    this.cardData.addEventListener("setCardImage", (evt) => {
      this._filterResults.updateCardImage(evt.detail.id, evt.detail.image);
    });

    await this._modelData.init();

    // Init sort
    this._filterResults._sort.init(
      "Localization",
      this._modelData._localizationTypes
    );

    // Init after modal is defined & modelData
    this._bulkEdit.init({
      page: this,
      permission: this._modelData._project.permission,
      bulkInit: this._bulkInit,
    });

    // Pass panel and localization types to gallery
    this._filterResults._initPanel({
      panelContainer: this._panelContainer,
      pageModal: this.modal,
      modelData: this._modelData,
      cardData: this.cardData,
      bulkEdit: this._bulkEdit,
      modalNotify: this.modalNotify,
      bulkInit: this._bulkInit,
    });

    // Initialize the settings with the URL. The settings will be used later on.
    this._settings.processURL();

    // Set lock value
    // this._settings._lock.hidden = true; // #TODO
    this.setupLock(project);

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
      init: true,
    };

    // Init vars for sort
    this._sortState = this._filterResults._sort.getQueryParam();

    // Init Card Gallery and Right Panel
    await this._cardGallery({
      conditions: this._filterConditions,
      pagination: this._paginationState,
      sort: this._sortState,
      cache: false,
    });

    // Filter interface
    this._filterDataView = new FilterData(
      this._modelData,
      ["annotation-analytics-view"],
      ["MediaStates"],
      [],
      false,
      {"FrameStates": "States (Coincident)",
       "LocalizationStates": "States (Track Membership)"},
      true
    );

    // Init panel side behavior
    this._panelContainer.init({
      main: this.main,
      aside: this.aside,
      pageModal: this.modal,
      modelData: this._modelData,
      gallery: this._filterResults,
      bulkEdit: this._bulkEdit,
    });

    this._filterDataView.init(); // requires model data to be init
    this._filterView.dataView = this._filterDataView;
    this._filterView.setFilterConditions(this._filterConditions);

    // Listen for pagination events
    this._filterResults._paginator.addEventListener(
      "selectPage",
      this._paginateFilterResults.bind(this)
    );
    this._filterResults._paginator_top.addEventListener(
      "selectPage",
      this._paginateFilterResults.bind(this)
    );

    this._filterResults._paginator.setValues(this._paginationState);
    this._filterResults._paginator_top.setValues(this._paginationState);

    // Listen for filter events
    this._filterView.addEventListener(
      "filterParameters",
      this._updateFilterResults.bind(this)
    );

    // Listen for sort events
    this._filterResults._sort.addEventListener(
      "sortBy",
      this._updateFilterResults.bind(this)
    );
  }

  set store(val) {
    this._store = val;

    // Create store subscriptions
    this._store.subscribe((state) => state.user, this._setUser.bind(this));
    this._store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    this._store.subscribe((state) => state.project, this._init.bind(this));

    this._initStore();
  }

  async _initStore() {
    // Initialize store data
    const values = await this._store.getState().init();
    console.log("Analytics page init with values", values);
  }

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
  }

  setupLock(data) {
    this._permission = data.permission;

    if (this._permission === "View Only") {
      // hide the ability to change editing
      this._settings._lock.viewOnly();
      if (this._settings.hasAttribute("lock"))
        this._settings.removeAttribute("lock");
      this._settings._bulkCorrect.hidden = true; // #TODO need permission within this as well
      this._panelContainer.setAttribute("permissionValue", "View Only");
      this._settings.setAttribute("lock", 0);
    } else {
      // Show the bulk edit button
      this._settings._bulkCorrect.hidden = false; // #TODO  need permission within this as well

      // Set lock value from the settings value // in URL
      if (
        this._settings.hasAttribute("lock") &&
        this._settings.getAttribute("lock") === "0"
      ) {
        this._settings._lock.lock();
        this._panelContainer.setAttribute("permissionValue", "View Only");
        this._settings.setAttribute("lock", 0);
      } else {
        // User can edit, default is unlocked
        this._settings._lock.unlock();
        this._panelContainer.setAttribute("permissionValue", "Can Edit");
        this._settings.setAttribute("lock", 1);
      }

      // Settings lock listener enabled
      this._settings._lock.addEventListener("click", (evt) => {
        const locked = this._settings._lock._pathLocked.style.display != "none";
        const permissionValue = locked ? "View Only" : "Can Edit";
        const panelPermissionEvt = new CustomEvent("permission-update", {
          detail: { permissionValue },
        });
        this._panelContainer.dispatchEvent(panelPermissionEvt);

        if (locked) {
          this._settings.setAttribute("lock", 0);
        } else {
          this._settings.setAttribute("lock", 1);
        }
        window.history.pushState({}, "", this._settings.getURL());
      });
    }
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  _cardGallery({ conditions, pagination, sort, cache }) {
    this.showDimmer();
    this.loading.showSpinner();

    /**
     * Always use a cached list when fetching cards for any pagination state
     */
    if (cache) {
      // Initial view-modal "Cardlist" from fetched localizations
      return this.cardData
        .makeCardListFromBulk(conditions, pagination, sort)
        .then((cardList) => {
          // CardList inits Gallery component with cards & pagination on page
          this._filterResults.show(cardList);
          this.loading.hideSpinner();
          this.hideDimmer();
        });
    } else {
      // Initial view-modal "Cardlist" from fetched localizations
      this.cardData
        .makeCardList(conditions, pagination, sort)
        .then((cardList) => {
          // CardList inits Gallery component with cards & pagination on page
          this._filterResults.show(cardList);
          this.loading.hideSpinner();
          this.hideDimmer();
        });
    }
  }

  // Reset the pagination back to page 0
  async _updateFilterResults(evt) {
    if (evt?.detail?.conditions) {
      this._filterConditions = evt.detail.conditions;
    }
    // console.log("UPDATE FILTER RESULTS");
    this._bulkEdit.checkForFilters(this._filterConditions);

    var filterURIString = encodeURIComponent(
      JSON.stringify(this._filterConditions)
    );
    this._paginationState.init = true;

    // @TODO reset to default page size? or keep if something was chosen?
    this._paginationState.pageSize =
      this._filterResults._paginator.getPageSize();
    this._paginationState.start = 0;
    this._paginationState.page = 1;
    this._paginationState.stop = this._paginationState.pageSize;

    this._sortState = this._filterResults._sort.getQueryParam();

    // updated the card gallery because of filter
    await this._cardGallery({
      conditions: this._filterConditions,
      pagination: this._paginationState,
      sort: this._sortState,
      cache: false,
    });

    this._settings.setAttribute("sort", this._sortState);
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

    this._sortState = this._filterResults._sort.getQueryParam();

    // get the gallery during pagination
    await this._cardGallery({
      conditions: this._filterConditions,
      pagination: this._paginationState,
      sort: this._sortState,
      cache: true,
    });

    // make sure view lined up top and bottom
    this._filterResults._paginator.setValues(this._paginationState);
    this._filterResults._paginator_top.setValues(this._paginationState);

    this._settings.setAttribute("pagesize", this._paginationState.pageSize);
    this._settings.setAttribute("page", this._paginationState.page);
    window.history.pushState({}, "", this._settings.getURL());
  }

  _deleteSelection() {
    const list = Array.from(this._bulkEdit._currentMultiSelection);
    console.log("Delete selection heard", list);

    if (list && list.length > 0) {
      this.deleteBulkModal.setAttribute(
        "delete-name",
        "Selected localizations"
      );
      this.deleteBulkModal.setAttribute("delete-id", String(list));
      this.deleteBulkModal.open(this._bulkEdit._currentSelectionObjects);

      this.setAttribute("has-open-modal", "");
    } else {
      // TODO
      // this._notify(
      //   "Make a selection",
      //   "Nothing to delete! Make a selection first.",
      //   "error"
      // );
    }
  }

  async _deleteSuccess(evt) {
    this._bulkEdit._clearSelection();
    this._panelContainer._panelTop.openHandler({ openFlag: false }, null, null);

    this.deleteBulkModal.removeAttribute("is-open");
    this.removeAttribute("has-open-modal", "");

    let msg = `Delete success! Updating...`;
    Utilities.showSuccessIcon(msg);

    // Setup Card Gallery and Right Panel
    await this._cardGallery({
      conditions: this._filterConditions,
      pagination: this._paginationState,
      sort: this._sortState,
      cache: false,
    });

    let msg2 = `Delete success! Gallery updated`;
    Utilities.showSuccessIcon(msg2);
  }

  async handleOutsideUpdate(evt) {
    this._bulkEdit._clearSelection();
    this._panelContainer._panelTop.openHandler({ openFlag: false }, null, null);

    let msg = `Update success...`;
    Utilities.showSuccessIcon(msg);

    // Setup Card Gallery and Right Panel
    await this._cardGallery({
      conditions: this._filterConditions,
      pagination: this._paginationState,
      sort: this._sortState,
      cache: false,
    });

    let msg2 = `Gallery updated!`;
    Utilities.showSuccessIcon(msg2);
  }

  // Page dimmer handler
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("analytics-page", AnalyticsPage);
