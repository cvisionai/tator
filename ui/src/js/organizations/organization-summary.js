import { TatorElement } from "../components/tator-element.js";

export class OrganizationSummary extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "projects d-flex flex-items-center rounded-2");
    this._shadow.appendChild(div);

    this._link = document.createElement("a");
    this._link.setAttribute("class", "projects__link d-flex flex-items-center text-white");
    div.appendChild(this._link);

    this._img = document.createElement("img");
    this._img.setAttribute("class", "projects__image px-2 rounded-1");
    this._link.appendChild(this._img);

    const text = document.createElement("div");
    text.setAttribute("class", "projects__text px-3");
    this._link.appendChild(text);

    const h2 = document.createElement("h2");
    h2.setAttribute("class", "text-semibold py-2");
    text.appendChild(h2);

    this._text = document.createTextNode("");
    h2.appendChild(this._text);
  }

  set info(val) {
    this._text.nodeValue = val.name;
    this._organizationId = val.id;
    if (val.thumb) {
      this._img.setAttribute("src", val.thumb);
      this._img.setAttribute("style", "object-fit:cover");
    } else {
      this._img.setAttribute("src", "/static/images/tator-logo-symbol-only.png");
      this._img.setAttribute("style", "object-fit:contain");
    }
    if (val.permission == "Admin") {
      const url = window.location.origin + "/" + val.id + "/organization-settings";
      this._link.setAttribute("href", url);
    }
    let first = true;
  }
}

customElements.define("organization-summary", OrganizationSummary);
