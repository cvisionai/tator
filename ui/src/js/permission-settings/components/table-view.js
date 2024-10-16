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
    // Subscribe to selection
    store.subscribe(
      (state) => state.selectedType,
      this._updateTypeSelection.bind(this)
    );

    // Create actions component
    this._type = this.getAttribute("type");
    this._actions = document.createElement(
      `${this._type.toLowerCase()}-table-view-actions`
    );
    this._actionsDiv.appendChild(this._actions);
    this._table = document.createElement(
      `${this._type.toLowerCase()}-table-view-table`
    );
    this._tableDiv.appendChild(this._table);

    // Once we know what type, listen to changes
    store.subscribe((state) => state[this._type], this._newData.bind(this));
  }

  async _updateTypeSelection(newSelectedType, oldSelectedType) {
    const affectsMe =
      this._type == newSelectedType || this._type == oldSelectedType;

    if (affectsMe) {
      if (
        oldSelectedType === this._type &&
        oldSelectedType !== newSelectedType
      ) {
        this.hidden = true;
        return; // If container type was the old type, and not the new one hide and end
      } else {
        this.hidden = false; // Otherwise Show
      }

      /* Clear container in any other case */
      // ie. NEW form (data is null), or no data from store
      // this.resetToNew();
    }
  }

  _newData() {}
}

customElements.define(
  "permission-settings-table-view",
  PermissionSettingsTableView
);
