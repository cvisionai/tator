import { TatorElement } from "../../components/tator-element.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { store } from "../store.js";

export class PermissionSettingsTableView extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("table-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._actionsDiv = this._shadow.getElementById("table-view-actions");
    this._tableDiv = this._shadow.getElementById("table-view-table");

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // this is outside the template and references by all parts of page to sync the dimmer
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    // state.Policy may not be initialized, so show the spinner at first
    this.showDimmer();
    this.loading.showSpinner();

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

    if (this.hasAttribute("has-open-modal")) {
      this.hideDimmer();
      this.loading.hideSpinner();
    }

    // Only after knowing how many items are there can we init the paginator
    this._table._initPaginator();
  }

  /**
   * Modal for this page, and handler
   * @returns sets page attribute that changes dimmer
   */
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define(
  "permission-settings-table-view",
  PermissionSettingsTableView
);
