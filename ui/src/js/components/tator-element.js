export const svgNamespace = "http://www.w3.org/2000/svg";

import variables from "/static/css/variables.css" with { type: "css" };
import base from "/static/css/base.css" with { type: "css" };
import text from "/static/css/text.css" with { type: "css" };
import reset from "/static/css/reset.css" with { type: "css" };
import utilities from "/static/css/utilities.css" with { type: "css" };

export class TatorElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.adoptedStyleSheets.push(variables, base, text, reset, utilities);
  }
}
