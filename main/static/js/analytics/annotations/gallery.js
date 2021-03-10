class AnnotationsGallery extends EntityCardGallery {
  constructor() {
    super();
    /*
    * Add tools, headings and pagination for gallery here
    * 
    */

    // Custom width for annotations gallery
    this.colSize = 200;
    this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`

    // Heading
    //this._h3Text = document.createTextNode("All Annotations")
    //this._h3.appendChild( this._h3Text );

    // Tools: Card labels display
    this._labelsDropDown = document.createElement('entity-gallery-labels');
    this._initLabels()
    this._tools.appendChild( this._labelsDropDown );

    // Tools: Slider to resize images
    this._resizeCards = document.createElement('entity-card-resize');
    this._resizeCards._initGallery(this._ul, this.colSize);
    this._tools.appendChild( this._resizeCards );
    
    // Tools: Show @aspect ratio
    this._aspectToggle = document.createElement('entity-gallery-aspect-ratio');
    this._tools.appendChild( this._aspectToggle );
    this._aspectToggle.init(this);

    this.panelContainer = null;

  }

  // Provide access to side panel for events
  _initPanel({
    panelContainer
  }){
    this.panelContainer = panelContainer;
  }

  // Init labels
  async _initLabels(){
    // Init gallery with data for filtering
    this._labelsDropDown.init({gallery : this});
    this.addEventListener("labels-changed", this.handleLabelChange.bind(this));
  }

  handleLabelChange(e){
    console.log(e.detail);
  }

  /* Init function to show and populate gallery w/ pagination */
  show({
    cardList = {}
  }){
    console.log(cardList);

    // Update Heading
    // if(cardList.filterState.filtered == true) {
    //   this._ul.innerHTML = "";
    //   this._h3Text = document.createTextNode("Filtered Annotations");
    // } else {
    //   this._ul.innerHTML = "";
    //   this._h3Text = document.createTextNode("All Annotations");
    // }

    //Update descriptive count text
    this._p.innerHTML = `Annotations ${cardList.paginationState._start}-${cardList.paginationState._stop} of ${cardList.total}`;

    // Populate the pagination
    this._paginator.init({numFiles : cardList.total, paginationState : cardList.paginationState});

    // Append the cardList
    this.appendCardList(cardList.cards)
  }

  // Accepts a cardList object and appends each card to the page web component
  appendCardList(cardList, panelContainer){    
    for(let cardObj of cardList){
      let card = document.createElement("annotations-card");
      
      
      // Resize Tool needs to change style within card on change
      this._resizeCards._slideInput.addEventListener("change", (e) => {
        let resizeValue = e.target.value;
        let resizeValuePerc = parseFloat( resizeValue / 100 );
        return card._img.style.height = `${130 * resizeValuePerc}px`;
      });

      // Inner div of side panel
      let annotationPanelDiv = document.createElement("div");
      annotationPanelDiv.setAttribute("class", "entity-panel--div")
      annotationPanelDiv.setAttribute("data-loc-id", cardObj.id)
      this.panelContainer.appendChild( annotationPanelDiv );

      // Init a side panel that can be triggered from card
      let annotationPanel = document.createElement("entity-attributes-panel");
      annotationPanel.init( cardObj, this.panelContainer );
      annotationPanelDiv.hidden = true;
      annotationPanelDiv.appendChild(annotationPanel);

      // // Update view
      this.addEventListener("view-change", (e) => {
        console.log(e.detail);
        this._ul.classList.toggle("aspect-true");
        card._li.classList.toggle("aspect-true");
      });

      // init and append card
      card.init( cardObj, this.panelContainer, annotationPanelDiv);
      this._ul.appendChild(card);
    }

    return this._ul;
  }

}
    
customElements.define("annotations-gallery", AnnotationsGallery);
    