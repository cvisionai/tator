class FavoritesPanel extends TatorElement {
  constructor() {
    super();

    const header = document.createElement("div");
    header.setAttribute("class", "d-flex flex-items-center flex-justify-between");
    this._shadow.appendChild(header);

    const header1 = document.createElement("div");
    header1.setAttribute("class", "d-flex flex-items-center py-3 text-semibold");
    header1.textContent = "Favorites";
    header.appendChild(header1);

    const addFavorite = document.createElement("button");
    addFavorite.setAttribute("class", "btn btn-outline btn-small f2 px-1");
    addFavorite.style.marginLeft = "6px"
    addFavorite.style.width = "24px"
    addFavorite.style.height = "24px"
    addFavorite.textContent = "+";
    header1.appendChild(addFavorite);

    this._pageHeader = document.createElement("div");
    this._pageHeader.setAttribute("class", "d-flex flex-items-center py-3 text-semibold");
    this._pageHeader.textContent = "";
    header.appendChild(this._pageHeader);

    const prevPage = document.createElement("button");
    prevPage.setAttribute("class", "btn btn-outline btn-small f2 px-1");
    prevPage.style.marginLeft = "6px"
    prevPage.style.width = "24px"
    prevPage.style.height = "24px"
    prevPage.textContent = "<";
    this._pageHeader.appendChild(prevPage);

    const nextPage = document.createElement("button");
    nextPage.setAttribute("class", "btn btn-outline btn-small f2 px-1");
    nextPage.style.marginLeft = "6px"
    nextPage.style.width = "24px"
    nextPage.style.height = "24px"
    nextPage.textContent = ">";
    this._pageHeader.appendChild(nextPage);

    this._buttons = document.createElement("div");
    this._buttons.setAttribute("class", "annotation__recents d-flex");
    this._shadow.appendChild(this._buttons);

    this._identifier = null;

    addFavorite.addEventListener("click", () => {
      this.dispatchEvent(new Event("store"));
    });
  }

  set dataType(val) {
    this._identifier = identifyingAttribute(val);
  }

  store(values) {
    this.style.display = "block";
    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-outline btn-small f2");
    button.textContent = values[this._identifier.name];
    for (const other of this._buttons.children) {
      if (other.textContent == button.textContent) {
        this._buttons.removeChild(other);
        break;
      }
    }
    this._buttons.insertBefore(button, this._buttons.firstChild);
    
    button.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("load", {
        detail: values,
      }));
    });
  }
}

customElements.define("favorites-panel", FavoritesPanel);
