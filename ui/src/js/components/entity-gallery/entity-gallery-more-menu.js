import { TatorElement } from "../tator-element.js";

export class EntityGalleryMoreMenu extends TatorElement {
  constructor() {
    super();

    this.details = document.createElement("details");
    this.details.setAttribute("class", "entity-gallery-tools--details more");
    this._shadow.appendChild(this.details);

    this.summary = document.createElement("summary");
    this.summary.setAttribute(
      "class",
      "btn-clear h2 text-gray hover-text-white"
    );
    this.details.appendChild(this.summary);

    // this.summary.style.height = "32px";
    // this.summary.style.width = "35px";

    const moreIcon = document.createElement("more-icon");
    moreIcon.setAttribute("class", "btn-clear h2 text-gray hover-text-white");
    this.summary.appendChild(moreIcon);

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute(
      "class",
      "entity-gallery-tools--menu rounded-2 px-2 d-flex flex-column f2"
    );
    this.details.appendChild(styleDiv);

    this._menu = document.createElement("div");
    this._menu.setAttribute(
      "class",
      "d-flex flex-column px-4 py-3 lh-condensed"
    );
    styleDiv.appendChild(this._menu);

    this.summary.addEventListener("click", this._showMenu.bind(this));

    window.addEventListener("click", () => {
      //Hide the menus if visible
      this.details.open = false;
    });
  }

  _showMenu(e) {
    // This allows the off click to work
    e.stopPropagation();
  }

  addMenuItem(text, callback) {
    let menuItem = document.createElement("button");
    let icon = document.createElement("div");
    icon.setAttribute("class", "d-flex");
    icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
    `;
    menuItem.appendChild(icon);
    menuItem.setAttribute(
      "class",
       "menu-link-button btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    menuItem.addEventListener("click", callback);
    menuItem.appendChild(document.createTextNode(text));
    this._menu.appendChild(menuItem);
  }
}

customElements.define("entity-gallery-more-menu", EntityGalleryMoreMenu);
