import "../../css/styles.scss";

export const svgNamespace = "http://www.w3.org/2000/svg";

class StyleHolder {
  constructor() {
    this.css = new CSSStyleSheet();
    this.ready = false;
    this.elements=[];
    fetch('/static/components.css').then(body => body.text())
    .then(text => {
        this.css.replaceSync(text);
        this.ready = true;
        for (let element of this.elements)
        {
          element.style.visibility = 'visible';
        }
      });
  }
}

let global_style = new StyleHolder();

export class TatorElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({mode: "open"});

    // Create a css link for components.
   
    this._shadow.adoptedStyleSheets = [global_style.css];
    //css.addEventListener("load", () => {this.style.visibility = "visible";});
  }

  connectedCallback() {
    if (global_style.ready != true)
    {
      this.style.visibility = "hidden";
      global_style.elements.push(this);
    }
  }
}
