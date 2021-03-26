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
    this._h3.hidden = true;
    //this._h3Text = document.createTextNode("All Annotations")
    //this._h3.appendChild( this._h3Text );

    const header = document.createElement("div");
    header.setAttribute("class", "project__header d-flex flex-items-center px-2");
    this._p.appendChild(header);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3 text-white"); //not a typo
    this._name.textContent = "Annotations";
    header.appendChild(this._name);

    this._numFiles = document.createElement("span");
    this._numFiles.setAttribute("class", "text-gray px-2");
    header.appendChild(this._numFiles);

    // Count text
    //this._p.classList.add("col-3");
    //this._p.classList.add("px-2");

    // @TODO Tools: Card labels display -- Not impleemented currently
    //this.labelContainer = document.createElement("div");
    //this.labelContainer.setAttribute("class", "col-2")
    // this._labelsDropDown = document.createElement('entity-gallery-labels');
    // this.labelContainer.appendChild( this._labelsDropDown );
    //this._tools.appendChild( this.labelContainer );

    // Tools: Slider to resize images
    this.sliderContainer = document.createElement("div");
    this.sliderContainer.setAttribute("class", "col-4")
    this._resizeCards = document.createElement('entity-card-resize');
    this._resizeCards._initGallery(this._ul, this.colSize);
    this.sliderContainer.appendChild( this._resizeCards );
    this._tools.appendChild( this.sliderContainer );
    
    // Tools: Show @aspect ratio
    this.aspectToolContainer = document.createElement("div");
    this.aspectToolContainer.setAttribute("class", "col-3")
    this._aspectToggle = document.createElement('entity-gallery-aspect-ratio');
    this.aspectToolContainer.appendChild( this._aspectToggle );
    this._tools.appendChild( this.aspectToolContainer );

    // Init aspect toggle
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
    pageModal,
    modelData
  }){
    this.panelContainer = panelContainer;
    this.panelControls = this.panelContainer._panelTop;
    this.pageModal = pageModal;
    this.modelData = modelData;

    // Init gallery with data for filtering
    // this._labelsDropDown.init({
    //   gallery : this,
    //   localizationTypes
    // });
    // this.addEventListener("labels-changed", this.handleLabelChange.bind(this));
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

    this._numFiles.textContent = `${cardList.total} Results`;

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
      } );
      
      
      // Initialize Card
      card.init({
        obj : cardObj, 
        panelContainer : this.panelContainer, 
        annotationPanelDiv : this._cardElements[index].annotationPanelDiv
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

  openClosedPanel(e){
    if(!this.panelContainer.open) this.panelContainer._toggleOpen();
    this.panelControls.locDataHandler( e.detail );
  }
}

customElements.define("annotations-gallery", AnnotationsGallery);
    
