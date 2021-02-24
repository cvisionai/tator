class AnnotationsCard extends EntityCard {
  constructor() {
    super();
    // Entity Card
    // - @this._name Title
    // - Card is list element; Parent can be UL element, or see: EntityCardGallery
    // - Card links out to one destination
    // Optional: 
    // - @this._ext Detail text
    // - @this._pos_text Pagination position text
    // - @this._more Menu
    // - @this.getAttribute('thumb-gif') Gif for hover effect
  }

}
  
customElements.define("annotations-card", AnnotationsCard);
  