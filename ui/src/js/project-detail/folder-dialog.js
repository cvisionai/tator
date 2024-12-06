import { ModalDialog } from "../components/modal-dialog.js";
import { store } from "./store.js";
/**
 * Dialog for creating a new section.
 * There will be two components:
 *
 * - Name of the folder
 * - A dropdown for nesting
 *   This dropdown consist of each section and each level is padded out
 */
export class FolderDialog extends ModalDialog {
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
    this._name.setAttribute("name", "Folder Name:");
    this._main.appendChild(this._name);

    this._originalName = document.createElement("div");
    this._originalName.setAttribute("class", "text-purple f3 mt-1 mb-3");
    this._main.appendChild(this._originalName);
    this._originalName.style.display = "none";

    this._parentFolders = document.createElement("enum-input");
    this._parentFolders.setAttribute("class", "text-gray f2");
    this._parentFolders.setAttribute("name", "Parent Folder:");
    this._main.appendChild(this._parentFolders);

    this._originalParent = document.createElement("div");
    this._originalParent.setAttribute("class", "text-purple f3 mt-1 mb-3");
    this._main.appendChild(this._originalParent);
    this._originalParent.style.display = "none";

    this._save = document.createElement("button");
    this._save.setAttribute("class", "btn btn-clear btn-purple disabled");
    this._footer.appendChild(this._save);
    this._save.setAttribute("disabled", "");

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    // Data initialization
    this._noParentName = "-- None --";
    this._sectionData = null;

