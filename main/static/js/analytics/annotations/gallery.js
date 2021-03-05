class AnnotationsGallery extends EntityCardGallery {
    constructor() {
      super();
      /*
      * Add tools, headings and pagination for gallery here
      * 
      */
      this._main.setAttribute("class", "enitity-gallery px-6 py-4 mx-6 pb-3 mt-6");

      // Custom width for annotations gallery
      this.colSize = 200;
      this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`

      // Heading
      this._h3Text = document.createTextNode("All Annotations")
      this._h3.appendChild( this._h3Text );

      // Tools: Slider to resize images
      this._resizeCards = document.createElement('entity-card-resize');
      this._resizeCards._initGallery(this._ul, this.colSize);
      this._tools.appendChild( this._resizeCards );

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
      this._galleryCountText = document.createTextNode(`Showing 1-10 of ${cardList.total}`);
      this._p.appendChild(this._galleryCountText);

      // Populate the pagination
      this._paginator.init(cardList.total);

      // Append the cardList
      this.appendCardList(cardList.cards)
    }

    // Accepts a cardList object and appends each card to the page web component
    appendCardList(cardList){    
      for(let cardObj of cardList){
        let card = document.createElement("annotations-card");
        card.init( cardObj );
        
        // Resize Tool needs to change style within card on change
        this._resizeCards._slideInput.addEventListener("change", (e) => {
          let resizeValue = e.target.value;
          let resizeValuePerc = parseFloat( resizeValue / 100 );
          return card._img.style.height = `${130 * resizeValuePerc}px`;
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
    