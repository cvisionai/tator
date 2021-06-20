class EntityGalleryLabels extends TatorElement {
    constructor() {
      super();
    
      // clickable bar
      this._main = document.createElement("div");
      this._main.setAttribute("class", "entity-gallery-labels my-2 py-2 d-flex flex-row flex-justify-center flex-justify-between col-12");

      this._title = document.createElement("div");
      this._title.setAttribute("class", "entity-gallery-labels--title px-2 py-1 text-gray col-3");
      this._main.appendChild(this._title);

      this._count = document.createElement("span");
      this._count.setAttribute("class", "gallery-label-count clickable pr-2")
      this._title.appendChild(this._count);

      // Labels chooser
      this._labelDetails = document.createElement("details");
      this._labelDetails.setAttribute("class", "col-12");
      this._main.appendChild(this._labelDetails);

      this._clickableTitle = document.createElement("summary");
      this._clickableTitle.setAttribute("tooltip", "Labels");
      let labelIcon = new SvgDefinition({ iconName: "label-tag" });
      this._clickableTitle.appendChild(labelIcon);
      this._labelDetails.appendChild(this._clickableTitle);

      this.styleDiv = document.createElement("div");
      this.styleDiv.setAttribute("class", "entity-gallery-labels--checkbox-div");
      this._labelDetails.appendChild(this.styleDiv);

      let innerText = document.createTextNode("Choose Labels:");
      this.styleDiv.appendChild(innerText);

      this._details = document.createElement("div");
      this._details.setAttribute("class", "py-3");
      this._labelDetails.appendChild(this._details);

      // Hide this type
      // this._eyeHolder = document.createElement("div");
      // this._eyeHolder.setAttribute("tooltip", "Hide/Show");
      // this._eyeHolder.setAttribute("class", "col-4");
      // this._main.appendChild(this._eyeHolder);

      // this.openEyeIcon = new SvgDefinition({ iconName: "open-eye" });
      // this._eyeHolder.appendChild(this.openEyeIcon);

      // this.closedEyeIcon = new SvgDefinition({ iconName: "closed-eye" });
      // this.closedEyeIcon.setAttribute("class", "hidden");
      // this._eyeHolder.appendChild(this.closedEyeIcon);
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

    let count = typeData.total ? typeData.total : "";
    this._count.appendChild(document.createTextNode(count));

    // Stop here if we aren't ok after init
    if (gallery === null || typeof typeData == "undefined") return console.log("Error in label init");;

    /**
     * Label Choice
     */
    // If ok, create the checkbox list
    const checkboxList = this.makeListFrom(typeData);
    console.log(this.newList);

    const selectionBoxes = document.createElement("checkbox-set");
    selectionBoxes._colSize = "py-1 pr-2";
    selectionBoxes._inputDiv.setAttribute("class", "col-12");

    selectionBoxes.setValue(checkboxList);

    // Append to main box
    this.styleDiv.appendChild(selectionBoxes);

    selectionBoxes.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("labels-update", { detail: { value: e.target.getValue() } }));
    });

    /**
     * Hide/Show
     */
    this._count.addEventListener("click", (e) => {
      let off = !this._count.classList.contains("off");
      this._count.classList.toggle("off");
      this.dispatchEvent(new CustomEvent("hide-type-update", { detail: { off: off } }));
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