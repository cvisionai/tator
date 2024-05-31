import { ModalDialog } from "../components/modal-dialog.js";

/**
 * Dialog for editing an existing bookmark
 * - Currently only capability is to rename it
 */
export class BookmarkEditDialog extends ModalDialog {
  /**
   * Constructor
   */
  constructor() {
    super();

    this._title.nodeValue = "Rename Bookmark";
    this._main.classList.remove("py-4");
    this._main.classList.add("pt-3");

    this._errorMessage = document.createElement("div");
    this._errorMessage.setAttribute(
      "class",
      "f2 text-semibold text-red px-3 py-3 text-center"
    );
    this._errorMessage.style.display = "none";
    this._main.appendChild(this._errorMessage);

    this._name = document.createElement("text-input");
    this._name.setAttribute("class", "text-gray f2");
    this._name.setAttribute("name", "Bookmark Name:");
    this._main.appendChild(this._name);

    this._originalName = document.createElement("div");
    this._originalName.setAttribute("class", "text-purple f3 mt-1 mb-3");
    this._main.appendChild(this._originalName);
    this._originalName.style.display = "none";

    this._save = document.createElement("button");
    this._save.setAttribute("class", "btn btn-clear btn-purple disabled");
    this._save.textContent = "Rename";
    this._footer.appendChild(this._save);
    this._save.setAttribute("disabled", "");

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    // Event handlers
    this._name.addEventListener("input", () => {
      var proposedName = this._name.getValue();

      if (proposedName != "") {
        this.enableSave();
        if (proposedName != this._bookmark.name) {
          this._originalName.style.display = "block";
          this._originalName.innerHTML = `Changing bookmark name from: <span class="text-semibold">${this._bookmark.name}</span>`;
        }
      } else {
        this._originalName.style.display = "none";
        this.invalidName();
      }
    });

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this._save.addEventListener("click", () => {
      var newName = this._name.getValue();
      newName = newName.trim();
      this.dispatchEvent(
        new CustomEvent("edit", {
          detail: {
            id: this._bookmark.id,
            spec: { name: newName },
          },
        })
      );
    });
  }

  /**
   * Call to enable the save button and hide the error message
   * Typically called after the fields have been verified
   */
  enableSave() {
    this._save.removeAttribute("disabled");
    this._errorMessage.style.display = "none";
  }

  /**
   * Call to set the modal to an invalid name state
   * Typically called after the fields have been verified
   */
  invalidName() {
    this._save.setAttribute("disabled", "");
    this._errorMessage.innerHTML =
      "Invalid bookmark name provided. Cannot be blank.";
    this._errorMessage.style.display = "block";
  }

  /**
   * @param {Tator.Bookmark} bookmark
   */
  init(bookmark) {
    this._bookmark = bookmark;
    this._name.setValue(bookmark.name);
    this._originalName.style.display = "none";
  }
}
customElements.define("bookmark-edit-dialog", BookmarkEditDialog);
