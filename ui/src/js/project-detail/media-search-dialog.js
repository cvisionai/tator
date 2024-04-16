import { ModalDialog } from "../components/modal-dialog.js";

/**
 * Dialog for creating new and editing media search sections
 */
export class MediaSearchDialog extends ModalDialog {
  /**
   * Constructor
   */
  constructor() {
    super();

    // UI elements
    this._errorMessage = document.createElement("div");
    this._errorMessage.setAttribute(
      "class",
      "f2 text-semibold text-red px-3 py-3 text-center"
    );
    this._errorMessage.style.display = "none";
    this._main.appendChild(this._errorMessage);

    this._name = document.createElement("text-input");
    this._name.setAttribute("class", "text-gray f2");
    this._name.setAttribute("name", "Media Search Name:");
    this._main.appendChild(this._name);

    this._originalName = document.createElement("div");
    this._originalName.setAttribute("class", "text-purple f3 mt-1 mb-3");
    this._main.appendChild(this._originalName);
    this._originalName.style.display = "none";

    this._save = document.createElement("button");
    this._save.setAttribute("class", "btn btn-clear btn-purple disabled");
    this._footer.appendChild(this._save);
    this._save.setAttribute("disabled", "");

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    // Data initialization
    this._sectionData = null;

    // Event handlers
    this._name.addEventListener("change", () => {
      var proposedName = this._name.getValue();
      if (this._sectionData.verifySectionRename(proposedName)) {
        this.enableSave();
      } else {
        this.invalidName();
      }

      if (this._mode == "editSearch") {
        if (proposedName != this._selectedSection.name) {
          var parts = this._sectionData.getSectionNamesLineage(
            this._selectedSection
          );
          this._originalName.style.display = "block";
          this._originalName.innerHTML = `Changing folder name from: <span class="text-semibold">${
            parts[parts.length - 1]
          }</span>`;
        } else {
          this._originalName.style.display = "none";
        }
      }
    });

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this._save.addEventListener("click", () => {
      var proposedName = this._name.getValue();
      var info = this._sectionData.makeFolderNameAndPath(proposedName);

      if (this._mode == "newSearch") {
        var spec = {
          name: info.name,
          path: info.path,
          visible: true,
        };

        // Utilize the URL to get the encoded search and encoded related search information
        const params = new URLSearchParams(
          document.location.search.substring(1)
        );

        if (params.has("encoded_search")) {
          let object_search = JSON.parse(atob(params.get("encoded_search")));
          if (this._selectedSection == null) {
            spec.object_search = object_search;
          } else if (this._selectedSection?.object_search) {
            let union_operation = {
              method: "and",
              operations: [this._selectedSection.object_search, object_search],
            };
            spec.object_search = union_operation;
          } else {
            let sectionOperation = {
              attribute: "$section",
              operation: "eq",
              value: this._selectedSection.id,
            };
            let union_operation = {
              method: "and",
              operations: [sectionOperation, object_search],
            };
            spec.object_search = union_operation;
          }
        } else if (this._selectedSection != null) {
          let sectionOperation = {
            method: "and",
            operations: [
              {
                attribute: "$section",
                operation: "eq",
                value: this._selectedSection.id,
              },
            ],
          };
          spec.object_search = sectionOperation;
        }

        if (params.has("encoded_related_search")) {
          let related_search = JSON.parse(
            atob(params.get("encoded_related_search"))
          );
          if (this._selectedSection?.related_search) {
            let union_operation = {
              method: "and",
              operations: [
                this._selectedSection.related_search,
                related_search,
              ],
            };
            spec.related_search = union_operation;
          } else {
            spec.related_search = related_search;
          }
        }

        this.dispatchEvent(
          new CustomEvent(this._saveClickEvent, {
            detail: { spec: spec },
          })
        );
      } else if (this._mode == "editSearch") {
        var patchSpecs = [];
        var patchSpec = {};

        if (info.name != this._selectedSection.name) {
          patchSpec.name = info.name;
        }
        if (info.path != this._selectedSection.path) {
          patchSpec.path = info.path;
        }
        // If patchSpec has nothing, then don't send a patch request
        if (Object.keys(patchSpec).length == 0) {
          return;
        }
        patchSpecs.push({
          id: this._selectedSection.id,
          spec: patchSpec,
        });

        this.dispatchEvent(
          new CustomEvent(this._saveClickEvent, {
            detail: {
              mainSectionId: this._selectedSection.id,
              specs: patchSpecs,
            },
          })
        );
      }
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
      "Invalid name provided. Name cannot be blank or share the same name as another folder in the same sub-directory.";
    this._errorMessage.style.display = "block";
  }

  /**
   * Can be called multiple times to reset the dialog (e.g. whenever there's a new section list)
   * @param {SectionData} sectionData
   *    SectionData object to use for the dialog
   * @postcondition Name and Parent Folders fields are reset
   */
  init(sectionData) {
    this._name.reset();
    this._sectionData = sectionData;
    this._selectedSection = null;
  }

  /**
   * @param {string} mode
   *   "newSearch" | "editSearch"
   * @param {Tator.Section} selectedSection
   *   Selected section in the UI
   */
  setMode(mode, selectedSection) {
    this._originalName.style.display = "none";
    this._errorMessage.style.display = "none";
    this._save.setAttribute("disabled", "");
    this._selectedSection = selectedSection;

    if (mode == "newSearch") {
      this._title.nodeValue = "Add Media Search";
      this._mode = mode;
      this._save.textContent = "Add";
      this._saveClickEvent = "add";
      this._name.setValue("");
    } else if (mode == "editSearch") {
      this._title.nodeValue = "Rename Media Search";
      this._mode = mode;
      this._save.textContent = "Rename";
      this._saveClickEvent = "edit";

      var parts = this._sectionData.getSectionNamesLineage(
        this._selectedSection
      );
      this._name.setValue(parts[parts.length - 1]);
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }
  }
}
customElements.define("media-search-dialog", MediaSearchDialog);
