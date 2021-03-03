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

    /* Init function to show and populate gallery w/ pagination */
    show({
      filtered = false,
      cardList = {}
    }){
      // Update Heading
      if(filtered) {
        this._ul.innerHTML = "";
        this._h3Text = document.createTextNode("Filtered Annotations");
      } else {
        this._ul.innerHTML = "";
        this._h3Text = document.createTextNode("All Annotations");
      }

      //Update descriptive count text
      this._galleryCountText = document.createTextNode(`Showing 1-50 of ${cardList.total}`);
      this._p.appendChild(this._galleryCountText);

      // Populate the pagination
      this._paginator_top.init(cardList.total);
      this._paginator.init(cardList.total);

      // Append the cardList
      this.appendCardList(cardList.cards)
    }

    // Accepts a cardList object and appends each card to the page web component
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
      this._ul.innerHTML = "";
      return appendCardList(cardList);
    }

}
    
customElements.define("annotations-gallery", AnnotationsGallery);
    