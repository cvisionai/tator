class EntityGallerySlider extends TatorElement {
   constructor() {
      super();

      this.main = document.createElement("div");
      this.main.setAttribute("class", "entity-gallery-slider mb-4 clickable");
      this._shadow.appendChild(this.main);


      this.topDiv = document.createElement("div");
      this.topDiv.setAttribute("class", "d-flex flex-row flex-items-center");
      this.main.appendChild(this.topDiv);

      this._labels = document.createElement("div");
      this._labels.setAttribute("class", "entity-gallery-slider--labels  d-flex d-row h3 text-normal text-gray py-2");
      this.topDiv.appendChild(this._labels);

      this._title = document.createElement("h2");
      this._title.setAttribute("class", "h3 entity-gallery-slider--title text-gray");
      this._labels.appendChild(this._title);

      // Gallery Top Tools and info
      this._tools = document.createElement("div");
      this._tools.setAttribute("class", "enitity-gallery__tools py-2 d-flex flex-justify-between");
      this.main.appendChild(this._tools);

      this._count = document.createElement("p");
      this._count.setAttribute("class", "text-gray py-1 pb-2")
      this._tools.appendChild(this._count);

      this.loadAllTeaser = document.createElement("span");
      this.loadAllTeaser.setAttribute("class", "entity-gallery-slider--load-more text-gray"); //
      let text = document.createTextNode("Loading...");
      this.loadAllTeaser.appendChild(text);

      this._tools.appendChild(this.loadAllTeaser);

      // Sort
      // this._attributeSortDiv = document.createElement("div");
      // this._attributeSortDiv.setAttribute("class", "enitity-gallery__sort-div py-1");
      // this._tools.appendChild(this._attributeSortDiv);

      // Labels Picker
      // this._attributeLabelsDiv = document.createElement("div");
      // this._attributeLabelsDiv.setAttribute("class", "enitity-gallery__labels-div py-1");
      // this._tools.appendChild(this._attributeLabelsDiv);

      // Tools: Slider to resize images
      this.sliderContainer = document.createElement("div");
      this.sliderContainer.setAttribute("class", "entity-card-resize col-4")
      this._resizeCards = document.createElement('entity-card-resize');
      this.sliderContainer.appendChild(this._resizeCards);
      this._tools.appendChild(this.sliderContainer);

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the card information stored in _cardElements
      this._currentCardIndexes = {};

      // Entity cards aren't deleted. They are reused and hidden if not used.
      this._cardElements = [];

      // Gallery Top Pagination Holder
      this._topNav = document.createElement("div");
      this._topNav.setAttribute("class", "enitity-gallery-slider__nav py-2 d-flex flex-justify-center");
      this.main.appendChild(this._topNav);

      // Div to contain slider cards styling
      this.styleDiv = document.createElement("div");
      this.styleDiv.setAttribute("class", "entity-gallery-slider__ul-container");
      this.main.appendChild(this.styleDiv);

      // Gallery Bottom Pagination Holder
      this._bottomNav = document.createElement("div");
      this._bottomNav.setAttribute("class", "enitity-gallery-slider__nav py-2 d-flex flex-justify-center");
      this.main.appendChild(this._bottomNav);






      // card columns inside slider #todo finish styling
      this.colSize = 150;
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "enitity-gallery-slider__ul py-1")
      //this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`
      this.styleDiv.appendChild(this._ul);

      this._resizeCards._initGallery(this._ul, this.colSize);



      // this.loadingText = document.createElement("span");
      // this.loadingText.setAttribute("class", "entity-gallery-slider--loading"); //
      // let text2 = document.createTextNode("More Tracks Loading...");
      // this.loadingText.appendChild(text2);
      // this._shadow.appendChild(this.loadingText);

      this.numberOfDisplayedCards = 0;
      this.attributeLabelEls = [];
      this._preloadedImages = [];
   }

   init({
      panelContainer,
      pageModal,
      modelData,
      slideCardData,
      cardType,
      attributes,
      state
   }) {
      this.panelContainer = panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = pageModal;
      this.modelData = modelData;
      this.slideCardData = slideCardData;
      this.state = state;

      this.addEventListener("slider-active", () => {
         this.main.classList.add("active");
         this.styleDiv.classList.add("open");
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
         this.main.classList.remove("active");
         this.styleDiv.classList.remove("open");
         this._ul.classList.remove("open");
      });

      this.addEventListener("new-card", (e) => {
         //console.log("New card event triggered! Index "+e.detail.cardIndex+" Data:");
         //console.log(e.detail.cardData[0]);
         this._addCard(e.detail.cardIndex, e.detail.cardData[0], cardType);
      });

      this.slideCardData.addEventListener("setSlideCardImage", this.updateCardImage.bind(this));

      // Update the card with the localization's associated media
      this.slideCardData.addEventListener("setSlideMedia", (evt) => {
         this.updateCardMedia(evt.detail.id, evt.detail.media);
      });


      if (this.modelData.currenHiddenType.includes[state.meta]) {
         let hiddenHTML = `<div class="hidden-type-html col-12">[ ${s.title} Hidden ]</div>`;
         var helper = document.createElement('div');
         helper.innerHTML = hiddenHTML;
         this.classList.add("hidden");
         this.after(helper);
      }


      const compareAttr = [...this.state.typeData.attribute_types];

      for (let attr in attributes) {
         //console.log(`Adding ${attr} to ${this.id}`)

         if (compareAttr) {
            let index = compareAttr.indexOf(attr);
            compareAttr.splice(index, 1); // test
         }

         let attributeLabel = document.createElement("div");
         attributeLabel.setAttribute("id", encodeURI(attr));

         // reapply any label preferences
         if (this.modelData.currenLabelValues && this.modelData.currenLabelValues[state.meta]) {
            const currentLabels = this.modelData.currenLabelValues[state.meta];
            if (currentLabels.length === 0 || !currentLabels.includes(attr)) {
               attributeLabel.setAttribute("class", "hidden");
            }
         } else {
            attributeLabel.setAttribute("class", "hidden");
         }

         // let typeId = statesInfo.meta;
         // this.labelsUpdate({ typeId, labelValues: });
         // if (this.modelData.currenHiddenType.includes(typeId)) {
         //    this.hideThisType({ typeId, hidden: true });
         // }

         let seperator = document.createElement("span");
         seperator.setAttribute("class", "px-2")
         let sep = document.createTextNode("|");
         seperator.appendChild(sep);
         attributeLabel.appendChild(seperator)

         let text = document.createTextNode(`${attr}: ${attributes[attr]}`);
         attributeLabel.appendChild(text);

         this._labels.appendChild(attributeLabel);
         this.attributeLabelEls.push(attributeLabel);
      }

      // #todo test
      if (compareAttr && compareAttr.length > 0) {
         for (let attr in compareAttr) {
            //console.log(`Adding (compared) ${attr} to ${this.id}`)

            let attributeLabel = document.createElement("div");
            attributeLabel.setAttribute("class", "hidden");
            attributeLabel.setAttribute("id", encodeURI(attr));

            let seperator = document.createElement("span");
            seperator.setAttribute("class", "px-2")
            let sep = document.createTextNode("|");
            seperator.appendChild(sep);
            attributeLabel.appendChild(seperator)

            let text = document.createTextNode(`${attr}: (not set)`);
            attributeLabel.appendChild(text);

            this._labels.appendChild(attributeLabel);
            this.attributeLabelEls.push(attributeLabel);
         }
      }
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
   // show(sliderData) {
   //    // Hide all cards' panels and de-select
   //    for (let idx = 0; idx < this._cardElements.length; idx++) {
   //       this._cardElements[idx].card._deselectedCardAndPanel();
   //    }

   //    // Append the cardList
   //    this.makeCards(cardList.cards)
   // }

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
      } else {
         // If the card hasn't been added yet -- save it here (we'll check for it when new cards are added)
         //console.log("Saving image for card ID " + id)
         this._preloadedImages[id] = e.detail.image;
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
      //console.log(e.detail)
      if (!this.panelContainer.open) this.panelContainer._toggleOpen();
      this.panelControls.openHandler(e.detail);
   }

   _addCard(index, cardObj, cardType) {
      const newCard = index >= this._cardElements.length;
      let card;
      if (newCard) {
         card = document.createElement(cardType);

         // // Resize Tool needs to change style within card on change
         card.style.width = "272px";
         this._resizeCards._slideInput.addEventListener("change", (evt) => {
            let resizeValue = evt.target.value;
            let resizeValuePerc = parseFloat(resizeValue / 100);
            card.style.width = "auto";
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
         // #todo needs to be componentized?
         annotationPanel.entityData.addEventListener("save", this.entityFormChange.bind(this));
         annotationPanel.stateData.addEventListener("save", this.stateFormChange.bind(this));
         annotationPanel.mediaData.addEventListener("save", this.mediaFormChange.bind(this));

         if (this.panelContainer.hasAttribute("permissionValue")) {
            let permissionVal = this.panelContainer.getAttribute("permissionValue");
            annotationPanel.entityData.setAttribute("permission", permissionVal);
            annotationPanel.stateData.setAttribute("permission", permissionVal);
            annotationPanel.mediaData.setAttribute("permission", permissionVal);
         }

         // when lock changes set attribute on forms to "View Only" / "Can Edit"
         this.panelContainer.addEventListener("permission-update", (e) => {
            annotationPanel.entityData.setAttribute("permission", e.detail.permissionValue);
            annotationPanel.stateData.setAttribute("permission", e.detail.permissionValue);
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


         if (cardObj.image) {
            annotationPanel.localizationType = false;
            annotationPanel.setImage(cardObj.image);
            if (cardObj.thumbnail) {
               card.setImageStatic(cardObj.thumbnail);
            } else {
               card.setImageStatic(cardObj.image);
            }
         }
         this._ul.appendChild(card);

         //console.log("A (NEW) New Card!!!!!!!!!!! id " + cardObj.id);
         if (this._preloadedImages[cardObj.id]) {
            const image = this._preloadedImages[cardObj.id];
            this._cardElements[index].card.setImage(image);
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
   }

   showLabels(selectedLabels) {
      //console.log(selectedLabels);
      for (let el of this.attributeLabelEls) {
         //console.log(`ID ${el.id} is included? ${selectedLabels.includes(el.id)}`);
         if (selectedLabels.includes(el.id)) {
            el.classList.remove("hidden");
         } else {
            el.classList.add("hidden");
         }
      }
   }

   _updateLabelValues({ newValues }) {
      for (let el of this.attributeLabelEls) {
         //const [key, value] of Object.entries(object1)
         for (const [key, value] of Object.entries(newValues.attributes)) {
            if (encodeURI(key) == el.id) {
               el.innerHTML = `<span class="px-2">|</span> ${key}: ${value}`;
            }
         }
      }
   }

   async _handleCardPagination(evt) {
      console.log(evt.detail);
      const start = evt.detail.start;
      const stop = evt.detail.stop;
      console.log(this.unshownCards);

      // Hide all the cards, and figure out which ones we need to show
      for (let i = 0; i < this.numberOfDisplayedCards; i++) {
         this._cardElements[i].card.style.display = "none";
      }

      //if (evt.detail.start >= this._cardElements.length) {
      for (let i = start; i < stop; i++) {   
         console.log(i);
         console.log(this.unshownCards[i])     
         let initData = this.unshownCards[i]; //type, id, totalList
         let index = this._currentCardIndexes[initData.id];

         if (index && this._cardElements[index] && this._cardElements[index].card) {
            console.log(`Preparing id ${initData.id} in card index ${index} with i equal to ${i}`);
            this._cardElements[index].card.style.display = "block";
         } else {
            console.log(`Preparing new card for id ${initData.id} where i is equal to ${i}`);
            // start is further than we have gotten cards
            const card = await this.slideCardData.makeCardList(initData);

            if (card) {
               card[0].posText = `${i + 1} of ${initData.totalList}`;
               card[0].stateType = this.state.typeData.association;
               card[0].stateInfo = {
                  id: this.state.id,
                  attributes: this.state.attributes,
                  entityType: this.state.typeData,
                  state: this.state
               }
               //states.cards.push(card);
               const detail = { detail: { cardData: card, cardIndex: i } };
               // if ((counter + 1) < this._previewCardCount) {
               let newCardEvent = new CustomEvent('new-card', detail);
               this.dispatchEvent(newCardEvent);
            }
         } 
      }

   }
}

customElements.define("entity-gallery-slider", EntityGallerySlider);