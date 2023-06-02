import { TatorElement } from "../../tator-element.js";

export class RadioSet extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-1"
    );
    this._shadow.appendChild(div);

    this._name = document.createTextNode("");
    div.appendChild(this._name);

    //
    this._setName = "radio-set";
    this._inputs = [];

    this._inputDiv = document.createElement("div");
    this._inputDiv.setAttribute(
      "class",
      "d-flex flex-row flex-wrap flex-justify-between col-8"
    );
    div.appendChild(this._inputDiv);

    // default 2 columns
    this._colSize = "col-6";
  }

  static get observedAttributes() {
    return ["name", "type"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
        this._setName = encodeURI(newValue);
        break;
      case "type":
        switch (newValue) {
          case "number":
            this.getValue = this.getValueAsNumber;
            this.type = newValue;
            break;
        }
    }
  }

  set default(val) {
    this._default = val;
  }

  reset() {
    // Go back to default value
    if (typeof this.defaultData !== "undefined") {
      this.setValue(this.defaultData);
    } else {
      this.setValue("");
    }
  }

  set choices(val) {
    if (val && val.length) {
      for (let item of val) {
        this._newInput(item);
      }
    }
  }

  setValue(val) {
    for (let input of this._inputs) {
      console.log(`${input.value} == ${val} >>> ${input.value == val}`);
      input.checked = input.value == val;
    }
  }

  _newInput(item) {
    let radioLabelAndInput = document.createElement("label");
    radioLabelAndInput.setAttribute("class", "d-flex flex-items-center py-1");
    radioLabelAndInput.setAttribute("for", item.value);

    let radioInput = document.createElement("input");
    radioInput.setAttribute("name", this._setName);
    radioInput.setAttribute("id", item.value);
    radioInput.setAttribute("value", item.value);
    radioInput.setAttribute("type", "radio");
    radioInput.checked = item.checked;
    radioLabelAndInput.appendChild(radioInput);

    this.styleSpan = document.createElement("span");
    this.styleSpan.setAttribute("class", "px-1");
    radioLabelAndInput.appendChild(this.styleSpan);

    this._name = document.createTextNode(item.name);
    this.styleSpan.appendChild(this._name);

    return this._addInput(radioLabelAndInput, radioInput);
  }

  _addInput(radioLabelAndInput, radioInput) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("class", this._colSize);
    wrapper.appendChild(radioLabelAndInput);

    // keep track of text inputs
    this._inputs.push(radioInput);

    radioInput.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });

    return this._inputDiv.appendChild(wrapper);
  }

  // Array of the checked inputs values
  getValue() {
    let valArray = this._inputs
      .filter((input) => input.checked)
      .map((checked) => checked.value);
    return String(valArray);
  }

  getValueAsNumber() {
    let valArray = this._inputs
      .filter((input) => input.getChecked())
      .map((checked) => checked.getValue());
    return Number(valArray);
  }

  // Array of checked inputs hidden data
  // @TODO this follows current patter for some radioes to store hidden data
  // should look into setting the data as value instead? or type to data and getValue = this?
  getData() {
    return this._inputs
      .filter((input) => input.getChecked())
      .map((checked) => checked.getData());
  }

  changed() {
    const currentValue = this.getValue();
    const originalValue = this._default;

    if (currentValue && originalValue) {
      if (originalValue.length !== currentValue.length) {
        return true;
      } else {
        // if they are the same lenght they should have the same values
        for (let val of originalValue) {
          if (!currentValue.includes(val)) return true;
        }
      }
    }

    return false;
  }

  relabelInput({ value, newLabel }) {
    for (let radio of this._inputs) {
      if (Number(radio._input.value) === Number(value))
        return radio.setAttribute("name", newLabel);
    }
    return console.log("No matching input found");
  }

  removeInput({ value }) {
    for (let radio of this._inputs) {
      if (Number(radio._input.value) === Number(value)) {
        radio.setValue(false);

        let idx = this._inputs.indexOf(radio);
        this._inputs.splice(idx, 1);
        radio.remove();
        const inputWrapper = this._inputDiv.children[idx];
        // console.log(inputWrapper);
        this._inputDiv.removeChild(inputWrapper);

        return true;
      }
    }
    return console.log("No matching input found");
  }
}

customElements.define("radio-set", RadioSet);