    // Event handlers
    this._name.addEventListener("input", () => {
      var proposedName = this._name.getValue();
      var parentSectionId = this._parentFolders.getValue();
      if (parentSectionId == this._noParentName) {
        parentSectionId = null;
      }
      if (
        this._sectionData.verifySectionRename(proposedName, parentSectionId)
      ) {
        this.enableSave();
      } else {
        this.invalidName();
      }

      if (this._mode == "moveFolder") {
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

    this._parentFolders.addEventListener("change", () => {
      var proposedName = this._name.getValue();
      var parentSectionId = this._parentFolders.getValue();
      if (parentSectionId == this._noParentName) {
        parentSectionId = null;
      }
      if (
        this._sectionData.verifySectionRename(proposedName, parentSectionId)
      ) {
        this.enableSave();
      } else {
        this.invalidName();
      }

      if (this._mode == "moveFolder") {
        var parentSections = this._sectionData.getParentSections(
          this._selectedSection
        );
        if (parentSections.length == 0 && parentSectionId != null) {
          var parts = this._sectionData.getSectionNamesLineage(
            this._selectedSection
          );
          parts.pop();
          var pathToShow = parts.join(" > ");
          this._originalParent.style.display = "block";
          this._originalParent.innerHTML = `Changing parent folder from: <span class="text-semibold">${pathToShow}</span>`;
        }
        if (
          parentSections.length > 0 &&
          parentSections[0].id != this._parentFolders.getValue()
        ) {
          var parts = this._sectionData.getSectionNamesLineage(
            this._selectedSection
          );
          parts.pop();
          var pathToShow = parts.join(" > ");
          this._originalParent.style.display = "block";
          this._originalParent.innerHTML = `Changing parent folder from: <span class="text-semibold">${pathToShow}</span>`;
        } else {
          this._originalParent.style.display = "none";
        }
      }
    });

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this._save.addEventListener("click", () => {
      var proposedName = this._name.getValue();
      var parentSectionId = this._parentFolders.getValue();
      if (parentSectionId == this._noParentName) {
        parentSectionId = null;
      }
      var info = this._sectionData.makeFolderNameAndPath(
        proposedName,
        parentSectionId
      );

      if (this._mode == "newFolder") {
        this.dispatchEvent(
          new CustomEvent("add", {
            detail: {
              name: info.name,
              path: info.path,
            },
          })
        );
      } else if (this._mode == "moveFolder" || this._mode == "renameFolder") {
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

        // If the path or name has changed, we need to update the children
        var childSections = this._sectionData.getChildSections(
          this._selectedSection
        );
        for (const childSection of childSections) {
          patchSpecs.push({
            id: childSection.id,
            spec: {
              path: childSection.path.replace(
                this._selectedSection.path,
                info.path
              ),
              name: childSection.name.replace(
                this._selectedSection.name,
                info.name
              ),
            },
          });
        }
        patchSpecs.push({
          id: this._selectedSection.id,
          spec: patchSpec,
        });

        this.dispatchEvent(
          new CustomEvent("edit", {
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
   *   "newFolder" | "moveFolder" | "renameFolder"
   * @param {Tator.Section} selectedSection
   *   Selected section in the UI
   */
  setMode(mode, selectedSection) {
    this._originalName.style.display = "none";
    this._originalParent.style.display = "none";
    this._errorMessage.style.display = "none";
    this._save.setAttribute("disabled", "");
    this._selectedSection = selectedSection;
    this._parentFolders.style.display = "block";

    if (mode == "newFolder") {
      //
      // Add Folder
      //
      this._title.nodeValue = "Add Folder";
      this._mode = mode;
      this._save.textContent = "Add";
      this._name.setValue("");
      this._parentFolders.clear();
      var choices = this._sectionData.getFolderEnumChoices();
      choices.unshift({ value: this._noParentName, label: this._noParentName });
      this._parentFolders.choices = choices;
      this._parentFolders.setValue(selectedSection?.id);
    } else if (mode == "moveFolder") {
      //
      // Move Folder
      //
      this._title.nodeValue = "Move Folder";
      this._mode = mode;
      this._save.textContent = "Move";

      // Remove the current section and its children from the parent folder choices
      this._parentFolders.clear();
      var choices = this._sectionData.getFolderEnumChoices();
      var newChoices = [];
      if (selectedSection != null) {
        for (const choice of choices) {
          // Don't include choices that are descendant sections of the selected section,
          // or the selected section itself.
          let choiceID = choice.value;
          var childSections =
            this._sectionData.getDescendantSections(selectedSection);
          var childSectionIds = childSections.map((child) => child.id);
          if (
            !childSectionIds.includes(choiceID) &&
            choiceID != selectedSection.id
          ) {
            newChoices.push(choice);
          }
        }
      }
      newChoices.unshift({
        value: this._noParentName,
        label: this._noParentName,
      });
      this._parentFolders.choices = newChoices;
      var parts = this._sectionData.getSectionNamesLineage(selectedSection);
      this._name.setValue(parts[parts.length - 1]);

      var parentSections = this._sectionData.getParentSections(selectedSection);
      if (parentSections.length == 0) {
        this._parentFolders.setValue(this._noParentName);
      } else {
        this._parentFolders.setValue(parentSections[0].id);
      }
    } else if (mode == "renameFolder") {
      //
      // Rename Folder
      //
      this._title.nodeValue = "Rename Folder";
      this._mode = mode;
      this._save.textContent = "Rename";
      this._parentFolders.style.display = "none";

      // Remove the current section and its children from the parent folder choices
      this._parentFolders.clear();
      var choices = this._sectionData.getFolderEnumChoices();
      var newChoices = [];
      if (selectedSection != null) {
        for (const choice of choices) {
          // Don't include choices that are descendant sections of the selected section,
          // or the selected section itself.
          let choiceID = choice.value;
          var childSections =
            this._sectionData.getDescendantSections(selectedSection);
          var childSectionIds = childSections.map((child) => child.id);
          if (
            !childSectionIds.includes(choiceID) &&
            choiceID != selectedSection.id
          ) {
            newChoices.push(choice);
          }
        }
      }
      newChoices.unshift({
        value: this._noParentName,
        label: this._noParentName,
      });
      this._parentFolders.choices = newChoices;
      var parts = this._sectionData.getSectionNamesLineage(selectedSection);
      this._name.setValue(parts[parts.length - 1]);

      var parentSections = this._sectionData.getParentSections(selectedSection);
      if (parentSections.length == 0) {
        this._parentFolders.setValue(this._noParentName);
      } else {
        this._parentFolders.setValue(parentSections[0].id);
      }
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }
  }
}
customElements.define("folder-dialog", FolderDialog);
