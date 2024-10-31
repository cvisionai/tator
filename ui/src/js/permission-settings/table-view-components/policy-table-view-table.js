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
        entityName: "",
        targetName: "",
      },
      pagination: {
        start: 0,
        stop: 10,
        page: 1,
        pageSize: 10,
      },
    };

    this._checkboxes = [];
  }

  connectedCallback() {
    store.subscribe((state) => state.tabularPolicy, this._newData.bind(this));

    store.subscribe(
      (state) => state.selectedPolicyIds,
      this._newSelectedPolicyIds.bind(this)
    );
  }

  _initPaginator() {
    this._paginator = document.createElement("entity-gallery-paginator");
    this._paginator.addEventListener("selectPage", this._changePage.bind(this));
    this._paginatorDiv.replaceChildren(this._paginator);
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
    this._checkboxes = [];

    const { data } = store.getState().tabularPolicy;

    // Head
    const tr = document.createElement("tr");
    COLUMN.map((val) => {
      const th = document.createElement("th");
      if (val === "Checkbox") {
        const check = document.createElement("checkbox-input");
        check.setAttribute("type", "number");
        check.addEventListener("change", (event) => {
          this._changeAllCheckboxes();
        });

        this._checkAll = check;
        th.appendChild(check);
      } else if (val === "Entity") {
        this._setupTableHeadCellWithSort(val, th);
      } else if (val === "Target") {
        this._setupTableHeadCellWithSort(val, th);
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
          check.setValue({ id: policy.id, checked: false });

          check.addEventListener("change", (event) => {
            this._changeCheckboxes();
          });

          this._checkboxes.push(check);
          td.appendChild(check);
        } else if (val === "Entity") {
          td.innerText = policy.entityName;
        } else if (val === "Target") {
          td.innerText = policy.targetName;
        } else if (val === "Permission") {
          td.innerText = policy.permission;
        } else {
          const edit = document.createElement("edit-line-button");
          edit.setAttribute("data-id", `Policy-${policy.id}`);
          edit.addEventListener("click", this._goTo.bind(this));
          td.appendChild(edit);
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });
      this._tableBody.appendChild(tr);
    });

    store.getState().setSelectedPolicyIds([]);
  }

  _setupTableHeadCellWithSort(text, th) {
    const {
      policySearchParams: { sortBy },
    } = store.getState();
    const sortByKey = text === "Entity" ? "entityName" : "targetName";

    const div = document.createElement("div");
    div.classList.add("d-flex", "flex-row");
    div.style.gap = "5px";
    th.appendChild(div);
    const span = document.createElement("span");
    span.innerText = text;
    div.appendChild(span);
    const sortDiv = document.createElement("div");
    sortDiv.classList.add("d-flex", "flex-row");
    div.appendChild(sortDiv);
    const sort = document.createElement("sort-button");
    const sortAscending = document.createElement("sort-ascending-button");
    const sortDescending = document.createElement("sort-descending-button");

    sort.setAttribute("data-id", `${sortByKey}--`);
    sortAscending.setAttribute("data-id", `${sortByKey}--ascending`);
    sortDescending.setAttribute("data-id", `${sortByKey}--descending`);
    sort.addEventListener("click", this._clickSort.bind(this));
    sortAscending.addEventListener("click", this._clickSort.bind(this));
    sortDescending.addEventListener("click", this._clickSort.bind(this));

    sortDiv.appendChild(sort);
    sortDiv.appendChild(sortAscending);
    sortDiv.appendChild(sortDescending);
    const sorts = {
      "": sort,
      ascending: sortAscending,
      descending: sortDescending,
    };
    Object.values(sorts).forEach((sort) => sort.setAttribute("hidden", ""));
    sorts[sortBy[sortByKey]].removeAttribute("hidden");
  }

  _newSelectedPolicyIds(selectedPolicyIds) {
    console.log(
      "😇 ~ _newSelectedPolicyIds ~ selectedPolicyIds:",
      selectedPolicyIds
    );
  }

  _changeCheckboxes() {
    const ids = this._checkboxes
      .filter((check) => check.getChecked())
      .map((checked) => checked.getValue());

    store.getState().setSelectedPolicyIds(ids);
  }

  _changeAllCheckboxes() {
    const val =
      store.getState().selectedPolicyIds.length < this._checkboxes.length;
    this._checkboxes.forEach((check) => {
      check._checked = val;
    });
    this._checkAll._checked = val;

    this._changeCheckboxes();
  }

  _clickSort(evt) {
    const id = evt.target.dataset.id;

    if (id) {
      const val = id.split("--");
      if (val.length === 2) {
        let newSortVal = "";
        if (!val[1]) {
          newSortVal = "ascending";
        } else if (val[1] === "ascending") {
          newSortVal = "descending";
        } else if (val[1] === "descending") {
          newSortVal = "ascending";
        }

        const newSortBy = { ...this._searchParams.sortBy };
        Object.keys(newSortBy).forEach((key) => {
          newSortBy[key] = "";
        });
        newSortBy[val[0]] = newSortVal;

        this._searchParams = {
          ...this._searchParams,
          sortBy: { ...newSortBy },
        };

        store.getState().setPolicySearchParams(this._searchParams);
        store.getState().setTabularPolicy();
      }
    }
  }

  _goTo(evt) {
    const id = evt.target.dataset.id;
    if (id) {
      window.location.hash = `#${id}`;
    }
  }
}

customElements.define("policy-table-view-table", PolicyTableViewTable);
