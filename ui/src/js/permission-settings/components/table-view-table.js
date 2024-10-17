import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TableViewTable extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("table-view-table").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._colgroup = this._shadow.getElementById("permission-table--colgroup");
    this._tableHead = this._shadow.getElementById("permission-table--head");
    this._tableBody = this._shadow.getElementById("permission-table--body");
  }
}

customElements.define("table-view-table", TableViewTable);
