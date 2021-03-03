class EntityCardGrow extends TatorElement {
    constructor() {
      super();

      // Slide Range container for grow range
      this._sliderContainer = document.createElement("div");
      this._sliderContainer.setAttribute("class", "slidecontainer");
      this._shadow.appendChild(this._sliderContainer);

      // Container Label for spans - / +
      this._slideInputLabel = document.createElement("label");
      this._slideInputLabel.setAttribute("for", "growAnnotationImages");

      // Minus span
      this._minusTextSpan = document.createElement("span");
      this._minusTextSpan.setAttribute("class","text-top");
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
      this._slideInput.setAttribute("id", "growAnnotationImages");
      this._sliderContainer.appendChild(this._slideInput);

      // Plus span
      this._plusTextSpan = document.createElement("span");
      this._plusTextSpan.setAttribute("class","text-top");
      this._plusText = document.createTextNode("+");
      this._plusTextSpan.appendChild(this._plusText);
      this._slideInputLabel.appendChild(this._plusTextSpan);

      // Init THIS var for gallery UL
      this._gallery = document.createElement("ul");
      
    }

    _initGallery(galleryUL){
      // Setup this gallery from parent for use in handler
      this._gallery = galleryUL
      
      // Listen to slide changes on init
      this._slideInput.addEventListener("change", this._rangeHandler.bind(this));
    }

    _rangeHandler(e){
      let growValue = e.target.value;
      let growValuePerc = parseFloat( growValue / 100 );

      // Gallery UL by default
      // * grid-template-columns: repeat(auto-fill,minmax(272px,1fr));
      const defaultMinMax = 272;
      let newMinMax =  defaultMinMax * growValuePerc;

      //Img height by default .project__file img
      // height: 130px - Changed in Gallery
      // handled in GALLERY with access to card element

      return this._gallery.style.gridTemplateColumns = `repeat(auto-fill,minmax(${newMinMax}px,1fr))`;
    }
   
  }
  
  customElements.define("entity-card-grow", EntityCardGrow);  