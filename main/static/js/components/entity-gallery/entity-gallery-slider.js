class EntityGallerySlider extends TatorElement {
   constructor() {
      super();

   }

   init({
      cardData,
      panelContainer,
      pageModal,
      modelData
   }) {
      this.cardData = cardData;
      this.panelContainer = panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = pageModal;
      this.modelData = modelData;

      console.log("Made it to SLIDER with data:::::::::::");
      console.log(cardData);
      //this.show(this.cardData)
   }

   /* Init function to show and populate gallery w/ pagination */
   show(cardList) {
      if (cardList.total >= this.modelData.getMaxFetchCount()) {
         this._numFiles.textContent = `Too many results to preview. Displaying the first ${cardList.total} results.`
      }
      else {
         this._numFiles.textContent = `${cardList.total} Results`;
      }

      // Only populate the pagination when the dataset has changed (and therefore the pagination
      // needs to be reinitialized)
      if (cardList.paginationState.init) {
         this._paginator.init(cardList.total, cardList.paginationState);
         this._paginator_top.init(cardList.total, cardList.paginationState);
      }

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

      this._currentCardIndexes = {}; // Clear the mapping from entity ID to card index
      var numberOfDisplayedCards = 0;

      // Loop through all of the card entries and create a new card if needed. Otherwise
      // apply the card entry to an existing card.
      for (const [index, cardObj] of cardInfo.entries()) {
         const newCard = index >= this._cardElements.length;
         let card;
         if (newCard) {
            card = document.createElement("annotations-card");

            // Resize Tool needs to change style within card on change
            this._resizeCards._slideInput.addEventListener("change", (evt) => {
               let resizeValue = evt.target.value;
               let resizeValuePerc = parseFloat(resizeValue / 100);
               return card._img.style.height = `${130 * resizeValuePerc}px`;
            });

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

            // Update view
            card._li.classList.toggle("aspect-true");
            this.addEventListener("view-change", () => {
               card._li.classList.toggle("aspect-true");
            });

            cardInfo = {
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
         card.init({
            obj: cardObj,
            panelContainer: this.panelContainer,
            annotationPanelDiv: this._cardElements[index].annotationPanelDiv
         });

         card.style.display = "block";
         numberOfDisplayedCards += 1;

         // Add new card to the gallery div
         if (newCard) {
            this._ul.appendChild(card);
         }
      }

      // Hide unused cards
      if (numberOfDisplayedCards < this._cardElements.length) {
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



}

customElements.define("entity-gallery-slider", EntityGallerySlider);