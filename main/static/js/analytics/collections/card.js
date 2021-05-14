class CollectionCard extends EntityCard {
  constructor() {
    super();

    // Add collection class to list item
    this._li.classList.add("analysis__collection");

  }
}

customElements.define("collection-card", CollectionCard);
