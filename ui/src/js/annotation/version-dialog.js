import { ModalDialog } from "../components/modal-dialog.js";

export class VersionDialog extends ModalDialog {
  constructor() {
    super();

    // Rework the styles
    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "");
    this._main.remove();
    this._footer.remove();

    const searchDiv = document.createElement("div");
    searchDiv.setAttribute(
      "class",
      "d-flex flex-row flex-grow flex-justify-between py-3 px-2 rounded-2 mt-3"
    );
    this._header.appendChild(searchDiv);

    const dialogHeader = document.createElement("div");
    dialogHeader.setAttribute("class", "h1 d-flex flex-items-center");
    dialogHeader.textContent = "Select Version";
    searchDiv.appendChild(dialogHeader);

    this._searchInput = document.createElement("input");
    this._searchInput.setAttribute("class", "form-control input-sm col-6 f2");
    this._searchInput.setAttribute("type", "text");
    this._searchInput.setAttribute("placeholder", "Search version by name...");
    searchDiv.appendChild(this._searchInput);

    const tableDiv = document.createElement("div");
    tableDiv.setAttribute("class", "py-4 annotation__version-list");
    this._header.appendChild(tableDiv);

    this._table = document.createElement("table");
    this._table.setAttribute("class", "version-table col-12 rounded-2");
    tableDiv.appendChild(this._table);

    const thead = document.createElement("thead");
    thead.setAttribute(
      "class",
      "f3 text-left text-gray text-uppercase text-semibold"
    );
    this._table.appendChild(thead);

    const tr = document.createElement("tr");
    thead.appendChild(tr);

    const thName = document.createElement("th");
    thName.setAttribute("class", "px-3");
    thName.textContent = "Version";
    tr.appendChild(thName);

    const thView = document.createElement("th");
    thView.style.width = "80px";
    thView.textContent = "Viewable";
    tr.appendChild(thView);

    const thSelect = document.createElement("th");
    thSelect.setAttribute("class", "text-center");
    thSelect.style.width = "120px";
    thSelect.textContent = "Editable";
    tr.appendChild(thSelect);

    const spanView = document.createElement("span");
    spanView.setAttribute("class", "sr-only");
    spanView.textContent = "View version";
    thView.appendChild(spanView);

    this._tableBody = document.createElement("tbody");
    this._table.appendChild(this._tableBody);

