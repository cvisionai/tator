import { TatorElement } from "../tator-element.js";
import { SvgDefinition } from "../svg-definitions/all-svg.js";

export class EntityGallerySort extends TatorElement {
  constructor() {
    super();

    // Element used for menu bar (not attached to shadow)
    // #todo this could be a menu button component?
    this.menuLink = document.createElement("button");
    this.menuLink.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );

    let labelIcon = new SvgDefinition({ iconName: "triangle" });
    this.menuLink.appendChild(labelIcon);

    this.menuLinkTextSpan = document.createElement("span");
    this.menuLinkTextSpan.setAttribute("class", "px-2");

    this.labelLinkText = document.createTextNode("Sort Entries");
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
      "Select sort options for gallery entries."
    );
    titleDiv.appendChild(this._titleText);
    this.div.append(titleDiv);

    // Hide and showing the attribute div
    let xClose = document.createElement("nav-close");
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

    // Dont dupe the types
    this._shownTypes = {};

    // Keep track of values by TypeId
    this._selectionValues = {};
    this._sortOrderValues = {};
  }

  set titleEntityTypeName(val) {
    this._titleText.textContent = `Select sort options for gallery ${val}.`;
  }

  /**
   * Add a section of labels to main label div
   * @param {typeData} - object
   *
   */
  async add({ typeData, hideTypeName = false }) {
    let typeName = typeData.name ? typeData.name : "";
    if (this._shownTypes[typeName]) {
      // don't re-add this type...
      return false;
    } else {
      this._shownTypes[typeName] = true;
    }

    // Main labels box
    let labelsMain = document.createElement("div");
    labelsMain.setAttribute(
      "class",
      "entity-gallery-labels rounded-2 my-2 d-flex flex-row flex-justify-center flex-justify-between col-12"
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
      idText.textContent = `Type ID: ${typeData.id}`;
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

    /**
     * Label Choice
     */
    // If ok, create the checkbox list
    const labelsList = this.makeListFrom(typeData);

    const labelSelectionBox = document.createElement("enum-input");
    labelSelectionBox.setAttribute("name", `Sort By`);
    labelSelectionBox.choices = labelsList;
    styleDiv.appendChild(labelSelectionBox);

    const ascendingBool = document.createElement("bool-input");
    ascendingBool.setAttribute("name", "Sort Order");
    ascendingBool.setAttribute("on-text", "Asc");
    ascendingBool.setAttribute("off-text", "Desc");
    ascendingBool.setValue(true);
    styleDiv.appendChild(ascendingBool);

    this._selectionValues[typeData.id] = labelSelectionBox;
    this._sortOrderValues[typeData.id] = ascendingBool;

    labelSelectionBox.addEventListener("change", (e) => {
      this.dispatchEvent(
        new CustomEvent("sort-update", {
          detail: {
            sortType: this._getSortValue(typeData.id),
            sortProperty: e.target.getValue(),
            typeId: typeData.id,
          },
        })
      );
    });

    ascendingBool.addEventListener("change", (e) => {
      this.dispatchEvent(
        new CustomEvent("sort-update", {
          detail: {
            sortType: e.target.getValue(),
            sortProperty: this._getValue(typeData.id),
            typeId: typeData.id,
          },
        })
      );
    });

    this.div.appendChild(labelsMain);

    return labelsMain;
  }

  _getValue(typeId) {
    return this._selectionValues[typeId].getValue();
  }

  _setValue({ typeId, values }) {
    // # assumes values are in the accepted format for checkbox set
    //
    let valuesList = this._getValue(typeId);
    for (let box in valuesList) {
      if (values.contains(box.name)) {
        box.checked = true;
      }
    }
    return this._selectionValues[typeId].setValue(valuesList);
  }

  _getSortValue(typeId) {
    return this._sortOrderValues[typeId].getValue();
  }

  _setSortValue({ typeId, value }) {
    return this._sortOrderValues[typeId].setValue(value);
  }

  /*
   */
  makeListFrom(typeData) {
    this.newList = [];
    let tmpArray = [...typeData.attribute_types];

    // Show array by order, or alpha
    const sorted = tmpArray.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    // Default sort is always by asc ID
    this.newList.push({
      value: "ID",
      label: "ID",
    });

    // Create an array for checkbox set el
    for (let attr of sorted) {
      this.newList.push({
        value: attr.name,
        label: attr.name,
      });
    }

    return this.newList;
  }

  ascCheck(val1, val2) {
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
    return 0;
  }

  dscCheck(val1, val2) {
    if (val1 < val2) return 1;
    if (val1 > val2) return -1;
    return 0;
  }

  getFnCheck(sortType) {
    return sortType ? this.ascCheck : this.dscCheck;
  }

  _sortCards({ cards, slider, fnCheck, property }) {
    //  console.log(slider._cardElements[0].card.cardObj.id);
    cards.sort((el1, el2) => {
      //console.log(el1.card.cardObj.attributes);
      let el1Value = "";
      let el2Value = "";
      let el1Id = el1.card.cardObj.id;
      let el2Id = el2.card.cardObj.id;

      if (property !== "ID") {
        //if(el1.card.cardObj.attributes != {}) {
        el1Value =
          typeof el1.card.cardObj.attributes[property] != undefined
            ? el1.card.cardObj.attributes[property]
            : "not set";
        el2Value =
          el2.card.cardObj.attributes[property] != undefined
            ? el2.card.cardObj.attributes[property]
            : "not set";
        //}
      } else if (property == "ID") {
        el1Value = el1Id;
        el2Value = el2Id;
      }

      return fnCheck(el1Value, el2Value);
    });

    // console.log(slider._cardElements[0].card.cardObj.id);

    return cards;
  }
}

customElements.define("entity-gallery-sort", EntityGallerySort);
