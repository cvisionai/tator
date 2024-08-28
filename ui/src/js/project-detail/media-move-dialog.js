import { ModalDialog } from "../components/modal-dialog.js";

/**
 * Dialog window for moving media from one folder to another
 */
export class MediaMoveDialog extends ModalDialog {
  constructor() {
    super();

    this._title.textContent = "Move Media";

    this._folderOptions = document.createElement("enum-input");
    this._folderOptions.setAttribute("class", "text-gray f2");
    this._folderOptions.setAttribute("name", "Destination Folder:");
    this._main.appendChild(this._folderOptions);

    this._save = document.createElement("button");
    this._save.setAttribute("class", "btn btn-clear btn-purple");
    this._save.textContent = "Move";
    this._footer.appendChild(this._save);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this._save.addEventListener("click", () => {
      var destSectionId = this._folderOptions.getValue();
      if (destSectionId == this._noFolderName) {
        destSectionId = null;
      }
      this.dispatchEvent(
        new CustomEvent("move", {
          detail: {
            destSectionId: destSectionId,
            mediaIds: this._mediaIds,
          },
        })
      );
    });
  }

  /**
   * Must be called whenever a section list is retrieved in the page
   * @param {SectionData} sectionData
   *    SectionData object to use for the dialog
   */
  initSectionOptions(sectionData) {
    this._noFolderName = "No Folder (visible in All Media)";
    this._sectionData = sectionData;
    var choices = this._sectionData.getFolderEnumChoices();
    choices.unshift({ value: this._noFolderName, label: this._noFolderName });

    this._folderOptions.clear();
    this._folderOptions.choices = choices;
  }

  /**
   * @param {array} mediaIds
   *    Array of media ID files to move
   */
  updateUI(mediaIds) {
    this._mediaIds = mediaIds;
    this._folderOptions.setAttribute(
      "name",
      `Move ${mediaIds.length} media to:`
    );
  }
}

customElements.define("media-move-dialog", MediaMoveDialog);
