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
    headerText.setAttribute("class", "project__header d-flex flex-items-center px-6 py-6 col-6 float-left");
    this.main.appendChild(headerText);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3 text-white"); //not a typo
    this._name.textContent = "SVP Records Needing Verification";
    headerText.appendChild(this._name);

    this._numFiles = document.createElement("span");
    this._numFiles.setAttribute("class", "text-gray px-2");
    headerText.appendChild(this._numFiles);

    // front end table search
    const searchDiv = document.createElement("div");
    searchDiv.setAttribute("class", "project__search search d-flex position-relative px-6 py-6 col-6 float-right");
    this.main.appendChild(searchDiv);

    const label = document.createElement("label");
    label.setAttribute("class", "circle d-inline-flex flex-items-center flex-justify-center f1");
    label.setAttribute("for", "search-project");
    searchDiv.appendChild(label);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-search");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", ".9em");
    svg.setAttribute("width", ".9em");
    label.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Search";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M16.041 15.856c-0.034 0.026-0.067 0.055-0.099 0.087s-0.060 0.064-0.087 0.099c-0.627 0.604-1.365 1.091-2.18 1.429-0.822 0.34-1.725 0.529-2.675 0.529s-1.853-0.189-2.677-0.53c-0.856-0.354-1.627-0.874-2.273-1.521s-1.166-1.417-1.521-2.273c-0.34-0.823-0.529-1.726-0.529-2.676s0.189-1.853 0.53-2.677c0.354-0.855 0.874-1.627 1.52-2.273s1.418-1.166 2.273-1.52c0.824-0.341 1.727-0.53 2.677-0.53s1.853 0.189 2.677 0.53c0.856 0.354 1.627 0.874 2.273 1.521s1.166 1.417 1.521 2.273c0.34 0.823 0.529 1.726 0.529 2.676s-0.189 1.853-0.53 2.677c-0.338 0.815-0.825 1.553-1.429 2.18zM21.707 20.293l-3.675-3.675c0.525-0.656 0.96-1.387 1.286-2.176 0.44-1.062 0.682-2.225 0.682-3.442s-0.242-2.38-0.682-3.442c-0.456-1.102-1.125-2.093-1.954-2.922s-1.82-1.498-2.922-1.954c-1.062-0.44-2.225-0.682-3.442-0.682s-2.38 0.242-3.442 0.682c-1.102 0.456-2.093 1.125-2.922 1.954s-1.498 1.82-1.954 2.922c-0.44 1.062-0.682 2.225-0.682 3.442s0.242 2.38 0.682 3.442c0.456 1.102 1.125 2.093 1.954 2.922s1.82 1.498 2.922 1.954c1.062 0.44 2.225 0.682 3.442 0.682s2.38-0.242 3.442-0.682c0.788-0.327 1.52-0.762 2.176-1.286l3.675 3.675c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414z");
    svg.appendChild(path);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "py-3 px-3 col-12 f2 text-white rounded-2 has-more");
    this._input.setAttribute("autocomplete", "off");
    this._input.setAttribute("type", "search");
    this._input.setAttribute("id", "search-project");
    this._input.setAttribute("name", "q");
    searchDiv.appendChild(this._input);

    this._input.setAttribute("placeholder", "Search Submissions...");

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
    this._displayData = null;
  }

    /* Get personlized information when we have project-id, and fill page. */
    static get observedAttributes() {
      return ["project-name", "project-id"].concat(TatorPage.observedAttributes);
    }
    attributeChangedCallback(name, oldValue, newValue) {
      TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
      switch (name) {
        case "project-name":
          this._breadcrumbs.setAttribute("project-name", newValue);
          break;
        case "project-id":
          this.projectId = Number(newValue);
          this._init();
          break;
      }
    }
  
    static get observedAttributes() {
      return ["project-name", "project-id"].concat(TatorPage.observedAttributes);
    }
  

  async _init() {
    this.loading.showSpinner();
    // Inventory data view
    this._appData = new AppData(this.projectId);
    let tableColumns = await this._appData._getSubmissionAttributes();

    // Pass panel and localization types to gallery
    this._table.init({
      columns: tableColumns,
      hasActionCol: true
    });
  
    this._data = await this._appData._getSubmissions();
    // console.log(this._data);

    // add data to table display
    this._displayData = this._data;
    this._table._refreshTable(this._displayData )
    this.loading.hideSpinner();

    // Listen for events
    // this._table.addEventListener("detail-click", this.openDetailsPanel.bind(this));

    // Listen for events
    this._input.addEventListener("input", this.frontEndSearch.bind(this));
    // this._search.addEventListener("filterProject", this.frontEndSearch.bind(this));
    this._table.addEventListener("sort", this.frontEndSort.bind(this));
  }

  updateTableCount() {
    this._numFiles.textContent = this._table._tableCount;
  }

  frontEndSearch() {
    // console.log(e);
    let searchTerm = String(this._input.value).toLowerCase();
    if(searchTerm == "") return this.frontEndFilterShowAll();

    try {
      let tmpData = [];
      for (let i of this._data) {
        let hasMatch = false;
        let attributes = i.attributes;

        for (let a in attributes) {
          let value = attributes[a];
          if (String(value).toLowerCase().indexOf(searchTerm) > -1) {
            // console.log(`String(value).indexOf(searchTerm) ... String(${value}).indexOf(${searchTerm}) `)
            hasMatch = true;
          }
        }
        if (hasMatch) {
          tmpData.push(i);
        }
      }
      
      // if (tmpData.length !== 0) {
        console.log(tmpData.length);
        this._displayData = tmpData;
        this._table._refreshTable(this._displayData);        
      // } else {
      //   // this.frontEndFilterShowAll();
      // }

    } catch (e) {
      console.error("Problem with search", e);
    }

  }

  _clearSearch(){
    return this.frontEndFilterShowAll();
  }

  frontEndFilterShowAll() {
    this._displayData = this._data;
    return this._table._refreshTable(this._displayData);
  }

  frontEndSort(e) {
    console.log(e);
    // sort the current data, and refresh table
    let selectedId = this._table.findSelected();
    let attributeName = e.detail.sortData.name;
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

    let sorted = this._displayData.sort((a, b) => {
      let aAttr = a.attributes;
      let bAttr = b.attributes;

      // find A and B values to compare
      let aVal = aAttr[attributeName];
      let bVal = bAttr[attributeName];

      return this._sortCompare(aVal, bVal);
    });

    this._displayData = sorted;
    this._table._refreshTable(this._displayData)

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