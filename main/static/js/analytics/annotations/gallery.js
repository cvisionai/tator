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
    this.cardList = {};

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
    if (id in this.cardList) {
      this.cardList[id].setImage(image);
    }
  }

  makeCards(cardInfo) {

    this._cardList = {}; // Clear the mapping from entity ID to card
    const children = this._ul.children;

    // Loop through all of the card entries and create a new card if needed. Otherwise
    // apply the card entry to an existing card.
    for (const [index, cardObj] of cardInfo.entries()) {
      const newCard = index >= children.length;
      let card;
      if (newCard) {
        card = document.createElement("annotations-card");
      } else {
        card = children[index];
      }
      this.cardList[cardObj.id] = card;

      // Resize Tool needs to change style within card on change
      this._resizeCards._slideInput.addEventListener("change", (e) => {
        let resizeValue = e.target.value;
        let resizeValuePerc = parseFloat( resizeValue / 100 );
        return card._img.style.height = `${130 * resizeValuePerc}px`;
      });

      // Inner div of side panel
      let annotationPanelDiv = document.createElement("div");
      annotationPanelDiv.setAttribute("class", "entity-panel--div hidden")
      annotationPanelDiv.setAttribute("data-loc-id", cardObj.id)
      this.panelContainer.appendChild( annotationPanelDiv );

      // Init a side panel that can be triggered from card
      let annotationPanel = document.createElement("entity-attributes-panel");
      annotationPanel.init( cardObj, this.panelContainer );
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
      document.addEventListener('click', function (event) {
        if (event.target.tagName == "BODY" && card._li.classList.contains("is-selected")) {
          card._li.click();
        }
      }, false);

      // Update view
      this.addEventListener("view-change", (e) => {
        card._li.classList.toggle("aspect-true");
      });

      // Initialize the card
      card.init(cardObj, this.panelContainer, annotationPanelDiv);
      card.style.display = "block";

      // Add new card to the gallery div
      if (newCard) {
        this._ul.appendChild(card);
      }
    }

    // Hide unused cards
    if (children.length > cardInfo.length) {
      const len = children.length;
      for (let idx = len - 1; idx >= cardInfo.length; idx--) {
        children[idx].style.display = "none";
      }
    }
  }

  /*
  // Accepts a cardList object and appends each card to the page web component
  appendCardList(cardList){
    for(let cardObj of cardList){
      let card = document.createElement("annotations-card");
      this.cardList[cardObj.id] = card;

      // Resize Tool needs to change style within card on change
      this._resizeCards._slideInput.addEventListener("change", (e) => {
        let resizeValue = e.target.value;
        let resizeValuePerc = parseFloat( resizeValue / 100 );
        return card._img.style.height = `${130 * resizeValuePerc}px`;
      });

      // Inner div of side panel
      let annotationPanelDiv = document.createElement("div");
      annotationPanelDiv.setAttribute("class", "entity-panel--div hidden")
      annotationPanelDiv.setAttribute("data-loc-id", cardObj.id)
      this.panelContainer.appendChild( annotationPanelDiv );

      // Init a side panel that can be triggered from card
      let annotationPanel = document.createElement("entity-attributes-panel");
      annotationPanel.init( cardObj, this.panelContainer );
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
      document.addEventListener('click', function (event) {
        if (event.target.tagName == "BODY" && card._li.classList.contains("is-selected")) {
          card._li.click();
        }
      }, false);

      // Update view
      this.addEventListener("view-change", (e) => {
        card._li.classList.toggle("aspect-true");
      });

      // init and append card
      card.init( cardObj, this.panelContainer, annotationPanelDiv);
      this._ul.appendChild(card);
    }

    return this._ul;
  }
  */

}

customElements.define("annotations-gallery", AnnotationsGallery);
