import { TableViewActions } from "../components/table-view-actions.js";
import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class GroupTableViewActions extends TableViewActions {
  constructor() {
    super();
    this.type = "Group";

    this._buttonsForTable = [this._viewByGroup, this._viewByUser, this._filter];
    this._buttonsForItems = [this._newGroup, this._delete];

    this._viewByGroup.addEventListener("click", () => {
      store.getState().setGroupViewBy("Group");
    });
    this._viewByUser.addEventListener("click", () => {
      store.getState().setGroupViewBy("User");
    });
  }

  _init() {
    this.styleViewByButtons(store.getState().groupViewBy);
    store.subscribe(
      (state) => state.groupViewBy,
      this.styleViewByButtons.bind(this)
    );
    store.subscribe(
      (state) => state.selectedGroupIds,
      this._newSelectedGroupIds.bind(this)
    );

    this._delete.addEventListener(
      "click",
      this._openDeleteGroupsModal.bind(this)
    );

    this._filterWindow._addConditionButton.addEventListener(
      "click",
      this._addCondition.bind(this)
    );
  }

  _addCondition() {
    const condition = document.createElement("group-filter-condition");
    this._filterWindow._conditionGroup.appendChild(condition);
  }

  styleViewByButtons(groupViewBy) {
    if (groupViewBy === "Group") {
      this._viewByGroup.classList.add("selected");
      this._viewByUser.classList.remove("selected");
      this._delete.style.display = "";
    } else if (groupViewBy === "User") {
      this._viewByGroup.classList.remove("selected");
      this._viewByUser.classList.add("selected");
      this._delete.style.display = "none";
    }
  }

  _newSelectedGroupIds(selectedGroupIds) {
    if (selectedGroupIds.length === 0) {
      this._delete.setAttribute("disabled", "");
    } else {
      this._delete.removeAttribute("disabled");
    }
  }

  setUpWarningDeleteMsg() {
    const {
      selectedGroupIds,
      Group: { map },
    } = store.getState();

    this._warningDeleteMessage = `
    Pressing confirm will delete these groups:<br/><br/>
    ${selectedGroupIds
      .map((id) => {
        return `ID: ${id}: ${map.get(id).name}`;
      })
      .join("<br/>")}
    <br/>
    <br/><br/>
    Do you want to continue?
    `;
    return this._warningDeleteMessage;
  }

  async _openDeleteGroupsModal() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red");

    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);

    button.addEventListener("click", this._deleteGroups.bind(this));
    this.setUpWarningDeleteMsg();

    this.modal._confirm({
      titleText: `Delete Confirmation`,
      mainText: this._warningDeleteMessage,
      buttonSave: button,
    });
  }

  async _deleteGroups() {
    const { selectedGroupIds } = store.getState();

    this.modal._modalCloseAndClear();
    try {
      const responses = [];
      for (const id of selectedGroupIds) {
        const respData = await store.getState().deleteGroup(id);
        responses.push(respData);
      }
      console.log("😇 ~ _deleteGroups ~ responses:", responses);
      this.handleResponseList(responses);

      // store.getState.setGroupData();
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
          `Successfully deleted ${sCount} group${sCount == 1 ? "" : "s"}.`
        );
        store.getState().setGroupData();
      } else if (sCount > 0 && eCount > 0) {
        this.modal._complete(
          `Successfully deleted ${sCount} group${
            sCount == 1 ? "" : "s"
          }.<br/><br/>
          Error deleting ${eCount} group${eCount == 1 ? "" : "s"}.<br/><br/>
          Error message${eCount == 1 ? "" : "s"}:<br/><br/>${errors}`
        );
        store.getState().setGroupData();
      } else {
        return this.modal._error(
          `Error deleting ${eCount} group${eCount == 1 ? "" : "s"}.<br/><br/>
          Error message${eCount == 1 ? "" : "s"}:<br/><br/>${errors}`
        );
      }
    }
  }
}

customElements.define("group-table-view-actions", GroupTableViewActions);
