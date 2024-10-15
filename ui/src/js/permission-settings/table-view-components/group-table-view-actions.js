import { TableViewActions } from "../components/table-view-actions.js";
import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class GroupTableViewActions extends TableViewActions {
  constructor() {
    super();
    this.type = "Group";

    this._buttonsForTable = [this._viewByGroup, this._viewByUser, this._filter];
    this._buttonsForItems = [this._newGroup, this._delete];
  }
}

customElements.define("group-table-view-actions", GroupTableViewActions);
