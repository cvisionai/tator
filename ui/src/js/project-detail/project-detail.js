import { TatorPage } from "../components/tator-page.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { TatorData } from "../util/tator-data.js";
import { TatorElement, svgNamespace } from "../components/tator-element.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { FilterData } from "../components/filter-data.js";
import { v1 as uuidv1 } from "uuid";
import { store } from "./store.js";
import { FilterConditionData } from "../util/filter-utilities.js";
import Gear from "../../images/svg/gear.svg";
import { ModalDialog } from "../components/modal-dialog.js";

/**
 * Class to handle the list of sections in a project.
 * Helper functions are available to get the parent and children of a section, etc.
 */
export class SectionData {

  /**
   * Initialize this object. Expected to be run whenever the UI has a set of sections to use.
   * Needs to be executed prior to using other functions of this class.
   *
   * @param {array} sections
   *   List of Tator.Section objects to process
   *
   * @postcondition this._section is set with sections
   * @postcondition this._sectionTree is set with the tree structure of the sections (key is section.path)
   *                Each node is a dictionary with the key being the subfolder name and the value being the children
   * @postcondition this._sectionPathMap is set with the sections (key is section.path)
   * @postcondition this._sectionIdPathMap is set with the section pathss (key is section.id)
   * @postcondition this._sectionIdMap is set with the section objects (key is section.id)
   */
  init(sections) {

    // Create the list of sections
    // Need to organize the list of sections in the tree format
    // Everything in the same subfolder is organized alphabetically
    // It is possible that folders may not have a path (mostly legacy). In this case, use the name as the path.
    this._sections = sections;
    this._sectionTree = {}; // Tree structure of the sections. Key is the section name using the path.
    this._sectionPathMap = {}; // Key is section.path, value is section object
    this._sectionIdPathMap = {}; // Key is section ID, value is path used in the UI
    this._sectionIdMap = {}; // Key is section ID, value is section object
    for (const section of sections) {

      // Get corresponding section path, this is based on either the path or the name
      var thisPath = this.getSectionPath(section);

      // Save mappings to for easier access later.
      this._sectionPathMap[thisPath] = section;
      this._sectionIdPathMap[section.id] = thisPath;
      this._sectionIdMap[section.id] = section;

      // Add to the section tree
      let currentNode = this._sectionTree;
      let parts = thisPath.split(".");
      parts.forEach(part => {
        if (!currentNode[part]) {
          currentNode[part] = {};
        }
        currentNode = currentNode[part];
      });
    }
  }

  /**
   * @param {string} path
   */
  static cleanPathString(path) {
    return path.replace(/[^A-Za-z0-9_.]/g, "_");
  }

  /**
   * @precondition init() has been called
   * @param {Tator.Section} section
   *    Section to get the path of (specifically the path key used in this UI)
   * @return string
   *    Path of the section in the UI
   */
  getSectionPath(section) {

    var thisPath = section.path;
    if (thisPath == null) {
      thisPath = section.name;
      // This is required for scenarios where there is no path set, but the name is set.
      // This assumes that this is in the top level. This replicates the string substitution
      // that occurs in the section REST endpoint.
      thisPath = SectionData.cleanPathString(thisPath);
    }

    return thisPath;
  }

  /**
   * @precondition init() has been called
   * @param {Tator.Section} section
   *    Section to get the children of
   * @returns {array}
   *    Array of sections that are children of the given section
   *    Only the children are obtained, not the grandchildren and so on
   */
  getChildSections(section) {

    const thisPath = this.getSectionPath(section);
    var that = this;
    var children = [];

    function traverseAlphabetically(node, parentPath) {

      var appendedPath = parentPath;
      if (appendedPath != "") {
        appendedPath += ".";
      }

      if (parentPath == thisPath) {
        Object.keys(node).sort().forEach(subpath => {
          var childSection = that._sectionPathMap[appendedPath + subpath];
          children.push(childSection);
          return;
        });
      }
      else {
        Object.keys(node).sort().forEach(subpath => {
          traverseAlphabetically(node[subpath], appendedPath + subpath);
        });
      }
    }

    traverseAlphabetically(this._sectionTree, "");

    return children;
  }

  /**
   * Parent sections are obtained using the path attribute of the section object.
   *
   * @precondition init() has been called
   * @param {Tator.Section} section
   *    Section to get the parent sections of
   * @returns {array}
   *    Array of sections that are parents of the given section
   *    The order is from the immediate parent to the root
   */
  getParentSections(section) {

    var parentSections = [];

    // Keep removing the "." until we're left with the root
    var currentPath = this.getSectionPath(section);
    while (currentPath.includes(".")) {
      let parts = currentPath.split(".");
      parts.pop();
      currentPath = parts.join(".");
      var parentSection = this._sectionPathMap[currentPath];
      parentSections.push(parentSection);
    }

    return parentSections;
  }

  /**
   * @param {string} path
   *   Path of the section to get
   * @returns Tator.Section
   */
  getSectionFromPath(path) {
    return this._sectionPathMap[path];
  }

  /**
   * @param {integer} id
   *    Section ID of section to get
   * @returns Tator.Section
   */
  getSectionFromID(id) {
    return this._sectionIdMap[id];
  }

  /**
   * @returns array
   *    Array of Tator.Section objects associated with this project that are media folders
   *    and not search related.
   */
  getFolderList() {
    var folderList = [];
    for (const section of this._sections) {
      if (section.object_search == null && section.related_search == null) {
        folderList.push(section);
      }
    }
    return this._sections;
  }

  /**
   * @returns array
   *   Array of Tator.Section objects associated with this project that are saved searches.
   */
  getSavedSearchesList() {
    var savedSearchesList = [];
    for (const section of this._sections) {
      if (section.object_search != null || section.related_search != null) {
        savedSearchesList.push(section);
      }
    }
    return savedSearchesList;
  }

  /**
   * Return the name and path for the given name and parent
   * Emulates the constraints of the section REST endpoint
   *
   * @param {string} name
   *    Needs to be trimmed
   * @param {integer} parentSectionId
   *    Parent section ID if applicable. null if not.
   * @return Object
   *    .name {string} - name to use for the associated section
   *    .path {string} - path to use for the associated section
   */
  makeFolderNameAndPath(name, parentSectionId) {

    let sectionName = name.trim();
    let pathFolderName = SectionData.cleanPathString(sectionName);
    if (parentSectionId == null) {
      sectionPath = pathFolderName;
    }
    else {
      var parentSection = this._sectionIdMap[parentSectionId]
      var sectionPath = this.getSectionPath(parentSection);
      sectionPath += ".";
      sectionPath += pathFolderName;
      sectionName = parentSection.name + "." + sectionName;
    }

    return {
      name: sectionName,
      path: sectionPath};
  }

