import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class PermissionSettingsTableView extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("table-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._actionsDiv = this._shadow.getElementById("table-view-actions");
    this._tableDiv = this._shadow.getElementById("table-view-table");

    // this is outside the template and references by all parts of page to sync the dimmer
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    this._type = this.getAttribute("type");

    // Create actions component
    this._actions = document.createElement(
      `${this._type.toLowerCase()}-table-view-actions`
    );
    this._actionsDiv.appendChild(this._actions);

    // Create table component
    this._table = document.createElement(
      `${this._type.toLowerCase()}-table-view-table`
    );
    this._tableDiv.appendChild(this._table);

    // Once we know what type, listen to changes
    store.subscribe((state) => state[this._type], this._newData.bind(this));
  }

  _newData(dataObj) {
    if (!dataObj.init) return;

    // Only after knowing how many items are there can we init the paginator
    this._table._initPaginator();
  }

  _getTabularData() {
    //
  }

  _changeFilter() {
    //
  }

  _changeSort() {
    //
  }
}

customElements.define(
  "permission-settings-table-view",
  PermissionSettingsTableView
);
