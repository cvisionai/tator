class EntityGalleryLabels extends TatorElement {
  constructor() {
    super();

    // Element used for menu bar (not attached to shadow)
    // #todo this could be a menu button component?
    this.menuLink = document.createElement("button");
    this.menuLink.setAttribute("class", "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center")

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
    this.div.setAttribute("class", "enitity-gallery__labels-div rounded-1 my-2 py-2 px-2 hidden");
    this._shadow.appendChild(this.div);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "text-gray d-flex flex-row flex-items-center f2 py-2 px-2");
    this._titleText = document.createTextNode("Select labels to display in the gallery");
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
  }

  set titleEntityTypeName(val) {
    this._titleText.textContent = `Select ${val} labels to display in the gallery`;
  }

  /**
   * Add a section of labels to main label div
   * @param {typeData} - object
   *
  */
  async add({ typeData, hideTypeName = false, checkedFirst = null }) {
    console.log(typeData);
    let typeName = typeData.name ? typeData.name : "";
    if(this._shownTypes[typeData.id]) {
      // don't re-add this type...
      return false;
    } else {
      this._shownTypes[typeData.id] = true;
    }

    // Main labels box
    let labelsMain = document.createElement("div");
    labelsMain.setAttribute("class", "entity-gallery-labels rounded-2 my-2 d-flex flex-row flex-justify-center flex-justify-between col-12");

    if(!hideTypeName){
      let _title = document.createElement("div");
      _title.setAttribute("class", "entity-gallery-labels--title py-3 px-2 col-3");
      _title.appendChild(document.createTextNode(`${typeName}`));

      if (typeof typeData.description !== "undefined" && typeData.description !== "") {
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
    styleDiv.setAttribute("class", "entity-gallery-labels--checkbox-div px-3 py-1 rounded-2");
    _labelDetails.appendChild(styleDiv);

    /**
     * Label Choice
     */
    // If ok, create the checkbox list
    const checkboxList = this.makeListFrom(typeData, checkedFirst);

    const selectionBoxes = document.createElement("checkbox-set");
    selectionBoxes._colSize = "py-1 pr-2";
    selectionBoxes._inputDiv.setAttribute("class", "d-flex flex-row flex-wrap col-12");
    selectionBoxes.setValue(checkboxList);

    // Save to refer to in get/set later
    this._selectionValues[typeData.id] = selectionBoxes;

    // Append to main box
    styleDiv.appendChild(selectionBoxes);

    selectionBoxes.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("labels-update", {
          detail: {
              value: e.target.getValue(),
              typeId: typeData.id
            }
        }));
    });

    this.div.appendChild(labelsMain)

    return labelsMain;
  }

  _getValue(typeId){
    return this._selectionValues[typeId].getValue();
  }

  _setValue({ typeId, values }){
    // # assumes values are in the accepted format for checkbox set
    //
    let valuesList = this._getValue(typeId);
    for(let box in valuesList){
      if(values.contains(box.name)){
        box.checked = true;
      }
    }
    return this._selectionValues[typeId].setValue(valuesList);
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
  makeListFrom(typeData, checkedFirst) {
    this.newList = [];
    let tmpArray = [...typeData.attribute_types];

    // Non-hidden attributes (ie order >= 0))
    let nonHiddenAttrs = [];
    let hiddenAttrs = [];
    for (let attr of typeData.attribute_types) {
      if (attr.order >= 0) {
        nonHiddenAttrs.push(attr);
      }
      else {
        hiddenAttrs.push(attr);
      }
    }

    // Show array by order, or alpha
    const sorted = nonHiddenAttrs.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    sorted.push(...hiddenAttrs);

    // Create an array for checkbox set el
    let checked = checkedFirst == null ? false : checkedFirst;
    for (let attr of sorted) {
      this.newList.push({
        id: encodeURI(attr.name),
        name: attr.name,
        checked
      });

      // reset checked - only check the first one
      if(checked) checked = false;
    }
    return this.newList;
  }
}

customElements.define("entity-gallery-labels", EntityGalleryLabels);