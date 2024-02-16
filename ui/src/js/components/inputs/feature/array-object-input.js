import { TatorElement } from "../../tator-element.js";

// This is a set of Object data
// You can specify the named properties each list item should have in it's object
export class ArrayObjectInput extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);

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
      labelText: "+ New",
      callback: "",
    });
    this._div.appendChild(this.addNewButton);

    this._properties = null;
    this._emptyRow = null;

    this.addNewButton.addEventListener("click", (e) => {
      e.preventDefault();
      this._newEmptyRow();
      this.dispatchEvent(
        new CustomEvent("new-input", { detail: { name: this._name } })
      );
    });
  }

  static get observedAttributes() {
    return ["name", "properties", "empty-row"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
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
    return this.addNewButton.before(row);
  }

  setValue(val) {
    if (val !== null) {
      // Value is an array of objects
      if (Array.isArray(val)) {
        for (let [i, obj] of val.entries()) {
          // console.log(obj)
          let row = this._newInputRow(obj, i);
          this._rows.push(row);
          this.addNewButton.before(row);
        }
      } else if (typeof val == "object") {
        // for (let [i, obj] of val.entries()) {
        let rowIndex = this._rows.length;
        let row = this._newInputRow(val, rowIndex);
        this._rows.push(row);
        return this.addNewButton.before(row);
        // }
      }
    }
  }

  _newInputRow(val, rowIndex) {
    // let testObj = { name: "test", value: { description: "test" } };
    // let testProps = { name: "text-input", value: { description: "text-input" } };
    // let styleDiv = document.createElement("div");
    // styleDiv.innerHTML = `<span class="px-6">&nbsp;</span>`;

    let row = document.createElement("div");
    row.setAttribute("class", "d-flex flex-column text-gray");

    // row.appendChild(styleDiv);

    let props = this._properties;
    this._inputs[rowIndex] = [];

    if (props !== null) {
      for (let i in props) {
        // console.log(`${i} : ${props[i]}`)
        let propName = i;
        let inputType = props[i];
        let inputValue = val[i];

        if (typeof inputType !== "object") {
          let input = this._getInput(inputType, propName, inputValue, rowIndex);
          row.appendChild(input);
        } else {
          let objectRow = this.drillIntoObj(
            inputValue,
            inputType,
            propName,
            rowIndex
          );
          row.appendChild(objectRow);
        }
      }
    }
    return row;
  }

  drillIntoObj(valueObj, propObj, propName, rowIndex) {
    let label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-row text-gray");

    let styleDiv = document.createElement("div");
    styleDiv.innerHTML = `<span class="px-6">&nbsp;</span><span class="px-6">&nbsp;</span>`;
    label.appendChild(styleDiv);

    let name = document.createTextNode(`${propName}`);
    label.appendChild(name);

    for (let i in propObj) {
      // console.log(`${i} : ${propObj[i]}`)
      let propName = i;
      let inputType = propObj[i];
      let inputValue = valueObj[i];

      if (typeof inputType !== "object") {
        let input = this._getInput(inputType, propName, inputValue, rowIndex);
        label.appendChild(input);
      } else {
        let objectRow = this.drillIntoObj(
          inputValue,
          inputType,
          propName,
          rowIndex
        );
        label.appendChild(objectRow);
      }
    }
    return label;
  }

  _getInput(inputType, inputKey, inputValue, rowIndex) {
    // let styleDiv = document.createElement("div");
    // styleDiv.innerHTML = `<span class="px-6">&nbsp;</span><span class="px-6">&nbsp;</span>`;

    let input = document.createElement(inputType);
    input.setAttribute("name", inputKey);
    input.setValue(inputValue);
    input.default = inputValue;
    input.setAttribute("class", "col-12");

    input.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });

    let keyobject = {};
    keyobject[inputKey] = input;
    this._inputs[rowIndex].push(keyobject);

    return input;
  }

  addNewRow({ labelText = "", callback = null } = {}) {
    const labelWrap = document.createElement("label");
    labelWrap.setAttribute(
      "class",
      "d-flex flex-items-center py-1 position-relative f1"
    );

    const spanTextNode = document.createElement("span");
    const spanText = document.createTextNode("");
    const labelDiv = document.createElement("div");

    spanTextNode.setAttribute("class", "col-sm-4 col-md-3 text-gray clickable");
    spanText.nodeValue = labelText;
    spanTextNode.appendChild(spanText);

    labelWrap.append(spanTextNode);

    labelDiv.setAttribute("class", "py-2 f1 text-semibold");
    labelDiv.appendChild(labelWrap);

    return labelDiv;
  }

  getValue() {
    const val = [];
    let rowVal = {};

    // Loop through the inputs
    // # TODO this could be generalized
    // # currently this is the only thing specific to algorith-edit.js
    if (this._inputs.length > 0) {
      for (let inputData of this._inputs) {
        rowVal = { ...this._emptyRow };
        rowVal.name = inputData[0].name.getValue();
        rowVal.value = inputData[1].value.getValue();

        // for (let [key, input] of Object.entries(inputData)) {
        //   console.log(rowVal.hasOwnProperty(key));
        //     //if (rowVal.hasOwnProperty(key) && typeof rowVal[key] !== "object") {
        //     if (typeof rowVal[key] !== "undefined" && typeof rowVal[key] !== "object") {
        //       rowVal[key] = input.getValue();
        //     } else {
        //       // # todo for nested objects
        //       if(typeof rowVal[key] === "object"){
        //         this._drillIntoSetProps(rowVal[key], key, input);
        //       }
        //     }
        //   }

        // }
        // console.log(rowVal);
        let emptyRow = rowVal.name === "" && rowVal.value === "";
        if (!emptyRow) {
          val.push(rowVal);
        }
      }
    }

    return val;
  }

  // _drillIntoSetProps(object, key, input){
  //   for (let [property, value] of Object.entries(object)) {
  //     if (key == property) {
  //       object[key] = input.getValue();
  //     } else if (typeof value === "object") {
  //       this._drillIntoSetProps(value, key, input);
  //     }
  //   }
  // }

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

customElements.define("array-object-input", ArrayObjectInput);
