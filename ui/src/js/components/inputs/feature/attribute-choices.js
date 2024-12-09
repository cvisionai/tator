import { TatorElement } from "../../tator-element.js";

// This is a set of Object data
// You can specify the named properties each list item should have in it's object
export class AttributeChoices extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);

    this._enumDiv = document.createElement("div");
    this._enumDiv.classList.add(
      "d-flex",
      "flex-items-center",
      "form-group",
      "offset-xs-4"
    );
    this._shadow.appendChild(this._enumDiv);

    this._attrEnum = document.createElement("enum-input");
    this._attrEnum.setAttribute("class", "col-12");
    this._attrEnum._select.classList.remove("col-8");
    this._attrEnum._select.classList.add("col-12");
    this._enumDiv.appendChild(this._attrEnum);

    this._attrEnum.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: {
            name: this._attrEnum.getValue(),
          },
        })
      );
    });

    this.label = document.createElement("label");
    this.label.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-1"
    );
    this._div.appendChild(this.label);

    this._name = document.createTextNode("");
    this.label.appendChild(this._name);

    //
    this._inputs = [];
    this._rows = [];

    // Add new
    this.addNewButton = this.addNewRow({
      labelText: "Set this",
      callback: "",
    });
    this._enumDiv.appendChild(this.addNewButton);

    this._properties = null;
    this._emptyRow = null;
    this._map = new Map();

    this.addNewButton.addEventListener("click", (e) => {
      e.preventDefault();
      this._newEmptyRow();
    });
  }

  static get observedAttributes() {
    return ["name", "properties", "empty-row"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._attrEnum._name.innerHTML = newValue;
        this._name.innerHTML = "test";
        break;
      case "properties":
        this._properties = JSON.parse(newValue);
        break;
      case "empty-row":
        this._emptyRow = JSON.parse(newValue);
        break;
    }
  }

  set default(val) {
    this._default = val; // this will be an array
  }

  resetChoices() {
    this._attrEnum.resetChoices();
  }

  set choices(val) {
    this._map = new Map();
    this._attrEnum.choices = val;

    for (let type of val) {
      this._map.set(type?.extra?.name, type.extra);
    }
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue([]);
    }
  }

  _newEmptyRow() {
    let rowIndex = this._rows.length;
    let row = this._newInputRow(this._emptyRow, rowIndex);
    this._rows.push(row);
    return this._div.appendChild(row);
  }

  setValue(val) {}

  _newInputRow(val, rowIndex) {
    const attrName = this._attrEnum.getValue(),
      attrProperties = this._map.get(attrName);
    //
    let row = document.createElement("div");
    row.setAttribute("class", "d-flex text-gray flex-items-center");

    if (attrProperties !== null) {
      let propName = attrProperties.name;
      let inputType = attrProperties.dtype;
      let inputValue = attrProperties.default ? attrProperties.default : "";

      let input = this._getInput(
        inputType,
        propName,
        inputValue,
        rowIndex,
        attrProperties
      );
      row.appendChild(input);
      this._inputs[rowIndex] = input;

      const cancel = document.createElement("span");
      cancel.classList.add("f1", "clickable", "text-purple", "circle", "ml-2");
      cancel.innerText = "X";
      cancel.addEventListener("click", () => {
        this._inputs.splice(rowIndex, 1);
        input.remove();
        cancel.remove();
        const choicesSpliced = [...this._attrEnum._choices];
        choicesSpliced.push({
          value: propName,
          label: propName,
          extra: attrProperties,
        });
        this._attrEnum.resetChoices();
        this.choices = choicesSpliced;
      });
      row.appendChild(cancel);
    }
    return row;
  }

  _getInput(dtype, inputKey, inputValue, rowIndex, attrProperties) {
    let inputType = "text-input"; // string, number, float
    switch (dtype) {
      case "bool":
        inputType = "bool-input";
        break;
      case "enum":
        inputType = "enum-input";
        break;
      default:
        inputType = "text-input";
    }

    this._attrEnum.resetChoices();
    this.choices = this._attrEnum._choices.filter((choice) => {
      return inputKey !== choice.value;
    });

    let input = document.createElement(inputType);
    input.setAttribute("name", inputKey);

    input.default = inputValue;
    input.setAttribute("class", "col-12");

    if (inputType === "enum-input") {
      input.choices = attrProperties.choices.map((choice) => {
        return {
          value: choice,
          label: choice,
          extra: choice,
        };
      });
    }

    input.setValue(inputValue);

    // input.addEventListener("change", () => {
    // 	this.dispatchEvent(new Event("change"));
    // });

    // let keyobject = {};
    // keyobject[inputKey] = input;
    // this._inputs[rowIndex].push(keyobject);

    return input;
  }

  addNewRow({ labelText = "", callback = null } = {}) {
    const labelWrap = document.createElement("label");
    labelWrap.setAttribute(
      "class",
      "f4 btn btn-charcoal btn-clear clickable btn-small col-2"
    );

    const spanTextNode = document.createElement("span");
    const spanText = document.createTextNode("");
    const labelDiv = document.createElement("div");

    // spanTextNode.setAttribute("class", "col-sm-4 col-md-3 text-gray clickable");
    spanText.nodeValue = labelText;
    spanTextNode.appendChild(spanText);

    labelWrap.append(spanTextNode);

    labelDiv.setAttribute("class", "py-2 f1 text-semibold");
    labelDiv.appendChild(labelWrap);

    return labelDiv;
  }

  getValues() {
    const attributes = {};

    // Loop through the inputs
    // # TODO this could be generalized
    // # currently this is the only thing specific to algorith-edit.js
    if (this._inputs.length > 0) {
      for (let input of this._inputs) {
        const name = input._name.innerText;
        attributes[name] = input.getValue();
      }
    }

    return attributes;
  }

  changed() {
    return this.getValue() !== this._default;
  }

  clear() {
    if (this._rows.length > 0) {
      for (let x of this._rows) {
        x.remove();
      }

      this._inputs = [];
      this._rows = [];
    }
  }
}

customElements.define("attribute-choices", AttributeChoices);
