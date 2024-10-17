import { TableViewTable } from "../components/table-view-table.js";
import { store } from "../store.js";

const COLUMN_BY_GROUP = [
  ["Checkbox", "Checkbox"],
  ["Group Name", "name"],
  ["User IDs", "members"],
  ["Actions", "Actions"],
];
const COLUMN_BY_USER = [
  ["Checkbox", "Checkbox"],
  ["User ID", "id"],
  ["Group IDs", "groupIds"],
  ["Actions", "Actions"],
];
const COLGROUP_BY_GROUP = `
<col style="width: 10%" />
<col style="width: 30%" />
<col style="width: 50%" />
<col style="width: 10%" />
`;
const COLGROUP_BY_USER = `
<col style="width: 10%" />
<col style="width: 20%" />
<col style="width: 60%" />
<col style="width: 10%" />
`;

export class GroupTableViewTable extends TableViewTable {
  constructor() {
    super();
    this.type = "Group";
  }

  connectedCallback() {
    this._displayTable(store.getState().groupViewBy);
    store.subscribe(
      (state) => state.groupViewBy,
      this._displayTable.bind(this)
    );
    store.subscribe((state) => state[this.type], this._newData.bind(this));
  }

  _newData(groupObj) {
    this._displayTable(store.getState().groupViewBy);
  }

  _displayTable(groupViewBy) {
    if (groupViewBy !== "Group" && groupViewBy !== "User") return;

    this._tableHead.innerHTML = "";
    this._tableBody.innerHTML = "";

    if (groupViewBy === "Group") {
      this._colgroup.innerHTML = COLGROUP_BY_GROUP;
      this._displayTableByGroup();
    } else if (groupViewBy === "User") {
      this._colgroup.innerHTML = COLGROUP_BY_USER;
      this._displayTableByUser();
    }
  }

  _displayTableByGroup() {
    //
    const groupObj = store.getState().Group;
    if (!groupObj.init) return;

    // Head
    const tr = document.createElement("tr");
    COLUMN_BY_GROUP.map((val) => {
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
      COLUMN_BY_GROUP.map((val) => {
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

  _displayTableByUser() {
    //
    const groupObj = store.getState().Group;
    if (!groupObj.init) return;

    // Head
    const tr = document.createElement("tr");
    COLUMN_BY_USER.map((val) => {
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
    for (let [userId, groupIds] of groupObj.userIdGroupIdMap) {
      const tr = document.createElement("tr");
      COLUMN_BY_USER.map((val) => {
        const td = document.createElement("td");
        if (val[1] === "Checkbox") {
          const check = document.createElement("checkbox-input");
          check.setAttribute("type", "number");
          td.appendChild(check);
        } else if (val[1] === "id") {
          td.innerText = userId;
        } else if (val[1] === "groupIds") {
          td.innerText = groupIds;
        } else if (val[1] === "Actions") {
          const edit = document.createElement("edit-button");
          td.appendChild(edit);
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });
      this._tableBody.appendChild(tr);
    }
  }
}

customElements.define("group-table-view-table", GroupTableViewTable);
