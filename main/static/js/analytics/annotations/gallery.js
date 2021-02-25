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
      filtered = false,
      cardList = []
    }){
      // Populate the pagination
      if(filtered) this._h3Text = document.createTextNode("Filtered Annotations");

      this.appendCardList(cardList)
    }

    appendCardList(cardList){
      for(let cardObj of cardList){
        let card = document.createElement("annotations-card");
        card.init( cardObj );

        this._ul.appendChild(card);
      }
      return this._ul;
    }

}
    
customElements.define("annotations-gallery", AnnotationsGallery);
    