class EntityCardGrow extends TatorElement {
    constructor() {
      super();

      this._sliderContainer = document.createElement("div");
      this._sliderContainer.setAttribute("class", "slidecontainer");
      this._shadow.appendChild(this._sliderContainer);

      this._slideInput = document.createElement("input");
      this._slideInput.setAttribute("type", "range");
      this._slideInput.setAttribute("min", "1");
      this._slideInput.setAttribute("max", "100");
      this._slideInput.setAttribute("value", "50");
      this._slideInput.setAttribute("class", "slider");
      this._slideInput.setAttribute("id", "growAnnotationImages");
      this._sliderContainer.appendChild(this._slideInput);
      
    }
   
  }
  
  customElements.define("entity-card-grow", EntityCardGrow);  