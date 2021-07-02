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

    let labelLinkText = document.createTextNode("Choose Labels");
    this.menuLinkTextSpan.appendChild(labelLinkText);
 
    this.menuLink.appendChild(labelIcon);
    this.menuLink.appendChild(this.menuLinkTextSpan);

    // Label div container for lists
    this.div = document.createElement("div");
    this.div.setAttribute("class", "enitity-gallery__labels-div rounded-1 my-2 py-2 px-2 hidden");
    this._shadow.appendChild(this.div);

    // Hide and showing the attribute div
    let xClose = document.createElement("span");
    xClose.setAttribute("class", "clickable float-right px-2 py-2");
    xClose.innerHTML = "X";
    this.div.appendChild(xClose);

    // Listeners
    xClose.addEventListener("click", () => {
        this.div.classList.add("hidden");
    });

    this.menuLink.addEventListener("click", () => {
      console.log("Menu link clicked!")
      this.div.classList.toggle("hidden");
    });
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

    // Create an array for checkbox set el
    for (let attr of sorted) {
      this.newList.push({
        id: encodeURI(attr.name),
        name: attr.name,
        checked: false
      });
    }

    return this.newList;
  }

  /**
   * Add a section of labels to main label div
   * @param {typeData} - object
   * @param {gallery} - element
   *
  */
  async add({ gallery, typeData }){
    // Main labels box
    let labelsMain = document.createElement("div");
    labelsMain.setAttribute("class", "entity-gallery-labels rounded-2 my-2 d-flex flex-row flex-justify-center flex-justify-between col-12");

    let _title = document.createElement("div");
    _title.setAttribute("class", "entity-gallery-labels--title py-3 px-2 col-2");
    labelsMain.appendChild(_title);

    // Labels details with checkboxes
    let _labelDetails = document.createElement("div");
    _labelDetails.setAttribute("class", "float-right col-10");
    labelsMain.appendChild(_labelDetails);

    // Style div for checkbox set
    let styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "entity-gallery-labels--checkbox-div px-3 py-1 rounded-2");
    _labelDetails.appendChild(styleDiv);

    let typeName = typeData.name ? typeData.name : "";
    _title.appendChild(document.createTextNode(typeName));

    // Stop here if we aren't ok after init
    if (gallery === null || typeof typeData == "undefined") {
      return console.log("Error in label init");
    }

    /**
     * Label Choice
     */
    // If ok, create the checkbox list
    const checkboxList = this.makeListFrom(typeData);

    const selectionBoxes = document.createElement("checkbox-set");
    selectionBoxes._colSize = "col-4 py-1 pr-2";
    selectionBoxes._inputDiv.setAttribute("class", "d-flex flex-row flex-wrap col-8");

    selectionBoxes.setValue(checkboxList);

    // Append to main box
    styleDiv.appendChild(selectionBoxes);

    selectionBoxes.addEventListener("change", (e) => {
      console.log("Update labels!");
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
}

customElements.define("entity-gallery-labels", EntityGalleryLabels);