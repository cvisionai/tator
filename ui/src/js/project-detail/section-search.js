import { TatorElement } from "../components/tator-element.js";

export class SectionSearch extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    this._shadow.appendChild(label);

    const input = document.createElement("input");
    input.setAttribute("class", "form-control input-sm");
    input.setAttribute("type", "search");
    input.setAttribute("placeholder", "Search within...");
    label.appendChild(input);

    input.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("filterSection", {
          composed: true,
          detail: { query: input.value },
        })
      );
    });
  }
}

customElements.define("section-search", SectionSearch);
