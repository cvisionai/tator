class CollectionsCard extends EntityCard {
  constructor() {
    super();


    // Add annotation class to list item
    this._li.setAttribute("class", "analysis__collection entity-slider-card entity-card aspect-true rounded-2");
  }

}

customElements.define("collections-card", CollectionsCard);
