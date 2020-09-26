class HeaderUser extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "header__user d-flex flex-justify-right flex-items-center f3");
    this._shadow.appendChild(div);

    this._success = document.createElement("success-light");
    div.appendChild(this._success);

    this._warning = document.createElement("warning-light");
    div.appendChild(this._warning);

    this._text = document.createElement("span");
    this._text.setAttribute("class", "text-gray px-2");
    div.appendChild(this._text);

    this._avatar = document.createElement("span");
    this._avatar.setAttribute("class", "avatar circle d-flex flex-items-center flex-justify-center");
    div.appendChild(this._avatar);
  }

  static get observedAttributes() {
    return ["username"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "username":
        this._text.textContent = newValue;
        let initials = newValue.match(/\b\w/g) || [];
        initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
        this._avatar.textContent = initials;
        break;
    }
  }
}

customElements.define("header-user", HeaderUser);
