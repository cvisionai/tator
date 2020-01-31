class AnnotationSearch extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    this._shadow.appendChild(label);

    const input = document.createElement("input");
    input.setAttribute("class", "form-control input-sm col-12 f2");
    input.setAttribute("type", "search");
    input.setAttribute("placeholder", "Search...");
    label.appendChild(input);

    input.addEventListener("change",() => {
      this.dispatchEvent(new CustomEvent("filterAnnotations", {
        composed: true,
        detail: {"query": input.value}
      }));
    });
  }
}

customElements.define("annotation-search", AnnotationSearch);
