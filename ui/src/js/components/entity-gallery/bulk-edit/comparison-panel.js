import { TatorElement } from "../../tator-element.js";

export class AttributeComparisonPanel extends TatorElement {
  constructor() {
    super();

    this._bulkEditBar = document.createElement("div");
    this._bulkEditBar.setAttribute("class", "px-6 py-2 d-flex flex-wrap");
    this._shadow.appendChild(this._bulkEditBar);

    // let barTop = document.createElement("div");
    // barTop.setAttribute("class", "py-2 bulk-edit-bar--left col-12")
    // this._shadow.appendChild(barTop);

    // let barRightTop = document.createElement("div");
    // barRightTop.setAttribute("class", "py-2 bulk-edit-bar--right col-6 d-flex flex-row flex-items-center flex-justify-right")
    // this._shadow.appendChild(barRightTop);

    let barLeft = document.createElement("div");
    barLeft.setAttribute("class", "py-2 bulk-edit-bar--left col-6");
    this._bulkEditBar.appendChild(barLeft);

    let barRight = document.createElement("div");
    barRight.setAttribute(
      "class",
      "py-2 bulk-edit-bar--right col-6 d-flex flex-justify-right"
    );
    this._bulkEditBar.appendChild(barRight);

    let barBottom = document.createElement("div");
    barBottom.setAttribute(
      "class",
      "py-2 bulk-edit-bar--left col-12 d-flex flex-align-center"
    );
    this._shadow.appendChild(barBottom);

    // this._compareButton = document.createElement("button");
    // this._compareButton.setAttribute("class", "btn btn-clear btn-outline py-2 px-2")
    // this._compareButton.textContent = "Compare";
    // barLeft.appendChild(this._compareButton);

    this._data = null;

    /////
    this._back = document.createElement("a");
    this._back.setAttribute("class", "text-purple clickable");
    this._back.textContent = "< Back to Edit";
    barLeft.appendChild(this._back);

    // this._h2 = document.createElement("h2");
    // this._h2.setAttribute("class", "py-2 px-2");
    // this._h2.textContent = "Selection mode: Select to compare, and/or bulk correct.";
    // barTop.appendChild(this._h2);

    this._table = document.createElement("table");
    this._table.setAttribute("class", "apps__table");
    barBottom.appendChild(this._table);

    // fixed header
    this._fixedHeader = document.createElement("thead");
    this._fixedHeader.setAttribute("class", " col-12 f2");
    this._table.appendChild(this._fixedHeader);

    // rows not header
    this._scrollSheet = document.createElement("tbody");
    this._scrollSheet.setAttribute(
      "class",
      "scroll-comparison-panel col-12 f3"
    );
    this._table.appendChild(this._scrollSheet);

    // Keep track of rows
    this._tableCount = 0;
    this._rows = [];
    this._rowDataIndex = {}; // 1234 : 0, 12345 : 1

    this._sortRemember = {};
    this.headerNameMap = new Map();
    this._columnCount = 0;

    // Right = side
    this._selectionSummary = document.createElement("div");
    this._selectionSummary.setAttribute(
      "class",
      "py-2 px-2 bulk-edit--quick-select"
    );
    barRight.appendChild(this._selectionSummary);

    this._selectionCount = document.createElement("span");
    this._selectionCount.textContent = "0";
    this._selectionSummary.appendChild(this._selectionCount);

    this._selectionCountText = document.createElement("span");
    this._selectionCountText.textContent = " localizations selected.";
    this._selectionSummary.appendChild(this._selectionCountText);

    // // Listen for events
    // this._input.addEventListener("input", this.frontEndSearch.bind(this));
    // // this._search.addEventListener("filterProject", this.frontEndSearch.bind(this));
    this._table.addEventListener("sort", this.frontEndSort.bind(this));

    // this._editButton = document.createElement("button");
    // this._editButton.setAttribute("class", "btn btn-clear py-2 px-2  col-12")
    // this._editButton.textContent = "Edit";
    // barRight.appendChild(this._editButton);

    // ADD EVENT LISTENERS
    this._back.addEventListener("click", () => {
      this.dispatchEvent(new Event("save-edit-click"));
    });
    // this._editButton.addEventListener("click", () => {
    //    this.dispatchEvent(new Event("save-edit-click"));
    // });
  }

  show(val) {
    this.hidden = !val;
  }

  isHidden() {
    return this.hidden;
  }

  /**
   *
   * @param {json} data
   *
   */
  init({ projectId = null, columns = null }) {
    // Create map of columns for attributes
    this.headerNameMap.clear();
    this._fixedHeader.innerHTML = "";

    //
    this.headerNameMap.set("id", "id"); // show this for all (exception in refreshData)
    this.headerNameMap = new Map([...this.headerNameMap, ...columns]);

    // Add header row to table
    this._columnCount = this.headerNameMap.size;
    let headerRow = this.getRow(true);

    for (let [key, value] of this.headerNameMap) {
      this.addHeaderCol(
        {
          value,
          key,
        },
        headerRow
      );
    }

    this._fixedHeader.appendChild(headerRow);
  }

  /**
   *
   * @param {json} data
   */
  _refreshTable(data) {
    // console.log("Clearing out table");

    this._scrollSheet.innerHTML = "";
    this._rows = [];
    this._rowDataIndex = {}; // 1234 : 0, 12345 : 1

    this._addTable(data);
  }

