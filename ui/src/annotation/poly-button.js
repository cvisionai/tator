class PolyButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "annotation__shape btn-clear py-3 px-3 d-flex rounded-2 text-gray hover-text-white");
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-poly");
    svg.setAttribute("viewBox", "0 0 42 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Poly";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M39 0c-1.654 0-3 1.346-3 3 0 0.888 0.396 1.679 1.011 2.229l-8.8 14.031c-0.371-0.165-0.78-0.26-1.211-0.26-0.868 0-1.644 0.376-2.193 0.967l-9.073-5.745c0.168-0.374 0.266-0.786 0.266-1.222 0-1.654-1.346-3-3-3s-3 1.346-3 3c0 0.904 0.41 1.706 1.044 2.256l-6.895 10.975c-0.354-0.148-0.742-0.231-1.149-0.231-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3c0-0.888-0.395-1.678-1.010-2.228l6.904-10.99c0.343 0.138 0.715 0.218 1.106 0.218 0.859 0 1.629-0.367 2.176-0.947l9.078 5.748c-0.161 0.368-0.254 0.772-0.254 1.199 0 1.654 1.346 3 3 3s3-1.346 3-3c0-0.863-0.371-1.636-0.957-2.184l8.81-14.046c0.354 0.147 0.741 0.23 1.147 0.23 1.654 0 3-1.346 3-3s-1.346-3-3-3zM5 29c0 1.103-0.897 2-2 2s-2-0.897-2-2 0.897-2 2-2 2 0.897 2 2zM13 15c-1.103 0-2-0.897-2-2s0.897-2 2-2 2 0.897 2 2-0.897 2-2 2zM27 24c-1.103 0-2-0.897-2-2s0.897-2 2-2 2 0.897 2 2-0.897 2-2 2zM39 5c-1.103 0-2-0.897-2-2s0.897-2 2-2 2 0.897 2 2-0.897 2-2 2z");
    svg.appendChild(path);
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

customElements.define("poly-button", PolyButton);
