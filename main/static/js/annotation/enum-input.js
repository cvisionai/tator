class EnumInput extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
    label.style.position = "relative";
    this._shadow.appendChild(label);

    this._name = document.createTextNode("");
    label.appendChild(this._name);

    const span = document.createElement("span");
    span.setAttribute("class", "sr-only");
    label.appendChild(span);

    this._select = document.createElement("select");
    this._select.setAttribute("class", "form-select has-border select-sm col-8");
    label.appendChild(this._select);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "text-gray");
    svg.setAttribute("id", "icon-chevron-down");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    label.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M5.293 9.707l6 6c0.391 0.391 1.024 0.391 1.414 0l6-6c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z");
    svg.appendChild(path);

    this._select.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });
  }

  static get observedAttributes() {
    return ["name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
        break;
    }
  }

  set choices(val) {
    for (const choice of val) {
      const option = document.createElement("option");
      option.setAttribute("value", choice);
      option.textContent = choice;
      this._select.appendChild(option);
    }
  }

  getValue() {
    const selected = this._select.selectedIndex;
    return this._select.options[selected].value;
  }

  setValue(val) {
    let idx = 0;
    for (const option of this._select.options) {
      if (option.textContent == val) {
        this._select.selectedIndex = idx;
        break;
      }
      idx++;
    }
  }
}

customElements.define("enum-input", EnumInput);
