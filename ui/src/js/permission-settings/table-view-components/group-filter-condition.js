import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

const CATEGORY_CHOICES = [
  { label: "Group Name", value: "groupName" },
  { label: "Group ID", value: "groupId" },
  { label: "User ID", value: "userId" },
];
const MODIFIER_CHOICES = {
  STRING: [
    { label: "includes", value: "includes" },
    { label: "not include", value: "not include" },
  ],
  NUMBER: [
    { label: "=", value: "=" },
    { label: ">=", value: ">=" },
    { label: "<=", value: "<=" },
  ],
};

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

    this._div.appendChild(this._categoryInput);
    this._div.appendChild(this._modifierInput);
    this._div.appendChild(this._valueInput);
    this._div.appendChild(this._deleteConditionButton);

    this._categoryInput.choices = CATEGORY_CHOICES;
    this._modifierInput.choices = MODIFIER_CHOICES.STRING;
  }
}

customElements.define("group-filter-condition", GroupFilterCondition);
