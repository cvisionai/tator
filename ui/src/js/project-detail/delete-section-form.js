import { ModalDialog } from "../components/modal-dialog.js";
import { SectionData } from "../util/section-utilities.js";

export class DeleteSectionForm extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This cannot be undone";
    this._main.appendChild(warning);

    const texts = ["", "", ""];
    this._checks = new Array(texts.length);
    texts.forEach((item, index, array) => {
      this._checks[index] = document.createElement("labeled-checkbox");
      this._checks[index].setAttribute("text", item);
      this._main.appendChild(this._checks[index]);
    });

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.setAttribute("disabled", "");
    this._accept.textContent = "Delete Section";
    this._footer.appendChild(this._accept);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._checks.forEach((item, index, array) => {
      item.addEventListener("change", (evt) => {
        let allChecked = true;
        this._checks.forEach((item, index, array) => {
          if (!item.checked) {
            allChecked = false;
          }
        });
        if (allChecked) {
          this._accept.removeAttribute("disabled");
        } else {
          this._accept.setAttribute("disabled", "");
        }
      });
    });

    this._accept.addEventListener("click", async (evt) => {
      this.dispatchEvent(
        new CustomEvent("confirmDelete", {
          detail: { id: this._section.id, deleteMedia: this._deleteMedia },
        })
      );
    });
  }

  /**
   * @param {bool} deleteMedia
   *    True if the media is also to be deleted along with the section.
   *    False if it's only the section.
   *    The UI shows different messages based on this.
   */
  init(section, deleteMedia) {
    this._section = section;
    this._deleteMedia = deleteMedia;

    var sectionText = "Folder";
    if (SectionData.isSavedSearch(section)) {
      sectionText = "Media Search";
    }

    if (deleteMedia) {
      this._title.nodeValue = `Delete ${SectionData.getMainName(
        section
      )} ${sectionText.toLowerCase()} and media`;
      this._checks[0].setAttribute(
        "text",
        `Delete ${sectionText.toLowerCase()}`
      );
      this._checks[1].setAttribute(
        "text",
        `Delete media in ${sectionText.toLowerCase()}`
      );
      this._checks[2].setAttribute("text", "Delete annotations");
      this._accept.textContent = "Delete";
    } else {
      this._title.nodeValue = `Delete ${SectionData.getMainName(
        section
      )} ${sectionText.toLowerCase()} and retain media`;
      this._checks[0].setAttribute(
        "text",
        `Delete ${sectionText.toLowerCase()}`
      );
      this._checks[1].setAttribute(
        "text",
        'Retain and access media in "All Media"'
      );
      this._checks[2].setAttribute("text", "Retain annotations");
      this._accept.textContent = "Delete";
    }
    this._checks.forEach((item, index, array) => {
      item.checked = false;
    });
    this._accept.setAttribute("disabled", "");
  }
}

customElements.define("delete-section-form", DeleteSectionForm);
