import { TatorElement } from "../../components/tator-element.js";

export class OrgSettingsBreadcrumbs extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "annotation__breadcrumbs d-flex flex-items-center px-2 f3 text-gray"
    );
    this._shadow.appendChild(div);

    this._projectText = document.createElement("a");
    this._projectText.setAttribute("class", "text-gray");
    this._projectText.textContent = "Organizations";
    this._projectText.setAttribute("href", `/organizations`);
    div.appendChild(this._projectText);

    const chevron1 = document.createElement("chevron-right");
    chevron1.setAttribute("class", "px-2");
    div.appendChild(chevron1);

    this._settingsText = document.createElement("span");
    this._settingsText.setAttribute("class", "text-white text-semibold");
    this._settingsText.textContent = "Organization settings";
    div.appendChild(this._settingsText);
  }

  static get observedAttributes() {
    return ["organization-name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "organization-name":
        this._settingsText.textContent = `${newValue}`;
        break;
    }
  }
}

customElements.define("org-settings-breadcrumbs", OrgSettingsBreadcrumbs);
