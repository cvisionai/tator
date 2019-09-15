class EditButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-pointer");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Edit";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M6.476 6.476l16.379 6.824-6.511 2.211c-0.38 0.131-0.696 0.427-0.833 0.833l-2.211 6.511zM17.347 19.232l7.044 7.044c0.521 0.521 1.365 0.521 1.885 0s0.521-1.365 0-1.885l-7.044-7.044 7.824-2.657c0.697-0.237 1.071-0.995 0.833-1.691-0.128-0.377-0.408-0.659-0.749-0.801l-22.627-9.427c-0.68-0.283-1.46 0.039-1.744 0.719-0.143 0.341-0.132 0.709 0 1.025l9.427 22.627c0.283 0.68 1.064 1.001 1.744 0.719 0.367-0.153 0.629-0.451 0.749-0.801z");
    svg.appendChild(path);
  }

  static get observedAttributes() {
    return ["class"];
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
    }
  }
}

customElements.define("edit-button", EditButton);
