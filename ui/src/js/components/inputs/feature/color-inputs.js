import { TatorElement } from "../../tator-element.js";

export class ColorInputs extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-items-center py-1");
    this._shadow.appendChild(label);

    const _styleSpan = document.createElement("span");
    _styleSpan.setAttribute("class", "col-4");
    label.appendChild(_styleSpan);

    this._name = document.createTextNode("");
    _styleSpan.appendChild(this._name);

    this._unspecifiedPreview = document.createElement("text-input");
    this._unspecifiedPreview.setAttribute("name", "Default");
    this._unspecifiedPreview.setAttribute("type", "color");
    this._unspecifiedPreview._input.disabled = true;
    this._unspecifiedPreview.setValue("#40E0D0");
    this._unspecifiedPreview.default = "#40E0D0";

    this._unspecifiedInput = document.createElement("checkbox-input");
    this._unspecifiedInput.setAttribute("type", "radio");
    this._unspecifiedInput.styleSpan.appendChild(this._unspecifiedPreview);
    label.appendChild(this._unspecifiedInput);

    this._customPreview = document.createElement("text-input");
    this._customPreview.setAttribute("name", "Custom");
    this._customPreview.setAttribute("type", "color");
    this._customPreview.setValue("#ffffff");
    this._customPreview.default = "#ffffff";
    label.appendChild(this._customPreview);

    this._customInput = document.createElement("checkbox-input");
    this._customInput.setAttribute("type", "radio");
    this._customInput.styleSpan.appendChild(this._customPreview);
    label.appendChild(this._customInput);

    this._unspecifiedPreview.addEventListener("click", () => {
      this._unspecifiedInput._checked = true;
      this._customInput._checked = false;
      this.dispatchEvent(new Event("change"));
    });

    this._customPreview.addEventListener("click", () => {
      this._unspecifiedInput._checked = false;
      this._customInput._checked = true;
      this.dispatchEvent(new Event("change"));
    });

    this._unspecifiedInput.addEventListener("change", () => {
      this._customInput._checked = !this._unspecifiedInput.getChecked();
      this.dispatchEvent(new Event("change"));
    });

    this._customInput.addEventListener("change", () => {
      this._unspecifiedInput._checked = !this._customInput.getChecked();
      this.dispatchEvent(new Event("change"));
    });
  }

  static get observedAttributes() {
    return ["name", "type"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
        break;
    }
  }

  set default(val) {
    this._default = val; // if null == unspecified
  }

  changed() {
    return this.getValue() !== this._default;
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue("");
    }
  }

  setValue(val) {
    if (val == null) {
      //unspecified
      this._unspecifiedInput._checked = true;
    } else {
      this._customInput._checked = true;
      this._customPreview.setValue(val);
    }
  }

  getValue() {
    // if null == unspecified
    if (this._customInput.getChecked()) {
      return this._customPreview.getValue();
    } else {
      return null;
    }
  }
}

customElements.define("color-inputs", ColorInputs);
