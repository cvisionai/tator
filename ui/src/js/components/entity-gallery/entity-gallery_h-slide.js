import { TatorElement } from "../tator-element.js";

export class EntityCardSlideGallery extends TatorElement {
  constructor() {
    super();

    // Gallery Container
    this._main = document.createElement("div");
    this._main.setAttribute(
			"class",
			"entity-gallery_h-slide ml-1 mr-6 mt-6 px-5 pb-3 rounded-1"
		);
    this._shadow.appendChild(this._main);

    // Gallery Container
    this._mainTop = document.createElement("div");
    this._mainTop.setAttribute("class", "entity-gallery--main-top rounded-1");
    this._main.appendChild(this._mainTop);

    // Gallery Top Tools and info
    this._tools = document.createElement("div");
    this._tools.setAttribute(
			"class",
			"entity-gallery__tools d-flex flex-items-center flex-justify-between"
		);
    this._mainTop.appendChild(this._tools);

    // Gallery Heading
    this._h3 = document.createElement("div");
    this._h3.setAttribute(
      "class",
      "project__header d-flex flex-items-center px-2"
    );
    this._tools.appendChild(this._h3);

    this.h2 = document.createElement("h2");
    this.h2.setAttribute("class", "h3 text-white");
    this._h3.appendChild(this.h2);

    this._numFiles = document.createElement("span");
    this._numFiles.setAttribute("class", "text-gray text-normal px-2");
    this._h3.appendChild(this._numFiles);

    // // Gallery Pagination Bottom
    this._paginator_top = document.createElement("entity-gallery-paginator");
    this._paginator_top.setupElements();
    this._paginator_top.div.classList.add("mt-3");
    this._paginator_top.div.classList.add("pb-2");
    // this._paginator_top.pageSizeEl.hidden = true;
    // this._paginator_top.pageSizeText.hidden = true;
    this._paginator_top.hidden = true;

    this._main.appendChild(this._paginator_top);

    // Gallery List is a list of sliders***
    this._sliderContainer = document.createElement("div");
    this._sliderContainer.setAttribute(
			"class",
			"entity-gallery__slider-container rounded-1"
		);
    //this._sliderContainer.style.marginTop = "-22px";
    this._main.appendChild(this._sliderContainer);

    // // Gallery Pagination Bottom
    this._paginator = document.createElement("entity-gallery-paginator");
    this._paginator.setupElements();
    //this._paginator.div.classList.add("py-5");
    // this._paginator.pageSizeEl.hidden = true;
    // this._paginator.pageSizeText.hidden = true;
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

if (!customElements.get("entity-card-slide-gallery")) {
  customElements.define("entity-card-slide-gallery", EntityCardSlideGallery);
}
