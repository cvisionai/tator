class AnalyticsCollections extends TatorPage {
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
      this._breadcrumbs.setAttribute("analytics-name", "Collections Gallery");

      // this._settings = document.createElement("analytics-settings");
      // this._settings.style.marginLeft = "50px";
      // div.appendChild(this._settings);

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

      //
      /* Slider w/ Cards Gallery */
      // Gallery of horizontal bars to view collections
      this._collections = document.createElement("collections-gallery");
      this.main.appendChild(this._collections);

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
      this._shadow.appendChild(this.modal);
      this.modal.addEventListener("open", this.showDimmer.bind(this));
      this.modal.addEventListener("close", this.hideDimmer.bind(this));
    }
  }
  
customElements.define("analytics-collections", AnalyticsCollections);