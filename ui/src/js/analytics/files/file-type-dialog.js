import { ModalDialog } from "../../components/modal-dialog.js";

export class FileTypeDialog extends ModalDialog {
  constructor() {
    super();

    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "px-3 py-3");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "File Types";
    this._main.remove();
    this._footer.remove();

    const tableDiv = document.createElement("div");
    tableDiv.setAttribute("class", "py-4 annotation__version-list");
    this._header.appendChild(tableDiv);

    this._table = document.createElement("table");
    this._table.setAttribute("class", "table col-12");
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
    thName.setAttribute("class", "py-3 col-9");
    thName.textContent = "Files Types";
    tr.appendChild(thName);

    const thView = document.createElement("th");
    tr.appendChild(thView);

    const spanView = document.createElement("span");
    spanView.setAttribute("class", "sr-only");
    spanView.textContent = "View files";
    thView.appendChild(spanView);

    this._buttons = [];
  }

  init(fileTypes, selectedIndex) {
    for (const fileType of fileTypes) {
      const tbody = document.createElement("tbody");
      this._table.appendChild(tbody);

      const tr = document.createElement("tr");
      tbody.appendChild(tr);

      const tdName = document.createElement("td");
      tdName.setAttribute("title", fileType.description);
      tdName.textContent = fileType.name;
      tr.appendChild(tdName);

      const tdSelect = document.createElement("td");
      tdSelect.setAttribute("class", "px-2");
      tr.appendChild(tdSelect);

      const select = document.createElement("file-type-select");
      select.addEventListener("select", this._handleSelect.bind(this));
      select.init(fileType, false);
      tdSelect.appendChild(select);
      this._buttons.push(select);
    }

    this._buttons[selectedIndex].select(true);
  }

  _handleSelect(evt) {
    const id = evt.detail.fileType.id;
    for (const button of this._buttons) {
      const sameFileType = button._fileType.id == id;
      if (!sameFileType) {
        button.deselect();
      } else {
        button.select(true);
      }
    }
    this.removeAttribute("is-open");
    this.dispatchEvent(
      new CustomEvent("fileTypeSelect", {
        detail: {
          fileType: evt.detail.fileType,
        },
      })
    );
  }
}

customElements.define("file-type-dialog", FileTypeDialog);
