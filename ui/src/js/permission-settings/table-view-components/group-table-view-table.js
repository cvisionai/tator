import { TableViewTable } from "../components/table-view-table.js";
import { store } from "../store.js";

const COLUMN_BY_GROUP = [
  "Checkbox",
  "Group ID",
  "Group Name",
  "User IDs",
  "Actions",
];
const COLUMN_BY_USER = ["User ID", "Group IDs", "Actions"];
const COLGROUP_BY_GROUP = `
<col style="width: 10%" />
<col style="width: 15%" />
<col style="width: 30%" />
<col style="width: 45%" />
<col style="width: 10%" />
`;
const COLGROUP_BY_USER = `
<col style="width: 15%" />
<col style="width: 75%" />
<col style="width: 10%" />
`;

const INITIAL_SEARCH_PARAMS = {
  Group: {
    filter: [],
    sortBy: {
      groupName: "",
      groupId: "",
    },
    pagination: {
      start: 0,
      stop: 10,
      page: 1,
      pageSize: 10,
    },
  },
  User: {
    filter: [],
    sortBy: {
      userId: "",
    },
    pagination: {
      start: 0,
      stop: 10,
      page: 1,
      pageSize: 10,
    },
  },
};

export class GroupTableViewTable extends TableViewTable {
  constructor() {
    super();
    this._checkboxes = [];
  }

  connectedCallback() {
    store.subscribe(
      (state) => state.groupViewBy,
      this._changeGroupViewBy.bind(this)
    );

    store.subscribe(
      (state) => state.groupSearchParams,
      this._newGroupSearchParams.bind(this)
    );

    store.subscribe((state) => state.tabularGroup, this._newData.bind(this));
  }

  _initPaginator() {
    this._paginator = document.createElement("entity-gallery-paginator");
    this._paginator.addEventListener("selectPage", this._changePage.bind(this));
    this._paginatorDiv.replaceChildren(this._paginator);
    this._paginator.setupElements();

    store.getState().setGroupSearchParams(INITIAL_SEARCH_PARAMS);
  }

  _newGroupSearchParams() {
    const { groupViewBy } = store.getState();
    // Count what data should be displayed
    store.getState().setTabularGroup(groupViewBy);
  }

  _changePage(evt) {
    console.log("😇 ~ _changePage ~ evt:", evt);

    const { groupViewBy, groupSearchParams } = store.getState();

    const newGroupSearchParams = {
      ...groupSearchParams,
      [groupViewBy]: {
        ...groupSearchParams[groupViewBy],
        pagination: { ...evt.detail },
      },
    };

    store.getState().setGroupSearchParams(newGroupSearchParams);
  }

