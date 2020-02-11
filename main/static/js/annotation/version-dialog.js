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
    thDesc.setAttribute("class", "col-4");
    thDesc.textContent = "Description";
    tr.appendChild(thDesc);

    const thView = document.createElement("th");
    tr.appendChild(thView);

    const spanView = document.createElement("span");
    spanView.setAttribute("class", "sr-only");
    spanView.textContent = "View version";
    thView.appendChild(spanView);
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
      tbody.appendChild(tdName);

      const tdUpdated = document.createElement("td");
      tdUpdated.setAttribute("class", "f3 text-gray");
    }
  }
}

customElements.define("version-dialog", VersionDialog);
