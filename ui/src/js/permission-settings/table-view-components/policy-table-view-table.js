import { TableViewTable } from "../components/table-view-table.js";
import { store } from "../store.js";

const COLUMN = ["Checkbox", "Entity", "Target", "Permission", "Actions"];
const COLGROUP = `
<col style="width: 10%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 40%" />
<col style="width: 10%" />
`;

export class PolicyTableViewTable extends TableViewTable {
  constructor() {
    super();
    this.type = "Policy";

    this._searchParams = {
      filter: {},
      sortBy: {
        entityName: "ascending",
      },
      pagination: {
        start: 0,
        stop: 10,
        page: 1,
        pageSize: 10,
      },
    };
  }

  connectedCallback() {
    store.subscribe((state) => state.tabularPolicy, this._newData.bind(this));

    this._paginator.addEventListener("selectPage", this._changePage.bind(this));
  }

  _initPaginator() {
    this._paginator.setupElements();

    store.getState().setPolicySearchParams(this._searchParams);
    store.getState().setTabularPolicy();

    // After we know the total number of data, then we can set up paginator
    // Note: not total number of items fetched from DB, but total number of FILTERED items
    const numData = store.getState().tabularPolicy.count;
    this._paginator.init(numData, this._searchParams.pagination);
  }

  _changePage(evt) {
    this._searchParams = {
      ...this._searchParams,
      pagination: { ...evt.detail },
    };

    // this._pagination = { ...evt.detail };
    store.getState().setPolicySearchParams(this._searchParams);
    store.getState().setTabularPolicy();
  }

  _newData(tabularPolicy) {
    if (!tabularPolicy?.data?.length) {
      this._tableNoData.classList.remove("hidden");
      this._pagePosition.classList.add("hidden");
      this._table.classList.add("hidden");
      this._paginatorDiv.classList.add("hidden");
    } else {
      this._tableNoData.classList.add("hidden");
      this._pagePosition.classList.remove("hidden");
      this._table.classList.remove("hidden");
      this._paginatorDiv.classList.remove("hidden");
      this._displayPagePosition();
      this._displayTable();
    }
  }

  _displayPagePosition() {
    const { count } = store.getState().tabularPolicy;
    const { page, pageSize } = store.getState().policySearchParams.pagination;
    const tatolPageCount = Math.ceil(count / pageSize);

    this._totalItemCount.innerText = count;
    this._currentPage.innerText = page;
    this._totalPageCount.innerText = tatolPageCount;
  }

  _displayTable() {
    this._tableHead.innerHTML = "";
    this._tableBody.innerHTML = "";
    this._colgroup.innerHTML = COLGROUP;

    const { data } = store.getState().tabularPolicy;

    // Head
    const tr = document.createElement("tr");
    COLUMN.map((val) => {
      const th = document.createElement("th");
      if (val === "Checkbox") {
        const check = document.createElement("checkbox-input");
        check.setAttribute("type", "number");
        // check.setAttribute("id", "checkbox--select-all");
        th.appendChild(check);
      } else {
        th.innerText = val;
      }
      return th;
    }).forEach((th) => {
      tr.appendChild(th);
    });
    this._tableHead.appendChild(tr);

    // Body
    data.forEach((policy) => {
      const tr = document.createElement("tr");
      COLUMN.map((val) => {
        const td = document.createElement("td");
        if (val === "Checkbox") {
          const check = document.createElement("checkbox-input");
          check.setAttribute("type", "number");
          td.appendChild(check);
        } else if (val === "Entity") {
          td.innerText = policy.entityName;
        } else if (val === "Target") {
          td.innerText = policy.targetName;
        } else if (val === "Permission") {
          td.innerText = policy.permission;
        } else {
          const edit = document.createElement("edit-line-button");
          td.appendChild(edit);
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });
      this._tableBody.appendChild(tr);
    });
  }
}

customElements.define("policy-table-view-table", PolicyTableViewTable);
