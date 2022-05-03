import { TatorElement } from "../components/tator-element.js";
import { getCookie } from "../util/get-cookie.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { svgNamespace } from "../components/tator-element.js";

export class SectionCard extends TatorElement {
  constructor() {
    super();

    this._li = document.createElement("li");
    this._li.style.cursor = "pointer";
    this._li.setAttribute("class", "section d-flex flex-items-center flex-justify-between px-2 rounded-1");
    this._shadow.appendChild(this._li);

    this._link = document.createElement("a");
    this._link.setAttribute("class", "section__link d-flex flex-items-center text-gray");
    this._li.appendChild(this._link);

    this._title = document.createElement("h2");
    this._title.setAttribute("class", "section__name py-1 px-1 css-truncate");
    this._link.appendChild(this._title);

  }



  rename(name) {
    this._title.textContent = name;
  }

  set active(enabled) {
    if (enabled) {
      this._li.classList.add("is-active");
    } else {
      this._li.classList.remove("is-active");
    }
  }
}

customElements.define("section-card", SectionCard);
