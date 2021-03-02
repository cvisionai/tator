class EntityCardGallery extends TatorElement {
    constructor() {
      super();
      
      // Gallery Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "enitity-gallery px-6");
      this._shadow.appendChild(this._main);

      // Gallery Pagination Top
      // this._paginator_top = document.createElement("entity-gallery-paginator");
      // this._main.appendChild(this._paginator_top);
      
      // Gallery Tools
      this._tools = document.createElement("div");
      this._tools.setAttribute("class", "enitity-gallery--tools py-4 float-right");
      this._main.appendChild(this._tools);

      // Gallery Heading
      this._h3 = document.createElement("div");
      this._h3.setAttribute("class", "enitity-gallery--heading h3 py-4");
      this._main.appendChild(this._h3);
  
      // Gallery List
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "enitity-gallery--ul project__files px-6");
      this._main.appendChild(this._ul);

      // Gallery Pagination Bottom
      this._paginator = document.createElement("entity-gallery-paginator");
      this._main.appendChild(this._paginator);
    }

    init(cardList){
      for(let card of cardList){
        this._ul.appendChild(card);
      }
      return this._ul;
    }

    updateCards(cardList){
      this._ul.innerHTML = "";
      return this.init(cardList);
    }
   
  }
  
  customElements.define("entity-card-gallery", EntityCardGallery);  