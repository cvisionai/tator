import "../../css/styles.scss";

export const svgNamespace = "http://www.w3.org/2000/svg";

export class TatorElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({mode: "open"});

    // Create a css link for components.
    const css = document.createElement("link");
    css.setAttribute("rel", "stylesheet");
    css.setAttribute("href", "/static/components.css");
    this._shadow.appendChild(css);
    css.addEventListener("load", () => {this.style.visibility = "visible";});
  }

  connectedCallback() {
    this.style.visibility = "hidden";
  }
}