  /**
   * Verify if the proposed name is valid
   * @param {string} proposedName
   *    Proposed name of the new folder (not including any of the children, i.e. what's
   *    displayed in the UI)
   * @param {integer} parentSectionId
   *    Can be null if there is no parent to the folder.
   * @return {bool} True if the section rename is valid. False otherwise.
   */
  verifySectionRename(proposedName, parentSectionId) {

    if (proposedName === "") {
      return false;
    }

    if (proposedName.includes(".")) {
      return false;
    }

    if (proposedName.includes(">")) {
      return false;
    }

    // Find the adjusted path which we will use to compare against other sections
    let info = this.makeFolderNameAndPath(proposedName, parentSectionId);

    // See if the adjusted path/name matches any of the provided sections
    for (const section of this._sections) {
      const sectionPath = this.getSectionPath(section);
      if (sectionPath == info.path || (section.name == info.name)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get a list of folder choices for the enum input
   * Does not include a no-parent option
   * Output is sorted by breadcrumb path
   *
   * @return {array}
   *   Each element is {value: sectionID, label: label to display}
   *   The label is a breadcrumb based version of the name
   */
  getFolderEnumChoices() {

    var choices = [];
    for (const section of this.getFolderList()) {
      if (section.visible == true) {
        var parentSections = this.getParentSections(section);

        // If any of the parentSections are not visible, don't add this section to the list
        var visible = true;
        var label = "";
        for (const parentSection of parentSections) {
          if (parentSection.visible == false) {
            visible = false;
            break;
          }
        }
        if (!visible) {
          continue;
        }

        choices.push({value: section.id, label: section.name.replace(/\./g, " > ")});
      }
    }

    // Sort the choices by path
    choices.sort((a, b) => {
      if (a.label < b.label) {
        return -1;
      }
      if (a.label > b.label) {
        return 1;
      }
      return 0;
    });

    return choices;
  }
}

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
    this._errorMessage.setAttribute("class", "f2 text-semibold text-red px-3 py-3 text-center");
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
    this._name.addEventListener("change", () => {
      var proposedName = this._name.getValue();
      var parentSectionId = this._parentFolders.getValue();
      if (parentSectionId == this._noParentName) {
        parentSectionId = null;
      }
      if (this._sectionData.verifySectionRename(proposedName, parentSectionId)) {
        this.enableSave();
      }
      else {
        this.invalidName();
      }

      if (this._mode == "editFolder") {
        if (proposedName != this._selectedSection.name) {
          var parts = this._selectedSection.name.split(".");
          this._originalName.style.display = "block";
          this._originalName.innerHTML = `Changing folder name from: <span class="text-semibold">${parts[parts.length - 1]}</span>`;
        }
        else {
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
      if (this._sectionData.verifySectionRename(proposedName, parentSectionId)) {
        this.enableSave();
      }
      else {
        this.invalidName();
      }

      if (this._mode == "editFolder") {
        var parentSections = this._sectionData.getParentSections(this._selectedSection);
        if (parentSections.length == 0 && parentSectionId != null) {
          var parts = this._selectedSection.name.split(".");
          parts.pop();
          var pathToShow = parts.join(" > ");
          this._originalParent.style.display = "block";
          this._originalParent.innerHTML = `Changing parent folder from: <span class="text-semibold">${pathToShow}</span>`;
        }
        if (parentSections.length > 0 && parentSections[0].id != this._parentFolders.getValue()) {
          var parts = this._selectedSection.name.split(".");
          parts.pop();
          var pathToShow = parts.join(" > ");
          this._originalParent.style.display = "block";
          this._originalParent.innerHTML = `Changing parent folder from: <span class="text-semibold">${pathToShow}</span>`;
        }
        else {
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
      var info = this._sectionData.makeFolderNameAndPath(proposedName, parentSectionId);

      if (this._mode == "newFolder") {
        this.dispatchEvent(new CustomEvent(this._saveClickEvent, {
           detail: {
             name: info.name,
             path: info.path
          }
        }));
      }
      else if (this._mode == "editFolder") {

        var patchSpecs = [];
        var patchSpec = {}

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
        var childSections = this._sectionData.getChildSections(this._selectedSection);
        for (const childSection of childSections) {
          patchSpecs.push({
            id: childSection.id,
            spec: {
              path: childSection.path.replace(this._selectedSection.path, info.path),
              name: childSection.name.replace(this._selectedSection.name, info.name)
            }
          })
        }
        patchSpecs.push({
          id: this._selectedSection.id,
          spec: patchSpec
        });

        this.dispatchEvent(new CustomEvent(this._saveClickEvent, {
          detail: {
            mainSectionId: this._selectedSection.id,
            specs: patchSpecs
         }
       }));
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
    this._errorMessage.innerHTML = "Invalid name provided. Name cannot be blank, share the same name as another folder in the same sub-directory or have '.' or '>' in the name.";
    this._errorMessage.style.display = "block";
  }

  /**
   * Can be called multiple times to reset the dialog (e.g. whenever there's a new section list)
   * @param {SectionData} sectionData
   *    SectionData object to use for the dialog
   * @postcondition Name and Parent Folders fields are reset
   */
  init(sectionData) {

    this._parentFolders.clear();
    this._name.reset();

    this._sectionData = sectionData;
    this._selectedSection = null;

    var choices = this._sectionData.getFolderEnumChoices();
    choices.unshift({ value: this._noParentName, label: this._noParentName });

    this._parentFolders.choices = choices;
  }

  /**
   * @param {string} mode
   *   "newFolder" | "editFolder"
   * @param {Tator.Section} selectedSection
   *   Selected section in the UI
   */
  setMode(mode, selectedSection) {

    this._originalName.style.display = "none";
    this._originalParent.style.display = "none";
    this._errorMessage.style.display = "none";
    this._save.setAttribute("disabled", "");
    this._selectedSection = selectedSection;

    if (mode == "newFolder") {
      this._title.nodeValue = "Add Folder";
      this._mode = mode;
      this._save.textContent = "Add";
      this._saveClickEvent = "add";
      this._name.setValue("");
      this._parentFolders.setValue(selectedSection?.id);
    }
    else if (mode == "editFolder") {
      this._title.nodeValue = "Edit Folder";
      this._mode = mode;
      this._save.textContent = "Edit";
      this._saveClickEvent = "edit";

      let nameParts = selectedSection.name.split(".");
      this._name.setValue(nameParts[nameParts.length - 1]);
      this._parentFolders.setValue(selectedSection?.id);
    }
    else {
      throw new Error(`Invalid mode: ${mode}`);
    }

  }
}
customElements.define("folder-dialog", FolderDialog);

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
    this._errorMessage.setAttribute("class", "f2 text-semibold text-red px-3 py-3 text-center");
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
    this._name.addEventListener("change", () => {
      var proposedName = this._name.getValue();

      if (proposedName != "") {
        this.enableSave();
        if (proposedName != this._bookmark.name) {
          this._originalName.style.display = "block";
          this._originalName.innerHTML = `Changing bookmark name from: <span class="text-semibold">${this._bookmark.name}</span>`;
        }
      }
      else {
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
        this.dispatchEvent(new CustomEvent("edit", {
          detail: {
            id: this._bookmark.id,
            spec: {name: newName}
         }
       }));
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
    this._errorMessage.innerHTML = "Invalid bookmark name provided. Cannot be blank.";
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

export class DeleteModal extends ModalDialog {
  constructor() {
    super();

    this._title.nodeValue = "Delete";
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

    this._accept.addEventListener("click", async (evt) => {
      this.dispatchEvent(new CustomEvent("delete", {
        detail: {
          data: this._data,
       }
     }));
    });

    this.updateUI();
  }

  /**
   * @param {Object} data
   *   Object to pass via the delete event
   */
  init(data) {
    this._data = data;
  }

  /**
   * Called during construction
   */
  updateUI() {
    this._title.nodeValue = "Delete";
    this._accept.textContent = "Delete";
  }
}
customElements.define("delete-modal", DeleteModal);

/**
 * Modal specifically for deleting a bookmark
 */
export class BookmarkDeleteModal extends DeleteModal {

  /**
   * @param {Tator.Bookmark} data
   */
  init(data) {
    super.init(data);
    this._dataText.innerHTML = `<span>Are you sure you want to delete the bookmark:</span><br /><span class="text-semibold">${data.name}</span>?`;
  }

  /**
   * @override
   */
  updateUI() {
    this._title.nodeValue = "Delete Bookmark";
    this._accept.textContent = "Delete";
  }
}
customElements.define("bookmark-delete-modal", BookmarkDeleteModal);

/**
 * Modal specifically for deleting a folder
 */
export class FolderDeleteModal extends DeleteModal {

  /**
   * @param {Tator.Section} data
   */
  init(data) {
    super.init(data);
    this._dataText.innerHTML = `<span>Are you sure you want to delete the folder:</span><br /><span class="text-semibold">${data.name}</span>?`;
  }

  /**
   * @override
   */
  updateUI() {
    this._title.nodeValue = "Delete Folder";
    this._accept.textContent = "Delete";
  }
}
customElements.define("folder-delete-modal", FolderDeleteModal);

/**
 * Modal specifically for deleting a saved search
 */
export class SearchDeleteModal extends DeleteModal {

  /**
   * @param {Tator.Section} data
   */
  init(data) {
    super.init(data);
    this._dataText.innerHTML = `<span>Are you sure you want to delete the saved search:</span><br /><span class="text-semibold">${data.name}</span>? Note: Media will not be deleted`;
  }

  /**
   * @override
   */
  updateUI() {
    this._title.nodeValue = "Delete Search";
    this._accept.textContent = "Delete";
  }
}
customElements.define("search-delete-modal", SearchDeleteModal);

/**
 * Button used for the "All Media" / home in the section list
 */
export class AllMediaItem extends TatorElement {

  constructor() {

    super();

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute("class", "rounded-2 px-1 py-1 d-flex flex-items-center clickable");
    this._shadow.appendChild(this._mainDiv);

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "d-flex ml-3");
    this._mainDiv.appendChild(this._icon);
    this._icon.innerHTML = `
    <svg class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
    </svg>
    `;

    this._name = document.createElement("div");
    this._name.setAttribute("class", "f2 text-gray ml-3 flex-grow");
    this._name.innerHTML = "All Media";
    this._mainDiv.appendChild(this._name);

    this._mainDiv.addEventListener("mouseover", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "#262e3d";
        this._mainDiv.style.color = "#ffffff";
        this._name.classList.remove("text-gray");
        this._name.classList.add("text-white");
      }
    });

    this._mainDiv.addEventListener("mouseout", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "";
        this._mainDiv.style.color = "";
        this._name.classList.add("text-gray");
        this._name.classList.remove("text-white");
      }
    });

    this._mainDiv.addEventListener("click", () => {
      this._mainDiv.blur();
      this.setActive();
      this.dispatchEvent(new CustomEvent("selected", { detail: { id: null } }));
    });
  }

  setActive() {
    this._active = true;
    this._mainDiv.style.backgroundColor = "#202543";
    this._mainDiv.style.color = "#ffffff";
    this._name.classList.remove("text-gray");
    this._name.classList.add("text-white");
    this._name.classList.add("text-semibold");
    this._mainDiv.classList.remove("box-border");
  }

  setInactive() {
    this._active = false;
    this._mainDiv.style.backgroundColor = "";
    this._mainDiv.style.color = "";
    this._name.classList.add("text-gray");
    this._name.classList.remove("text-white");
    this._name.classList.remove("text-semibold");
    this._mainDiv.classList.add("box-border");
  }
}
customElements.define("all-media-item", AllMediaItem);

/**
 * Button thats used as part of the section list
 */
export class SectionListItem extends TatorElement {

  /**
   * Constructor
   */
  constructor() {
    super();

    this.setupUIElements();
    this.setupEventListeners();
    this.setInactive();
    this.collapse();
  }

  setupUIElements() {

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute("class", "rounded-2 px-1 d-flex flex-items-center");
    this._shadow.appendChild(this._mainDiv);

    this._expand = document.createElement("div");
    this._expand.setAttribute("class", "d-flex mr-1 d-flex flex-items-center clickable rounded-2");
    this._mainDiv.appendChild(this._expand);
    this._expand.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
      </svg>
    `;

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "d-flex py-1");
    this._mainDiv.appendChild(this._icon);
    this._icon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
      </svg>
    `;

    this._name = document.createElement("div");
    this._name.setAttribute("class", "f2 text-gray ml-3 py-1 clickable flex-grow css-truncate");
    this._mainDiv.appendChild(this._name);

    var moreWrapper = document.createElement("div");
    moreWrapper.setAttribute("class", "d-flex flex-justify-right");
    this._mainDiv.appendChild(moreWrapper);

    this._more = document.createElement("div");
    this._more.setAttribute("class", "d-flex mr-2 clickable rounded-2");
    moreWrapper.appendChild(this._more);
    this._more.innerHTML = `
      <svg transform="rotate(90)" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      </svg>
    `;
    this._more.style.display = "none";

    this._moreMenu = document.createElement("div");
    this._moreMenu.setAttribute(
      "class",
      "more d-flex flex-column f2 px-3 py-2 lh-condensed"
    );
    this._moreMenu.style.display = "none";
    this._moreMenu.style.marginTop = "5px";
    this._moreMenu.style.marginLeft = "200px";
    this._shadow.appendChild(this._moreMenu);

    //
    // Details section
    //
    this._detailsDiv = document.createElement("div");
    this._detailsDiv.setAttribute("class", "pl-2 pt-1 pb-2 d-flex flex-column f3 text-dark-gray");
    this._shadow.appendChild(this._detailsDiv);
    this._detailsDiv.style.display = "none";
  }

  setupEventListeners() {
    this._mainDiv.addEventListener("mouseover", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "#262e3d";
        this._mainDiv.style.color = "#ffffff";
        this._name.classList.remove("text-gray");
        this._name.classList.add("text-white");
      }
      this._more.style.display = "flex";
    });

    this._mainDiv.addEventListener("mouseout", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "";
        this._mainDiv.style.color = "";
        this._name.classList.add("text-gray");
        this._name.classList.remove("text-white");
      }
      this._more.style.display = "none";
    });

    this._name.addEventListener("click", () => {
      this._mainDiv.blur();
      this._moreMenu.style.display = "none";
      this.setActive();
      this.dispatchEvent(new CustomEvent("selected", { detail: { id: this._section.id } }));
    });

    this._expand.addEventListener("mouseover", () => {
      this._expand.style.backgroundColor = "#3b4250";
    });

    this._expand.addEventListener("mouseout", () => {
      this._expand.style.backgroundColor = "";
    });

    this._expand.addEventListener("click", () => {
      this._mainDiv.blur();
      this._moreMenu.style.display = "none";
      if (this._expanded) {
        this.collapse();
        this.dispatchEvent(new Event("expand"));
      }
      else {
        this.expand();
        this.dispatchEvent(new Event("collapse"));
      }
    });

    this._more.addEventListener("mouseover", () => {
      this._more.style.backgroundColor = "#3b4250";
    });

    this._more.addEventListener("mouseout", () => {
      this._more.style.backgroundColor = "";
    });

    this._more.addEventListener("click", () => {
      if (this._moreMenu.style.display == "none") {
        this._moreMenu.style.display = "block";
      }
      else {
        this._moreMenu.style.display = "none";
      }
    });
  }

  /**
   * @param {Tator.Section} section
   *    Section object to initialize the button with
   * @param {array} childSections
   *    Array of child sections (Tator.Section objects)
   */
  init(section, childSections) {

    this._section = section;
    this._childSections = childSections;

    // If section.path exists, use it. Otherwise, use section.name
    // section.path is ParentName.ChildName - we want to just use ChildName
    var sectionName = section.name;
    var padding = 0;
    if (section.path) {
      var pathParts = sectionName.split(".");
      padding = 10 * (sectionName.split(".").length - 1);
      if (pathParts.length > 1) {
        sectionName = pathParts[pathParts.length - 1];
      }
    }
    this._name.innerHTML = sectionName;

    // Add the appropriate padding based on how many parents this section has
    // 10px margin left for each parent
    if (childSections.length > 0) {
      // There are child sections, show the expand icon
      this._expand.style.marginLeft = `${padding}px`;
    } else {
      // If no children, remove the expand icon
      this._expand.style.visibility = "hidden";
      this._icon.style.marginLeft = `${padding}px`;
    }

    if (!section.visible) {
      this._name.classList.add("text-dark-gray");
      this._icon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
        </svg>
      `;
    }

    // Update the more menu
    const hideToggleButton = document.createElement("button");
    hideToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    if (section.visible) {
      hideToggleButton.innerHTML = `
      <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      Hide folder`;
      hideToggleButton.addEventListener("click", () => {
        this._moreMenu.style.display = "none";
        this.dispatchEvent(new CustomEvent("hideSection", { detail: { id: section.id } }));
      });
    }
    else {
      hideToggleButton.innerHTML = `
      <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      Restore folder`;
      hideToggleButton.addEventListener("click", () => {
        this._moreMenu.style.display = "none";
        this.dispatchEvent(new CustomEvent("restoreSection", { detail: { id: section.id } }));
      });
    }
    const deleteToggleButton = document.createElement("button");
    deleteToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    deleteToggleButton.innerHTML = `
    <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
    Delete folder`;
    if (childSections.length > 0) {
      deleteToggleButton.setAttribute("disabled", "");
      deleteToggleButton.style.cursor = "not-allowed";
      deleteToggleButton.setAttribute("tooltip", "Cannot delete folder when it has subfolders.");
    }
    else {
      deleteToggleButton.addEventListener("click", () => {
        this._moreMenu.style.display = "none";
        this.dispatchEvent(new CustomEvent("deleteSection", { detail: { id: section.id } }));
      });
    }

    const editToggleButton = document.createElement("button");
    editToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    editToggleButton.innerHTML = `
    <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
    Edit folder`;
    editToggleButton.addEventListener("click", () => {
      this._moreMenu.style.display = "none";
      this.dispatchEvent(new CustomEvent("editSection", { detail: { id: section.id } }));
    });

    this._moreMenu.appendChild(editToggleButton);
    this._moreMenu.appendChild(deleteToggleButton);
    this._moreMenu.appendChild(hideToggleButton);

    this._detailsDiv.innerHTML = `
      <div><span class="text-semibold text-gray">id:</span> ${section.id}</div>
      <div><span class="text-semibold text-gray">name:</span> ${section.name}</div>
      <div><span class="text-semibold text-gray">path:</span> ${section.path}</div>
      <div><span class="text-semibold text-gray">tator_user_sections:</span> ${section.tator_user_sections}</div>
    `;
  }

  /**
   * Display this list item as active
   */
  setActive() {
    this._active = true;
    this._mainDiv.style.backgroundColor = "#202543";
    this._mainDiv.style.color = "#ffffff";
    this._name.classList.remove("text-gray");
    this._name.classList.add("text-white");
    this._name.classList.add("text-semibold");
  }

  /**
   * Display this list item as inactive
   */
  setInactive() {
    this._active = false;
    this._mainDiv.style.backgroundColor = "";
    this._mainDiv.style.color = "";
    this._name.classList.add("text-gray");
    this._name.classList.remove("text-white");
    this._name.classList.remove("text-semibold");
    this._moreMenu.style.display = "none";
  }

  /**
   * @returns {Tator.Section} section object associated with this list item
   */
  getSection() {
    return this._section;
  }

  collapse() {
    this._expanded = false;
    this._expand.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
      </svg>
    `;
  }

  expand() {
    this._expanded = true;
    this._expand.innerHTML = `
      <svg transform="rotate(90)" width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
      </svg>
    `;
  }

  hideAdvancedDetails() {
    this._detailsDiv.style.display = "none";
  }

  showAdvancedDetails() {
    this._detailsDiv.style.display = "block";
  }
}
customElements.define("section-list-item", SectionListItem);


/**
 * Button that used to add a bookmark
 */
export class BookmarkListItem extends TatorElement {

  constructor() {
    super();

    this.setupUIElements();
    this.setupEventListeners();
  }

  /**
   * Executed by constructor only
   */
  setupUIElements() {

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute("class", "rounded-2 px-1 d-flex flex-items-center");
    this._shadow.appendChild(this._mainDiv);

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "d-flex py-1");
    this._mainDiv.appendChild(this._icon);
    this._icon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
      </svg>
    `;

    this._name = document.createElement("div");
    this._name.setAttribute("class", "f2 text-gray ml-3 py-1 clickable flex-grow css-truncate");
    this._mainDiv.appendChild(this._name);

    var moreWrapper = document.createElement("div");
    moreWrapper.setAttribute("class", "d-flex flex-justify-right");
    this._mainDiv.appendChild(moreWrapper);

    this._more = document.createElement("div");
    this._more.setAttribute("class", "d-flex mr-2 clickable rounded-2");
    moreWrapper.appendChild(this._more);
    this._more.innerHTML = `
      <svg transform="rotate(90)" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      </svg>
    `;
    this._more.style.display = "none";

    this._moreMenu = document.createElement("div");
    this._moreMenu.setAttribute(
      "class",
      "more d-flex flex-column f2 px-3 py-2 lh-condensed"
    );
    this._moreMenu.style.display = "none";
    this._moreMenu.style.marginTop = "5px";
    this._moreMenu.style.marginLeft = "200px";
    this._shadow.appendChild(this._moreMenu);

    this._link = document.createElement("a");
    this._link.style.display = "none";
    this._shadow.appendChild(this._moreMenu);
  }

  /**
   * Executed by constructor only
   */
  setupEventListeners() {
    this._mainDiv.addEventListener("mouseover", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "#262e3d";
        this._mainDiv.style.color = "#ffffff";
        this._name.classList.remove("text-gray");
        this._name.classList.add("text-white");
      }
      this._more.style.display = "flex";
    });

    this._mainDiv.addEventListener("mouseout", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "";
        this._mainDiv.style.color = "";
        this._name.classList.add("text-gray");
        this._name.classList.remove("text-white");
      }
      this._more.style.display = "none";
    });

    this._name.addEventListener("click", () => {
      this._mainDiv.blur();
      this._moreMenu.style.display = "none";
      this._link.click();
    });

    this._more.addEventListener("mouseover", () => {
      this._more.style.backgroundColor = "#3b4250";
    });

    this._more.addEventListener("mouseout", () => {
      this._more.style.backgroundColor = "";
    });

    this._more.addEventListener("click", () => {
      if (this._moreMenu.style.display == "none") {
        this._moreMenu.style.display = "block";
      }
      else {
        this._moreMenu.style.display = "none";
      }
    });
  }


  /**
   * @param {Tator.Bookmark} bookmark
   */
  init(bookmark) {

    this._bookmark = bookmark;
    this._name.textContent = bookmark.name;

    this._link.setAttribute("target", "_blank");
    this._link.setAttribute("href", bookmark.uri);

    if (bookmark.name == "Last visited") {
      this._mainDiv.classList.add("box-border");
      this._mainDiv.classList.add("py-1");
      this._mainDiv.classList.add("mb-2");
      this._more.classList.add("hidden");
    }
    else {
      const deleteToggleButton = document.createElement("button");
      deleteToggleButton.setAttribute(
        "class",
        "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
      );
      deleteToggleButton.innerHTML = `
      <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      Delete bookmark`;
      deleteToggleButton.addEventListener("click", () => {
        this._moreMenu.style.display = "none";
        this.dispatchEvent(new CustomEvent("deleteBookmark", { detail: { id: bookmark.id } }));
      });

      const renameToggleButton = document.createElement("button");
      renameToggleButton.setAttribute(
        "class",
        "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
      );
      renameToggleButton.innerHTML = `
      <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
      Rename bookmark`;
      renameToggleButton.addEventListener("click", () => {
        this._moreMenu.style.display = "none";
        this.dispatchEvent(new CustomEvent("renameBookmark", { detail: { id: bookmark.id } }));
      });

      this._moreMenu.appendChild(renameToggleButton);
      this._moreMenu.appendChild(deleteToggleButton);
    }
  }
}
customElements.define("bookmark-list-item", BookmarkListItem);

/**
 * Main project detail page
 */
export class ProjectDetail extends TatorPage {
  constructor() {
    super();

    document.body.setAttribute("class", "no-padding-bottom");

    // Success and warning Utility hooks
    const utilitiesDiv = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    utilitiesDiv.setAttribute(
      "class",
      "annotation__header d-flex flex-items-center flex-justify-between px-6 f3"
    );
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(utilitiesDiv, user);

    this._lightSpacer = document.createElement("span");
    this._lightSpacer.style.width = "32px";
    utilitiesDiv.appendChild(this._lightSpacer);

    this._success = document.createElement("success-light");
    this._lightSpacer.appendChild(this._success);

    this._warning = document.createElement("warning-light");
    this._lightSpacer.appendChild(this._warning);

    // Wrapper to allow r.side bar to slide into left
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute(
      "class",
      "analysis--main--wrapper d-flex"
    );
    this.mainWrapper.style.minHeight = "calc(100vh - 62px)";
    this._shadow.appendChild(this.mainWrapper);

    //
    // Left area of the page
    //
    this.createSidebarNav();
    this.createLeftPanel();

    //
    // Central area of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "d-flex flex-grow col-12 mr-5");
    this.mainWrapper.appendChild(this.main);

    this._mainSection = document.createElement("section");
    this._mainSection.setAttribute("class", "py-3 px-3 ml-3 flex-grow");
    this.main.appendChild(this._mainSection);

    this.gallery = {};
    this.gallery._main = this._mainSection;

    const div = document.createElement("div");
    this.gallery._main.appendChild(div);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-justify-between");
    div.appendChild(header);

    const nameDiv = document.createElement("div");
    nameDiv.setAttribute("class", "d-flex flex-row flex-items-center");
    header.appendChild(nameDiv);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    nameDiv.appendChild(h1);

    this._settingsButton = document.createElement("a");
    this._settingsButton.setAttribute(
      "class",
      "px-2 h2 text-gray hover-text-white"
    );
    this._settingsButton.style.marginTop = "6px";
    nameDiv.appendChild(this._settingsButton);

    const settingsSvg = document.createElementNS(svgNamespace, "svg");
    settingsSvg.setAttribute("viewBox", "0 0 24 24");
    settingsSvg.setAttribute("height", "1em");
    settingsSvg.setAttribute("width", "1em");
    this._settingsButton.appendChild(settingsSvg);

    const settingsPath = document.createElementNS(svgNamespace, "use");
    settingsPath.setAttribute("href", `${Gear}#path`);
    settingsSvg.appendChild(settingsPath);

    this._projectText = document.createTextNode("");
    h1.appendChild(this._projectText);

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex");
    header.appendChild(buttons);

    this._analyticsButton = document.createElement("analytics-button");
    this._analyticsButton.style.marginRight = "10px";
    buttons.appendChild(this._analyticsButton);

    this._activityButton = document.createElement("activity-button");
    buttons.appendChild(this._activityButton);

    this._description = document.createElement("project-text");
    div.appendChild(this._description);

    const subheader = document.createElement("div");
    subheader.setAttribute("class", "d-flex flex-justify-right");
    this._mainSection.appendChild(subheader);

    const filterdiv = document.createElement("div");
    filterdiv.setAttribute("class", "mt-3");
    this._mainSection.appendChild(filterdiv);

    this._filterView = document.createElement("filter-interface");
    filterdiv.appendChild(this._filterView);

    this._collaborators = document.createElement("project-collaborators");
    subheader.appendChild(this._collaborators);

    this._projects = document.createElement("div");
    this._mainSection.appendChild(this._projects);

    // Part of Gallery: Communicates between card + page
    this._bulkEdit = document.createElement("entity-gallery-bulk-edit");
    this._bulkEdit._selectionPanel.hidden = true;
    this._shadow.appendChild(this._bulkEdit);
    filterdiv.appendChild(this._bulkEdit._selectionPanel);

    // Media section
    this._mediaSection = document.createElement("media-section");
    this._projects.appendChild(this._mediaSection);
    this._mediaSection.addEventListener(
      "runAlgorithm",
      this._openConfirmRunAlgoModal.bind(this)
    );

    // Card attribute stuff related to mediaSection
    /**
     * CARD Label display options link for menu, and checkbox div
     */
    this._cardAttributeLabels = document.createElement("entity-gallery-labels");
    this._cardAttributeLabels.setAttribute("id", "showMediaAttributes");
    this._cardAttributeLabels.titleEntityTypeName = "media";
    this._cardAttributeLabels._titleText = document.createTextNode(
      "Select media labels to display."
    );
    this._cardAttributeLabels.menuLinkTextSpan.innerHTML =
      "Show file attributes";

    this._mediaSection._hiddenMediaLabel.appendChild(this._cardAttributeLabels);
    this._mediaSection._more._cardLink.appendChild(
      this._cardAttributeLabels.menuLink
    );
    this._mediaSection._more.addEventListener(
      "bulk-edit",
      this._openBulkEdit.bind(this)
    );

    this._cardAttributeLabels.addEventListener("labels-update", (evt) => {
      // updates labels on cards
      this._mediaSection._files.dispatchEvent(
        new CustomEvent("labels-update", evt.detail)
      );
      this._bulkEdit._updateShownAttributes({
        typeId: evt.detail.typeId,
        values: evt.detail.value,
      });
      this._mediaSection._files.cardLabelsChosenByType[evt.detail.typeId] =
        evt.detail.value;
    });

    // references inner for card setup and pagination checkbox clear
    this._mediaSection.bulkEdit = this._bulkEdit;
    this._mediaSection._files.bulkEdit = this._bulkEdit;

    // Confirm algorithm
    this._confirmRunAlgorithm = document.createElement("confirm-run-algorithm");
    this._projects.appendChild(this._confirmRunAlgorithm);
    this._confirmRunAlgorithm.addEventListener(
      "close",
      this._closeConfirmRunAlgoModal.bind(this)
    );

    this._deleteSectionDialog = document.createElement("delete-section-form");
    this._projects.appendChild(this._deleteSectionDialog);

    this.deleteFileForm = document.createElement("delete-file-form");
    this._projects.appendChild(this.deleteFileForm);

    this.modalNotify = document.createElement("modal-notify");
    this._projects.appendChild(this.modalNotify);

    this.modal = document.createElement("modal-dialog");
    this._projects.appendChild(this.modal);

    const cancelJob = document.createElement("cancel-confirm");
    this._shadow.appendChild(cancelJob);

    this.moveFile = document.createElement("media-move-dialog");
    this._shadow.appendChild(this.moveFile);

    this._modalError = document.createElement("modal-dialog");
    this._shadow.appendChild(this._modalError);

    this._folderDialog = document.createElement("folder-dialog");
    this._projects.appendChild(this._folderDialog);

    this._folderDeleteDialog = document.createElement("folder-delete-modal");
    this._projects.appendChild(this._folderDeleteDialog);

    this._searchDeleteDialog = document.createElement("search-delete-modal");
    this._projects.appendChild(this._searchDeleteDialog);

    this._bookmarkEditDialog = document.createElement("bookmark-edit-dialog");
    this._projects.appendChild(this._bookmarkEditDialog);

    this._bookmarkDeleteDialog = document.createElement("bookmark-delete-modal");
    this._projects.appendChild(this._bookmarkDeleteDialog);

    this._uploadDialog = document.createElement("upload-dialog");
    this._projects.appendChild(this._uploadDialog);

    const attachmentDialog = document.createElement("attachment-dialog");
    attachmentDialog._header.classList.add("fixed-height-scroll");
    this._projects.appendChild(attachmentDialog);

    this._activityNav = document.createElement("activity-nav");
    this.main.appendChild(this._activityNav);

    // Class to hide and showing loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    this._sectionData = new SectionData();

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );

    window.addEventListener("beforeunload", (evt) => {
      if (this._uploadDialog.hasAttribute("is-open")) {
        evt.preventDefault();
        evt.returnValue = "";
        window.alert("Uploads are in progress. Still leave?");
      }
    });

    this.moveFile.addEventListener("reload", () => {
      this._mediaSection.reload();
      this._bulkEdit._clearSelection();
    });
    this.moveFile.addEventListener("new-section", (evt) => {
      this._sectionVisibilityEL(evt);
      this._bulkEdit._clearSelection();
    });

    this._modalError.addEventListener("close", () => {
      this._modalError.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this._bookmarkDeleteDialog.addEventListener("close", () => {
      this._bookmarkDeleteDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this._bookmarkDeleteDialog.addEventListener("delete", async (evt) => {

      this._bookmarkDeleteDialog.removeAttribute("is-open");

      var response = await fetchCredentials(`/rest/Bookmark/${evt.detail.data.id}`, {
        method: "DELETE",
      });

      if (response.status == 200) {
        var data = await response.json();
        var response = await fetchCredentials(`/rest/Bookmarks/${this._projectId}`, {
          method: "GET"
        });
        this._bookmarks = await response.json();
        this.makeBookmarks(this._bookmarks);
        this.removeAttribute("has-open-modal");
      }
      else {
        this._modalError._error(
          `Unable to patch bookmark. Error: ${response.message}`,
          "Error");
      }
    });

    this._bookmarkEditDialog.addEventListener("close", () => {
      this._bookmarkEditDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    })

    this._bookmarkEditDialog.addEventListener("edit", async (evt) => {

      this._bookmarkEditDialog.removeAttribute("is-open");

      var response = await fetchCredentials(`/rest/Bookmark/${evt.detail.id}`, {
        method: "PATCH",
        body: JSON.stringify(evt.detail.spec),
      });

      if (response.status == 200) {
        var response = await fetchCredentials(`/rest/Bookmarks/${this._projectId}`, {
          method: "GET"
        });
        this._bookmarks = await response.json();
        this.makeBookmarks(this._bookmarks);
        this.removeAttribute("has-open-modal");
      }
      else {
        this._modalError._error(
          `Unable to patch bookmark. Error: ${response.message}`,
          "Error");
      }
    })

    this.setFolderDialogCallbacks();

    this._mediaSection.addEventListener("filesadded", (evt) => {
      this._uploadDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._uploadDialog.addEventListener("cancel", (evt) => {
      store.getState().uploadCancel();
      this.removeAttribute("has-open-modal");
    });

    this._uploadDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal");
    });

    this._mediaSection.addEventListener("attachments", (evt) => {
      attachmentDialog.init(evt.detail);
      attachmentDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    attachmentDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal");
    });

    this._mediaSection.addEventListener("newName", (evt) => {
      for (const child of this._allSections()) {
        if (child._section) {
          if (child._section.id == evt.detail.id) {
            child.rename(evt.detail.sectionName);
          }
        }
      }
    });

    this._activityButton.addEventListener("click", () => {
      this._activityNav.open();
      this._activityNav.reload();
      this.setAttribute("has-open-modal", "");
    });

    this._activityNav.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this._activityNav.addEventListener("deleteJobs", (evt) => {
      cancelJob.init(
        evt.detail.uid,
        evt.detail.gid,
        this.getAttribute("project-id")
      );
      cancelJob.setAttribute("is-open", "");
    });

    this._moveFileCallback = (evt) => {
      // console.log(evt);
      this.moveFile.open(
        evt.detail.mediaId,
        evt.detail.mediaName,
        this.getAttribute("project-id")
      );
    };

    this._removeCallback = (evt) => {
      this._deleteSectionDialog.init(
        evt.detail.projectId,
        evt.detail.section,
        evt.detail.sectionParams,
        evt.detail.deleteMedia
      );
      this._deleteSectionDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    this._deleteSectionDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this._deleteSectionDialog.addEventListener("confirmDelete", (evt) => {
      for (const child of this._allSections()) {
        if (child._section) {
          if (child._section.id == evt.detail.id) {
            child.parentNode.removeChild(child);
            this._folders.children[0].click();
          }
        }
      }
      this._bulkEdit._clearSelection();

      this._deleteSectionDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });

    this._deleteFileCallback = (evt) => {
      this.deleteFileForm.setAttribute("media-id", evt.detail.mediaId);
      this.deleteFileForm.setAttribute("media-name", evt.detail.mediaName);
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    this.deleteFileForm.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this.deleteFileForm.addEventListener("confirmFileDelete", (evt) => {
      this._mediaSection.removeMedia(evt.detail.mediaId);
      this.deleteFileForm.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });

    cancelJob.addEventListener("confirmGroupCancel", () => {
      cancelJob.removeAttribute("is-open");
    });

    cancelJob.addEventListener("close", () => {
      this.removeAttribute("has-open-modal");
    });

    this._loaded = 0;
    this._needScroll = true;

    this._lastQuery = null;

    //
    this.modalNotify.addEventListener("open", this.showDimmer.bind(this));
    this.modalNotify.addEventListener("close", this.hideDimmer.bind(this));
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // State of chosen labels for gallery
    this.cardLabelsChosenByType = {};
    this.mediaTypesMap = new Map();
  }

  /**
   * Expected to be run once in the constructor
   */
  setDeleteFolderCallbacks() {

    // Close without any modifications
    deleteSection.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    // Delete current folder
    deleteSection.addEventListener("confirmDelete", (evt) => {
      this._bulkEdit._clearSelection();
      deleteSection.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setFolderDialogCallbacks() {

    // Close without any modifications
    this._folderDialog.addEventListener("close", () => {
      this._folderDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    // Edit current folder
    // May need to update child folders too, so loop over specs
    this._folderDialog.addEventListener("edit", async (evt) => {

      this._folderDialog.removeAttribute("is-open");

      for (const spec of evt.detail.specs) {
        var response = await fetchCredentials(`/rest/Section/${spec.id}`, {
          method: "PATCH",
          body: JSON.stringify(spec.spec),
        });

        if (response.status != 200) {
          this._modalError._error(
            `Unable to patch section ${spec}. Error: ${response.message}`,
            "Error");
          return;
        }
      }

      await this.getSections();
      this.selectSection(evt.detail.mainSectionId);
      this.removeAttribute("has-open-modal");
      this._bulkEdit._clearSelection();
    });

    // Add new folder
    this._folderDialog.addEventListener("add", async (evt) => {

      this._folderDialog.removeAttribute("is-open");

      var spec = {
        name: evt.detail.name,
        path: evt.detail.path,
        tator_user_sections: uuidv1(),
        visible: true,
      };

      var response = await fetchCredentials(`/rest/Sections/${this._projectId}`, {
        method: "POST",
        body: JSON.stringify(spec),
      });

      if (response.status == 201) {
        var data = await response.json();
        await this.getSections();
        this.selectSection(data.id);
        this.removeAttribute("has-open-modal");
        this._bulkEdit._clearSelection();
      }
      else {
        this._modalError._error(
          `Unable to create section '${spec.name}'. Error: ${response.message}`,
          "Error");
      }
    });
  }

  connectedCallback() {
    this.setAttribute(
      "project-id",
      Number(window.location.pathname.split("/")[1])
    );
    // Initialize store data
    store.getState().init();
    this._uploadDialog.init(store);
  }

  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
  }

  _openBulkEdit() {
    this._bulkEdit.startEditMode();
  }


  _allSections() {
    const folders = Array.from(this._folders.children);
    const hiddenFolders = Array.from(this._archivedFolders.children);
    const savedSearches = Array.from(this._savedSearches.children);
    return folders.concat(savedSearches).concat(hiddenFolders);
  }

  _notify(title, message, error_or_ok) {
    this.modalNotify.init(title, message, error_or_ok);
    this.modalNotify.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  _init() {

    //this.showDimmer();
    //this.loading.showSpinner();
    //#TODO

    const projectId = this.getAttribute("project-id");
    this._projectId = projectId;
    this._settingsButton.setAttribute("href", `/${projectId}/project-settings`);
    this._activityNav.init(projectId);

    // Get info about the project.
    const projectPromise = fetchCredentials("/rest/Project/" + projectId);

    // Get sections
    const sectionPromise = fetchCredentials("/rest/Sections/" + projectId);

    // Get project bookmarks
    const bookmarkPromise = fetchCredentials("/rest/Bookmarks/" + projectId);

    // Get Algorithms
    const algoPromise = fetchCredentials("/rest/Algorithms/" + projectId);

    // Get MediaType data for attributes
    const mediaTypePromise = fetchCredentials("/rest/MediaTypes/" + projectId);

    // Run all above promises
    Promise.all([
      projectPromise,
      sectionPromise,
      bookmarkPromise,
      algoPromise,
      mediaTypePromise,
    ])
      .then(
        ([
          projectResponse,
          sectionResponse,
          bookmarkResponse,
          algoResponse,
          mediaTypeResponse,
        ]) => {
          const projectData = projectResponse.json();
          const sectionData = sectionResponse.json();
          const bookmarkData = bookmarkResponse.json();
          const algoData = algoResponse.json();
          const mediaTypeData = mediaTypeResponse.json();

          Promise.all([
            projectData,
            sectionData,
            bookmarkData,
            algoData,
            mediaTypeData,
          ])
            .then(([project, sections, bookmarks, algos, mediaTypes]) => {
              // First hide algorithms if needed. These are not appropriate to be
              // run at the project/this._section/media level.
              var hiddenAlgos = ["tator_extend_track", "tator_fill_track_gaps"];
              const hiddenAlgoCategories = ["annotator-view", "disabled"];

              this._cardAttributeLabels.init(projectId);
              this._sections = sections;
              this._sectionData.init(this._sections);
              this._bookmarks = bookmarks;

              //
              // Set up attributes for bulk edit
              for (let mediaTypeData of mediaTypes) {
                //init card labels with localization entity type definitions
                this._cardAttributeLabels.add({
                  typeData: mediaTypeData,
                  checkedFirst: false,
                });

                //init panel with localization entity type definitions
                // console.log("ADDING MEDIA TYPE")
                this._bulkEdit._editPanel.addLocType(mediaTypeData);
                this.mediaTypesMap.set(mediaTypeData.id, mediaTypeData);
              }

              this._mediaSection.mediaTypesMap = this.mediaTypesMap;

              //
              const moveSelectedButton =
                document.createElement("media-move-button");
              moveSelectedButton.setAttribute(
                "name",
                "Move selected files to folder"
              );
              moveSelectedButton._span.textContent =
                "Move selected files to folder";
              // this._bulkEdit._otherTools.appendChild(moveSelectedButton);
              this._bulkEdit._editPanel._otherTools.appendChild(
                moveSelectedButton
              );

              moveSelectedButton.addEventListener("click", () => {
                const list = Array.from(this._bulkEdit._currentMultiSelection);
                if (list && list.length > 0) {
                  const listString = String(list);
                  this.moveFile.open(
                    list,
                    null,
                    this.getAttribute("project-id"),
                    false
                  );
                } else {
                  this._notify(
                    "Make a selection",
                    "Nothing to move! Make a selection first.",
                    "error"
                  );
                }
              });

              //
              const deleteSelectedButton =
                document.createElement("delete-button");
              deleteSelectedButton.setAttribute(
                "name",
                "Delete selected files"
              );
              deleteSelectedButton._span.textContent = "Delete selected files";
              // this._bulkEdit._otherTools.appendChild(deleteSelectedButton);
              this._bulkEdit._editPanel._otherTools.appendChild(
                deleteSelectedButton
              );

              deleteSelectedButton.addEventListener(
                "click",
                this._deleteSelection.bind(this)
              );

              //
              this._mediaSection._files._cardAttributeLabels =
                this._cardAttributeLabels;
              this._mediaSection._bulkEdit = this._bulkEdit;

              this._bulkEdit.init({
                page: this,
                gallery: this._mediaSection._files,
                type: "media",
                projectId,
                additionalTools: true,
                permission: project.permission,
              });

              var parsedAlgos = algos.filter(function (alg) {
                if (Array.isArray(alg.categories)) {
                  for (const category of alg.categories) {
                    if (hiddenAlgoCategories.includes(category)) {
                      return false;
                    }
                  }
                }
                return !hiddenAlgos.includes(alg.name);
              });
              parsedAlgos.sort((a, b) => a.name.localeCompare(b.name));

              if (!hasPermission(project.permission, "Full Control")) {
                this._settingsButton.style.display = "none";
              }
              this._project = project;
              this._algorithms = parsedAlgos;
              this._mediaSection.project = project;
              this._mediaSection.algorithms = this._algorithms;
              this._projectText.nodeValue = project.name;
              this._description.setAttribute("text", project.summary);
              this._collaborators.usernames = project.usernames;

              let projectParams = null;

              this.makeFolders();
              this.makeBookmarks(bookmarks);
              this.displayPanel("library");

              // Model data & filter setup
              try {
                this._modelData = new TatorData(projectId);
                this._modelData.init().then(() => {

                  // used to setup filter options & string utils
                  this._mediaSection._modelData = this._modelData;
                  this._mediaSection._files.memberships =
                    this._modelData._memberships;

                  this._filterDataView = new FilterData(
                    this._modelData,
                    null,
                    [],
                    null
                  );
                  this._filterDataView.init();
                  this._filterView.dataView = this._filterDataView;

                  // Set UI and results to any url param conditions that exist (from URL)
                  this._mediaSection._filterConditions =
                    this._mediaSection.getFilterConditionsObject();
                  this._bulkEdit.checkForFilters(
                    this._mediaSection._filterConditions
                  );
                  if (this._mediaSection._filterConditions.length > 0) {
                    this._updateFilterResults({
                      detail: {
                        conditions: this._mediaSection._filterConditions,
                      },
                    });
                  }

                  // Listen for filter events
                  this._filterView.addEventListener(
                    "filterParameters",
                    this._updateFilterResults.bind(this)
                  );

                  //
                  // Select the section
                  //
                  const params = new URLSearchParams(document.location.search.substring(1));
                  if (params.has("section")) {
                    const sectionId = Number(params.get("section"));
                    this.selectSection(sectionId);
                  }
                  else {
                    this.selectSection();
                  }
                });
              } catch (err) {
                console.error("Could not initialize filter interface.", err);
                this.loading.hideSpinner();
                this.hideDimmer();
              }
            })
            .catch((err) => {
              console.error("Error setting up page with all promises", err);
              this.loading.hideSpinner();
              this.hideDimmer();
            });
        }
      )
      .catch((err) => {
        console.error("Error setting up page with all promises", err);
        this.loading.hideSpinner();
        this.hideDimmer();
      });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "username":
        break;
      case "project-id":
        this._analyticsButton.setAttribute("project-id", newValue);
        this._init();
        break;
    }
  }

  async _selectSection(section, projectId, clearPage = false) {
    const params = new URLSearchParams(document.location.search);

    if (clearPage) {
      params.delete("page");
      params.delete("pagesize");
    }

    this._mediaSection.addEventListener("remove", this._removeCallback);
    this._mediaSection.addEventListener("moveFile", this._moveFileCallback);
    this._mediaSection.addEventListener("deleteFile", this._deleteFileCallback);

    params.delete("section");
    if (section !== null) {
      params.set("section", section.id);
    }

    const path = document.location.pathname;
    const searchArgs = params.toString();

    let newUrl = path;
    newUrl += "?" + searchArgs;
    let sectionName = "All Media";
    if (section !== null) {
      sectionName = section.name;
    }
    window.history.replaceState(
      `${this._projectText.textContent}|${sectionName}`,
      "Filter",
      newUrl
    );

    await this._mediaSection.init(projectId, section);

    if (params.has("page") && params.has("pagesize") && !clearPage) {
      let pageSize = Number(params.get("pagesize"));
      let page = Number(params.get("page"));

      const samePageSize = pageSize == this._mediaSection._defaultPageSize;
      const samePage = page == 1;

      if (!samePageSize) {
        this._mediaSection._paginator_bottom.pageSize = pageSize;
        this._mediaSection._paginator_top.pageSize = pageSize;
      }

      if (!samePage) {
        this._mediaSection._paginator_bottom._setPage(page - 1);
        this._mediaSection._paginator_top._setPage(page - 1);
      }

      if (!samePageSize || !samePage) {
        this._mediaSection._paginator_top._emit();
      }
    }

    // Add section filter information
    this._filterView.sections = this._sections;
    this._filterView.section = section;

    return true;
  }

  /**
   * Callback when user clicks on an algorithm button.
   * This launches the confirm run algorithm modal window.
   */
  _openConfirmRunAlgoModal(evt) {
    this._confirmRunAlgorithm.init(
      evt.detail.algorithmName,
      evt.detail.projectId,
      evt.detail.mediaIds,
      evt.detail.section
    );
    this._confirmRunAlgorithm.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");
  }

  /**
   * Callback from confirm run algorithm modal choice
   */
  async _closeConfirmRunAlgoModal(evt) {
    console.log(evt);

    this._confirmRunAlgorithm.removeAttribute("is-open");
    this.removeAttribute("has-open-modal");
    document.body.classList.remove("shortcuts-disabled");

    if (evt.detail == null) {
      return;
    }

    var that = this;
    var jobMediaIds = [];
    var jobMediaIdSet = new Set();
    if (evt.detail.confirm) {
      // Retrieve media IDs first (if needed)
      if (evt.detail.mediaIds == null) {
        this.showDimmer();
        this.loading.showSpinner();

        var filterConditions = [];
        var mediaTypes = this._modelData.getStoredMediaTypes();
        if (evt.detail.section != null) {
          filterConditions.push(
            new FilterConditionData(
              mediaTypes[0].name,
              "$section",
              "==",
              `${evt.detail.section.id}`,
              ""
            )
          );
        }

        var totalCounts = await this._modelData.getFilteredMedias(
          "count",
          filterConditions
        );
        console.log(`mediaCounts: ${totalCounts}`);
        var pageSize = 5000;
        var pageStart = 0;
        var pageEnd = pageStart + pageSize;
        var allMedia = [];
        var numPages = Math.floor(totalCounts / pageSize) + 1;
        var pageCount = 1;
        while (allMedia.length < totalCounts) {
          console.log(`Processing media page ${pageCount} of ${numPages}`);
          var pageMedia = await this._modelData.getFilteredMedias(
            "objects",
            filterConditions,
            allMedia.length,
            allMedia.length + pageSize,
            true
          );
          allMedia.push(...pageMedia);
          pageStart = pageEnd;
          pageEnd = pageStart + pageSize;
          pageCount += 1;
        }

        for (const media of allMedia) {
          jobMediaIds.push(media.id);
          jobMediaIdSet.add(media.id);
        }

        this.loading.hideSpinner();
        this.hideDimmer();
      } else {
        jobMediaIds = evt.detail.mediaIds;
      }

      var body = JSON.stringify({
        algorithm_name: evt.detail.algorithmName,
        media_ids: jobMediaIds,
      });
      console.log(
        `${jobMediaIds.length} | ${evt.detail.algorithmName} (Unique IDs: ${jobMediaIdSet.size})`
      );

      var response = await fetchCredentials(
        "/rest/Jobs/" + evt.detail.projectId,
        {
          method: "POST",
          body: body,
        },
        true
      );
      var data = await response.json();
      if (response.status == 201) {
        that._notify(
          "Workflow launched!",
          `Successfully launched ${evt.detail.algorithmName}! Monitor progress by clicking the "Activity" button.`,
          "ok"
        );
      } else {
        that._notify(
          "Error launching workflow!",
          `Failed to launch ${evt.detail.algorithmName}: ${response.statusText}.`,
          "error"
        );
      }
    }
  }

  async _updateFilterResults(evt) {
    this._filterConditions = evt.detail.conditions;
    this._filterView.setFilterConditions(this._filterConditions);
    this._bulkEdit.checkForFilters(this._filterConditions);

    //this.showDimmer();
    //this.loading.showSpinner(); #TODO

    try {
      const query = await this._mediaSection.updateFilterResults(
        this._filterConditions
      );
      if (typeof query != "undefined" && query != this._lastQuery) {
        if (query !== "") {
          this._lastQuery = query;
          this._addSavedSearchButton.style.opacity = 1.0;
          this._addSavedSearchButton.style.cursor = "pointer";
        } else {
          this._lastQuery = null;
          this._addSavedSearchButton.style.opacity = 0.5;
          this._addSavedSearchButton.style.cursor = "not-allowed";
        }
      }
    } catch (err) {
      console.error("Couldn't update results with current filter.", err);
    }

    this.loading.hideSpinner();
    this.hideDimmer();
  }

  _deleteSelection() {
    const list = Array.from(this._bulkEdit._currentMultiSelection);

    if (list && list.length > 0) {
      this.deleteFileForm.setAttribute("media-id", list);
      this.deleteFileForm.setAttribute("project-id", this._projectId);
      this.deleteFileForm.setAttribute("media-name", "Selected files");
      this.deleteFileForm.setAttribute("media-id", String(list));
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    } else {
      this._notify(
        "Make a selection",
        "Nothing to delete! Make a selection first.",
        "error"
      );
    }
  }

  /**
   * Displays the background dimmer. Call when a modal is open.
   */
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  /**
   * Hides the background dimmer. Call when a modal is closed..
   */
  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }

  //
  // Section data functions
  //

  /**
   * Get the sections for the project and set the UI
   */
  async getSections() {
    var response = await fetchCredentials(`/rest/Sections/${this._projectId}`, {
      method: "GET"
    });
    this._sections = await response.json();
    this._sectionData.init(this._sections);
    this.makeFolders();
  }

  /**
   * @param {integer} id - Section ID to hide / set visible = false
   * No checking is done to see if we're just patching the same value
   */
  async hideSection(id) {
    var response = await fetchCredentials(`/rest/Section/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ visible: false }),
    });
    if (response.status == 200) {
      return;
    }
    else {
      this._modalError._error(
        `Unable to hide section. Error: ${response.message}`,
        "Error");
    }
  }

  /**
   * @param {integer} id - Section ID to restore / set visible = true
   * No checking is done to see if we're just patching the same value.
   */
  async restoreSection(id) {
    var response = await fetchCredentials(`/rest/Section/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ visible: true }),
    });
    if (response.status == 200) {
      return;
    }
    else {
      this._modalError._error(
        `Unable to restore section. Error: ${response.message}`,
        "Error");
    }
  }

  //
  // Folder tree functions
  //

  /**
   * Loops through the folders and sees if they are visible or not (either via expanding) or
   * using the section visibility flag.
   *
   * If a folder/section visibility flag is false, but the this._viewAllHiddenFolders == true, then
   *   it is visible to the user. Hidden otherwise.
   * If a parent folder is hidden, then all of its children are hidden.
   * If a parent folder is not expanded, then all of its children are hidden.
   */
  updateVisibility() {

    var that = this;

    if (this._viewAdvancedFolderDetails) {
      this.setLeftPanelWidth("500px");
    }
    else {
      this.setLeftPanelWidth(this._leftPanelDefaultWidth);
    }

    function traverseAlphabetically(node, parentPath) {

      var appendedPath = parentPath;
      var parentExpanded = null;

      if (appendedPath != "") {
        var parentSection = that._sectionData._sectionPathMap[parentPath];
        for (const folder of that._folders.children) {
          if (folder._section.id == parentSection.id) {
            parentExpanded = folder._expanded;
            break;
          }
        }

        appendedPath += ".";
      }

      Object.keys(node).sort().forEach(subpath => {

        var childSectionListItem = null;
        var childSection = that._sectionData.getSectionFromPath(appendedPath + subpath);
        for (const folder of that._folders.children) {
          if (folder._section.id == childSection.id) {
            childSectionListItem = folder;
          }
        }

        if (that._viewAdvancedFolderDetails) {
          childSectionListItem.showAdvancedDetails();
        }
        else {
          childSectionListItem.hideAdvancedDetails();
        }

        var section = that._sectionData.getSectionFromPath(appendedPath + subpath);
        childSectionListItem.style.display = "block";
        if (!section.visible) {
          if (!that._viewAllHiddenFolders) {
            childSectionListItem.collapse();
            childSectionListItem.style.display = "none";
          }
        }
        if (parentExpanded != null && parentExpanded == false) {
          childSectionListItem.collapse();
          childSectionListItem.style.display = "none";
        }

        traverseAlphabetically(node[subpath], appendedPath + subpath);
      });
    }
    traverseAlphabetically(this._sectionData._sectionTree, "");

  }

  /**
   * @postcondition Section edit dialog is updated with the list of sections
   */
  makeFolders() {

    // Clear out the existing folder lists
    while (this._folders.firstChild) {
      this._folders.removeChild(this._folders.firstChild);
    }
    while (this._savedSearches.firstChild) {
      this._savedSearches.removeChild(this._savedSearches.firstChild);
    }

    const that = this;
    function createSectionItem(path) {

      const section = that._sectionData.getSectionFromPath(path);
      const childSections = that._sectionData.getChildSections(section);

      const sectionItem = document.createElement("section-list-item");
      sectionItem.init(section, childSections);

      sectionItem.addEventListener("selected", (evt) => {
        that.selectSection(evt.detail.id);
      });

      sectionItem.addEventListener("collapse", () => {
        that.updateVisibility();
      });

      sectionItem.addEventListener("expand", () => {
        that.updateVisibility();
      });

      sectionItem.addEventListener("hideSection", async (evt) => {
        that.showDimmer();

        await that.hideSection(evt.detail.id);

        // Get children of the section. If there are any, we need to hide all of them.
        const children = that._sectionData.getChildSections(section);
        for (const childSection of children) {
          await that.hideSection(childSection.id);
        }

        // Reset the UI
        await that.getSections();
        that.hideDimmer();
      });

      sectionItem.addEventListener("deleteSection", async (evt) => {
        
        const sectionToDelete = that._sectionData.getSectionFromID(evt.detail.id)
        that._deleteSectionDialog.init(
          that._project.id,
          sectionToDelete,
          null,
          false
        );
        that._deleteSectionDialog.setAttribute("is-open", "");
        that.setAttribute("has-open-modal", "");
      });

      sectionItem.addEventListener("restoreSection", async (evt) => {
        that.showDimmer();
        await that.restoreSection(evt.detail.id);

        // Get children of the section. If there are any, we need to restore all of them.
        const children = that._sectionData.getChildSections(section);
        for (const childSection of children) {
          await that.restoreSection(childSection.id);
        }

        await that.getSections();
        that.selectSection(evt.detail.id);
        that.hideDimmer();
      });

      sectionItem.addEventListener("editSection", (evt) => {
        that.showDimmer();
        that._folderDialog.setMode("editFolder", section);
        that._folderDialog.setAttribute("is-open", "");
      });

      that._folders.appendChild(sectionItem);
    }

    function traverseAlphabetically(node, parentPath) {

      var appendedPath = parentPath;
      if (appendedPath != "") {
        appendedPath += ".";
      }

      Object.keys(node).sort().forEach(subpath => {
        createSectionItem(appendedPath + subpath);
        traverseAlphabetically(node[subpath], appendedPath + subpath);
      });
    }
    traverseAlphabetically(this._sectionData._sectionTree, "");

    this._folderDialog.init(this._sectionData);
    this.updateVisibility();
  }

  /**
   * @param {integer} sectionId - Tator ID of section element. If null, then All Media is assumed
   */
  selectSection(sectionId) {

    // Make all folders inactive
    const allFolders = [...this._folders.children]
    for (const folder of allFolders) {
      folder.setInactive();
    }

    this._allMediaButton.setInactive();

    // Set the active folder and the mainSection portion of the page
    if (sectionId == null) {
      this._allMediaButton.setActive();
      this._mediaSection.init(this._projectId, null);
      this._selectedSection = null;
    }
    else {
      for (const folder of allFolders) {
        const section = folder.getSection();
        if (section.id == sectionId) {
          folder.setActive();
          this._mediaSection.init(this._projectId, section);
          this._selectedSection = section;
          break;
        }
      }
    }

    // Expand the folders in the library panel until the active folder is selected and in view
    if (this._selectedSection != null) {
      var parentSections = this._sectionData.getParentSections(this._selectedSection);
      var parentSectionIds = parentSections.map((section) => section.id);
      var activeFolder = null;
      for (const folder of allFolders) {
        const section = folder.getSection();
        if (parentSectionIds.includes(section.id)) {
          folder.expand();
        }
        if (section.id == this._selectedSection.id) {
          activeFolder = folder;
        }
      }
      this.updateVisibility();

      function isInViewport(element) {
        var rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      }
      if (!isInViewport(activeFolder)) {
        activeFolder.scrollIntoView();
      }
    }

    // Update media section center page
    this._mediaSection.init(this._project.id, this._selectedSection);

    // Update the URL
    this.updateURL();
  }

  /**
   * Updates the URL with the current page's state
   */
  updateURL() {

    let url = new URL(window.location.href);

    if (this._selectedSection !== null) {
      url.searchParams.set("section", this._selectedSection.id);
    }
    else {
      url.searchParams.delete("section");
    }
    window.history.replaceState({}, '', url.toString());
  }

  //
  // Bookmark management
  //

  /**
   * @param {array} bookmarks
   *    Array of Tator.Bookmark objects to make the bookmarks listing
   */
  makeBookmarks(bookmarks) {

    // Clear out the existing bookmarks
    while (this._bookmarkListItems.firstChild) {
      this._bookmarkListItems.removeChild(this._bookmarkListItems.firstChild);
    }

    const first = "Last visited";
    bookmarks.sort((a, b) => {
      return a.name == first ? -1 : b.name == first ? 1 : 0;
    });

    for (const bookmark of bookmarks) {
      const listItem = document.createElement("bookmark-list-item");
      listItem.init(bookmark);
      this._bookmarkListItems.appendChild(listItem);

      listItem.addEventListener("renameBookmark", () => {
        this._bookmarkEditDialog.init(bookmark);
        this._bookmarkEditDialog.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      });

      listItem.addEventListener("deleteBookmark", () => {
        this._bookmarkDeleteDialog.init(bookmark);
        this._bookmarkDeleteDialog.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      });
    }
  }

  //
  // Section Panel
  //

  /**
   * @param {string} panel
   *   "library" | "saved searches" | "bookmarks"
   */
  displayPanel(panel) {

    if (panel == "library") {

      if (this._panelLibrary.style.display == "block" && this._leftPanel.style.display == "flex") {
        this._leftPanel.style.display = "none";
        this._sidebarLibraryButton.setAttribute("tooltip", "Expand Library Panel");
      }
      else {
        this._leftPanel.style.display = "flex";
        this._sidebarLibraryButton.setAttribute("tooltip", "Hide Library Panel");
      }

      if (this._viewAdvancedFolderDetails) {
        this.setLeftPanelWidth("500px");
      }
      else {
        this.setLeftPanelWidth(this._leftPanelDefaultWidth);
      }

      this._sidebarSavedSearchesButton.setAttribute("tooltip", "Open Saved Searches Panel");
      this._sidebarBookmarksButton.setAttribute("tooltip", "Open Bookmarks Panel");

      this._sidebarLibraryButton.classList.add("btn-purple50");
      this._sidebarSavedSearchesButton.classList.remove("btn-purple50");
      this._sidebarBookmarksButton.classList.remove("btn-purple50");

      this._sidebarLibraryText.classList.add("text-white");
      this._sidebarSavedSearchesText.classList.remove("text-white");
      this._sidebarBookmarksText.classList.remove("text-white");

      this._sidebarLibraryText.classList.remove("text-gray");
      this._sidebarSavedSearchesText.classList.add("text-gray");
      this._sidebarBookmarksText.classList.add("text-gray");

      this._panelLibrary.style.display = "block";
      this._panelSavedSearches.style.display = "none";
      this._panelBookmarks.style.display = "none";

    }
    else if (panel == "saved searches") {

      if (this._panelSavedSearches.style.display == "block" && this._leftPanel.style.display == "flex") {
        this._leftPanel.style.display = "none";
        this._sidebarSavedSearchesButton.setAttribute("tooltip", "Expand Saved Searches Panel");
      }
      else {
        this._leftPanel.style.display = "flex";
        this._sidebarSavedSearchesButton.setAttribute("tooltip", "Hide Saved Searches Panel");
      }

      this.setLeftPanelWidth(this._leftPanelDefaultWidth);

      this._sidebarLibraryButton.setAttribute("tooltip", "Open Library Panel");
      this._sidebarBookmarksButton.setAttribute("tooltip", "Open Bookmarks Panel");

      this._sidebarLibraryButton.classList.remove("btn-purple50");
      this._sidebarSavedSearchesButton.classList.add("btn-purple50");
      this._sidebarBookmarksButton.classList.remove("btn-purple50");

      this._sidebarLibraryText.classList.remove("text-white");
      this._sidebarSavedSearchesText.classList.add("text-white");
      this._sidebarBookmarksText.classList.remove("text-white");

      this._sidebarLibraryText.classList.add("text-gray");
      this._sidebarSavedSearchesText.classList.remove("text-gray");
      this._sidebarBookmarksText.classList.add("text-gray");

      this._panelLibrary.style.display = "none";
      this._panelSavedSearches.style.display = "block";
      this._panelBookmarks.style.display = "none";
    }
    else if (panel == "bookmarks") {

      if (this._panelBookmarks.style.display == "block" && this._leftPanel.style.display == "flex") {
        this._leftPanel.style.display = "none";
        this._sidebarBookmarksButton.setAttribute("tooltip", "Expand Bookmarks Panel");
      }
      else {
        this._leftPanel.style.display = "flex";
        this._sidebarBookmarksButton.setAttribute("tooltip", "Hide Bookmarks Panel");
      }

      this.setLeftPanelWidth(this._leftPanelDefaultWidth);

      this._sidebarLibraryButton.setAttribute("tooltip", "Open Library Panel");
      this._sidebarSavedSearchesButton.setAttribute("tooltip", "Open Saved Searches Panel");

      this._sidebarLibraryButton.classList.remove("btn-purple50");
      this._sidebarSavedSearchesButton.classList.remove("btn-purple50");
      this._sidebarBookmarksButton.classList.add("btn-purple50");

      this._sidebarLibraryText.classList.remove("text-white");
      this._sidebarSavedSearchesText.classList.remove("text-white");
      this._sidebarBookmarksText.classList.add("text-white");

      this._sidebarLibraryText.classList.add("text-gray");
      this._sidebarSavedSearchesText.classList.add("text-gray");
      this._sidebarBookmarksText.classList.remove("text-gray");

      this._panelLibrary.style.display = "none";
      this._panelSavedSearches.style.display = "none";
      this._panelBookmarks.style.display = "block";
    }
  }

  /**
   * Setup the left side navigation bar
   * Execute only at initialization.
   */
  createSidebarNav() {

    var sidebarDiv = document.createElement("div");
    sidebarDiv.setAttribute("class", "sidebar d-flex flex-items-center flex-column");
    this.mainWrapper.appendChild(sidebarDiv);

    this._sidebarLibraryButton = document.createElement("button");
    this._sidebarLibraryButton.setAttribute("class", "mt-2 btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button sidebar-button tooltip-right")
    this._sidebarLibraryButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M17 17v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h2" />
      </svg>
    `;
    sidebarDiv.appendChild(this._sidebarLibraryButton);

    this._sidebarLibraryText = document.createElement("div");
    this._sidebarLibraryText.setAttribute("class", "f3 text-gray pb-2 pt-1 text-center mb-2 clickable");
    this._sidebarLibraryText.textContent = "Library";
    sidebarDiv.appendChild(this._sidebarLibraryText);

    this._sidebarSavedSearchesButton = document.createElement("button");
    this._sidebarSavedSearchesButton.setAttribute("class", "btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button sidebar-button tooltip-right")
    this._sidebarSavedSearchesButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" />
      </svg>
    `;
    sidebarDiv.appendChild(this._sidebarSavedSearchesButton);

    this._sidebarSavedSearchesText = document.createElement("div");
    this._sidebarSavedSearchesText.setAttribute("class", "f3 text-gray pb-2 pt-1 text-center mb-2 clickable");
    this._sidebarSavedSearchesText.textContent = "Searches";
    sidebarDiv.appendChild(this._sidebarSavedSearchesText);

    this._sidebarBookmarksButton = document.createElement("button");
    this._sidebarBookmarksButton.setAttribute("class", "btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button sidebar-button tooltip-right")
    this._sidebarBookmarksButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 10v11l-5 -3l-5 3v-11a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3z" /><path d="M11 3h5a3 3 0 0 1 3 3v11" />
      </svg>
    `;
    sidebarDiv.appendChild(this._sidebarBookmarksButton);

    this._sidebarBookmarksText = document.createElement("div");
    this._sidebarBookmarksText.setAttribute("class", "f3 text-gray pb-2 pt-1 text-center mb-2 clickable");
    this._sidebarBookmarksText.textContent = "Bookmarks";
    sidebarDiv.appendChild(this._sidebarBookmarksText);

    this._sidebarLibraryButton.addEventListener("click", () => {
      this._sidebarLibraryButton.blur();
      this.displayPanel("library");
    });
    this._sidebarLibraryText.addEventListener("click", () => {
      this._sidebarLibraryText.blur();
      this.displayPanel("library");
    });
    this._sidebarSavedSearchesButton.addEventListener("click", () => {
      this._sidebarSavedSearchesButton.blur();
      this.displayPanel("saved searches");
    });
    this._sidebarSavedSearchesText.addEventListener("click", () => {
      this._sidebarSavedSearchesText.blur();
      this.displayPanel("saved searches");
    });
    this._sidebarBookmarksButton.addEventListener("click", () => {
      this._sidebarBookmarksButton.blur();
      this.displayPanel("bookmarks");
    });
    this._sidebarBookmarksText.addEventListener("click", () => {
      this._sidebarBookmarksText.blur();
      this.displayPanel("bookmarks");
    });
  }

  /**
   * Setup the left side panel for the library components
   * Execute only at initialization.
   */
  setupLibraryPanel() {

    this._viewAllHiddenFolders = false;
    this._viewAdvancedFolderDetails = false;

    const libraryHeader = document.createElement("div");
    libraryHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center pt-2 pb-3 ml-2"
    );
    this._panelLibrary.appendChild(libraryHeader);

    const libraryText = document.createElement("div");
    libraryText.setAttribute("class", "h2 mb-2");
    libraryText.textContent = "Library";
    libraryHeader.appendChild(libraryText);

    this._allMediaButton = document.createElement("all-media-item");
    this._panelLibrary.appendChild(this._allMediaButton);

    this._allMediaButton.addEventListener("selected", (evt) => {
      this.selectSection(evt.detail.id);
    })

    const folderHeader = document.createElement("div");
    folderHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-2 mt-3"
    );
    this._panelLibrary.appendChild(folderHeader);

    const folderText = document.createElement("h2");
    folderText.setAttribute("class", "h3 ml-2");
    folderText.textContent = "Folders";
    folderHeader.appendChild(folderText);

    const folderButtons = document.createElement("div");
    folderButtons.setAttribute("class", "rounded-2 px-1 d-flex flex-items-center");
    folderHeader.appendChild(folderButtons);

    const advancedDetails = document.createElement("div");
    advancedDetails.setAttribute("class", "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray");
    advancedDetails.setAttribute("tooltip", "View Advanced Details");
    advancedDetails.style.minHeight = "28px";
    folderButtons.appendChild(advancedDetails);
    advancedDetails.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 100 100" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M81.41,56.24l-11.47-6.86c-1.88-1.12-1.92-3.83-0.07-5.01c5.71-3.64,5.33-11.31,0.19-14.6
      L33.17,6.23c-5.71-3.65-13.21,0.46-13.21,7.24v15.38c0,1.83-2.02,2.94-3.56,1.95C10.69,27.15,3.2,31.24,3.2,38.03v47.11
      c0,6.78,7.49,10.89,13.21,7.24l12.76-8.24c1.2-0.78,2.78,0.09,2.78,1.52c0,8.74,7.95,11.39,13.04,8.14l36.42-23.26
      C86.63,67.2,86.63,59.58,81.41,56.24z M65.64,60.57c-5.92,3.78-33.23,21.44-33.83,21.69c-5.47,2.28-11.84-1.69-11.84-7.95
      c0-2.21,0-38.64,0-40.88c0-6.78,7.49-10.89,13.21-7.24c5.1,3.26,32.56,20.62,32.47,20.62C70.86,50.15,70.86,57.24,65.64,60.57z">
    </svg>
   `;

    const viewHiddenFolders = document.createElement("div");
    viewHiddenFolders.setAttribute("class", "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray");
    viewHiddenFolders.setAttribute("tooltip", "View Hidden Folders");
    viewHiddenFolders.style.minHeight = "28px";
    folderButtons.appendChild(viewHiddenFolders);
    viewHiddenFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
   `;

    const collapseFolders = document.createElement("div");
    collapseFolders.setAttribute("class", "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray");
    collapseFolders.setAttribute("tooltip", "Collapse All Folders");
    collapseFolders.style.minHeight = "28px";
    folderButtons.appendChild(collapseFolders);
    collapseFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 7.26a2.005 2.005 0 0 0 -1.012 1.737v10c0 1.1 .9 2 2 2h10c.75 0 1.158 -.385 1.5 -1" /><path d="M11 10h6" />
    </svg>
    `;

    const expandFolders = document.createElement("div");
    expandFolders.setAttribute("class", "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray");
    expandFolders.setAttribute("tooltip", "Expand All Folders");
    expandFolders.style.minHeight = "28px";
    folderButtons.appendChild(expandFolders);
    expandFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 7.26a2.005 2.005 0 0 0 -1.012 1.737v10c0 1.1 .9 2 2 2h10c.75 0 1.158 -.385 1.5 -1" /><path d="M11 10h6" /><path d="M14 7v6" />
    </svg>
    `;

    const addFolders = document.createElement("div");
    addFolders.setAttribute("class", "d-flex d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray");
    addFolders.setAttribute("tooltip", "Add Folder");
    addFolders.style.minHeight = "28px";
    folderButtons.appendChild(addFolders);
    addFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />
    </svg>
    `;

    this._folders = document.createElement("ul");
    this._folders.setAttribute("class", "sections");
    this._panelLibrary.appendChild(this._folders);

    advancedDetails.addEventListener("click", () => {
      advancedDetails.blur();
      this._viewAdvancedFolderDetails = !this._viewAdvancedFolderDetails;

      if (this._viewAdvancedFolderDetails) {
        advancedDetails.setAttribute("tooltip", "Hide Advanced Details");
      }
      else {
        advancedDetails.setAttribute("tooltip", "View Advanced Details");
      }

      this.updateVisibility();
    });

    viewHiddenFolders.addEventListener("click", () => {
      viewHiddenFolders.blur();
      this._viewAllHiddenFolders = !this._viewAllHiddenFolders;

      if (this._viewAllHiddenFolders) {
        viewHiddenFolders.setAttribute("tooltip", "Stash Hidden Folders");
        viewHiddenFolders.innerHTML = `
        <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        `;
      }
      else {
        viewHiddenFolders.setAttribute("tooltip", "View Hidden Folders");
        viewHiddenFolders.innerHTML = `
        <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
       `;
      }

      this.updateVisibility();
    });

    collapseFolders.addEventListener("click", () => {
      collapseFolders.blur();
      const allFolders = [...this._folders.children]
      for (const folder of allFolders) {
        folder.collapse();
      }
      this.updateVisibility();
    });

    expandFolders.addEventListener("click", () => {
      expandFolders.blur();
      const allFolders = [...this._folders.children]
      for (const folder of allFolders) {
        folder.expand();
      }
      this.updateVisibility();
    });

    addFolders.addEventListener("click", () => {
      addFolders.blur();
      this._folderDialog.setMode("newFolder", this._selectedSection);
      this._folderDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });
  }

  /**
   * Setup the left side panel for the saved searches components
   * Execute only at initialization.
   */
  setupSearchesPanel() {

    const savedSearchesHeader = document.createElement("div");
    savedSearchesHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center pt-2 pb-3 ml-2"
    );
    this._panelSavedSearches.appendChild(savedSearchesHeader);

    const savedSearchText = document.createElement("div");
    savedSearchText.setAttribute("class", "h2 mb-2");
    savedSearchText.textContent = "Saved Searches";
    savedSearchesHeader.appendChild(savedSearchText);

    const headerButtons = document.createElement("div");
    headerButtons.setAttribute(
      "class",
      "f3 btn-clear text-gray hover-text-white"
    );
    savedSearchesHeader.appendChild(headerButtons);

    this._addSavedSearchButton = document.createElement("div");
    this._addSavedSearchButton.setAttribute("class", "d-flex d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-clear btn-charcoal-medium text-gray");
    this._addSavedSearchButton.setAttribute("tooltip", "Save Search");
    this._addSavedSearchButton.style.maxHeight = "28px";
    this._addSavedSearchButton.style.opacity = 0.5;
    this._addSavedSearchButton.style.cursor = "not-allowed";
    headerButtons.appendChild(this._addSavedSearchButton);
    this._addSavedSearchButton.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />
    </svg>
    `;

    this._savedSearches = document.createElement("ul");
    this._savedSearches.setAttribute("class", "sections");
    this._panelSavedSearches.appendChild(this._savedSearches);
  }

  /**
   * Setup the left side panel for the bookmarks components
   * Execute only at initialization
   */
  setupBookmarksPanel() {

    const bookmarkHeader = document.createElement("div");
    bookmarkHeader.setAttribute(
      "class",
      "d-flex pt-2 pb-2 ml-2 flex-column"
    );
    this._panelBookmarks.appendChild(bookmarkHeader);

    const bookmarkHeaderDiv = document.createElement("div");
    bookmarkHeaderDiv.setAttribute("class", "d-flex flex-justify-between flex-items-center mb-2");
    bookmarkHeader.appendChild(bookmarkHeaderDiv);

    const bookmarkText = document.createElement("div");
    bookmarkText.setAttribute("class", "h2");
    bookmarkText.textContent = "Bookmarks";
    bookmarkHeaderDiv.appendChild(bookmarkText);

    const bookmarkHelpIcon = document.createElement("div");
    bookmarkHelpIcon.setAttribute("class", "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray");
    bookmarkHelpIcon.setAttribute("tooltip", "Bookmarks Help");
    bookmarkHelpIcon.style.minHeight = "28px";
    bookmarkHelpIcon.style.maxWidth = "28px";
    bookmarkHeaderDiv.appendChild(bookmarkHelpIcon);
    bookmarkHelpIcon.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
   `;

    const bookmarkHelpText = document.createElement("div");
    bookmarkHelpText.setAttribute("class", "f2 py-2 text-dark-gray");
    bookmarkHelpText.textContent = "Click on a bookmark to view the media at the specific frame and version. Bookmarks are created within the annotator and are specific to the user.";
    bookmarkHeader.appendChild(bookmarkHelpText);
    bookmarkHelpText.style.display = "none";

    bookmarkHelpIcon.addEventListener("click", () =>{
      bookmarkHelpIcon.blur();
      if (bookmarkHelpText.style.display == "none") {
        bookmarkHelpText.style.display = "block";
      }
      else {
        bookmarkHelpText.style.display = "none";
      }
    });

    this._bookmarkListItems = document.createElement("ul");
    this._bookmarkListItems.setAttribute("class", "sections");
    this._panelBookmarks.appendChild(this._bookmarkListItems);

  }

  /**
   * @param {string} width
   *  e.g. "400px";
   */
  setLeftPanelWidth(width) {
    this._leftPanel.style.minWidth = width;
    this._leftPanel.style.maxWidth = width;
  }

  /**
   * Create the left panels for the:
   * - Library
   * - Saved searches
   * - Bookmarks
   *
   * Execute only at initialization
   */
  createLeftPanel() {

    this._leftPanel = document.createElement("div");
    this._leftPanel.setAttribute("class", "d-flex flex-grow flex-column");
    this._leftPanel.style.minWidth = "400px";
    this._leftPanel.style.maxWidth = "400px";
    this._leftPanel.style.backgroundColor = "#0d1320";
    this.mainWrapper.appendChild(this._leftPanel);

    this._panelLibrary = document.createElement("section");
    this._panelLibrary.setAttribute("class", "py-3 mr-3 ml-3 text-gray flex-grow");
    this._leftPanel.appendChild(this._panelLibrary);

    this._panelSavedSearches = document.createElement("section");
    this._panelSavedSearches.setAttribute("class", "py-3 mr-3 ml-3 text-gray flex-grow");
    this._leftPanel.appendChild(this._panelSavedSearches);

    this._panelBookmarks = document.createElement("section");
    this._panelBookmarks.setAttribute("class", "py-3 mr-3 ml-3 text-gray flex-grow");
    this._leftPanel.appendChild(this._panelBookmarks);

    this.setupLibraryPanel();
    this.setupSearchesPanel();
    this.setupBookmarksPanel();

    this._leftPanelDefaultWidth = "400px";
    this.setLeftPanelWidth(this._leftPanelDefaultWidth);
  }
}

customElements.define("project-detail", ProjectDetail);
