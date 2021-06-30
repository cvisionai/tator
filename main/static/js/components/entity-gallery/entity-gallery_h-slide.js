class EntityCardSlideGallery extends TatorElement {
   constructor() {
      super();

      // Gallery Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "enitity-gallery_h-slide ml-1 mr-6 pb-3 mt-6 rounded-1");
      this._shadow.appendChild(this._main);

      // Gallery Heading
      this._h3 = document.createElement("div");
      this._h3Text = document.createTextNode("Collections")
      this._h3.appendChild(this._h3Text);
      this._h3.setAttribute("class", "enitity-gallery__heading h3 mr-3");
      this._main.appendChild(this._h3);

      this._numFiles = document.createElement("span");
      this._numFiles.setAttribute("class", "text-gray text-normal px-2");
      this._h3.appendChild(this._numFiles);

      // Gallery Top Tools and info
      this._tools = document.createElement("div");
      this._tools.setAttribute("class", "enitity-gallery__tools py-2 d-flex flex-items-center");
      this._main.appendChild(this._tools);

      // // Gallery Pagination Bottom
      this._paginator_top = document.createElement("entity-gallery-paginator");
      this._paginator_top.div.classList.add("py-1");
      this._paginator_top.pageSizeEl.hidden = true;
      this._paginator_top.pageSizeText.hidden = true;
      this._paginator_top.hidden = true;
      this._main.appendChild(this._paginator_top);

      // Gallery List is a list of sliders***
      this._sliderContainer = document.createElement("div");
      this._sliderContainer.setAttribute("class", "enitity-gallery__slider-container mt-3 mb-2 rounded-1");
      //this._sliderContainer.style.marginTop = "-22px";
      this._main.appendChild(this._sliderContainer);

      // // Gallery Pagination Bottom
      this._paginator = document.createElement("entity-gallery-paginator");
      //this._paginator.div.classList.add("py-5");
      this._paginator.pageSizeEl.hidden = true;
      this._paginator.pageSizeText.hidden = true;
      this._paginator.hidden = true;
      this._main.appendChild(this._paginator);
   }

   // init(cardList) {
   //    for (let card of cardList) {
   //       this._ul.appendChild(card);
   //    }
   //    return this._ul;
   // }

   // updateCards(cardList) {
   //    this._ul.innerHTML = "";
   //    return this.init(cardList);
   // }

}

customElements.define("entity-card-slide-gallery", EntityCardSlideGallery);