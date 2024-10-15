import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TableViewActions extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("table-view-actions").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._tableActionsDiv = this._shadow.getElementById(
      "table-view-actions--for-table"
    );
    this._itemsActionsDiv = this._shadow.getElementById(
      "table-view-actions--for-items"
    );

    this._viewByGroup = this._shadow.getElementById("view-by-group");
    this._viewByUser = this._shadow.getElementById("view-by-user");
    this._filter = this._shadow.getElementById("filter");
    this._calculator = this._shadow.getElementById("calculator");

    this._newGroup = this._shadow.getElementById("new-group");
    this._delete = this._shadow.getElementById("delete");
    this._newPolicy = this._shadow.getElementById("new-policy");

    this._buttons = [
      this._viewByGroup,
      this._viewByUser,
      this._filter,
      this._calculator,
      this._newGroup,
      this._delete,
      this._newPolicy,
    ];

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    // store.subscribe(
    //   (state) => state.selectedType,
    //   this._newSelectedType.bind(this)
    // );

    this._buttons.forEach((btn) => {
      btn.style.display = "none";
    });
    this._buttonsForTable.forEach((btn) => {
      btn.style.display = "";
    });
    this._buttonsForItems.forEach((btn) => {
      btn.style.display = "";
    });
  }

  _newSelectedType() {}

  _unhideButton() {}

  _hideButton() {}

  _enableButton() {}

  _disableButton() {}

  _highlightButton() {}

  _unhighlightButton() {}
}

customElements.define("table-view-actions", TableViewActions);