  /**
   *
   * @param {json} data
   */
  _addTable(data) {
    this._data = data;

    // For each data object....
    for (let [id, item] of data) {
      let rowObject = item.attributes;
      let row = this.getRow(false);
      row.setAttribute("class", "table-row");
      row.setAttribute("data", JSON.stringify(rowObject));
      row.setAttribute("id", id);
      this._rowDataIndex[id] = row;

      // #todo add key check against item.entityType.id
      for (let [key, value] of this.headerNameMap) {
        let attrValue = "";
        if (key == "id") {
          attrValue = id;
        } else {
          attrValue = rowObject[value];
        }

        if (typeof attrValue === "undefined" || attrValue === null) {
          attrValue = "--";
        }

        // Add the data item
        let colObj = {
          key,
          value: attrValue,
        };

        this.addCol(colObj, row);
      }

      if (
        typeof rowObject.selectedFlag !== "undefined" &&
        rowObject.selectedFlag
      ) {
        row.classList.add("selected");
      }

      this._rows.push(row);
      this._scrollSheet.appendChild(row);
    }

    this.updateTableCount();
  }

  _deselectRows() {
    this._table.querySelectorAll(".selected").forEach((row) => {
      row.classList.remove("selected");
    });
  }

  findSelected() {
    let selectedRow = this._table.querySelector(".selected");
    if (selectedRow) return selectedRow.getAttribute("id");
    return false;
  }

  /**
   *
   * @param {Bool} headerRow
   * @returns {Node}
   */
  getRow(headerRow) {
    let row = document.createElement("tr");
    this._table.appendChild(row);

    this._columns = [];
    row.setAttribute("isHeaderRow", headerRow);
    return row;
  }

  addHeaderCol(colObj, row) {
    let normal = 100 / Number(this._columnCount);
    let narrow = normal / 2;
    let wide = normal + narrow;
    let x_wide = normal + normal;

    let column = document.createElement("th");
    this._addColumnSort(column);

    column.setAttribute("name", colObj.key);
    column.style.width = `${normal}%`;

    let textSpan = document.createElement("span");
    textSpan.appendChild(document.createTextNode(colObj.value));
    column.prepend(textSpan);

    this._columns.push(column);

    row.appendChild(column);
  }

  /**
   *
   * @param {json} data
   * @param {Node} row
   */
  addCol(colObj, row) {
    let column = document.createElement("td");
    column.setAttribute("name", colObj.key);

    let textSpan = document.createElement("span");
    textSpan.appendChild(document.createTextNode(colObj.value));
    column.prepend(textSpan);

    this._columns.push(column);

    row.appendChild(column);
  }

  /**
   *
   * @param {Node} column
   */
  _addColumnSort(column) {
    let sortSVG = `<span class="sort-icon default-sort clickable"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M11 7H5l3-4zM5 9h6l-3 4z"/></svg></span>`;
    column.innerHTML += sortSVG;

    column.addEventListener("click", () => {
      let colName = column.getAttribute("name");
      let current =
        typeof this._sortRemember[colName] !== "undefined"
          ? this._sortRemember[colName]
          : "default";

      let direction = current == "default" || current == "dsc" ? "asc" : "dsc";
      this._sortRemember[colName] = direction;

      let sortData = {
        sortType: direction,
        name: colName,
      };

      let evt = new CustomEvent("sort", { detail: { sortData } });
      this.dispatchEvent(evt);
    });
  }

  /**
   *
   * @param {Set} rowIds
   */
  showOnly(rowIds) {
    this._deselectRows();
    // console.log(rowIds);
    for (let row of this._rows) {
      let id = row.getAttribute("id");
      // console.log(`is id ${id} in our index? ${rowIds.has(id)}`)
      if (!rowIds.has(Number(id))) {
        this._rowDataIndex[id].classList.add("hidden");
      } else {
        this._rowDataIndex[id].classList.remove("hidden");
      }
    }
    this.updateTableCount();
  }

  showAll(selectAll) {
    this._deselectRows();
    for (let row of this._rows) {
      if (selectAll) {
        row.classList.remove("hidden");
      } else {
        row.classList.add("hidden");
      }
    }
    this.updateTableCount();
  }

  updateTableCount() {
    let rowQuery = this._table.querySelectorAll(".table-row:not(.hidden)");
    let rowLength = rowQuery.length;

    for (let [i, row] of Object.entries(rowQuery)) {
      let odd = i % 2;
      if (odd) {
        row.classList.remove("even");
        row.classList.add("odd");
      } else {
        row.classList.add("even");
        row.classList.remove("odd");
      }
    }
    this._tableCount = rowLength;
    this.dispatchEvent(new Event("update-count"));
  }

  hideShowTypes(types) {
    // To do
  }

  newColumns({ typeId, values }) {
    this.headerNameMap.clear();
    this.headerNameMap.set("id", "id");
    for (let val of values) {
      this.headerNameMap.set(val, `${val} type_${typeId}`);
    }
    // console.log("newColumns -- headerNameMap..................");
    // console.log(this.headerNameMap);
    this.updateColumnsShown();
  }

  updateColumnsShown(e = null) {
    this.headerNameMap.clear();
    this.headerNameMap.set("id", "id");

    if (e !== null) {
      if (e.detail.added) {
        this.headerNameMap.set(e.detail.typeId, e.detail.name);
      } else {
        if (e.detail.typeId) this.headerNameMap.delete(e.detail.name);
      }
    }

    // Add header row to table
    this._columnCount = this.headerNameMap.size;
    let headerRow = this.getRow(true);

    for (let [name, typeId] of this.headerNameMap) {
      this.addHeaderCol(
        {
          name: `${name} (${typeId})`,
          value: typeId,
        },
        headerRow
      );
    }
    this._fixedHeader.innerHTML = "";
    this._fixedHeader.appendChild(headerRow);

    if (this._data !== null) this._refreshTable(this._data);
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
    this._table._refreshTable(this._displayData);

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
customElements.define(
  "entity-gallery-attribute-comparison-panel",
  AttributeComparisonPanel
);
