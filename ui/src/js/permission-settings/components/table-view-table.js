import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TableViewTable extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("table-view-table").content;
    this._shadow.appendChild(template.cloneNode(true));

    // NO DATA
    this._tableNoData = this._shadow.getElementById(
      "permission-table--no-data"
    );

    // PAGE POSITION
    this._pagePosition = this._shadow.getElementById(
      "permission-table-page-position"
    );
    this._totalItemCount = this._shadow.getElementById(
      "page-position--total-item"
    );
    this._currentPage = this._shadow.getElementById(
      "page-position--current-page"
    );
    this._totalPageCount = this._shadow.getElementById(
      "page-position--total-page"
    );

    // TABLE
    this._table = this._shadow.getElementById("permission-table");
    this._colgroup = this._shadow.getElementById("permission-table--colgroup");
    this._tableHead = this._shadow.getElementById("permission-table--head");
    this._tableBody = this._shadow.getElementById("permission-table--body");

    // PAGINATOR
    this._paginatorDiv = this._shadow.getElementById(
      "permission-table-paginator-div"
    );
    this._paginator = document.createElement("entity-gallery-paginator");
    this._paginatorDiv.appendChild(this._paginator);
  }
}

customElements.define("table-view-table", TableViewTable);
