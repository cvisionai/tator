import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";

export class ModalSuccess extends TatorElement {
  constructor() {
    super();

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "h3 text-green");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._shadow.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Success";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M21 11.080v0.92c-0.001 1.22-0.244 2.382-0.683 3.441-0.456 1.1-1.126 2.091-1.957 2.921s-1.823 1.498-2.924 1.953c-1.059 0.438-2.221 0.68-3.442 0.679s-2.382-0.244-3.441-0.683c-1.1-0.456-2.091-1.126-2.921-1.957s-1.498-1.823-1.953-2.924c-0.438-1.058-0.68-2.22-0.679-3.441s0.244-2.382 0.683-3.441c0.456-1.1 1.126-2.091 1.957-2.921s1.823-1.498 2.924-1.953c1.059-0.438 2.221-0.68 3.442-0.679 1.33 0.001 2.586 0.289 3.649 0.775 0.502 0.23 1.096 0.008 1.325-0.494s0.008-1.096-0.494-1.325c-1.327-0.606-2.866-0.955-4.479-0.956-1.488-0.001-2.91 0.294-4.207 0.831-1.348 0.556-2.56 1.373-3.574 2.386s-1.832 2.223-2.39 3.57c-0.538 1.297-0.835 2.718-0.836 4.206s0.294 2.91 0.831 4.207c0.557 1.347 1.374 2.559 2.386 3.573s2.223 1.832 3.57 2.39c1.297 0.538 2.718 0.835 4.206 0.836s2.91-0.294 4.207-0.831c1.347-0.557 2.559-1.374 3.573-2.386s1.832-2.223 2.39-3.57c0.539-1.297 0.836-2.718 0.837-4.207v-0.92c0-0.552-0.448-1-1-1s-1 0.448-1 1zM21.293 3.293l-9.293 9.302-2.293-2.292c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l3 3c0.391 0.391 1.024 0.39 1.415 0l10-10.010c0.39-0.391 0.39-1.024-0.001-1.414s-1.024-0.39-1.414 0.001z"
    );
    svg.appendChild(path);
  }
}

customElements.define("modal-success", ModalSuccess);
