class AnnotationsGallery extends EntityCardGallery {
  constructor() {
    super();
    /*
    * Add tools, headings and pagination for gallery here
    *
    */


    // Custom width for annotations gallery
    this.colSize = 272;
    this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`

    // Heading
    //this._h3Text = document.createTextNode("All Annotations")
    //this._h3.appendChild( this._h3Text );

    // @TODO Tools: Card labels display
    // this._labelsDropDown = document.createElement('entity-gallery-labels');
    // this._tools.appendChild( this._labelsDropDown );

    // Tools: Slider to resize images
    this._resizeCards = document.createElement('entity-card-resize');
    this._resizeCards._initGallery(this._ul, this.colSize);
    this._tools.appendChild( this._resizeCards );

    // Tools: Show @aspect ratio
    this._aspectToggle = document.createElement('entity-gallery-aspect-ratio');
    this._tools.appendChild( this._aspectToggle );
    this._aspectToggle.init(this);

    this.panelContainer = null;

    // Property IDs are the entity IDs (which are expected to be unique)
    // Each property (ID) points to the index of the card information stored in _cardElements
    this._currentCardIndexes = {};

    // Entity cards aren't deleted. They are reused and hidden if not used.
    this._cardElements = [];
  }

  // Provide access to side panel for events
  _initPanel({
    panelContainer,
    localizationTypes
  }){
    this.panelContainer = panelContainer;

    // Init gallery with data for filtering
    // this._labelsDropDown.init({
    //   gallery : this,
    //   localizationTypes
    // });
    //this.addEventListener("labels-changed", this.handleLabelChange.bind(this));
  }

  handleLabelChange(e){
    console.log(e.detail);
  }

  /* Init function to show and populate gallery w/ pagination */
  show(cardList) {

    // Update Heading
    // if(cardList.filterState.filtered == true) {
    //   this._ul.innerHTML = "";
    //   this._h3Text = document.createTextNode("Filtered Annotations");
    // } else {
    //   this._ul.innerHTML = "";
    //   this._h3Text = document.createTextNode("All Annotations");
    // }

    //Update descriptive count text
    var stopCount = cardList.paginationState.stop + 1;
    if (cardList.total < cardList.paginationState.stop + 1) {
      stopCount = cardList.total;
    }
    this._p.innerHTML = `Annotations ${cardList.paginationState.start + 1}-${stopCount} of ${cardList.total}`;

    // Only populate the pagination when the dataset has changed (and therefore the pagination
    // needs to be reinitialized)
    if (cardList.paginationState.init) {
      this._paginator.init(cardList.total, cardList.paginationState);
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
      info.annotationPanel.setImage(image);
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
        this.panelContainer.appendChild(annotationPanelDiv);

        // Init a side panel that can be triggered from card
        let annotationPanel = document.createElement("entity-attributes-panel");
        annotationPanelDiv.appendChild(annotationPanel);

        // Update view
        annotationPanelDiv.addEventListener("unselected", () => {
          card._li.classList.remove("is-selected");
          annotationPanelDiv.classList.remove("is-selected");
          annotationPanelDiv.classList.add("hidden");
          console.log(annotationPanelDiv.classList);
          console.log("Hiding "+annotationPanelDiv.dataset.locId);
        });

        // Listen for all clicks on the document
        document.addEventListener('click', function (evt) {
          if (evt.target.tagName == "BODY" && card._li.classList.contains("is-selected")) {
            card._li.click();
          }
        }, false);

        // Update view
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

      // Initialize the card
      this._cardElements[index].annotationPanel.init(cardObj, this.panelContainer);
      this._cardElements[index].annotationPanelDiv.setAttribute("data-loc-id", cardObj.id)
      card.init(cardObj, this.panelContainer, this._cardElements[index].annotationPanelDiv);
      card.style.display = "block";

      // Add new card to the gallery div
      if (newCard) {
        this._ul.appendChild(card);
      }
    }

    // Hide unused cards
    if (this._cardElements.length > this._cardElements.length) {
      const len = this._cardElements.length;
      for (let idx = len - 1; idx >= this._cardElements.length; idx--) {
        this._cardElements[idx].card.style.display = "none";
      }
    }
  }
}

customElements.define("annotations-gallery", AnnotationsGallery);
    
