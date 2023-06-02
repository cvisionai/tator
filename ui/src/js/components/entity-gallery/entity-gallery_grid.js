import { TatorElement } from "../tator-element.js";

export class EntityCardGallery extends TatorElement {
  constructor() {
    super();

    // Gallery Container
    this._main = document.createElement("div");
    this._main.setAttribute(
      "class",
      "enitity-gallery--main ml-1 mt-6 mr-6 px-5 rounded-1"
    );
    this._shadow.appendChild(this._main);

    // Gallery Container
    this._mainTop = document.createElement("div");
    this._mainTop.setAttribute("class", "enitity-gallery--main-top rounded-1");
    this._main.appendChild(this._mainTop);

    // Gallery Top Tools and info
    this._tools = document.createElement("div");
    this._tools.setAttribute(
      "class",
      "enitity-gallery__tools d-flex flex-items-center flex-justify-between"
    );
    this._mainTop.appendChild(this._tools);

    // Gallery Heading
    this._h3 = document.createElement("div");
    this._h3.setAttribute("class", "enitity-gallery__heading h3 mr-3");
    this._tools.appendChild(this._h3);

    // Gallery count / info
    this._p = document.createElement("p");
    this._p.setAttribute("class", "enitity-gallery__count col-5 text-gray");
    this._galleryCountText = document.createTextNode("");
    this._p.appendChild(this._galleryCountText);
    this._tools.appendChild(this._p);

    // Gallery Pagination Top
    this._paginator_top = document.createElement("entity-gallery-paginator");
    this._paginator_top.setupElements();
    this._paginator_top.div.classList.add("py-3");
    this._main.appendChild(this._paginator_top);

    // Gallery List
    this._ul = document.createElement("ul");
    this._ul.setAttribute(
      "class",
      "enitity-gallery enitity-gallery__ul py-2 px-2 mb-2 rounded-1"
    );
    this._main.appendChild(this._ul);

    // Gallery Pagination Bottom
    this._paginator = document.createElement("entity-gallery-paginator");
    this._paginator.setupElements();
    this._paginator.div.classList.add("py-2");
    this._main.appendChild(this._paginator);
  }

  init(cardList) {
    for (let card of cardList) {
      this._ul.appendChild(card);
    }

    return this._ul;
  }

  updateCards(cardList) {
    this._ul.innerHTML = "";
    return this.init(cardList);
  }
}

if (!customElements.get("entity-card-gallery")) {
  customElements.define("entity-card-gallery", EntityCardGallery);
}
