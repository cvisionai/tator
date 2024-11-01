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
  }

  connectedCallback() {}
}

customElements.define("table-view-filter", TableViewFilter);
