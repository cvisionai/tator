import { TatorElement } from "../tator-element.js";
import { SvgDefinition } from "../svg-definitions/all-svg.js";

export class EntityGalleryLabels extends TatorElement {
  constructor() {
    super();

    // Element used for menu bar (not attached to shadow)
    // #todo this could be a menu button component?
    this.menuLink = document.createElement("button");
    this.menuLink.setAttribute(
      "class",
      "menu-link-button btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );

    let labelIcon = new SvgDefinition({ iconName: "label-tag" });
    this.menuLink.appendChild(labelIcon);

    this.menuLinkTextSpan = document.createElement("span");
    this.menuLinkTextSpan.setAttribute("class", "px-2");

    this.labelLinkText = document.createTextNode("Choose Labels");
    this.menuLinkTextSpan.appendChild(this.labelLinkText);

    this.menuLink.appendChild(labelIcon);
    this.menuLink.appendChild(this.menuLinkTextSpan);

    // Label div container for lists
    this.div = document.createElement("div");
    this.div.setAttribute(
      "class",
      "entity-gallery__labels-div rounded-1 my-2 py-2 px-2 hidden"
    );
    this._shadow.appendChild(this.div);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute(
      "class",
      "text-gray d-flex flex-row flex-items-center f2 py-2 px-2"
    );
    this._titleText = document.createTextNode(
      "Select labels to display in the gallery"
    );
    titleDiv.appendChild(this._titleText);
    this.div.append(titleDiv);

    // Hide and showing the attribute div
    const xClose = document.createElement("nav-close");
    xClose.style.marginLeft = "auto";
    xClose.style.height = "20px";
    titleDiv.appendChild(xClose);

    // Listeners
    xClose.addEventListener("click", () => {
      this.div.classList.add("hidden");
    });

    this.menuLink.addEventListener("click", () => {
      this.div.classList.toggle("hidden");
    });

    // Each type is shown in the menu. Organized by type ID
    this._shownTypes = {};

    // Keep track of values by TypeId
    this._selectionValues = {};

    this._builtInAttributes = [
      { name: "ID", id: "id" },

      { name: "Created By", id: "created_by" },
      { name: "Created Datetime", id: "created_datetime" },

      { name: "Modified By", id: "modified_by" },
      { name: "Modified Datetime", id: "modified_datetime" },

      { name: "Type", id: "type" },
      { name: "Elemental ID", id: "elemental_id" },

      { name: "Mark", id: "mark" },
    ];
  }

  set titleEntityTypeName(val) {
    this._titleEntityTypeName = val;
    this._titleText.textContent = `Select ${val} labels to display in the gallery`;
  }

  init(projectId) {
    this.projectId = projectId;
    this.add({
      typeData: {
        id: -1,
        name: "Built In (all types)",
        attribute_types: this._builtInAttributes,
      },
    });
  }

  /**
   * Add a section of labels to main label div
   * @param {typeData} - object
   *
   */
  async add({
    typeData,
    hideTypeName = false,
    checkedFirst = null,
    customBuiltIns = [],
  }) {
    let typeName = typeData.name ? typeData.name : "";

    // don't re-add this type, or don't add if visible=false...
    if (this._shownTypes[typeData.id] || typeData.visible === false) {
      return false;
    } else {
      this._shownTypes[typeData.id] = true;
    }

    // Main labels box
    let labelsMain = document.createElement("div");
    labelsMain.setAttribute(
      "class",
      "entity-gallery-labels rounded-2 d-flex flex-row flex-justify-center flex-justify-between col-12"
    );

    if (!hideTypeName) {
      let _title = document.createElement("div");
      _title.setAttribute(
        "class",
        "entity-gallery-labels--title py-3 px-2 col-3"
      );
      _title.appendChild(document.createTextNode(`${typeName}`));

      if (
        typeof typeData.description !== "undefined" &&
        typeData.description !== ""
      ) {
        let descriptionText = document.createElement("div");
        descriptionText.setAttribute("class", "f3 py-1 text-gray");
        descriptionText.textContent = `${typeData.description}`;
        _title.appendChild(descriptionText);
      }

      let idText = document.createElement("text");
      idText.setAttribute("class", "d-flex py-1 text-gray f3");
      if (typeData.id == -1) {
        idText.textContent = `Type: Built in`;
      } else {
        idText.textContent = `Type ID: ${typeData.id}`;
      }
      _title.appendChild(idText);
      labelsMain.appendChild(_title);
    }

    // Labels details with checkboxes
    let _labelDetails = document.createElement("div");
    _labelDetails.setAttribute("class", "float-right col-10");
    labelsMain.appendChild(_labelDetails);

    // Style div for checkbox set
    let styleDiv = document.createElement("div");
    styleDiv.setAttribute(
      "class",
      "entity-gallery-labels--checkbox-div px-3 py-1 rounded-2"
    );
    _labelDetails.appendChild(styleDiv);

    // No attributes, so we can stop and provide a message
    if (typeData.attribute_types.length == 0) {
      const message = document.createElement("span");
      message.setAttribute("class", "text-gray f2");
      message.textContent = `${typeName} has no custom attributes.`;
      styleDiv.appendChild(message);
    } else {
      // If ok, create the checkbox list
      const checkboxList = this.makeListFrom(
        typeData,
        checkedFirst,
        customBuiltIns
      );

      const selectionBoxes = document.createElement("checkbox-set");
      selectionBoxes._colSize = "py-1 pr-2";
      selectionBoxes._inputDiv.setAttribute(
        "class",
        "d-flex flex-row flex-wrap col-12"
      );
      selectionBoxes.setValue(checkboxList);

      // Save to refer to in get/set later
      this._selectionValues[typeData.id] = selectionBoxes;

      // Check any project preferences, then also apply any cached (in that order)
      // #todo get preferences list, this may need to be passed into this function
      const projectPreference = [];
      const cacheTypeList = this.getLocalStorage(typeData.id);
      const listToApply = [...projectPreference, ...cacheTypeList];
      this._setValue({ typeId: typeData.id, values: listToApply });

      // Append to main box
      styleDiv.appendChild(selectionBoxes);

      // Listen for changes
      selectionBoxes.addEventListener("change", (e) => {
        const builtIns = this._selectionValues[-1]
          ? this._selectionValues[-1].getValue()
          : [];
        const currentBoxes = typeData.id == -1 ? [] : e.target.getValue();
        const newValue = [...builtIns, ...currentBoxes];

        this.setLocalStorage(typeData.id);

        this.dispatchEvent(
          new CustomEvent("labels-update", {
            detail: {
              value: newValue,
              typeId: typeData.id,
            },
          })
        );
      });
    }

    this.div.appendChild(labelsMain);

    return labelsMain;
  }

  _getValue(typeId) {
    if (this._selectionValues[typeId]) {
      // gets value of the selection boxes (type: checkbox-list) for that type
      return this._selectionValues[typeId].getValue();
    } else {
      return [];
    }
  }

  _setValue({ typeId, values }) {
    this._selectionValues[typeId].updateValue(values);
  }

  /*
   * Created a list based on attribute properties
   * - sorts, then saves as Array
   * - allows for "first checked" functionality #todo to use set in future
   * - Array is usable by checkbox set which requires:
   * - - @param id : string, attr.name
   * - - @param name : string, attr.name
   * - - @param checked : boolean
   */
  makeListFrom(typeData, checkedFirst, customBuiltIns) {
    this.newList = [];
    let tmpArray = [...typeData.attribute_types];

    // Non-hidden attributes (ie order >= 0))
    let nonHiddenAttrs = [];
    let hiddenAttrs = [];
    for (let attr of typeData.attribute_types) {
      if (attr.order >= 0) {
        nonHiddenAttrs.push(attr);
      } else {
        hiddenAttrs.push(attr);
      }
    }

    // Show array by order, or alpha
    // Should hidden be shown?
    const sorted = [...nonHiddenAttrs, ...hiddenAttrs].sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    if (customBuiltIns) {
      for (const bi of customBuiltIns) {
        sorted.push({ name: bi.name, id: `${bi.id}` });
      }
    }

    // Create an array for checkbox set el
    // console.log("checkedFirst "+checkedFirst)
    let checkedValue = checkedFirst == null ? false : checkedFirst;
    for (let attr of sorted) {
      this.newList.push({
        id: attr.id || encodeURI(attr.name),
        name: attr.name,
        checked: checkedValue,
      });

      // reset checked - only check the first one
      checkedValue = false;
    }
    // console.log(this.newList);

    return this.newList;
  }

  getLocalStorage(typeId) {
    const storageKey = `project-${this.projectId}__${this._titleEntityTypeName}-labels__type-${typeId}`;
    const storedData = localStorage.getItem(storageKey);
    // console.log(`GET storedData for ${storageKey} = ${storedData}`);

    if (storedData) {
      const data = JSON.parse(storedData);
      return data.values;
    } else {
      return [];
    }
  }

  setLocalStorage(typeId) {
    const storageKey = `project-${this.projectId}__${this._titleEntityTypeName}-labels__type-${typeId}`;
    const newValue = JSON.stringify({ values: this._getValue(typeId) });
    // console.log(`SET storedData for ${storageKey} set to newValue = ${newValue}`);

    localStorage.setItem(storageKey, newValue);
  }
}

customElements.define("entity-gallery-labels", EntityGalleryLabels);
