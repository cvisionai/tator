class BoolInput extends TatorElement {
  constructor() {
    super();

    const fieldset = document.createElement("fieldset");
    this._shadow.appendChild(fieldset);

    const div = document.createElement("div");
    div.setAttribute("class", "radio-slide-wrap d-flex flex-justify-between flex-items-center");
    fieldset.appendChild(div);

    this._legend = document.createElement("legend");
    div.appendChild(this._legend);

    const controls = document.createElement("div");
    controls.setAttribute("class", "d-flex flex-items-center col-8");
    div.appendChild(controls);

    this._on = document.createElement("input");
    this._on.setAttribute("class", "sr-only");
    this._on.setAttribute("type", "radio");
    this._on.setAttribute("id", "on");
    this._on.setAttribute("name", "asdf");
    this._on.checked = true;
    controls.appendChild(this._on);

    this._onLabel = document.createElement("label");
    this._onLabel.setAttribute("for", "on");
    controls.appendChild(this._onLabel);

    const off = document.createElement("input");
    off.setAttribute("class", "sr-only");
    off.setAttribute("type", "radio");
    off.setAttribute("id", "off");
    off.setAttribute("name", "asdf");
    controls.appendChild(off);

    this._offLabel = document.createElement("label");
    this._offLabel.setAttribute("for", "off");
    controls.appendChild(this._offLabel);

    const span = document.createElement("span");
    span.setAttribute("class", "radio-slide rounded-2");
    controls.appendChild(span);

    this._on.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
      this._onLabel.blur();
      this._offLabel.blur();
    });

    off.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
      this._onLabel.blur();
      this._offLabel.blur();
    });

    span.addEventListener("click", () => {
      if (this._on.checked) {
        this._offLabel.click();
      } else {
        this._onLabel.click();
      }
    });
  }

  static get observedAttributes() {
    return ["name", "on-text", "off-text"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._legend.textContent = newValue;
        break;
      case "on-text":
        this._onLabel.textContent = newValue;
        break;
      case "off-text":
        this._offLabel.textContent = newValue;
        break;
    }
  }

  getValue() {
    return this._on.checked;
  }

  setValue(val) {
    if (val) {
      this._onLabel.click();
    } else {
      this._offLabel.click();
    }
  }
}

customElements.define("bool-input", BoolInput);
