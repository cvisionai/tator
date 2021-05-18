class CollectionsGallery extends EntityCardSlideGallery {
   constructor() {
      super();
      /*
      * Add tools, headings and pagination for gallery here
      *
      */

      // Custom width for annotations gallery
      this.colSize = 4000;
      this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`

      // Heading
      this._h3.hidden = true;
      //this._h3Text = document.createTextNode("All Annotations")
      //this._h3.appendChild( this._h3Text );

      const header = document.createElement("div");
      header.setAttribute("class", "project__header d-flex flex-items-center px-2");
      this._p.appendChild(header);

      this._name = document.createElement("h2");
      this._name.setAttribute("class", "h3 text-white"); //not a typo
      this._name.textContent = "Collections";
      header.appendChild(this._name);

      this._numFiles = document.createElement("span");
      this._numFiles.setAttribute("class", "text-gray px-2");
      header.appendChild(this._numFiles);

      // Count text
      //this._p.classList.add("col-3");
      //this._p.classList.add("px-2");

      this.panelContainer = null;

      this.sliderList = document.createElement("div");
      this._shadow.appendChild(this.sliderList);

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the sliders information stored in _sliderElements
      this._currentSliderIndexes = {};

      // Entity sliders aren't deleted. They are reused and hidden if not used.
      this._sliderElements = [];

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the card information stored in _cardElements
      this._currentCardIndexes = {};

      // Entity cards aren't deleted. They are reused and hidden if not used.
      this._cardElements = [];
   }

   // Provide access to side panel for events
   init({
      panelContainer,
      pageModal,
      modelData
   }) {
      this.panelContainer = panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = pageModal;
      this.modelData = modelData;


      // Init slider, which inits inner cards
      this._addSliders({ states: this.modelData._states });
   }

   _addSliders({ states }) {
      if (states.total >= this.modelData.getMaxFetchCount()) {
         this._numFiles.textContent = `Too many results to preview. Displaying the first ${states.total} results.`
      } else {
         this._numFiles.textContent = `${states.total} Results`;
      }

      // Append the sliders
      for (let state of states) {
         this._currentSliderIndexes = {}; // Clear the mapping from entity ID to card index

         const slider = document.createElement("entity-gallery-slider");
         slider.init({
            panelContainer: this.panelContainer,
            pageModal: this.pageModal,
            modelData: this.modelData,
            cardData: state
         });

         this.sliderList.appendChild(slider);
      }


   }


}

customElements.define("collections-gallery", CollectionsGallery);
