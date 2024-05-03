import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { identifyingAttribute } from "../util/identifying-attribute.js";
import { svgNamespace } from "../components/tator-element.js";

export class FavoritesPanel extends TatorElement {
  constructor() {
    super();

    const header = document.createElement("div");
    header.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between"
    );
    this._shadow.appendChild(header);

    const header1 = document.createElement("div");
    header1.setAttribute(
      "class",
      "d-flex flex-items-center py-3 text-semibold"
    );
    header1.textContent = "Favorites";
    header.appendChild(header1);

    const addFavorite = document.createElement("button");
    addFavorite.setAttribute("class", "btn btn-outline btn-small f2 px-1");
    addFavorite.style.marginLeft = "6px";
    addFavorite.style.width = "24px";
    addFavorite.style.height = "24px";
    header1.appendChild(addFavorite);

    const addSvg = document.createElementNS(svgNamespace, "svg");
    addSvg.setAttribute("viewBox", "0 0 24 24");
    addSvg.setAttribute("width", "24");
    addSvg.setAttribute("height", "24");
    addSvg.setAttribute("fill", "none");
    addSvg.setAttribute("stroke", "currentColor");
    addSvg.setAttribute("stroke-width", "2");
    addSvg.setAttribute("stroke-linecap", "round");
    addSvg.setAttribute("stroke-linejoin", "round");
    addFavorite.appendChild(addSvg);

    const line1 = document.createElementNS(svgNamespace, "line");
    line1.setAttribute("x1", "12");
    line1.setAttribute("y1", "5");
    line1.setAttribute("x2", "12");
    line1.setAttribute("y2", "19");
    addSvg.appendChild(line1);

    const line2 = document.createElementNS(svgNamespace, "line");
    line2.setAttribute("x1", "5");
    line2.setAttribute("y1", "12");
    line2.setAttribute("x2", "19");
    line2.setAttribute("y2", "12");
    addSvg.appendChild(line2);

    this._pageHeader = document.createElement("div");
    this._pageHeader.setAttribute(
      "class",
      "d-flex flex-items-center py-3 text-semibold"
    );
    this._pageHeader.textContent = "";
    header.appendChild(this._pageHeader);

    this._pageText = document.createTextNode("");
    this._pageHeader.appendChild(this._pageText);

    const prevPage = document.createElement("button");
    prevPage.setAttribute("class", "btn btn-outline btn-small f2 px-1");
    prevPage.style.marginLeft = "6px";
    prevPage.style.width = "24px";
    prevPage.style.height = "24px";
    this._pageHeader.appendChild(prevPage);

    const prevSvg = document.createElementNS(svgNamespace, "svg");
    prevSvg.setAttribute("viewBox", "0 0 32 32");
    prevSvg.setAttribute("height", "1em");
    prevSvg.setAttribute("width", "1em");
    prevPage.appendChild(prevSvg);

    const prevTitle = document.createElementNS(svgNamespace, "title");
    prevTitle.textContent = "Previous Page";
    prevSvg.appendChild(prevTitle);

    const prevPath = document.createElementNS(svgNamespace, "path");
    prevPath.setAttribute(
      "d",
      "M20.943 23.057l-7.057-7.057 7.057-7.057c0.521-0.521 0.521-1.365 0-1.885s-1.365-0.521-1.885 0l-8 8c-0.521 0.521-0.521 1.365 0 1.885l8 8c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885z"
    );
    prevSvg.appendChild(prevPath);

    const nextPage = document.createElement("button");
    nextPage.setAttribute("class", "btn btn-outline btn-small f2 px-1");
    nextPage.style.marginLeft = "6px";
    nextPage.style.width = "24px";
    nextPage.style.height = "24px";
    this._pageHeader.appendChild(nextPage);

    const nextSvg = document.createElementNS(svgNamespace, "svg");
    nextSvg.setAttribute("viewBox", "0 0 32 32");
    nextSvg.setAttribute("height", "1em");
    nextSvg.setAttribute("width", "1em");
    nextPage.appendChild(nextSvg);

    const nextTitle = document.createElementNS(svgNamespace, "title");
    nextTitle.textContent = "Previous Page";
    nextSvg.appendChild(nextTitle);

    const nextPath = document.createElementNS(svgNamespace, "path");
    nextPath.setAttribute(
      "d",
      "M12.943 24.943l8-8c0.521-0.521 0.521-1.365 0-1.885l-8-8c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l7.057 7.057-7.057 7.057c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z"
    );
    nextSvg.appendChild(nextPath);

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
    // console.log(`dataType: ${dataType}`);

    this._identifier = identifyingAttribute(dataType);
    this._dataType = dataType;
    this._isState = this._dataType.id.includes("state");
    if (this._isState) {
      this._entityTypeName = "State";
    } else {
      this._entityTypeName = "Localization";
    }

    this._typeId = Number(this._dataType.id.split("_")[1]);
    this._favorites = new Map(); // Map between page number and list of favorites
    for (let page = 1; page <= this._maxPages; page++) {
      this._favorites.set(page, []);
    }
    for (const favorite of favorites) {
      if (favorite.entity_type_name == null) {
        // Legacy path
        if (favorite.type == this._typeId) {
          this._favorites.get(favorite.page).push(favorite);
        }
      } else {
        // New path supporting multiple entity types
        if (
          favorite.entity_type_name == "State" &&
          favorite.type == this._typeId
        ) {
          this._favorites.get(favorite.page).push(favorite);
        } else if (
          favorite.entity_type_name == "Localization" &&
          favorite.type == this._typeId
        ) {
          this._favorites.get(favorite.page).push(favorite);
        }
      }
    }
    this._favorites.forEach((arr) => {
      arr.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    });
    this._updatePage();
  }

  store(values) {
    const name = values[this._identifier.name];
    const favorite = {
      name: name,
      page: this._page,
      type: this._typeId,
      values: values,
      entity_type_name: this._entityTypeName,
    };
    fetchCredentials(
      "/rest/Favorites/" + this._dataType.project,
      {
        method: "POST",
        body: JSON.stringify(favorite),
      },
      true
    )
      .then((response) => response.json())
      .then((data) => {
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
    button.addEventListener("rename", (evt) => {
      const update = evt.detail;
      for (const [index, favorite] of this._favorites
        .get(update.page)
        .entries()) {
        if (favorite.id == update.id) {
          this._favorites.get(update.page)[index] = update;
          break;
        }
      }
    });
    button.addEventListener("remove", (evt) => {
      const removed = evt.detail;
      for (const [index, favorite] of this._favorites
        .get(removed.page)
        .entries()) {
        if (favorite.id == removed.id) {
          this._favorites.get(removed.page).splice(index, 1);
          break;
        }
      }
    });
  }
}

customElements.define("favorites-panel", FavoritesPanel);
