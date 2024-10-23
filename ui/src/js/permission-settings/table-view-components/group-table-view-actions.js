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
}

customElements.define("group-table-view-actions", GroupTableViewActions);
