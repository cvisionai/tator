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

      // this._name = document.createElement("h2");
      // this._name.setAttribute("class", "h3 text-white"); //not a typo
      // this._name.textContent = "Collections";
      // header.appendChild(this._name);

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
      this._sliderElements = [];
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

      // Possibly remove this so we can have navigation controls
      // this.panelContainer._panelTop._topBarArrow.hidden = true;
      // this.panelContainer._panelTop.panelNav.init();

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
            const total = this.modelData._states.total;
            let totalText = "";

            if(total > (this.modelData._states.paginationStop - this.modelData._states.paginationStart) ){
               totalText = `Showing ${this.modelData._states.paginationStart} to ${this.modelData._states.paginationStop} of ${total} of  Collections`
            } else {
               totalText = `Showing ${total} Collections`
            }
            this._numFiles.textContent = totalText;

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
         let counter = 0;

         const slider = document.createElement("entity-gallery-slider");
         slider.entityFormChange = this.entityFormChange.bind(this);
         slider.mediaFormChange = this.mediaFormChange.bind(this);

         slider.init({
            panelContainer: this.panelContainer,
            pageModal: this.pageModal,
            modelData: this.modelData,
            slideCardData: this.slideCardData,
            cardType: "collections-card"
         });

         const stateName = `ID ${state.id}`
         slider.setAttribute("title", stateName);

         const cardCount = document.createElement("p");
         slider.appendChild(cardCount);

         this._sliderElements.push(slider);
         this.sliderList.appendChild(slider);

         // tell the panel about these cards
         // this.panelContainer._panelTop.panelNav.pushNavData({
         //    sliderIndex: (this.sliderList.length - 1),
         //    entityList: slider._cardElements
         // });

         slider.addEventListener("click", (e) => {
            if (!slider.main.classList.contains("active")) {
               //when it is clicked, set main to active for this, and remove for others
               for(let s of this._sliderElements) {
                  s.main.classList.remove("active");
                  const inactiveEvent = new Event("slider-inactive");
                  s.dispatchEvent(inactiveEvent);
               }
               slider.main.classList.add("active");
               const activeEvent = new CustomEvent("slider-active", { detail: { target: e.target } });
               slider.dispatchEvent(activeEvent);
            }
         });

         // create the cards
         const galleryList = state.typeData.association === "Localization" ? state.localizations : state.media;
         if(galleryList) {
            const totalList = galleryList.length;
            // Loc association should have list of loc Ids -- If none we should show State with Name and 0 Localizations
            if(totalList > 0){
               // Otherwise, get the localizations & make cards with slideCard
               for(let id of galleryList){
                  const cardInitData = { type : state.typeData.association, id }; 
                  const card = await this.slideCardData.makeCardList( cardInitData );
                  
                  if(card){
                     card[0].posText = `${counter+1} of ${totalList}`;
                     card[0]["state-type"] = state.typeData.association;
                     card[0].state = state;
                     //states.cards.push(card);

                     let newCardEvent = new CustomEvent('new-card', {detail : { cardData : card, cardIndex : counter}} );
                     slider.dispatchEvent(newCardEvent);
                     counter++;
                  }
               }
            }    
         }
     
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
