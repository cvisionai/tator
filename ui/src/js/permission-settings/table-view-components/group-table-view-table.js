import { TableViewTable } from "../components/table-view-table.js";
import { store } from "../store.js";

const COLUMN = [
  ["Checkbox", "Checkbox"],
  ["Group Name", "name"],
  ["User IDs", "members"],
  ["Actions", "Actions"],
];

export class GroupTableViewTable extends TableViewTable {
  constructor() {
    super();
    this.type = "Group";
  }

  connectedCallback() {
    store.subscribe((state) => state[this.type], this._newData.bind(this));
  }

  _newData(groupObj) {
    console.log("😇 ~ _newData ~ groupObj:", groupObj);

    if (!groupObj.init) return;

    // View by Group

    // Head
    const tr = document.createElement("tr");
    COLUMN.map((val) => {
      const th = document.createElement("th");
      if (val[0] === "Checkbox") {
        const check = document.createElement("checkbox-input");
        check.setAttribute("type", "number");
        // check.setAttribute("id", "checkbox--select-all");
        th.appendChild(check);
      } else {
        th.innerText = val[0];
      }
      return th;
    }).forEach((th) => {
      tr.appendChild(th);
    });
    this._tableHead.appendChild(tr);

    // Body
    groupObj.data.forEach((gr) => {
      const tr = document.createElement("tr");
      COLUMN.map((val) => {
        const td = document.createElement("td");
        if (val[1] === "Checkbox") {
          const check = document.createElement("checkbox-input");
          check.setAttribute("type", "number");
          td.appendChild(check);
        } else if (val[1] === "Actions") {
          const edit = document.createElement("edit-button");
          td.appendChild(edit);
        } else {
          td.innerText = gr[val[1]];
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });

      this._tableBody.appendChild(tr);
    });
  }
}

customElements.define("group-table-view-table", GroupTableViewTable);
