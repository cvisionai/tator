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
    store.subscribe(
      (state) => state.policySearchParams,
      this._newPolicySearchParams.bind(this)
    );

    this._filterWindow._addConditionButton.addEventListener(
      "click",
      this._addCondition.bind(this)
    );
  }

  _newPolicySearchParams(policySearchParams) {
    // Check if have filters applied
    if (policySearchParams.filter.length) {
      this._filterAppliedSignal.removeAttribute("hidden");
    } else {
      this._filterAppliedSignal.setAttribute("hidden", "");
    }
  }

  _addCondition() {
    const condition = document.createElement("policy-filter-condition");
    this._filterWindow._conditionGroup.appendChild(condition);
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
