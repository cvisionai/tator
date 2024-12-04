import { TatorElement } from "../../tator-element.js";

export class CheckboxSet extends TatorElement {
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
        break;
      case "type":
        switch (newValue) {
          case "number":
            this.getValue = this.getValueAsNumber;
            this.type = newValue;
            break;
          case "radio":
            this.getValue = this.getValueAsRadio;
            this.type = newValue;
            break;
        }
    }
  }

  set default(val) {
    this.defaultData = val; // full data needed to reset FE

    // default is apples to apples with getValue to check for Array of ids
    this._default = val
      .filter((data) => data.checked)
      .map((checked) => checked.id);
  }

  reset() {
    // Go back to default value
    if (typeof this.defaultData !== "undefined") {
      this.setValue(this.defaultData);
    } else {
      this.setValue([]);
    }
  }

  setValue(val) {
    this._inputDiv.innerHTML = "";
    this._inputs = [];

    if (val && val.length) {
      for (let item of val) {
        this._newInput(item);
      }
    }
  }

  _newInput(item) {
    let checkbox = document.createElement("checkbox-input");
    checkbox.setAttribute("name", `${item.name}`);
    if (this.type != undefined) {
      checkbox.setAttribute("type", this.type);
    }
    checkbox.setValue(item);
    checkbox.default = item;

    return this._addInput(checkbox);
  }

  _addInput(checkbox) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("class", this._colSize);
    wrapper.appendChild(checkbox);

    // keep track of text inputs
    this._inputs.push(checkbox);

    checkbox.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });

    return this._inputDiv.appendChild(wrapper);
  }

  // Array of the checked inputs values
  getValue() {
    return this._inputs
      .filter((input) => input.getChecked())
      .map((checked) => checked.getValue());
  }

  getValueAsNumber() {
    return this._inputs
      .filter((input) => input.getChecked())
      .map((checked) => Number(checked.getValue()));
  }

  getValueAsRadio() {
    // should just get 1 checked, return as string not array
    return String(this.getValue());
  }

  // Array of checked inputs hidden data
  // @TODO this follows current pattern for some checkboxes to store hidden data
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
    for (let checkbox of this._inputs) {
      if (Number(checkbox._input.value) === Number(value))
        return checkbox.setAttribute("name", newLabel);
    }
    return console.log("No matching input found");
  }

  /**
   *
   * @param {list} val
   * Map(name: [name: "Atribute 1", checked: true ])
   * @returns updates the checkbox elements related to val.name to checked or unchecked
   */
  updateValue(checkedList) {
    for (let checkbox of this._inputs) {
      const currentVal = decodeURI(checkbox._input.value);
      checkbox._checked = checkedList.includes(currentVal);
    }
  }

  removeInput({ value }) {
    for (let checkbox of this._inputs) {
      if (Number(checkbox._input.value) === Number(value)) {
        checkbox.setValue(false);

        let idx = this._inputs.indexOf(checkbox);
        this._inputs.splice(idx, 1);
        checkbox.remove();
        const inputWrapper = this._inputDiv.children[idx];
        // console.log(inputWrapper);
        this._inputDiv.removeChild(inputWrapper);

        return true;
      }
    }
    return console.log("No matching input found");
  }
}

customElements.define("checkbox-set", CheckboxSet);
