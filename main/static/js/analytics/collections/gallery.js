class CollectionsGallery extends EntityCardSlideGallery {
   constructor() {
      super();
      /*
      * Add tools, headings and pagination for gallery here
      *
      */

      // // Custom width for annotations gallery
      // this.colSize = 4000;
      // this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`

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
      this._sliderContainer.appendChild(this.sliderList);

      this.slideCardData = document.createElement("collection-slide-card-data");

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the sliders information stored in _sliderElements
      //this._currentSliderIndexes = {};

      // Entity sliders aren't deleted. They are reused and hidden if not used.
      //this._sliderElements = [];
   }

   // Provide access to side panel for events
   init({
      panelContainer,
      pageModal,
      modelData,
      galleryContainer
   }) {
      this.panelContainer = panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = pageModal;
      this.modelData = modelData;
      this.galleryContainer = galleryContainer;

      try{
         this.slideCardData.init(this.modelData);
      } catch(e){
         console.log(e.description);
      }


      // Init slider, which inits inner cards
      if(this.modelData._states){
         if (this.modelData._states.total >= this.modelData.getMaxFetchCount()) {
            this._numFiles.textContent = `Too many results to preview. Displaying the first ${this.modelData._states.total} results.`
         } else {
            this._numFiles.textContent = `${this.modelData._states.total} Results`;

             if(this.modelData._states.length > 0){
               this._addSliders({ states: this.modelData._states });
             }
         }         
      }    
   }

   async _addSliders({ states }) {
      // Append the sliders
      for (let state of states) {
         //this._currentSliderIndexes = {}; // Clear the mapping from entity ID to card index
         state.cards = [];

         const slider = document.createElement("entity-gallery-slider");
         slider.entityFormChange = this.entityFormChange;
         slider.mediaFormChange = this.mediaFormChange;

         slider.init({
            panelContainer: this.panelContainer,
            pageModal: this.pageModal,
            modelData: this.modelData,
            slideCardData: this.slideCardData
         });

         const stateName = `${state.typeData.name} ID ${state.id} | Media ${state.media[0]} | Version ID ${state.version}`
         slider.setAttribute("title", stateName);

         const cardCount = document.createElement("p");
         slider.appendChild(cardCount);


         this.sliderList.appendChild(slider);

         // create the cards
         if(state.typeData.association === "Localization") {
            
            // Loc association should have list of loc Ids -- If none we should show State with Name and 0 Localizations
            if(state.localizations.length > 0){
               // Otherwise, get the localizations & make cards with slideCard
               for(let [i, loc] of state.localizations.entries()){
                  console.log(`Card data for loc ${loc}`);
                  let card = await this.slideCardData.makeCardList( { type: "Localization", id: loc } );
                  card.posText = `${i} of ${state.localizations.length}`;
                  console.log(card);

                  state.cards.push(card);               

                  // # todo -- if we store all the cards with the state object, we could show just the first 5, and then this new card event happens when they scroll?
                  // # todo -- or when they slide in this gallery we have an event to get more localizations.....
                  // start with just passing info from state to cards, then improve it

                  let newCardEvent = new CustomEvent('new-card', {detail : { cardData : card, cardIndex : i}} );
                  slider.dispatchEvent(newCardEvent);
               }

            }
            

            
         } else if (state.typeData.association === "Media") {
            // #TODO Not sure if this is how it would work for media
            // if(state.media.length > 0){
            //    // Get the media & make cards with slideCard
            //    state.cards =  await slideCard.makeCardList( "Media", state.media )
            // }

         }
         // } else {
         //    // #TODO
         // }        

         
      }


   }

   entityFormChange(e) {
    console.log(e.detail);

    // @TODO get accurate entity type (other than localization??)
    return this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Localization"
    });
  }

  mediaFormChange(e) {
    console.log(e.detail);

    return this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Media"
    });
  }

  async formChange({ type, id, values } = {}) {
    const result = await fetch(`/rest/${type}/${id}`, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const data = await result.json();
    let msg = "";
    if (result.ok) {  
      if (data.details && data.details.contains("Exception")) {
        msg = `Error: ${data.message}`
        Utilities.warningAlert(msg);
      } else {
        msg = `${data.message}`
        Utilities.showSuccessIcon(msg);
      }

    } else {
      if (data.message) {
        msg = `Error: ${data.message}`
      } else {
        msg = `Error saving ${type}.`
      }
      Utilities.warningAlert(msg, "#ff3e1d", false);
    }
  }


}

customElements.define("collections-gallery", CollectionsGallery);
