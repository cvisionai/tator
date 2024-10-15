import { TableViewActions } from "../components/table-view-actions.js";
import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class PolicyTableViewActions extends TableViewActions {
  constructor() {
    super();
    this.type = "Policy";

    this._buttonsForTable = [this._filter, this._calculator];
    this._buttonsForItems = [this._newPolicy, this._delete];
  }
}

customElements.define("policy-table-view-actions", PolicyTableViewActions);
