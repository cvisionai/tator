import { TatorElement } from "../../components/tator-element.js";

export class CreateCustom extends TatorElement {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const close = document.createElement("new-project-close");
    main.appendChild(close);

    const div = document.createElement("div");
    div.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center py-6");
    main.appendChild(div);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    div.appendChild(h1);

    const h1Text = document.createTextNode("Create a new project.");
    h1.appendChild(h1Text);

    const form = document.createElement("custom-form");
    main.appendChild(form);
  }
}

customElements.define("create-custom", CreateCustom);
