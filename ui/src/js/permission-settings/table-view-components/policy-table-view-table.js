import { TableViewTable } from "../components/table-view-table.js";
import { store } from "../store.js";

export class PolicyTableViewTable extends TableViewTable {
  constructor() {
    super();
    this.type = "Policy";
  }

  connectedCallback() {}
}

customElements.define("policy-table-view-table", PolicyTableViewTable);
