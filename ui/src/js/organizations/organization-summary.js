import { TatorElement } from "../components/tator-element.js";

export class OrganizationSummary extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("organization-summary").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._link = this._shadow.getElementById("organization-link");
    this._img = this._shadow.getElementById("organization-thumbnail");
    this._name = this._shadow.getElementById("organization-name");
  }

  set info(val) {
    this._name.textContent = val.name;
    this._organizationId = val.id;
    if (val.thumb) {
      this._img.setAttribute("src", val.thumb);
      this._img.setAttribute("style", "object-fit:cover");
    } else {
      this._img.setAttribute("src", `${STATIC_PATH}/images/tator-logo-symbol-only.png`);
      this._img.setAttribute("style", "object-fit:contain");
    }
    if (val.permission == "Admin") {
      const url =
        window.location.origin + "/" + val.id + "/organization-settings";
      this._link.setAttribute("href", url);
    }
    let first = true;
  }
}

customElements.define("organization-summary", OrganizationSummary);
