class EntityCardGallery extends TatorElement {
    constructor() {
      super();
      
      // Gallery Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "enitity-gallery ml-1 mr-6 pb-3 mt-6 rounded-1");
      this._shadow.appendChild(this._main);

      // Gallery Top Tools and info
      this._tools = document.createElement("div");
      this._tools.setAttribute("class", "enitity-gallery__tools py-2 d-flex flex-items-center");
      this._main.appendChild(this._tools);

      // Gallery Heading
      this._h3 = document.createElement("div");
      this._h3.setAttribute("class", "enitity-gallery__heading h3 py-2 mr-3");
      this._tools.appendChild(this._h3);

      // Gallery count / info
      this._p = document.createElement("p");
      this._p.setAttribute("class", "enitity-gallery__count col-5 py-2 text-gray");
      this._galleryCountText = document.createTextNode("");
      this._p.appendChild(this._galleryCountText);
      this._tools.appendChild(this._p);

      // Gallery Pagination Bottom
      this._paginator_top = document.createElement("entity-gallery-paginator");
      this._paginator_top.div.classList.add("pb-3");
      this._main.appendChild(this._paginator_top);
  
      // Gallery List
      this._ul = document.createElement("ul");
      this._ul.setAttribute("class", "enitity-gallery__ul px-2 py-2 mb-2 rounded-1");
      this._main.appendChild(this._ul);

      // Gallery Pagination Bottom
      this._paginator = document.createElement("entity-gallery-paginator");
      this._paginator.div.classList.add("py-5");
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