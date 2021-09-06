class AnnotationsCard extends EntityCard {
  constructor() {
    super();

    // Add annotation class to list item
    this._li.classList.add("analysis__annotation");
  }

}

customElements.define("annotations-card", AnnotationsCard);
