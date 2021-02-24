class AnnotationsGallery extends EntityCardGallery {
    constructor() {
      super();
      /*
      * Add tools, headings and pagination for gallery here
      *
      */

      // Heading
      this._h3Text = document.createTextNode("All Annotations")
      this._h3.appendChild( this._h3Text );

      // Tools: Slider to grow or shrink images
      this._growCards = document.createElement('entity-card-grow');
      this._tools.appendChild( this._growCards );

    }

    init({
      filtered = false
    }){
      // Populate the pagination
      if(filtered) this._h3Text = document.createTextNode("Filtered Annotations");
    }

}
    
customElements.define("annotations-gallery", AnnotationsGallery);
    