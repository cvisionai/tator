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

    const thAnnotations = document.createElement("th");
    thAnnotations.setAttribute("class", "col-3");
    thAnnotations.textContent = "Annotations";
    tr.appendChild(thAnnotations);

    const thView = document.createElement("th");
    tr.appendChild(thView);

    const spanView = document.createElement("span");
    spanView.setAttribute("class", "sr-only");
    spanView.textContent = "View version";
    thView.appendChild(spanView);

    this._buttons = [];
  }

  init(versions, selected_idx) {
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

      const tdUpdated = document.createElement("td");
      tdUpdated.setAttribute("class", "f3 text-gray");
      const created = new Date(version.created_datetime);
      if (!isNaN(created)) {
        const created_str = created.toDateString().slice(4);
        tdUpdated.textContent = created_str + " by " + version.created_by;
      } else {
        tdUpdated.textContent = "---";
      }
      tr.appendChild(tdUpdated);

      const tdAnnotations = document.createElement("td");
      tdAnnotations.setAttribute("class", "f3 text-gray");
      tdAnnotations.textContent = version.num_created;
      tr.appendChild(tdAnnotations);

      const tdSelect = document.createElement("td");
      tr.appendChild(tdSelect);

      const select = document.createElement("version-select");
      select.addEventListener("select", this._handleSelect.bind(this));
      select.init(version, false);
      tdSelect.appendChild(select);
      this._buttons.push(select);

      const trEdited = document.createElement("tr");
      tbody.appendChild(trEdited);

      const tdNameEdited = document.createElement("td");
      tdNameEdited.setAttribute("class", "f3 text-gray text-uppercase text-semibold");
      tdNameEdited.textContent = "Edited";
      trEdited.appendChild(tdNameEdited);

      const tdModified = document.createElement("td");
      tdModified.setAttribute("class", "f3 text-gray");
      const modified = new Date(version.modified_datetime);
      if (!isNaN(modified)) {
        const modified_str = modified.toDateString().slice(4);
        tdModified.textContent = modified_str + " by " + version.modified_by;
      } else {
        tdModified.textContent = "---";
      }
      trEdited.appendChild(tdModified);

      const tdAnnotationsEdited = document.createElement("td");
      tdAnnotationsEdited.setAttribute("class", "f3 text-gray");
      tdAnnotationsEdited.textContent = version.num_modified;
      trEdited.appendChild(tdAnnotationsEdited);

      const tdSelectEdited = document.createElement("td");
      trEdited.appendChild(tdSelectEdited);

      const selectEdited = document.createElement("version-select");
      selectEdited.addEventListener("select", this._handleSelect.bind(this));
      selectEdited.init(version, true);
      tdSelectEdited.appendChild(selectEdited);
      this._buttons.push(selectEdited);
    }

    this._buttons[selected_idx].select(true);
  }

  _handleSelect(evt) {
    const id = evt.detail.version.id;
    for (const button of this._buttons) {
      const sameVersion = button._version.id == id;
      const sameEdited = button._edited == evt.detail.edited;
      if (!(sameVersion && sameEdited)) {
        button.deselect();
      }
    }
    this.dispatchEvent(new CustomEvent("versionSelect", {
      "detail": {
        "version": evt.detail.version,
        "edited": evt.detail.edited,
      }
    }));
  }
}

customElements.define("version-dialog", VersionDialog);
