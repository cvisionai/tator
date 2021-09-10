class AppsVerificationPage extends TatorPage {
  constructor() {
    super();

    // header
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-2 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);
    
    this._breadcrumbs = document.createElement("verification-breadcrumbs");
    div.appendChild(this._breadcrumbs);

    //
    // Define the main section of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "position-relative");
    this._shadow.appendChild(this.main);

    // Table Container
    const headerText = document.createElement("div");
    headerText.setAttribute("class", "project__header d-flex flex-items-center px-2");
    this.main.appendChild(headerText);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3 text-white"); //not a typo
    this._name.textContent = "SVP Records Needing Verification";
    headerText.appendChild(this._name);

    this._numFiles = document.createElement("span");
    this._numFiles.setAttribute("class", "text-gray px-2");
    headerText.appendChild(this._numFiles);

    // Gallery count / info
    this._table = document.createElement("verification-table");
    this.main.appendChild(this._table);

    // Add this before table init
    this._table.addEventListener("update-count", this.updateTableCount.bind(this));

    //
    /* Other */
    // Class to hide and showing loading spinner
    // @TODO what is standard use?
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Modal parent - to pass to page components
    // this.modal = document.createElement("modal-dialog");
    // this._shadow.appendChild(this.modal);
    // this.modal.addEventListener("open", this.showDimmer.bind(this));
    // this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // All of the file data
    this._data = null;

    // Subset shown to user at a given time
    this._displayData = null;
  }

    /* Get personlized information when we have project-id, and fill page. */
    static get observedAttributes() {
      return ["project-id"].concat(TatorPage.observedAttributes);
    }
    attributeChangedCallback(name, oldValue, newValue) {
      TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
      switch (name) {
        case "project-id":
          this.projectId = Number(newValue);
          this._init();
          break;
      }
    }
  

  async _init() {
    // Inventory data view
    console.log(this.projectId)

    this._appData = new AppData(this.projectId);
    let tableColumns = await this._appData._getSubmissionInfo();

    this.loading.showSpinner();
    // Pass panel and localization types to gallery
    this._table.init({
      panelContainer: this._panelContainer,
      columns: tableColumns
    });
    this.loading.hideSpinner();

    this._displayData = await this._appData._getSubmissionData();

    this._table._refreshTable(this._displayData);

    // Listen for events
    // this._table.addEventListener("detail-click", this.openDetailsPanel.bind(this));

    // Listen for events
    this._table.addEventListener("sort", this.frontEndSort.bind(this));
  }


  updateTableCount() {
    this._numFiles.textContent = this._table._tableCount;
  }

  frontEndSearch(e) {
    let searchTerm = e.detail.searchTerm;
    this._displayData = null;

    for(let item of this._data) {
      if (item.id.indexOf(searchTerm)) {
        this._displayData.push(item);
      }
    }
    console.log(this._data);
    console.log(this._displayData);

    this._table._refreshTable(this._displayData);
  }

  frontEndFilter(e) {
    // close any open details
    this._panelContainer._panelTop.openHandler({ openFlag: false } );
    
    // Use the media list from current saved queries to create display data
    let showMedias = e.detail.medias;
    this._displayData = [];
    
    for (let item of this._data) {
      if (showMedias.has(item.id)) {
        this._displayData.push(item);
      }
    }
    console.log(this._data);
    console.log(this._displayData);

    this._table._refreshTable(this._displayData);
  }

  frontEndFilterShowAll(e) {
    return this._table._refreshTable(this._data);
  }

  frontEndSort(e) {
    // sort the current data, and refresh table
    let selectedId = this._table.findSelected();
    let prop = e.detail.sortData.name;
    this._sortCompare = null;

    if (e.detail.sortData.sortType == "asc") {
      this._sortCompare = (c, d) => {
        if (c < d) return -1;
        if (c > d) return 1;
        return 0;
      };
    } else {
      this._sortCompare = (c, d) => {
        if (c < d) return 1;
        if (c > d) return -1;
        return 0;
      };
    }

    let sorted = this._data.sort((a, b) => {
      let aProp = a;
      let bProp = b;
      let aIsNull = false;
      let bIsNull = false;

      let path = prop.split("--");

      for (let p of path) {
        if (aProp != null && !aIsNull) {
          aProp = aProp[p];
        } else {
          aIsNull = true;
          aProp = "";
        }

        if (bProp != null && !bIsNull) {
          bProp = bProp[p];
        } else {
          bIsNull = true;
          bProp = "";
        }
      }

      return this._sortCompare(aProp, bProp);
    });

    this._data = sorted;
    // this._table._refreshTable(this._data);

    // reapply any front end filtering or selections
    this._filterButtons.applyCurrentValues();

    if (selectedId) {
      for (let r of this._table._rows) {
        if (r.getAttribute("id") == selectedId) {
          r.classList.add("selected");
        }
      }
    }

    return;
  }

}

customElements.define("apps-verification-page", AppsVerificationPage);