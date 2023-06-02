import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class EntityDeleteButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex flex-justify-center px-2 py-2 rounded-2 f2 text-white entity__button"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Delete";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M18 7v13c0 0.137-0.027 0.266-0.075 0.382-0.050 0.122-0.125 0.232-0.218 0.325s-0.203 0.167-0.325 0.218c-0.116 0.048-0.245 0.075-0.382 0.075h-10c-0.137 0-0.266-0.027-0.382-0.075-0.122-0.050-0.232-0.125-0.325-0.218s-0.167-0.203-0.218-0.325c-0.048-0.116-0.075-0.245-0.075-0.382v-13zM17 5v-1c0-0.405-0.081-0.793-0.228-1.148-0.152-0.368-0.375-0.698-0.651-0.974s-0.606-0.499-0.974-0.651c-0.354-0.146-0.742-0.227-1.147-0.227h-4c-0.405 0-0.793 0.081-1.148 0.228-0.367 0.152-0.697 0.375-0.973 0.651s-0.499 0.606-0.651 0.973c-0.147 0.355-0.228 0.743-0.228 1.148v1h-4c-0.552 0-1 0.448-1 1s0.448 1 1 1h1v13c0 0.405 0.081 0.793 0.228 1.148 0.152 0.368 0.375 0.698 0.651 0.974s0.606 0.499 0.974 0.651c0.354 0.146 0.742 0.227 1.147 0.227h10c0.405 0 0.793-0.081 1.148-0.228 0.368-0.152 0.698-0.375 0.974-0.651s0.499-0.606 0.651-0.974c0.146-0.354 0.227-0.742 0.227-1.147v-13h1c0.552 0 1-0.448 1-1s-0.448-1-1-1zM9 5v-1c0-0.137 0.027-0.266 0.075-0.382 0.050-0.122 0.125-0.232 0.218-0.325s0.203-0.167 0.325-0.218c0.116-0.048 0.245-0.075 0.382-0.075h4c0.137 0 0.266 0.027 0.382 0.075 0.122 0.050 0.232 0.125 0.325 0.218s0.167 0.203 0.218 0.325c0.048 0.116 0.075 0.245 0.075 0.382v1z"
    );
    svg.appendChild(path);
  }
}

customElements.define("entity-delete-button", EntityDeleteButton);
