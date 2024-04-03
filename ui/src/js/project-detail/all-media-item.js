import { TatorElement } from "../components/tator-element.js";

/**
 * Button used for the "All Media" / home in the section list
 */
export class AllMediaItem extends TatorElement {

  constructor() {

    super();

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute("class", "rounded-2 px-1 py-1 d-flex flex-items-center clickable");
    this._shadow.appendChild(this._mainDiv);

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "d-flex ml-3");
    this._mainDiv.appendChild(this._icon);
    this._icon.innerHTML = `
    <svg class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
    </svg>
    `;

    this._name = document.createElement("div");
    this._name.setAttribute("class", "f2 text-gray ml-3 flex-grow");
    this._name.innerHTML = "All Media";
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
customElements.define("all-media-item", AllMediaItem);