import { TatorElement } from "./tator-element.js";

export class InlineWarning extends TatorElement {
  constructor() {
    super();
  }

  div() {
    return this._inlineWarningDiv();
  }

  _inlineWarningDiv() {
    // Div
    this.inlineWarning = document.createElement("div");
    this.inlineWarning.setAttribute("class", "text-red d-flex inline-warning");
    this.inlineWarning.hidden = true;

    return this.inlineWarning;
  }

  showCaution(msg) {
    // Clear whatever was there
    this.clear();

    // Append new msg
    this.inlineWarning.classList.add("caution");
    this.inlineWarning.append(msg);

    // Show
    return (this.inlineWarning.hidden = false);
  }

  show(msg) {
    // Clear whatever was there
    this.clear();

    // Append new msg
    this.inlineWarning.append(msg);

    // Show
    return (this.inlineWarning.hidden = false);
  }

  hide() {
    this.clear();
    return (this.inlineWarning.hidden = true);
  }

  clear() {
    this.inlineWarning.classList.remove("caution");
    this.inlineWarning.innerHTML = "";
  }
}

customElements.define("inline-warning", InlineWarning);
