export const svgNamespace = "http://www.w3.org/2000/svg";

const styles = window.top.document.styleSheets;
const sheets = [];
for (const ruleImport of styles[0].cssRules) {
  // TODO: we could selectively adopt stylesheets based on the current view by adding a conditional continue here.
  for (const rule of ruleImport.styleSheet.cssRules) {
    const sheet = new CSSStyleSheet();
    sheet.replace(rule.cssText);
    sheets.push(sheet);
  }
}

export class TatorElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.adoptedStyleSheets = sheets;
  }
}
