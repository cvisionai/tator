import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

const CATEGORY_CHOICES = [
  { label: "Group Name", value: "groupName" },
  { label: "Group ID", value: "groupId" },
  { label: "User ID", value: "userId" },
];
const MODIFIER_CHOICES = {
  NAME: [
    { label: "Includes", value: "includes" },
    { label: "Equals", value: "equals" },
    { label: "Starts with", value: "starts with" },
    { label: "Ends with", value: "ends with" },
    { label: "Does not equal", value: "not equal" },
  ],
  ID: [
    { label: "Equals", value: "==" },
    { label: "Does Not Euqal", value: "!=" },
    { label: ">=", value: ">=" },
    { label: "<=", value: "<=" },
    { label: "Is one of (Comma-seperated)", value: "in" },
  ],
};
const STRING_INPUT = [...MODIFIER_CHOICES.NAME.map((item) => item.value), "in"];

export class GroupFilterCondition extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "d-flex flex-items-center flex-grow text-gray f2"
    );
    this._div.setAttribute(
      "style",
      "border: 1px solid var(--color-charcoal--light)"
    );
    this._shadow.appendChild(this._div);
  }

  connectedCallback() {
    this._initInputs();
  }

  _initInputs() {
    this._categoryInput = document.createElement("enum-input");
    this._categoryInput.setAttribute("class", "col-4");
    this._categoryInput.setAttribute("name", "Category");
    this._categoryInput.setAttribute("style", "margin-left: 15px");

    this._modifierInput = document.createElement("enum-input");
    this._modifierInput.setAttribute("class", "col-4");
    this._modifierInput.setAttribute("name", "Modifier");
    this._modifierInput.setAttribute("style", "margin-left: 15px");

    this._valueInput = document.createElement("text-input");
    this._valueInput.setAttribute("class", "col-4");
    this._valueInput.setAttribute("name", "Value");
    this._valueInput.setAttribute("style", "margin-left: 15px");

    this._deleteConditionButton = document.createElement(
      "entity-delete-button"
    );
    this._deleteConditionButton.setAttribute(
      "style",
      "margin-left: 15px; margin-right: 8px"
    );
    this._deleteConditionButton.addEventListener(
      "click",
      this._deleteSelf.bind(this)
    );

    this._div.appendChild(this._categoryInput);
    this._div.appendChild(this._modifierInput);
    this._div.appendChild(this._valueInput);
    this._div.appendChild(this._deleteConditionButton);

    this._categoryInput.choices = CATEGORY_CHOICES;
    this._modifierInput.choices = MODIFIER_CHOICES.NAME;
    this._valueInput.setAttribute("type", "string");

    this._categoryInput.addEventListener(
      "change",
      this._userSelectedCategory.bind(this)
    );
    this._modifierInput.addEventListener(
      "change",
      this._userSelectedModifier.bind(this)
    );
  }

  _userSelectedCategory() {
    // Remove existing choices
    this._modifierInput.clear();
    this._valueInput.setValue(null);

    if (this._categoryInput.getValue() === "groupName") {
      this._modifierInput.choices = MODIFIER_CHOICES.NAME;
      this._valueInput.setAttribute("type", "string");
      this._valueInput._input.setAttribute("placeholder", "");
    } else {
      this._modifierInput.choices = MODIFIER_CHOICES.ID;
      this._valueInput.setAttribute("type", "int");
    }
  }
  _userSelectedModifier() {
    // Remove existing choices
    this._valueInput.setValue(null);

    if (STRING_INPUT.includes(this._modifierInput.getValue())) {
      this._valueInput.setAttribute("type", "string");
      this._valueInput._input.setAttribute("placeholder", "");
    } else {
      this._valueInput.setAttribute("type", "int");
    }
  }

  _processConditionValue() {
    this._valueInput._input.classList.remove("has-border");
    this._valueInput._input.classList.remove("is-invalid");

    const categoryValue = this._categoryInput.getValue();
    const modifierValue = this._modifierInput.getValue();
    const valueValue = this._valueInput.getValue();

    if (categoryValue === "groupName") {
      if (valueValue) {
        return {
          category: categoryValue,
          modifier: modifierValue,
          value: valueValue,
        };
      } else {
        this._valueInput._input.classList.add("has-border");
        this._valueInput._input.classList.add("is-invalid");
        return null;
      }
    }
    if (categoryValue === "groupId" || categoryValue === "userId") {
      if (modifierValue === "in") {
        const values = valueValue
          .split(",")
          .map((val) => parseInt(val))
          .filter((val) => !isNaN(val));

        if (values.length) {
          return {
            category: categoryValue,
            modifier: modifierValue,
            value: values,
          };
        } else {
          this._valueInput._input.classList.add("has-border");
          this._valueInput._input.classList.add("is-invalid");
          return null;
        }
      } else {
        if (valueValue) {
          return {
            category: categoryValue,
            modifier: modifierValue,
            value: valueValue,
          };
        } else {
          this._valueInput._input.classList.add("has-border");
          this._valueInput._input.classList.add("is-invalid");
          return null;
        }
      }
    }
  }

  _deleteSelf() {
    this.remove();
  }
}

customElements.define("group-filter-condition", GroupFilterCondition);
