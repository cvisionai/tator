class VersionDialog extends ModalDialog {
  constructor() {
    super();
   
    // Rework the styles 
    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "px-3 py-3");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "Version History";
    this._main.remove();
    this._footer.remove();

    const tableDiv = document.createElement("div");
    tableDiv.setAttribute("class", "py-4");
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
    thName.setAttribute("class", "py-3 col-3");
    thName.textContent = "Version";
    tr.appendChild(thName);

    const thUpdated = document.createElement("th");
    thUpdated.setAttribute("class", "col-4");
    thUpdated.textContent = "Updated";
    tr.appendChild(thUpdated);

    const thDesc = document.createElement("th");
    thDesc.setAttribute("class", "col-3");
    thDesc.textContent = "Description";
    tr.appendChild(thDesc);

    const thView = document.createElement("th");
    tr.appendChild(thView);

    const spanView = document.createElement("span");
    spanView.setAttribute("class", "sr-only");
    spanView.textContent = "View version";
    thView.appendChild(spanView);

    this._buttons = [];
  }

  init(versions) {
    // Initializes the dialog.
    // versions: returned object from Version endpoint.
    for (const version of versions) {
      const tbody = document.createElement("tbody");
      this._table.appendChild(tbody);

      const tr = document.createElement("tr");
      tbody.appendChild(tr);

      const tdName = document.createElement("td");
      tdName.textContent = version.name;
      tr.appendChild(tdName);

      const tdUpdated = document.createElement("td");
      tdUpdated.setAttribute("class", "f3 text-gray");
      const created = new Date(version.created_datetime);
      const created_str = created.toDateString().slice(4);
      tdUpdated.textContent = created_str + " by " + version.created_name;
      tr.appendChild(tdUpdated);

      const tdDesc = document.createElement("td");
      tdDesc.setAttribute("class", "f3 text-gray");
      tdDesc.textContent = version.description;
      tr.appendChild(tdDesc);

      const tdSelect = document.createElement("td");
      tr.appendChild(tdSelect);

      const select = document.createElement("version-select");
      select.addEventListener("select", this._handleSelect.bind(this));
      select.init(version, false);
      tdSelect.appendChild(select);
      this._buttons.push(select);

      if (version.created_datetime != version.modified_datetime) {
        const trEdited = document.createElement("tr");
        tbody.appendChild(trEdited);

        const tdNameEdited = document.createElement("td");
        tdNameEdited.setAttribute("class", "f3 text-gray text-uppercase text-semibold");
        tdNameEdited.textContent = "Edited";
        trEdited.appendChild(tdNameEdited);

        const tdModified = document.createElement("td");
        tdModified.setAttribute("class", "f3 text-gray");
        const modified = new Date(version.modified_datetime);
        const modified_str = modified.toDateString().slice(4);
        tdModified.textContent = created_str + " by " + version.modified_name;
        trEdited.appendChild(tdModified);

        const tdDescEdited = document.createElement("td");
        tdDescEdited.setAttribute("class", "f3 text-gray");
        tdDescEdited.textContent = version.description;
        trEdited.appendChild(tdDescEdited);

        const tdSelectEdited = document.createElement("td");
        trEdited.appendChild(tdSelectEdited);

        const selectEdited = document.createElement("version-select");
        selectEdited.addEventListener("select", this._handleSelect.bind(this));
        selectEdited.init(version, true);
        tdSelectEdited.appendChild(selectEdited);
        this._buttons.push(selectEdited);
      }
    }
  }

  _handleSelect(evt) {
    const version = evt.detail.version;
    const edited = evt.detail.edited;
    for (const button of this._buttons) {
      const sameVersion = button._version.number == version.number;
      const sameEdited = button._edited == edited;
      if (!(sameVersion && sameEdited)) {
        button.deselect();
      }
    }
  }
}

customElements.define("version-dialog", VersionDialog);