    this._searchInput.addEventListener("input", () => {
      this.filterVersionTable();
    });
  }

  init(versions, selectedId) {
    console.log(`Selecting version ID: ${selectedId}`);

    this._tableRows = [];
    this._buttons = [];
    this._viewables = [];
    this._tableOrder = []; // Order of version IDs in the table

    this._tableBody.innerHTML = "";
    this._versions = versions;
    this._versionMap = {};
    for (const version of versions) {
      this._versionMap[version.id] = version;
    }

    // Organize the version list by name
    // Put the Baseline version first
    this._versions.sort((a, b) => {
      if (a.name == "Baseline") {
        return -1;
      }
      if (b.name == "Baseline") {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Initializes the dialog.
    // versions: returned object from Version endpoint.
    for (const version of versions) {
      const tr = document.createElement("tr");
      this._tableBody.appendChild(tr);

      const tdName = document.createElement("td");
      tdName.setAttribute("class", "px-3");
      tdName.setAttribute("title", version.description);
      tdName.innerHTML = `<div class="d-flex flex-column"><div class="text-semibold">${version.name}</div><div class="mt-1 text-dark-gray f4">(ID: ${version.id})</div></div>`;
      tr.appendChild(tdName);

      const tdViewable = document.createElement("td");
      tdViewable.setAttribute("class", "px-2");
      tdViewable.style.width = "80px";
      tr.appendChild(tdViewable);
      let viewable = document.createElement("bool-input");
      viewable.setValue(false);
      viewable.addEventListener(
        "change",
        this._handleViewableChange.bind(this)
      );
      viewable._legend.style.display = "none";
      tdViewable.appendChild(viewable);

      const tdSelect = document.createElement("td");
      tdSelect.setAttribute("class", "px-3");
      tdSelect.style.width = "160px";
      tr.appendChild(tdSelect);

      const select = document.createElement("version-select");
      select.addEventListener("select", this._handleSelect.bind(this));
      select.init(version, false);
      tdSelect.appendChild(select);
      this._buttons.push(select);
      this._viewables.push(viewable);
      this._tableOrder.push(version.id);
      this._tableRows.push(tr);
    }

    this._selected_idx = null;
    for (let idx = 0; idx < this._tableOrder.length; idx++) {
      if (this._tableOrder[idx] == selectedId) {
        this._selected_idx = idx;
        break;
      }
    }

    // Auto-select the baseline version if none is selected
    if (this._selected_idx == null) {
      for (let idx = 0; idx < this._tableOrder.length; idx++) {
        let version = this._versionMap[this._tableOrder[idx]];
        if (version.name == "Baseline") {
          this._selected_idx = idx;
          this._tableRows[idx].classList.add("selected");
          this._tableRows[idx].scrollIntoView();
          break;
        }
      }
    }

    this._buttons[this._selected_idx].select(true);
    this._viewables[this._selected_idx].setValue(true);
    this._viewables[this._selected_idx].setDisable(true);
    this._updatedDependentLayers(this._selected_idx);

    this._searchInput.value = "";
    this.filterVersionTable();
  }

  filterVersionTable() {
    const search = this._searchInput.value.toLowerCase();

    for (let idx = 0; idx < this._tableOrder.length; idx++) {
      var displayThisVersion = false;
      if (this._selected_idx == idx) {
        displayThisVersion = true;
      }
      if (search.trim().length == 0 || search == null) {
        displayThisVersion = true;
      }

      const version = this._versionMap[this._tableOrder[idx]];
      const tr = this._tableRows[idx];
      if (
        version.name.toLowerCase().indexOf(search) >= 0 ||
        displayThisVersion
      ) {
        tr.style.display = "";
      } else {
        tr.style.display = "none";
      }
    }
  }

  // A selected layer might have dependent layers that come for the ride.
  _updatedDependentLayers(selected_idx) {
    const selected_version = this._versionMap[this._tableOrder[selected_idx]];

    if (typeof selected_version === "undefined") {
      return;
    }
    const bases = selected_version.bases;
    for (let idx = 0; idx < this._viewables.length; idx++) {
      const button = this._buttons[idx];
      const viewable = this._viewables[idx];
      // If this row is included make it read only as well
      if (bases.indexOf(button._version.id) >= 0) {
        viewable.setDisable(true);
        viewable.setValue(true);
      } else if (button._version.id == selected_version.id) {
        // no-op
      } else {
        viewable.setDisable(false);
        viewable.setValue(false);
      }
    }
  }

  _handleViewableChange(evt) {
    let viewables = [];
    for (let idx = 0; idx < this._viewables.length; idx++) {
      const viewable = this._viewables[idx];
      const version = this._versions[idx];
      if (viewable.getValue() == true) {
        viewables.push(version.id);
      }
    }

    const selected_version =
      this._versionMap[this._tableOrder[this._selected_idx]];

    this.dispatchEvent(
      new CustomEvent("versionSelect", {
        detail: {
          version: selected_version,
          viewables: viewables,
        },
      })
    );
  }
  _handleSelect(evt) {
    const id = evt.detail.version.id;
    let selected_idx = null;
    for (let idx = 0; idx < this._buttons.length; idx++) {
      const button = this._buttons[idx];
      const viewable = this._viewables[idx];
      const sameVersion = this._tableOrder[idx] == id;
      const tableRow = this._tableRows[idx];
      if (!sameVersion) {
        button.deselect();
        viewable.setValue(false);
        viewable.setDisable(false);
        tableRow.classList.remove("selected");
      } else {
        button.select(true);
        viewable.setValue(true);
        viewable.setDisable(true);
        tableRow.classList.add("selected");
        selected_idx = idx;
      }
    }
    this._updatedDependentLayers(selected_idx);
    this._selected_idx = selected_idx;
    this.dispatchEvent(
      new CustomEvent("versionSelect", {
        detail: {
          version: evt.detail.version,
        },
      })
    );
  }
}

customElements.define("version-dialog", VersionDialog);
