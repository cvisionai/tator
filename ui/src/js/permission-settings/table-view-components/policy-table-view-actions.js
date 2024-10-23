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

  _init() {
    store.subscribe(
      (state) => state.selectedPolicyIds,
      this._newSelectedPolicyIds.bind(this)
    );
  }

  _newSelectedPolicyIds(selectedPolicyIds) {
    if (selectedPolicyIds.length === 0) {
      this._delete.setAttribute("disabled", "");
    } else {
      this._delete.removeAttribute("disabled");
    }
  }
}

customElements.define("policy-table-view-actions", PolicyTableViewActions);
