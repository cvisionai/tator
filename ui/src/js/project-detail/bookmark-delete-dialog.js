import { ModalDialog } from "../components/modal-dialog.js";

/**
 * Modal specifically for deleting a bookmark
 */
export class BookmarkDeleteDialog extends ModalDialog {

  constructor() {
    super();

    this._title.nodeValue = "Delete Bookmark";
    this._main.classList.remove("py-4");
    this._main.classList.add("pt-3");

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    this._dataText = document.createElement("div");
    this._dataText.setAttribute("class", "f2 text-gray px-3 py-3 text-center");
    this._main.appendChild(this._dataText);

    this._warning = document.createElement("div");
    this._warning.setAttribute("class", "py-3 text-center f2 text-red");
    this._warning.innerHTML = `<span class="text-semibold">Warning: </span>This cannot be undone`;
    this._main.appendChild(this._warning);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.textContent = "Delete";
    this._footer.appendChild(this._accept);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this._accept.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("delete", {
        detail: {
          data: this._data,
       }
      }));
    });
  }

  /**
   * @param {Tator.Bookmark} data
   */
  init(data) {
    this._data = data;
    this._dataText.innerHTML = `<span>Are you sure you want to delete the bookmark:</span><br /><span class="text-semibold">${data.name}</span>?`;
  }
}
customElements.define("bookmark-delete-dialog", BookmarkDeleteDialog);