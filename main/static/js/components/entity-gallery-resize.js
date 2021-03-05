class EntityCardResize extends TatorElement {
  constructor() {
    super();

    // Slide Range container for resize range
    this._sliderContainer = document.createElement("div");
    this._sliderContainer.setAttribute("class", "entity-resize");
    this._shadow.appendChild(this._sliderContainer);

    // Container Label for spans - / +
    this._slideInputLabel = document.createElement("label");
    this._slideInputLabel.setAttribute("for", "resizeAnnotationImages");
    this._sliderContainer.appendChild(this._slideInputLabel);

    // Resize label text
    this._resizeLabel = document.createElement("span");
    this._resizeLabel.setAttribute("class", "text-gray entity-resize__label f2");
    let resize = document.createTextNode("Resize ");
    this._resizeLabel.appendChild(resize);
    this._slideInputLabel.appendChild(this._resizeLabel);

    // Minus span
    this._minusTextSpan = document.createElement("span");
    this._minusTextSpan.setAttribute("class", "text-top text-gray");
    this._minusText = document.createTextNode("-");
    this._minusTextSpan.appendChild(this._minusText);
    this._slideInputLabel.appendChild(this._minusTextSpan);

    // Range element min: 50, max: 250
    this._slideInput = document.createElement("input");
    this._slideInput.setAttribute("type", "range");
    this._slideInput.setAttribute("min", "50");
    this._slideInput.setAttribute("max", "250");
    this._slideInput.setAttribute("value", "150");
    this._slideInput.setAttribute("class", "slider");
    this._slideInput.setAttribute("id", "resizeAnnotationImages");
    this._slideInputLabel.appendChild(this._slideInput);

    // Plus span
    this._plusTextSpan = document.createElement("span");
    this._plusTextSpan.setAttribute("class", "text-top text-gray");
    this._plusText = document.createTextNode("+");
    this._plusTextSpan.appendChild(this._plusText);
    this._slideInputLabel.appendChild(this._plusTextSpan);

    // Init THIS var for gallery UL
    this._gallery = document.createElement("ul");

    // Allow label clicks to +/-
    this._minusTextSpan.addEventListener("click", this.handlerMinusClick.bind(this));
    this._plusTextSpan.addEventListener("click", this.handlerPlusClick.bind(this));
  
    // This can be overriden, default column width for start
    this.defaultMinMax = 272;

  }

  _initGallery(galleryUL, colWidth = 272) {
    // Setup this gallery from parent for use in handler
    this._gallery = galleryUL
    this.defaultMinMax = colWidth;

    // Listen to slide changes on init
    this._slideInput.addEventListener("change", this._rangeHandler.bind(this));
  }

  _rangeHandler(e) {
    let resizeValue = e.target.value;
    let resizeValuePerc = parseFloat(resizeValue / 100);

    // Gallery UL by default
    // * grid-template-columns: repeat(auto-fill,minmax(272px,1fr));
    this.newMinMax = this.defaultMinMax * resizeValuePerc;

    // Img height by default .project__file img
    // height: 130px - Changed in Gallery
    // handled in GALLERY with access to card element

    return this.setGalleryTo(this.newMinMax);
  }

  setGalleryTo(size){
    console.log("Gallery resized");
    return this._gallery.style.gridTemplateColumns = `repeat(auto-fill,minmax(${size}px,1fr))`;
  }

  handlerMinusClick() {
    let smaller = Number(this._slideInput.value) - 10;
    if(smaller >= this._slideInput.min) return this._slideInput.value = smaller ;
    return this._slideInput.value = this._slideInput.min;
  }

  handlerPlusClick() {
    let bigger = Number(this._slideInput.value) + 10;
    if(bigger <= this._slideInput.max) return this._slideInput.value = bigger ;
    return this._slideInput.value = this._slideInput.max;
  }

}

customElements.define("entity-card-resize", EntityCardResize);  