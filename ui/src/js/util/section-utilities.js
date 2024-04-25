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
   *   List of Tator.Section objects to process. May or may not contain invalid sections.
   * @param {array} invalidSections
   *   List of Tator.Section objects that are considered invalid
   *
   * @postcondition this._section is set with sections
   * @postcondition this._sectionTree is set with the tree structure of the sections (key is section.path)
   *                Each node is a dictionary with the key being the subfolder name and the value being the children
   * @postcondition this._sectionPathMap is set with the sections (key is section.path)
   * @postcondition this._sectionIdPathMap is set with the section pathss (key is section.id)
   * @postcondition this._sectionIdMap is set with the section objects (key is section.id)
   */
  init(sections, invalidSections) {
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
      parts.forEach((part) => {
        if (!currentNode[part]) {
          currentNode[part] = {};
        }
        currentNode = currentNode[part];
      });
    }

    // Need to loop through the provided sections.
    // It's possible that there are sections with erroneous paths, we need to detect them and
    // not include them in this._sections and into a separate list. This requires building
    // the section tree, and then checking if the section has a parent that is not in the tree.
    var validSections = [];
    this._invalidSections = [];
    var foundInvalidSectionsCount = 0;
    if (Array.isArray(invalidSections)) {
      this._invalidSections = invalidSections;
    }
    for (const section of sections) {
      var parentSections = this.getParentSections(section);
      var valid = true;
      for (const parentSection of parentSections) {
        if (parentSection == null) {
          valid = false;
          break;
        }
      }

      if (valid) {
        validSections.push(section);
      } else {
        this._invalidSections.push(section);
        foundInvalidSectionsCount += 1;
      }
    }

    if (foundInvalidSectionsCount > 0) {
      console.warn(
        `${this._invalidSections.length} invalid sections detected. Reinitializing with valid sections.`
      );
      this.init(validSections, this._invalidSections);
    }
  }

  /**
   * @param {string} path
   */
  static cleanPathString(path) {
    return path.replace(/[^A-Za-z0-9_.]/g, "_");
  }

  /**
   * @param {Tator.Section} section
   * @returns boolean
   *    True if the section is a saved search. False if it's  a media folder
   */
  static isSavedSearch(section) {
    return section.object_search != null || section.related_search != null;
  }

  /**
   * @param {Tator.Section} section
   * @returns string
   *    Returns the name of the section (removing the path components)
   */
  static getMainName(section) {
    return section.name;
  }

  /**
   * @return array
   *   Array of section objects that have an error in it and are not included as part of the
   *   nominal section tree.
   */
  getErrorSections() {
    return this._invalidSections;
  }

  /**
   * @return array
   *   Array of strings that are names of the section and its parents
   *   Order is from the oldest parent to the current section
   */
  getSectionNamesLineage(section) {
    var displayPath = [];
    var parentSections = this.getParentSections(section);
    displayPath.push(section.name);

    for (const parentSection of parentSections) {
      displayPath.push(parentSection.name);
    }

    // Reverse the displayPath so that the order is from the oldest parent to the current section
    displayPath.reverse();

    return displayPath;
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
    if (thisPath == null || thisPath == "None") {
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
        Object.keys(node)
          .sort()
          .forEach((subpath) => {
            var childSection = that._sectionPathMap[appendedPath + subpath];
            children.push(childSection);
            return;
          });
      } else {
        Object.keys(node)
          .sort()
          .forEach((subpath) => {
            traverseAlphabetically(node[subpath], appendedPath + subpath);
          });
      }
    }

    traverseAlphabetically(this._sectionTree, "");

    return children;
  }

  /**
   * @param {Tator.Section} section
   *    Section to get all the descendants of
   * @returns {array}
   *   Array of sections that are descendants of the given section
   */
  getDescendantSections(section) {
    const thisPath = this.getSectionPath(section);
    var thisPathTokens = thisPath.split(".");
    var that = this;
    var descendants = [];

    function traverseAlphabetically(node, parentPath) {
      var appendedPath = parentPath;
      if (appendedPath != "") {
        appendedPath += ".";
      }

      // Check to see if this part of the tree is part of the provided section
      //
      // Suppose there are folders with these paths:
      //
      // A
      // A.B
      // A.B.C
      // A.B.D
      // X
      // X.Y
      // X.Y.Z
      //
      // If the section provided was C, then the descendants would be []
      // If the section provided was Y, then the descendants would be [Z]
      // If the section provided was A, then the descendants would be [B, C, D]
      var parentPathTokens = parentPath.split(".");
      var isDescendant = true;
      if (parentPathTokens.length >= thisPathTokens.length) {
        for (var i = 0; i < thisPathTokens.length; i++) {
          if (parentPathTokens[i] != thisPathTokens[i]) {
            isDescendant = false;
            break;
          }
        }
      } else {
        isDescendant = false;
      }
      if (parentPath == "") {
        isDescendant = false;
      }

      if (isDescendant) {
        Object.keys(node)
          .sort()
          .forEach((subpath) => {
            var childSection = that._sectionPathMap[appendedPath + subpath];
            descendants.push(childSection);
            traverseAlphabetically(node[subpath], appendedPath + subpath);
          });
      } else {
        Object.keys(node)
          .sort()
          .forEach((subpath) => {
            traverseAlphabetically(node[subpath], appendedPath + subpath);
          });
      }
    }

    traverseAlphabetically(this._sectionTree, "");

    return descendants;
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
    return folderList;
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
    } else {
      var parentSection = this._sectionIdMap[parentSectionId];
      var sectionPath = this.getSectionPath(parentSection);
      sectionPath += ".";
      sectionPath += pathFolderName;
    }

    return {
      name: sectionName,
      path: sectionPath,
    };
  }

  /**
   * Verify if the proposed name is valid
   * Note: This loops through all section objects (searches, hidden, etc)
   *
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

    if (proposedName.toLowerCase() === "all media") {
      return false;
    }

    // Find the adjusted path which we will use to compare against other sections
    let info = this.makeFolderNameAndPath(proposedName, parentSectionId);

    // See if the adjusted path/name matches any of the provided sections
    // Use the lowercase version of the name and path for comparison
    for (const section of this._sections) {
      const sectionPath = this.getSectionPath(section);
      if (sectionPath.toLowerCase() === info.path.toLowerCase()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get a list of folder choices for an enum input
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
      if (typeof section !== "undefined" && section?.visible === true) {
        var parentSections = this.getParentSections(section);

        // If any of the parentSections are not visible, don't add this section to the list
        var visible = true;
        for (const parentSection of parentSections) {
          if (parentSection.visible == false) {
            visible = false;
            break;
          }
        }
        if (!visible) {
          continue;
        }

        var parts = this.getSectionNamesLineage(section);
        var label = parts.join(" > ");

        choices.push({
          value: section.id,
          label: label,
        });
      } else if (typeof section == "undefined" || section?.visible) {
        console.warn("Skipping 'undefined', or null section from getFolderList.", section)
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

  /**
   * Get a list of hidden folder choices for an enum input
   * Output is sorted by breadcrumb path
   *
   * @return {array}
   *   Each element is {value: sectionID, label: label to display}
   *   The label is a breadcrumb based version of the name
   */
  getHiddenFolderEnumChoices() {
    var choices = [];
    for (const section of this.getFolderList()) {
      if (section.visible == false) {
        var parts = this.getSectionNamesLineage(section);
        var label = parts.join(" > ");

        choices.push({
          value: section.id,
          label: label,
        });
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

  /**
   * Get a list of saved searches choices for an enum input
   * Note: Don't bother doing any cleaning with the section name, unlike the folders.
   *       Saved searches are expected to be only in the top level.
   */
  getSavedSearchEnumChoices() {
    var choices = [];
    for (const section of this.getSavedSearchesList()) {
      if (section.visible == true) {
        choices.push({ value: section.id, label: section.name });
      }
    }

    return choices;
  }
}
