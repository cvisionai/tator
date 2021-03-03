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
      this._growCards._initGallery(this._ul);
      this._tools.appendChild( this._growCards );

    }

    show({
      filtered = false,
      cardList = {}
    }){
      // Populate the pagination
      if(filtered) {
        this._ul.innerHTML = "";
        this._h3Text = document.createTextNode("Filtered Annotations");
      } else {
        this._ul.innerHTML = "";
        this._h3Text = document.createTextNode("All Annotations");
      }
      this._paginator.init(cardList.total);
      this.appendCardList(cardList.cards)
    }

    appendCardList(cardList){
      for(let cardObj of cardList){
        let card = document.createElement("annotations-card");
        card.init( cardObj );
        
        // Grow Tool needs to change style within card on change
        this._growCards._slideInput.addEventListener("change", (e) => {
          let growValue = e.target.value;
          let growValuePerc = parseFloat( growValue / 100 );
          return card._img.style.height = `${130 * growValuePerc}px`;
        });

        this._ul.appendChild(card);
      }
      return this._ul;
    }

    // For pagination events
    updatePage(start, stop){
      
    }

}
    
customElements.define("annotations-gallery", AnnotationsGallery);
    