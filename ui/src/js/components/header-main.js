import { TatorElement } from "./tator-element.js";

export class HeaderMain extends TatorElement {
  constructor() {
    super();

    const header = document.createElement("header");
    header.setAttribute(
      "class",
      "header d-flex px-3 flex-items-center flex-justify-between"
    );
    this._shadow.appendChild(header);

    const menu = document.createElement("header-menu");
    header.appendChild(menu);

    this._user = document.createElement("header-user");
    header.appendChild(this._user);

    menu.addEventListener("click", () => {
      this.dispatchEvent(new Event("openNav", { composed: true }));
    });
  }

  static get observedAttributes() {
    return ["username", "email"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "username":
        this._user.setAttribute("username", newValue);
        break;
      case "email":
        this._user.setAttribute("email", newValue);
        break;
    }
  }
}

customElements.define("header-main", HeaderMain);
