import { TatorElement } from "../tator-element.js";

export class PlaceholderGlow extends TatorElement {
  constructor() {
    super();

    this.div = document.createElement("div");
    this.div.setAttribute("class", "placeholder-glow");
    this._shadow.appendChild(this.div);

    this._row = document.createElement("span");
    this._row.setAttribute("class", "placeholder SideNav-subItem");
    this._row.style = `width: ${String(
      (Math.random() * (110 - 80) + 80).toFixed(0)
    )}px`;

    this._className = "";
  }

  /*  */
  static get observedAttributes() {
    return ["rows", "className"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "size":
        const size = newValue.split("_");
        this._row.style = `width: ${size[1]}px; height: ${size[0]}px`;
      case "rows":
        for (let x = 0; x <= newValue; x++) {
          this._row.style = `width: ${String(
            (Math.random() * (110 - 80) + 80).toFixed(0)
          )}px`;
          const cloneRow = this._row.cloneNode();
          this.div.appendChild(cloneRow);
        }
        break;
      case "className":
        this._className = newValue;
        for (let row of this.div.children) {
          row.classList.add(newValue);
        }
        this._row.classList.add(this._className);
        break;
    }
  }
}

if (!customElements.get("placeholder-glow")) {
  customElements.define("placeholder-glow", PlaceholderGlow);
}
