class EntityGallerySort extends TatorElement {
  constructor() {
    super();

    // clickable bar
    this._main = document.createElement("div");
    this._main.setAttribute("class", "entity-gallery-sort my-2 py-2 d-flex flex-row flex-justify-center flex-justify-between col-12");

    this._title = document.createElement("div");
    this._title.setAttribute("class", "entity-gallery-sort--title py-1 px-1 text-gray col-3");
    this._main.appendChild(this._title);

    // Sort chooser
    this._sortDetails = document.createElement("details");
    this._sortDetails.setAttribute("class", "col-12 py-3");
    this._main.appendChild(this._sortDetails);

    this._clickableTitle = document.createElement("summary");
    let sortIcon = new SvgDefinition({ iconName: "triangle" });
    sortIcon.setAttribute("tooltip", "Sort");
    this._clickableTitle.appendChild(sortIcon);
    this._sortDetails.appendChild(this._clickableTitle);

    let innerText = document.createTextNode("Show Attributes:");
    this._sortDetails.appendChild(innerText);

    this._details = document.createElement("div");
    this._details.setAttribute("class", "py-3");
    this._sortDetails.appendChild(this._details);
  }

  /**
   * @param {typeData} - object
   * @param {gallery} - element
   *
  */
  async init({ gallery, typeData }) {
    this._gallery = gallery;

    let text = typeData.name ? typeData.name : "";
    this._title.appendChild(document.createTextNode(text));

    // Stop here if we aren't ok after init
    if (gallery === null || typeof typeData == "undefined") return console.log("Error in sort init");;

    /**
     * Sort Choice
     */
    // If ok, create the checkbox list
    const checkboxList = this.makeListFrom(typeData);
    const selectionBoxes = document.createElement("checkbox-set");
    selectionBoxes._colSize = "px-3"
    selectionBoxes.setValue(checkboxList);

    // Append to main box
    this._details.appendChild(selectionBoxes);

    selectionBoxes.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("sort-update", { detail: { value: e.target.getValue() } }));
    });

    return this._shadow.appendChild(this._main);
  }

  /*
  */
  makeListFrom(typeData) {
    this.newList = [];
    for (let attr of typeData.attribute_types) {
      this.newList.push({
        id: encodeURI(attr.name),
        name: attr.name,
        checked: false
      });
    }
    return this.newList;
  }
}

customElements.define("entity-gallery-sort", EntityGallerySort);