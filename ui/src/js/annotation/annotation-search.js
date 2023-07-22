import { TatorElement } from "../components/tator-element.js";

export class AnnotationSearch extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    this._shadow.appendChild(label);

    const input = document.createElement("input");
    input.setAttribute("class", "form-control input-sm col-12 f2");
    input.setAttribute("type", "search");
    input.setAttribute("placeholder", "Search...");
    label.appendChild(input);

    input.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("filterAnnotations", {
          composed: true,
          detail: { query: input.value },
        })
      );
    });

    input.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    input.addEventListener("blur", () => {
      document.body.classList.remove("shortcuts-disabled");
    });
  }
}

customElements.define("annotation-search", AnnotationSearch);
