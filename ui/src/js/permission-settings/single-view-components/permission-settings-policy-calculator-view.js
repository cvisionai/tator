import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class PermissionSettingsPolicyCalculatorView extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("policy-calculator-view").content;
    this._shadow.appendChild(template.cloneNode(true));
  }

  connectedCallback() {}
}

customElements.define(
  "permission-settings-policy-calculator-view",
  PermissionSettingsPolicyCalculatorView
);
