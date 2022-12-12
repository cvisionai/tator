import { TatorElement } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";
import { svgNamespace } from "../tator-element.js";

export class EnumInput extends TatorElement {
  constructor() {
    super();

    this.label = document.createElement("label");
    this.label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
    this.label.style.position = "relative";
    this._shadow.appendChild(this.label);

    this._name = document.createTextNode("");
    this.label.appendChild(this._name);

    const span = document.createElement("span");
    span.setAttribute("class", "sr-only");
    this.label.appendChild(span);

    this._select = document.createElement("select");
    this._select.setAttribute("class", "form-select has-border select-sm col-8");
    this.label.appendChild(this._select);

    // Add unselectable option for null values.
    this._null = document.createElement("option");
    this._null.setAttribute("value", "");
    this._null.setAttribute("disabled", "");
    this._null.setAttribute("hidden", "");
    this._null.textContent = "null";
    this._select.appendChild(this._null);

    // Add unselectable option for undefined values.
    this._undefined = document.createElement("option");
    this._undefined.setAttribute("value", "");
    this._undefined.setAttribute("disabled", "");
    this._undefined.setAttribute("hidden", "");
    this._undefined.textContent = "undefined";
    this._select.appendChild(this._undefined);

    this._svg = document.createElementNS(svgNamespace, "svg");
    this._svg.setAttribute("class", "text-gray");
    this._svg.setAttribute("id", "icon-chevron-down");
    this._svg.setAttribute("viewBox", "0 0 24 24");
    this._svg.setAttribute("height", "1em");
    this._svg.setAttribute("width", "1em");
    this.label.appendChild(this._svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M5.293 9.707l6 6c0.391 0.391 1.024 0.391 1.414 0l6-6c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z");
    this._svg.appendChild(path);

    this._select.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });
    this._isMultiple = false;
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

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._select.removeAttribute("disabled");
    } else {
      this._select.setAttribute("disabled", "");
    }
  }

  set multiple(val) {
    this._select.multiple = true;
    this._isMultiple = true;
    this._select.style.height = "100px";
    this._svg.hidden = true;
  }

  resetChoices() {
    this._select.innerHTML = "";
  }

  set choices(val) {
    let selectedDefault = null;
    this._choices = val;
    // Add attribute type choices.
    for (const choice of val) {
      const option = document.createElement("option");
      option.setAttribute("value", choice.value);
      if ('label' in choice) {
        option.textContent = choice.label;
      } else {
        option.textContent = choice.value;
      }
      if (choice.selected) {
        selectedDefault = choice.value;
      }
      this._select.appendChild(option);
    }
    if (selectedDefault !== null) {
      this.setValue(selectedDefault)
    }
  }

  set default(val) {
    this._default = val;
  }

  // checks if the current value equals the default
  changed(){
    return String(this.getValue()) !== String(this._default);
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this._undefined.setAttribute("selected", "");
    }
  }

  getValue() {
    if (this._select.options.length !== 0) {
      if (this._isMultiple) {
        let result = [];
        for (let option of this._select.options) {
          if (option.selected) {
            result.push(option.value);
          }
        }
        return result.join();
      } else {
        const selected = this._select.selectedIndex;
        if (typeof this._select.options[selected] !== "undefined") {
          return this._select.options[selected].value;
        }
      }

    }
    
    return null;
  }

  setValue(val) {
    console.log("Set value " + val);
    let idx = 0;
    if (typeof val === "undefined") {
      this._undefined.setAttribute("selected", "");
    } else if (val === null) {
      this._null.setAttribute("selected", "");
    } else {
      if (this._isMultiple) {
        let valueArray = Array.isArray(val) ? val : [val];
        for (let selected of valueArray) {
          for (const option of this._select.options) {
            if (option.value == selected) {
              this._select.selectedIndex = idx;
              break;
            }
            idx++;
          }
        }
      } else {        
        for (const option of this._select.options) {
          if (option.value == val) {
            this._select.selectedIndex = idx;
            break;
          }
          idx++;
        }
      }
    }
  }

  getChoices() {
    var choiceList = [];
    for (const option of this._select.options) {
      choiceList.push(option.value);
    }
    return choiceList;
  }

  
  /**
   * Clears the options. Useful for resetting the menu options.
   */
  clear() {
    while (this._select.options.length > 0) {
      this._select.options.remove(0);
    }
  }
}

customElements.define("enum-input", EnumInput);