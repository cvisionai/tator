class TrackButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElement("track-icon");
    this._button.appendChild(svg);
  }

  static get observedAttributes() {
    return ["class", "disabled"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "class":
        if (this.classList.contains("is-selected")) {
          this._button.classList.add("is-selected");
        } else {
          this._button.classList.remove("is-selected");
        }
        break;
      case "disabled":
        if (newValue === null) {
          this._button.removeAttribute("disabled");
        } else {
          this._button.setAttribute("disabled", "");
        }
        break;
    }
  }
}

customElements.define("track-button", TrackButton);
