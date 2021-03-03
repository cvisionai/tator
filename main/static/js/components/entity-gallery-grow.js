class EntityCardGrow extends TatorElement {
    constructor() {
      super();

      this._sliderContainer = document.createElement("div");
      this._sliderContainer.setAttribute("class", "slidecontainer");
      this._shadow.appendChild(this._sliderContainer);

      this._slideInput = document.createElement("input");
      this._slideInput.setAttribute("type", "range");
      this._slideInput.setAttribute("min", "50");
      this._slideInput.setAttribute("max", "250");
      this._slideInput.setAttribute("value", "150");
      this._slideInput.setAttribute("class", "slider");
      this._slideInput.setAttribute("id", "growAnnotationImages");
      this._sliderContainer.appendChild(this._slideInput);

      // Init holder for gallery UL
      this._gallery = document.createElement("ul");
      
    }

    _initGallery(galleryUL){
      this._gallery = galleryUL
      

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

      return this._gallery.style.gridTemplateColumns = `repeat(auto-fill,minmax(${newMinMax}px,1fr))`;
    }
   
  }
  
  customElements.define("entity-card-grow", EntityCardGrow);  