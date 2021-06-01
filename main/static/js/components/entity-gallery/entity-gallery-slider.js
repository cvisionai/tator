class EntityGallerySlider extends TatorElement {
   constructor() {
      super();

      this.main = document.createElement("div");
      this.main.setAttribute("class", "entity-gallery-slider clickable");
      this._shadow.appendChild(this.main);

      this._title = document.createElement("h2");
      this._title.setAttribute("class", "h2 entity-gallery-slider--title text-gray py-2");
      this.main.appendChild(this._title);

      this._count = document.createElement("p");
      this.main.appendChild(this._count);

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the card information stored in _cardElements
      this._currentCardIndexes = {};

      // Entity cards aren't deleted. They are reused and hidden if not used.
      this._cardElements = [];

      // card columns inside slider #todo finish styling
      this.colSize = 150;
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "enitity-gallery__ul")
      this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`
      this.main.appendChild(this._ul);

      this.numberOfDisplayedCards = 0;

   }

   init({
      panelContainer,
      pageModal,
      modelData,
      slideCardData,
      cardType
   }) {
      this.panelContainer = panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = pageModal;
      this.modelData = modelData;
      this.slideCardData = slideCardData;

      this.addEventListener("new-card", (e) => {
         console.log("new card event triggered! "+cardType+" ---> CARD OBJ below");
         console.log(e.detail.cardData[0]);
         this._addCard(e.detail.cardIndex, e.detail.cardData[0], cardType);
      });

      this.slideCardData.addEventListener("setSlideCardImage", (evt) => {
         this.updateCardImage(evt.detail.id, evt.detail.image);
      });

      // Update the card with the localization's associated media
      this.slideCardData.addEventListener("setSlideMedia", (evt) => {
         this.updateCardMedia(evt.detail.id, evt.detail.media);
      });
   }

static get observedAttributes() {
    return ["title", "count"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "title":
        this._title.textContent = newValue;
        break;
      case "count":
         this._count.textContent = newValue;
        break;
    }
  }

   /* Init function to show and populate gallery w/ pagination */
   show(sliderData) {
      console.log(sliderData);
      
      // Turn this dats into a card list

      // Hide all cards' panels and de-select
      for (let idx = 0; idx < this._cardElements.length; idx++) {
         this._cardElements[idx].card._deselectedCardAndPanel();
      }

      // Append the cardList
      this.makeCards(cardList.cards)
   }

   /**
    * Updates the specific card's thumbnail image
    * @param {integer} id
    * @param {image} image
    */
   updateCardImage(id, image) {
      if (id in this._currentCardIndexes) {
         var info = this._cardElements[this._currentCardIndexes[id]];
         info.card.setImage(image);
         // info.annotationPanel.setImage(image);
      }
   }

   /**
    * Updates the specific card's panel's media
    * @param {integer} id
    * @param {entityObject} media
    */
   updateCardMedia(id, media) {
      if (id in this._currentCardIndexes) {
         var info = this._cardElements[this._currentCardIndexes[id]];
         //#TODO Entity gallery panel needs to be updated so that it can display multiple
         //      entity attributes (e.g. media associated with the localization)
         //info.annotationPanel.setMedia(media);
      }
   }

   /**
    * Creates the card display in the gallery portion of the page using the provided
    * localization information
    *
    * @param {object} cardInfo
    */
   makeCards(cardInfo) {
      console.log(":::::::::cardInfo:::::::::::::")
      console.log(cardInfo);
      this._currentCardIndexes = {}; // Clear the mapping from entity ID to card index
      

      // Loop through all of the card entries and create a new card if needed. Otherwise
      // apply the card entry to an existing card.
      for (const [index, cardObj] of cardInfo.entries()) {
         this._addCard(index, cardObj);
      }

      // Hide unused cards
      if (this.numberOfDisplayedCards < this._cardElements.length) {
         const len = this._cardElements.length;
         for (let idx = len - 1; idx >= numberOfDisplayedCards; idx--) {
            this._cardElements[idx].card.style.display = "none";
         }
      }
   }

   openClosedPanel(e) {
      if (!this.panelContainer.open) this.panelContainer._toggleOpen();
      this.panelControls.locDataHandler(e.detail);
   }

   _addCard(index, cardObj, cardType){
         const newCard = index >= this._cardElements.length;
         let card;
         if (newCard) {
            card = document.createElement(cardType);
            console.log(card);
            // // Resize Tool needs to change style within card on change
            // this._resizeCards._slideInput.addEventListener("change", (evt) => {
            //    let resizeValue = evt.target.value;
            //    let resizeValuePerc = parseFloat(resizeValue / 100);
            //    return card._img.style.height = `${130 * resizeValuePerc}px`;
            // });

            // Inner div of side panel
            let annotationPanelDiv = document.createElement("div");
            annotationPanelDiv.setAttribute("class", "entity-panel--div hidden");
            this.panelContainer._shadow.appendChild(annotationPanelDiv);

            // Init a side panel that can be triggered from card
            let annotationPanel = document.createElement("entity-gallery-panel");
            annotationPanelDiv.appendChild(annotationPanel);

            // Listen for attribute changes
            annotationPanel.entityData.addEventListener("save", this.entityFormChange.bind(this));
            annotationPanel.mediaData.addEventListener("save", this.mediaFormChange.bind(this));

            // Update view
            annotationPanelDiv.addEventListener("unselected", () => {
               card._li.classList.remove("is-selected");
               annotationPanelDiv.classList.remove("is-selected");
               annotationPanelDiv.classList.add("hidden");
            });

            // Listen for all clicks on the document
            document.addEventListener('click', function (evt) {
               if (evt.target.tagName == "BODY" && card._li.classList.contains("is-selected")) {
                  card._li.click();
               }
            }, false);

            // Open panel if a card is clicked
            card.addEventListener("card-click", this.openClosedPanel.bind(this)); // open if panel is closed

            // // Update view
            // card._li.classList.toggle("aspect-true");
            // this.addEventListener("view-change", () => {
            //    card._li.classList.toggle("aspect-true");
            // });

            let cardInfo = {
               card: card,
               annotationPanel: annotationPanel,
               annotationPanelDiv: annotationPanelDiv
            };
            this._cardElements.push(cardInfo);

         } else {
            card = this._cardElements[index].card;
         }

         this._currentCardIndexes[cardObj.id] = index;

         // Initialize the card panel
         this._cardElements[index].annotationPanelDiv.setAttribute("data-loc-id", cardObj.id)
         this._cardElements[index].annotationPanel.init({
            cardObj
         });


         // Initialize Card
         console.log(cardObj);
         card.init({
            obj: cardObj,
            panelContainer: this.panelContainer,
            annotationPanelDiv: this._cardElements[index].annotationPanelDiv
         });

         card.style.display = "block";
         this.numberOfDisplayedCards += 1;

         // Add new card to the gallery div
         if (newCard) {
            this._ul.appendChild(card);
         }
   }



}

customElements.define("entity-gallery-slider", EntityGallerySlider);