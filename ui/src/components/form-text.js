class FormText extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-column py-2 text-semibold");
    this._shadow.appendChild(label);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "py-3");
    this._span.textContent = "New Project";
    label.appendChild(this._span);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control");
    label.appendChild(this._input);
  }

  static get observedAttributes() {
    return ["name", "placeholder", "password"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._span.textContent = newValue;
        break;
      case "placeholder":
        this._input.setAttribute("placeholder", newValue);
        break;
      case "password":
        this._input.setAttribute("type", "password");
        break;
    }
  }

  get value() {
    return this._input.value;
  }
}

customElements.define("form-text", FormText);
