import { TatorElement } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";

export class TextArea extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-1"
    );
    this._shadow.appendChild(label);
    this.label = label;

    this._name = document.createElement("span");
    this._name.setAttribute("class", "col-4");
    label.appendChild(this._name);

    this._input = document.createElement("textarea");
    this._input.setAttribute("class", "form-control input-sm col-8");
    this._input.setAttribute("type", "text");
    label.appendChild(this._input);

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

    this.getValue = this._validateString;

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
        this._name.textContent = newValue;
        break;
      case "type":
        switch (newValue) {
          case "string":
            this.getValue = this._validateString;
            break;
          case "json":
            this.getValue = this._validateJSON;
            this._input.addEventListener("change", () => {
              this._input.value = this._prettyPrint(this._input.value);
            });
            break;
        }
        break;
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

  set default(val) {
    this._default = val;
  }

  /**
   * @param {string} val - Style string associated with the attribute type
   */
  setStyle(val) {
    if (typeof val != "string") {
      console.warn(`Provided style is not a string`);
      return;
    }

    var styleTokens = val.split(" ");
    for (const token of styleTokens) {
      if (token.includes("label-css-add-")) {
        var classAdd = token.split("label-css-add-")[1];
        this._name.classList.add(classAdd);
      } else if (token.includes("label-css-rem")) {
        var classRem = token.split("label-css-rem-")[1];
        this._name.classList.remove(classRem);
      } else if (token.includes("field-css-add")) {
        var classAdd = token.split("field-css-add-")[1];
        this._input.classList.add(classAdd);
      } else if (token.includes("field-css-rem")) {
        var classRem = token.split("field-css-rem-")[1];
        this._input.classList.remove(classRem);
      } else if (token.includes("css-add-")) {
        var classAdd = token.split("css-add-")[1];
        this.label.classList.add(classAdd);
      } else if (token.includes("css-rem-")) {
        var classRem = token.split("css-rem-")[1];
        this.label.classList.add(classRem);
      }
    }
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue("");
    }
  }

  _validateString() {
    return this._input.value;
  }

  _validateJSON() {
    let val = this._input.value;
    try {
      JSON.parse(val);
    } catch (e) {
      //Error
      //JSON is not okay
      return null;
    }

    return val;
  }

  setValue(val) {
    this._input.value = val;
  }

  changed() {
    return this.getValue() !== this._default;
  }

  _prettyPrint(val) {
    var obj = JSON.parse(val);
    return JSON.stringify(obj, undefined, 4);
  }
}

customElements.define("text-area", TextArea);
