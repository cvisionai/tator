import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class PolicyFilterCondition extends TatorElement {
  constructor() {
    super();
  }
}

customElements.define("policy-filter-condition", PolicyFilterCondition);
