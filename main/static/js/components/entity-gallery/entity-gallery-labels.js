class EntityGalleryLabels extends TatorElement {
  constructor() {
    super();

    // clickable bar
    this._main = document.createElement("div");
    this._main.setAttribute("class", "entity-gallery-labels my-2 d-flex flex-row flex-justify-center flex-justify-between col-12");

    this._title = document.createElement("div");
    this._title.setAttribute("class", "entity-gallery-labels--title py-2 px-2 col-2");
    this._main.appendChild(this._title);

    // Labels chooser
    this._labelDetails = document.createElement("div");
    this._labelDetails.setAttribute("class", "float-right col-10");
    this._main.appendChild(this._labelDetails);

    // this._clickableTitle = document.createElement("div");
    // //this._clickableTitle.setAttribute("tooltip", "Labels");
    // let labelIcon = new SvgDefinition({ iconName: "label-tag" });
    // this._clickableTitle.appendChild(labelIcon);
    // this._labelDetails.appendChild(this._clickableTitle);

    this.styleDiv = document.createElement("div");
    this.styleDiv.setAttribute("class", "entity-gallery-labels--checkbox-div px-3 py-1 rounded-2");
    this._labelDetails.appendChild(this.styleDiv);

    // let innerText = document.createTextNode("Choose Labels:");
    // this.styleDiv.appendChild(innerText);


    // this._clickableTitle.addEventListener("click", (e) => {
    //   this.styleDiv.classList.toggle("hidden");
    //   this._clickableTitle.classList.toggle("active");
    // });
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
    if (gallery === null || typeof typeData == "undefined") return console.log("Error in label init");;

    /**
     * Label Choice
     */
    // If ok, create the checkbox list
    const checkboxList = this.makeListFrom(typeData);

    const selectionBoxes = document.createElement("checkbox-set");
    selectionBoxes._colSize = "col-4 py-1 pr-2";
    //selectionBoxes._inputDiv.setAttribute("class", "col-12");

    selectionBoxes.setValue(checkboxList);

    // Append to main box
    this.styleDiv.appendChild(selectionBoxes);

    selectionBoxes.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("labels-update", { detail: { value: e.target.getValue() } }));
    });

    return this._shadow.appendChild(this._main);
  }

  /*
  */
  makeListFrom(typeData) {
    this.newList = [];
    let tmpArray = [...typeData.attribute_types];
    for (let attr of tmpArray) {
      this.newList.push({
        id: encodeURI(attr.name),
        name: attr.name,
        checked: false
      });
    }
    return this.newList;
  }
}

customElements.define("entity-gallery-labels", EntityGalleryLabels);