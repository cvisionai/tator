import { TatorElement } from "../components/tator-element.js";

/**
 * Button used for the "All Media" / home in the section list
 */
export class PageAppletItem extends TatorElement {
  constructor() {
    super();

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute(
      "class",
      "rounded-2 px-1 py-1 d-flex flex-items-center clickable"
    );
    this._shadow.appendChild(this._mainDiv);

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "d-flex ml-3");
    this._mainDiv.appendChild(this._icon);
    this._icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
    `;

    this._name = document.createElement("div");
    this._name.setAttribute("class", "f2 text-gray ml-3 flex-grow");
    this._name.innerHTML = "Page Applet";
    this._mainDiv.appendChild(this._name);

    this._mainDiv.addEventListener("mouseover", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "#262e3d";
        this._mainDiv.style.color = "#ffffff";
        this._name.classList.remove("text-gray");
        this._name.classList.add("text-white");
      }
    });

    this._mainDiv.addEventListener("mouseout", () => {
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "";
        this._mainDiv.style.color = "";
        this._name.classList.add("text-gray");
        this._name.classList.remove("text-white");
      }
    });

    this._mainDiv.addEventListener("click", () => {
      this._mainDiv.blur();
      this.setActive();
      this.dispatchEvent(new CustomEvent("selected", { detail: { id: null } }));
    });
  }

  init(applet)
  {
    this._name.innerHTML = applet.name;
    this._applet = applet;
  }

  setActive() {
    this._active = true;
    this._mainDiv.style.backgroundColor = "#202543";
    this._mainDiv.style.color = "#ffffff";
    this._name.classList.remove("text-gray");
    this._name.classList.add("text-white");
    this._name.classList.add("text-semibold");
    this._mainDiv.classList.remove("box-border");
  }

  setInactive() {
    this._active = false;
    this._mainDiv.style.backgroundColor = "";
    this._mainDiv.style.color = "";
    this._name.classList.add("text-gray");
    this._name.classList.remove("text-white");
    this._name.classList.remove("text-semibold");
    this._mainDiv.classList.add("box-border");
  }
}
customElements.define("page-applet-item", PageAppletItem);
