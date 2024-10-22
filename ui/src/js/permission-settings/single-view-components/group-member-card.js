import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class GroupMemberCard extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("group-member-card").content;
    this._shadow.appendChild(template.cloneNode(true));
  }

  connectedCallback() {}

  /**
   * @param {object} val
   */
  set data(val) {
    this._data = val;
  }
}

customElements.define("group-member-card", GroupMemberCard);
