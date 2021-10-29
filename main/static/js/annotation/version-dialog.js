class VersionDialog extends ModalDialog {
  constructor() {
    super();
   
    // Rework the styles 
    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "px-3 py-3");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "Versions";
    this._main.remove();
    this._footer.remove();

    const tableDiv = document.createElement("div");
    tableDiv.setAttribute("class", "py-4 annotation__version-list");
    this._header.appendChild(tableDiv);

    this._table = document.createElement("table");
    this._table.setAttribute("class", "table col-12");
    tableDiv.appendChild(this._table);

    const thead = document.createElement("thead");
    thead.setAttribute("class", "f3 text-left text-gray text-uppercase text-semibold");
    this._table.appendChild(thead);

    const tr = document.createElement("tr");
    thead.appendChild(tr);

    const thName = document.createElement("th");
    thName.setAttribute("class", "py-3 col-9");
    thName.textContent = "Version";
    tr.appendChild(thName);

    const thView = document.createElement("th");
    thView.textContent = "Viewable";
    tr.appendChild(thView);

    const thSelect = document.createElement("th");
    thSelect.textContent = "Editable";
    tr.appendChild(thSelect);

    const spanView = document.createElement("span");
    spanView.setAttribute("class", "sr-only");
    spanView.textContent = "View version";
    thView.appendChild(spanView);

    this._buttons = [];
    this._viewables = [];
  }

  init(versions, selected_idx) {
    this._versions = versions;
    // Initializes the dialog.
    // versions: returned object from Version endpoint.
    for (const version of versions) {
      const tbody = document.createElement("tbody");
      this._table.appendChild(tbody);

      const tr = document.createElement("tr");
      tbody.appendChild(tr);

      const tdName = document.createElement("td");
      tdName.setAttribute("title", version.description);
      tdName.textContent = version.name;
      tr.appendChild(tdName);

      const tdViewable = document.createElement("td");
      tdViewable.setAttribute("class", "px-2");
      tr.appendChild(tdViewable);
      let viewable = document.createElement("bool-input");
      viewable.setValue(false);
      tdViewable.appendChild(viewable);

      const tdSelect = document.createElement("td");
      tdSelect.setAttribute("class", "px-2");
      tr.appendChild(tdSelect);

      const select = document.createElement("version-select");
      select.addEventListener("select", this._handleSelect.bind(this));
      select.init(version, false);
      tdSelect.appendChild(select);
      this._buttons.push(select);
      this._viewables.push(viewable);
    }

    this._buttons[selected_idx].select(true);
    this._viewables[selected_idx].setValue(true);
    this._viewables[selected_idx].setDisable(true);
  }

  _handleSelect(evt) {
    const id = evt.detail.version.id;
    for (let idx = 0; idx < this._buttons.length; idx++) {
      const button = this._buttons[idx];
      const viewable = this._viewables[idx];
      const sameVersion = button._version.id == id;
      if (!sameVersion) {
        button.deselect();
        viewable.setValue(false);
        viewable.setDisable(false);
      } else {
        button.select(true);
        viewable.setValue(true);
        viewable.setDisable(true);
      }
    }
    this.dispatchEvent(new CustomEvent("versionSelect", {
      "detail": {
        "version": evt.detail.version,
      }
    }));
  }
}

customElements.define("version-dialog", VersionDialog);
