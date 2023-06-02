import { TatorElement } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";

export class CheckboxInput extends TatorElement {
  constructor() {
    super();

    this.label = document.createElement("label");
    this.label.setAttribute("class", "d-flex flex-items-center py-1");
    this._shadow.appendChild(this.label);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "checkbox");
    this._input.setAttribute("type", "checkbox");
    this.label.appendChild(this._input);

    this.styleSpan = document.createElement("span");
    this.styleSpan.setAttribute("class", "px-1");
    this.label.appendChild(this.styleSpan);

    this._name = document.createTextNode("");
    this.styleSpan.appendChild(this._name);

    this._input.addEventListener("change", () => {
      if (this.getValue() === null) {
        this._input.classList.add("has-border");
        this._input.classList.add("is-invalid");
      } else {
        this._input.classList.remove("has-border");
        this._input.classList.remove("is-invalid");
      }
      this.dispatchEvent(new Event("change"));
    });

    this._input.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    this._input.addEventListener("blur", () => {
      document.body.classList.remove("shortcuts-disabled");
    });
  }

  static get observedAttributes() {
    return ["name", "type"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
        this.name = newValue;
        break;
      case "type":
        switch (newValue) {
          case "number":
            this.getValue = this.getValueAsNumber;
            break;
          case "radio":
            this.type = "radio";
            break;
        }
    }
  }

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._input.removeAttribute("readonly");
      this._input.classList.remove("disabled");
    } else {
      this._input.setAttribute("readonly", "");
      this._input.classList.add("disabled");
    }
  }

  set disabled(val) {
    this._input.disabled = val;
  }

  set default(val) {
    if (val.checked) {
      return (this._default = val.id);
    } else {
      return (this._default = null);
    }
  }

  set _checked(val) {
    return (this._input.checked = val);
  }

  changed() {
    return this.getValue() !== this._default;
  }

  reset() {
    // Go back to default value
    if (typeof this._checked !== "undefined") {
      this._input.checked = this._checked;
    } else {
    }
  }

  setValue(val) {
    this._input.value = val.id;
    this._checked = val.checked;
    if (val.data) {
      this.setData(val.data);
    }
  }

  getValue() {
    if (this.getChecked()) {
      return decodeURI(this._input.value);
    } else {
      return null;
    }
  }

  getValueAsNumber() {
    if (this.getChecked()) {
      return Number(this._input.value);
    } else {
      return null;
    }
  }

  getChecked() {
    return this._input.checked;
  }

  setData(val) {
    return (this._data = val);
  }

  getData() {
    if (this._data) {
      return this._data;
    } else {
      return null;
    }
  }
}

customElements.define("checkbox-input", CheckboxInput);
