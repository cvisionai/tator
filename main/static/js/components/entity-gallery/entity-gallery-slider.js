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

      this.styleDiv = document.createElement("div");
      this.styleDiv.setAttribute("class", "entity-gallery-slider__ul-container");
      this.main.appendChild(this.styleDiv);

      // card columns inside slider #todo finish styling
      //this.colSize = 150;
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "enitity-gallery-slider__ul py-1")
      //this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`
      this.styleDiv.appendChild(this._ul);

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

      // console.log("::::::::::::::::::slideCardData");
      // console.log(slideCardData);

      this.addEventListener("slider-active", (e) => {
         //console.log("Slider chosen, show first card");
         this._ul.classList.add("open");

         for (let idx = 0; idx < this._cardElements.length; idx++) {
            // if they directly chose a card, that's great stop there....
            let listEl = this._cardElements[idx].card._li;
            if (listEl.classList.contains("is-selected")) {
               return false;
            }

         }
         // if you got here, they just clicked the slider box, select the first card
         if (this._cardElements[0] && this._cardElements[0].card) {
            return this._cardElements[0].card.click();
         }
      });

      this.addEventListener("slider-inactive", (e) => {
         //console.log("Slider inactive hide cards");
         this._ul.classList.remove("open");
         // Hide all cards' panels and de-select
         // for (let idx = 0; idx < this._cardElements.length; idx++) {
         //    this._cardElements[idx].card._deselectedCardAndPanel();
         // }
      });

      this.addEventListener("new-card", (e) => {
         console.log("New card event triggered! Index "+e.detail.cardIndex+" Data:");
         console.log(e.detail.cardData[0]);
         this._addCard(e.detail.cardIndex, e.detail.cardData[0], cardType);
      });

      this.slideCardData.addEventListener("setSlideCardImage", this.updateCardImage.bind(this));

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
   updateCardImage(e) {
      // We need to check if this slider has the card we heard about...
      const id = e.detail.id;
      var index = this._currentCardIndexes[id]
      var info = this._cardElements[index];

      if (typeof this._currentCardIndexes[id] !== "undefined" && typeof info !== "undefined") {
         const image = e.detail.image;
         info.card.setImage(image);
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
      
      // Loop through all of the card entries and create a new card if needed. Otherwise
      // apply the card entry to an existing card.
      //for (const [index, cardObj] of cardInfo.entries()) {
         this._addCard(index, cardObj);
      //}

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

            // when lock changes set attribute on forms to "View Only" / "Can Edit"
            this.panelContainer.addEventListener("permission-update", (e) => {
               annotationPanel.entityData.setAttribute("permission", e.detail.permissionValue);
               annotationPanel.mediaData.setAttribute("permission", e.detail.permissionValue);
            });

            // Update view unselected card panel
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


            if(cardObj.image) {
               annotationPanel.localizationType = false;
               annotationPanel.setImage(cardObj.image);
               if(cardObj.thumbnail) {
                  card.setImageStatic(cardObj.thumbnail);
               } else {
                  card.setImageStatic(cardObj.image);
               }
            }



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
         this.numberOfDisplayedCards += 1;

         // Add new card to the gallery div
         if (newCard) {
            this._ul.appendChild(card);
         }
   }



}

customElements.define("entity-gallery-slider", EntityGallerySlider);