  _newData(tabularGroup) {
    const { groupViewBy, groupSearchParams } = store.getState();

    // After we know the total number of data, then we can set up paginator
    // Note: not total number of items fetched from DB, but total number of FILTERED items
    const numData = tabularGroup[groupViewBy].count;
    this._paginator.init(numData, groupSearchParams[groupViewBy].pagination);

    if (
      !tabularGroup?.[groupViewBy]?.data?.length &&
      !tabularGroup?.[groupViewBy]?.userIdGroupIdMap?.size
    ) {
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
    const { groupViewBy } = store.getState();

    if (groupViewBy !== "Group" && groupViewBy !== "User") return;

    const { count } = store.getState().tabularGroup[groupViewBy];
    const { page, pageSize } =
      store.getState().groupSearchParams[groupViewBy].pagination;
    const tatolPageCount = Math.ceil(count / pageSize);

    this._totalItemCount.innerText = count;
    this._currentPage.innerText = page;
    this._totalPageCount.innerText = tatolPageCount;
  }

  _changeGroupViewBy(groupViewBy) {
    if (groupViewBy !== "Group" && groupViewBy !== "User") return;
    store.getState().setTabularGroup(groupViewBy);
  }

  _displayTable(groupViewBy) {
    if (!groupViewBy) {
      groupViewBy = store.getState().groupViewBy;
    }

    if (groupViewBy !== "Group" && groupViewBy !== "User") return;

    this._tableHead.innerHTML = "";
    this._tableBody.innerHTML = "";

    if (groupViewBy === "Group") {
      this._checkboxes = [];
      this._colgroup.innerHTML = COLGROUP_BY_GROUP;
      this._displayTableByGroup();
      store.getState().setSelectedGroupIds([]);
    } else if (groupViewBy === "User") {
      this._colgroup.innerHTML = COLGROUP_BY_USER;
      this._displayTableByUser();
    }
  }

  _displayTableByGroup() {
    const { data } = store.getState().tabularGroup.Group;

    // Head
    const tr = document.createElement("tr");
    COLUMN_BY_GROUP.map((val) => {
      const th = document.createElement("th");
      if (val === "Checkbox") {
        const check = document.createElement("checkbox-input");
        check.setAttribute("type", "number");
        check.addEventListener("change", (event) => {
          this._changeAllCheckboxes();
        });

        this._checkAll = check;
        th.appendChild(check);
      } else if (val === "Group ID" || val === "Group Name") {
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
    data.forEach((gr) => {
      const tr = document.createElement("tr");
      COLUMN_BY_GROUP.map((val) => {
        const td = document.createElement("td");
        if (val === "Checkbox") {
          const check = document.createElement("checkbox-input");
          check.setAttribute("type", "number");
          check.setValue({ id: gr.id, checked: false });

          check.addEventListener("change", (event) => {
            this._changeCheckboxes();
          });

          this._checkboxes.push(check);
          td.appendChild(check);
        } else if (val === "Group ID") {
          td.innerText = gr.id;
        } else if (val === "Group Name") {
          td.innerText = gr.name;
        } else if (val === "User IDs") {
          td.classList.add("table-cell-padding");
          td.innerText = gr.members;
        } else if (val === "Actions") {
          const edit = document.createElement("edit-line-button");
          edit.setAttribute("data-id", `Group-${gr.id}`);
          edit.addEventListener("click", this._goTo.bind(this));
          td.appendChild(edit);
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });
      this._tableBody.appendChild(tr);
    });
  }

  _displayTableByUser() {
    const { userIdGroupIdMap } = store.getState().tabularGroup.User;

    // Head
    const tr = document.createElement("tr");
    COLUMN_BY_USER.map((val) => {
      const th = document.createElement("th");
      if (val === "User ID") {
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
    for (let [userId, groupIds] of userIdGroupIdMap) {
      const tr = document.createElement("tr");
      COLUMN_BY_USER.map((val) => {
        const td = document.createElement("td");
        if (val === "User ID") {
          td.innerText = userId;
        } else if (val === "Group IDs") {
          td.classList.add("table-cell-padding", "long-text-td");
          const span = document.createElement("span");
          span.innerText = groupIds;
          td.appendChild(span);
          td.setAttribute("data-tooltip", groupIds);
        } else if (val === "Actions") {
          const edit = document.createElement("edit-line-button");
          edit.setAttribute("data-id", `Group-user${userId}`);
          edit.addEventListener("click", this._goTo.bind(this));
          td.appendChild(edit);
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });
      this._tableBody.appendChild(tr);
    }
  }

  _setupTableHeadCellWithSort(text, th) {
    const { groupViewBy, groupSearchParams } = store.getState();
    const { sortBy } = groupSearchParams[groupViewBy];

    let sortByKey = "";
    if (text === "Group ID") sortByKey = "groupId";
    else if (text === "Group Name") sortByKey = "groupName";
    else sortByKey = "userId";

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

  _changeCheckboxes() {
    const ids = this._checkboxes
      .filter((check) => check.getChecked())
      .map((checked) => checked.getValue());

    store.getState().setSelectedGroupIds(ids);
  }

  _changeAllCheckboxes() {
    const val =
      store.getState().selectedGroupIds.length < this._checkboxes.length;
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

        const { groupViewBy, groupSearchParams } = store.getState();
        const newSortBy = { ...INITIAL_SEARCH_PARAMS[groupViewBy].sortBy };
        newSortBy[val[0]] = newSortVal;

        const newGroupSearchParams = {
          ...groupSearchParams,
          [groupViewBy]: {
            ...groupSearchParams[groupViewBy],
            sortBy: { ...newSortBy },
          },
        };

        store.getState().setGroupSearchParams(newGroupSearchParams);
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

customElements.define("group-table-view-table", GroupTableViewTable);
