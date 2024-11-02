import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

const CATEGORY_CHOICES = [
  { label: "Entity Type", value: "entityType" },
  { label: "Entity ID", value: "entityId" },
  { label: "Target Type", value: "targetType" },
  { label: "Target ID", value: "targetId" },
];
const MODIFIER_CHOICES = {
  TYPE: [
    { label: "Equals", value: "equals" },
    { label: "Does Not Euqal", value: "not equal" },
  ],
  ID: [
    { label: "Equals", value: "==" },
    { label: "Does Not Euqal", value: "!=" },
    { label: ">=", value: ">=" },
    { label: "<=", value: "<=" },
    { label: "Is one of (Comma-seperated)", value: "in" },
  ],
};
const VALUE_CHOICES = {
  ENTITY: [
    { label: "User", value: "user" },
    { label: "Group", value: "group" },
    { label: "Organization", value: "organization" },
  ],
  TARGET: [
    { label: "Project", value: "project" },
    { label: "Media", value: "media" },
    { label: "Localization", value: "localization" },
    { label: "State", value: "state" },
    { label: "File", value: "file" },
    { label: "Section", value: "section" },
    { label: "Algorithm", value: "algorithm" },
    { label: "Version", value: "version" },
    { label: "Organization", value: "target_organization" },
    { label: "Group", value: "target_group" },
    { label: "Job Cluster", value: "job_cluster" },
    { label: "Bucket", value: "bucket" },
    { label: "Hosted Template", value: "hosted_template" },
  ],
};

export class PolicyFilterCondition extends TatorElement {
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

    this._typeInput = document.createElement("enum-input");
    this._typeInput.setAttribute("class", "col-4");
    this._typeInput.setAttribute("name", "Value");
    this._typeInput.setAttribute("style", "margin-left: 15px");

    this._idInput = document.createElement("text-input");
    this._idInput.setAttribute("class", "col-4");
    this._idInput.setAttribute("name", "Value");
    this._idInput.setAttribute("style", "margin-left: 15px");
    this._idInput.setAttribute("hidden", "");

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
    this._div.appendChild(this._typeInput);
    this._div.appendChild(this._idInput);
    this._div.appendChild(this._deleteConditionButton);

    this._categoryInput.choices = CATEGORY_CHOICES;
    this._modifierInput.choices = MODIFIER_CHOICES.TYPE;
    this._typeInput.choices = VALUE_CHOICES.ENTITY;

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
    this._typeInput.clear();
    this._idInput.setValue(null);

    if (this._categoryInput.getValue() === "entityType") {
      this._modifierInput.choices = MODIFIER_CHOICES.TYPE;
      this._typeInput.removeAttribute("hidden");
      this._typeInput.choices = VALUE_CHOICES.ENTITY;
      this._idInput.setAttribute("hidden", "");
    } else if (this._categoryInput.getValue() === "targetType") {
      this._modifierInput.choices = MODIFIER_CHOICES.TYPE;
      this._typeInput.removeAttribute("hidden");
      this._typeInput.choices = VALUE_CHOICES.TARGET;
      this._idInput.setAttribute("hidden", "");
    } else {
      this._modifierInput.choices = MODIFIER_CHOICES.ID;
      this._idInput.removeAttribute("hidden");
      this._idInput.setAttribute("type", "int");
      this._typeInput.setAttribute("hidden", "");
    }
  }
  _userSelectedModifier() {
    // Remove existing choices
    this._typeInput.clear();
    this._idInput.setValue(null);

    if (
      this._categoryInput.getValue() === "entityId" ||
      this._categoryInput.getValue() === "targetId"
    ) {
      if (this._modifierInput.getValue() === "in") {
        this._idInput.setAttribute("type", "string");
        this._idInput._input.setAttribute("placeholder", "");
      } else {
        this._idInput.setAttribute("type", "int");
      }
    }
  }

  _processConditionValue() {
    this._typeInput._select.classList.remove("has-border");
    this._typeInput._select.classList.remove("is-invalid");
    this._idInput._input.classList.remove("has-border");
    this._idInput._input.classList.remove("is-invalid");

    const categoryValue = this._categoryInput.getValue();
    const modifierValue = this._modifierInput.getValue();
    const typeValue = this._typeInput.getValue();
    const idValue = this._idInput.getValue();

    if (categoryValue === "entityType" || categoryValue === "targetType") {
      if (typeValue) {
        return {
          category: categoryValue,
          modifier: modifierValue,
          value: typeValue,
        };
      } else {
        this._typeInput._select.classList.add("has-border");
        this._typeInput._select.classList.add("is-invalid");
        return null;
      }
    }
    if (categoryValue === "entityId" || categoryValue === "targetId") {
      if (modifierValue === "in") {
        const values = idValue
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
          this._idInput._input.classList.add("has-border");
          this._idInput._input.classList.add("is-invalid");
          return null;
        }
      } else {
        if (idValue) {
          return {
            category: categoryValue,
            modifier: modifierValue,
            value: idValue,
          };
        } else {
          this._idInput._input.classList.add("has-border");
          this._idInput._input.classList.add("is-invalid");
          return null;
        }
      }
    }
  }

  _deleteSelf() {
    this.remove();
  }
}

customElements.define("policy-filter-condition", PolicyFilterCondition);
