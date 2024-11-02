import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TableViewFilter extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("table-view-filter").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._addConditionButton = this._shadow.getElementById(
      "add-condition-button"
    );
    this._conditionGroup = this._shadow.getElementById("condition-group");

    this._search = this._shadow.getElementById("table-view-filter--search");
    this._cancel = this._shadow.getElementById("table-view-filter--cancel");
  }

  connectedCallback() {
    this._search.addEventListener("click", this._getConditionValues.bind(this));
    this._cancel.addEventListener("click", this._toggleFilterWindow.bind(this));
  }

  static get observedAttributes() {
    return ["type"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "type":
        this.type = newValue;
        break;
    }
  }

  _toggleFilterWindow() {
    if (this.getAttribute("hidden") === null) {
      this.setAttribute("hidden", "");
    } else {
      this.removeAttribute("hidden");
    }
  }

  _getConditionValues() {
    const values = Array.from(this._conditionGroup.children).map((condition) =>
      condition._processConditionValue()
    );

    if (values.findIndex((val) => !val) > -1) {
      return;
    }

    this.setAttribute("hidden", "");

    if (this.type === "Group") {
      const { groupSearchParams } = store.getState();

      const newGroupSearchParams = {
        Group: {
          ...groupSearchParams.Group,
          filter: values,
        },
        User: {
          ...groupSearchParams.User,
          filter: values,
        },
      };

      store.getState().setGroupSearchParams(newGroupSearchParams);
    } else if (this.type === "Policy") {
      const { policySearchParams } = store.getState();

      const newPolicySearchParams = {
        ...policySearchParams,
        filter: values,
      };

      store.getState().setPolicySearchParams(newPolicySearchParams);
    }
  }
}

customElements.define("table-view-filter", TableViewFilter);
