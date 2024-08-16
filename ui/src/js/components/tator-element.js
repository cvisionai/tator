export const svgNamespace = "http://www.w3.org/2000/svg";

class StyleHolder {
  constructor() {
    this.css = new CSSStyleSheet();
    this.css.insertRule("* { visibility: hidden }");
    this.ready = false;
    this.elements = [];
    fetch("/static/index.css")
      .then((body) => body.text())
      .then((text) => {
        this.css.replaceSync(text);
      });
  }
}

let global_style = new StyleHolder();

export class TatorElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.adoptedStyleSheets = [global_style.css];
  }
}
