class EntityGalleryLabels extends TatorElement {
    constructor() {
      super();
    
      // Hide panel by default
      this._main = document.createElement("details");
      this._main.setAttribute("class", "entity-gallery-labels px-3 py-2");

      //
      this._title = document.createElement("summary");
      this._main.appendChild(this._title);
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

    console.log("label init");
    console.log(typeData);

    // Stop here if we aren't ok after init
    if (gallery === null || typeof typeData == "undefined") return console.log("Error in label init");;

    // If ok, create the checkbox list
    const checkboxList = this.makeListFrom(typeData);
    const selectionBoxes = document.createElement("checkbox-set");
    selectionBoxes.setValue(checkboxList);

    // Append to main box
    this._main.appendChild(selectionBoxes);

    selectionBoxes.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("labels-update", { detail: { value: e.target.getValue() } }));
    });
          
    return this._shadow.appendChild(this._main);
  }

    /*
    */
  makeListFrom(typeData) {
    let newList = [];
    for (let attr of typeData.attribute_types) {
      newList.push({
        id: encodeURI(attr.name),
        name: attr.name,
        checked: false
      });
    }
    return newList;
  }
}
  
customElements.define("entity-gallery-labels", EntityGalleryLabels);