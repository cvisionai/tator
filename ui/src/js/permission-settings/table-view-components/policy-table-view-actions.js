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

    this._delete.addEventListener(
      "click",
      this._openDeletePoliciesModal.bind(this)
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

  setUpWarningDeleteMsg() {
    const {
      selectedPolicyIds,
      Policy: { processedMap },
      Group: { groupIdUserIdMap },
    } = store.getState();

    // If a policy's entity is group, then deleting it can affect the group's members
    const affectedUsers = new Map();
    selectedPolicyIds.forEach((id) => {
      const policy = processedMap.get(id);
      if (policy.entityType === "group") {
        affectedUsers.set(id, groupIdUserIdMap.get(policy.entityId));
      } else {
        affectedUsers.set(id, []);
      }
    });

    this._warningDeleteMessage = `
    Pressing confirm will delete these policies:<br/><br/><br/>
    ${selectedPolicyIds
      .map((id) => {
        return `ID: ${id}, ${processedMap.get(id).entityName} against ${
          processedMap.get(id).targetName
        }, ${
          affectedUsers.get(id).length
            ? `    This can affect User ${affectedUsers.get(id)}`
            : ""
        }`;
      })
      .join("<br/><br/>")}
    <br/><br/><br/>
    Do you want to continue?
    `;
    return this._warningDeleteMessage;
  }

  _openDeletePoliciesModal() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red");

    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);

    button.addEventListener("click", this._deletePolicies.bind(this));
    this.setUpWarningDeleteMsg();

    this.modal._confirm({
      titleText: `Delete Confirmation`,
      mainText: this._warningDeleteMessage,
      buttonSave: button,
    });
  }

  async _deletePolicies() {
    const { selectedPolicyIds } = store.getState();

    this.modal._modalCloseAndClear();
    try {
      const responses = [];
      for (const id of selectedPolicyIds) {
        const respData = await store.getState().deletePolicy(id);
        responses.push(respData);
      }
      this.handleResponseList(responses);
    } catch (err) {
      this.modal._error(err);
    }
  }

  handleResponseList(responses) {
    if (responses && Array.isArray(responses)) {
      let sCount = 0;
      let eCount = 0;
      let errors = "";

      for (let object of responses) {
        if (object.response?.ok) {
          sCount++;
        } else {
          eCount++;
          const message = object?.data?.message || "";
          errors += `<br/><br/>${message}`;
        }
      }

      if (sCount > 0 && eCount === 0) {
        this.modal._success(
          `Successfully deleted ${sCount} ${
            sCount == 1 ? "policy" : "policies"
          }.`
        );
        store.getState().setPolicyData();
      } else if (sCount > 0 && eCount > 0) {
        this.modal._complete(
          `Successfully deleted ${sCount} ${
            sCount == 1 ? "policy" : "policies"
          }.<br/><br/>
          Error deleting ${eCount} ${
            eCount == 1 ? "policy" : "policies"
          }.<br/><br/>
          Error message${eCount == 1 ? "" : "s"}:<br/><br/>${errors}`
        );
        store.getState().setPolicyData();
      } else {
        return this.modal._error(
          `Error deleting ${eCount} ${
            eCount == 1 ? "policy" : "policies"
          }.<br/><br/>
          Error message${eCount == 1 ? "" : "s"}:<br/><br/>${errors}`
        );
      }
    }
  }
}

customElements.define("policy-table-view-actions", PolicyTableViewActions);
