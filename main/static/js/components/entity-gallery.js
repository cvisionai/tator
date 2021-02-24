class EntityCardGallery extends TatorElement {
    constructor() {
      super();
      
      // Gallery Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "");
      this._shadow.appendChild(this._main);
      
      // Gallery Tools
      this._tools = document.createElement("div");
      this._tools.setAttribute("class", "");
      this._shadow.appendChild(this._tools);

      // Gallery Heading
      this._h3 = document.createElement("div");
      this._h3.setAttribute("class", "h3");
      this._shadow.appendChild(this._h3);
  
      // Gallery List
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "");
      this._main.appendChild(this._ul);

      // Gallery Pagination
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "");
      this._main.appendChild(this._ul);
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