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

    this._pageText = document.createTextNode("");
    this._pageHeader.appendChild(this._pageText);

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
    this._maxPages = 10;
    this._page = 1;

    addFavorite.addEventListener("click", () => {
      this.dispatchEvent(new Event("store"));
    });

    nextPage.addEventListener("click", () => {
      this._page = Math.min(this._page + 1, this._maxPages);
      this._updatePage();
    });

    prevPage.addEventListener("click", () => {
      this._page = Math.max(this._page - 1, 1);
      this._updatePage();
    });
  }

  init(dataType, favorites) {
    this._identifier = identifyingAttribute(dataType);
    this._dataType = dataType;
    this._typeId = Number(this._dataType.id.split("_")[1]);
    this._favorites = new Map(); // Map between page number and list of favorites
    for (let page = 1; page <= this._maxPages; page++) {
      this._favorites.set(page, []);
    }
    for (const favorite of favorites) {
      if (favorite.meta == this._typeId) {
        this._favorites.get(favorite.page).push(favorite);
      }
    }
    this._updatePage();
  }

  store(values) {
    const name = values[this._identifier.name];
    const favorite = {
      'name': name,
      'page': this._page,
      'type': this._typeId,
      'values': values,
    };
    fetchRetry("/rest/Favorites/" + this._dataType.project, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(favorite),
    })
    .then(response => response.json())
    .then(data => {
      favorite.id = data.id;
      this._favorites.get(this._page).push(favorite);
      this._makeButton(favorite);
    });
  }

  _updatePage() {
    // Clear out existing buttons.
    while (this._buttons.firstChild) {
      this._buttons.removeChild(this._buttons.firstChild);
    }

    // Create buttons for favorites on this page.
    for (const favorite of this._favorites.get(this._page)) {
      this._makeButton(favorite);
    }

    // Set page text.
    this._pageText.textContent = `Page ${this._page}`;
  }

  _makeButton(favorite) {
    const button = document.createElement("favorite-button");
    button.init(favorite);
    this._buttons.appendChild(button);
  }
}

customElements.define("favorites-panel", FavoritesPanel);
