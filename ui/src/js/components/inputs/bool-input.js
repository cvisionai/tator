import { TatorElement } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";

export class BoolInput extends TatorElement {
  constructor() {
    super();

    const fieldset = document.createElement("fieldset");
    this._shadow.appendChild(fieldset);

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "radio-slide-wrap d-flex flex-justify-between flex-items-center"
    );
    fieldset.appendChild(div);
    this.label = div;

    this._legend = document.createElement("legend");
    this._legend.setAttribute("class", "col-4");
    div.appendChild(this._legend);

    this._controls = document.createElement("div");
    this._controls.setAttribute("class", "d-flex flex-items-center col-8");
    div.appendChild(this._controls);

    this._on = document.createElement("input");
    this._on.setAttribute("class", "hidden");
    this._on.setAttribute("type", "radio");
    this._on.setAttribute("id", "on");
    this._on.setAttribute("name", "asdf");
    this._controls.appendChild(this._on);

    this._onLabel = document.createElement("label");
    this._onLabel.setAttribute("for", "on");
    this._controls.appendChild(this._onLabel);

    this._null = document.createElement("input");
    this._null.setAttribute("class", "hidden");
    this._null.setAttribute("type", "radio");
    this._null.setAttribute("id", "null");
    this._null.setAttribute("name", "asdf");
    this._null.checked = true;
    this._controls.appendChild(this._null);

    this._off = document.createElement("input");
    this._off.setAttribute("class", "hidden");
    this._off.setAttribute("type", "radio");
    this._off.setAttribute("id", "off");
    this._off.setAttribute("name", "asdf");
    this._controls.appendChild(this._off);

    this._offLabel = document.createElement("label");
    this._offLabel.setAttribute("for", "off");
    this._offLabel.style.order = 4;
    this._controls.appendChild(this._offLabel);

    const span = document.createElement("span");
    span.setAttribute("class", "radio-slide rounded-2");
    this._controls.appendChild(span);
    this._span = span;

    const spanCircle = document.createElement("span");
    spanCircle.setAttribute("class", "radio-slide-circle null-value");
    this._span.appendChild(spanCircle);
    this._spanCircle = spanCircle;

    span.addEventListener("click", () => {
      if (this._null.checked) {
        this.setValue(true);
      } else if (this._on.checked) {
        this.setValue(false);
      } else {
        this.setValue(true);
      }

      this.dispatchEvent(new Event("change"));
      this._onLabel.blur();
      this._offLabel.blur();
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

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._on.removeAttribute("readonly");
      this._off.removeAttribute("readonly");
      this._null.removeAttribute("readonly");
      this._onLabel.removeEventListener("click", this._preventDefault);
      this._offLabel.removeEventListener("click", this._preventDefault);
    } else {
      this._on.setAttribute("readonly", "");
      this._off.setAttribute("readonly", "");
      this._null.setAttribute("readonly", "");
      this._onLabel.addEventListener("click", this._preventDefault);
      this._offLabel.addEventListener("click", this._preventDefault);
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
        this._legend.classList.add(classAdd);
      } else if (token.includes("label-css-rem")) {
        var classRem = token.split("label-css-rem-")[1];
        this._legend.classList.remove(classRem);
      } else if (token.includes("field-css-add")) {
        var classAdd = token.split("field-css-add-")[1];
        this._controls.classList.add(classAdd);
      } else if (token.includes("field-css-rem")) {
        var classRem = token.split("field-css-rem-")[1];
        this._controls.classList.remove(classRem);
      } else if (token.includes("css-add-")) {
        var classAdd = token.split("css-add-")[1];
        this.label.classList.add(classAdd);
      } else if (token.includes("css-rem-")) {
        var classRem = token.split("css-rem-")[1];
        this.label.classList.add(classRem);
      }
    }
  }

  changed() {
    console.log("bool-input: changed");
    return this.getValue() !== this._default;
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue(null);
    }
  }

  getValue() {
    if (this._null.checked) {
      return null;
    } else {
      return this._on.checked;
    }
  }

  setValue(val) {
    if (typeof val == "string") {
      console.warn("Setting bool-input from string value=" + val);
      if (val.toLowerCase().includes("true")) {
        val = true;
      } else if (val.toLowerCase().includes("false")) {
        val = false;
      } else {
        val = null;
      }
    }
    if (val) {
      this._on.checked = true;
      this._off.checked = false;
      this._null.checked = false;
      this._on.setAttribute("checked", "");
      this._off.removeAttribute("checked");
      this._null.removeAttribute("checked");

      this._spanCircle.classList.add("true-value");
      this._spanCircle.classList.remove("false-value");
      this._spanCircle.classList.remove("null-value");
      this._span.classList.remove("disable");
    } else if (val == null) {
      this._on.checked = false;
      this._off.checked = false;
      this._null.checked = true;
      this._on.removeAttribute("checked");
      this._off.removeAttribute("checked");
      this._null.setAttribute("checked", "");

      this._spanCircle.classList.remove("true-value");
      this._spanCircle.classList.remove("false-value");
      this._spanCircle.classList.add("null-value");
      this._span.classList.add("disable");
    } else {
      this._on.checked = false;
      this._off.checked = true;
      this._null.checked = false;
      this._on.removeAttribute("checked");
      this._off.setAttribute("checked", "");
      this._null.removeAttribute("checked");

      this._spanCircle.classList.remove("true-value");
      this._spanCircle.classList.add("false-value");
      this._spanCircle.classList.remove("null-value");
      this._span.classList.add("disable");
    }
  }

  setDisable(val) {
    if (val) {
      this._on.setAttribute("disabled", true);
      this._off.setAttribute("disabled", true);
      this._null.setAttribute("disabled", true);
      this._span.style.backgroundColor = "#6d7a96";
      this._span.style.cursor = "not-allowed";
    } else {
      this._on.removeAttribute("disabled");
      this._off.removeAttribute("disabled");
      this._null.removeAttribute("disabled");
      this._span.style.backgroundColor = null;
      this._span.style.cursor = null;
    }
  }

  _preventDefault(evt) {
    evt.preventDefault();
  }
}

customElements.define("bool-input", BoolInput);
