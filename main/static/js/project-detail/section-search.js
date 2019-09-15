class SectionSearch extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    this._shadow.appendChild(label);

    const input = document.createElement("input");
    input.setAttribute("class", "form-control input-sm");
    input.setAttribute("type", "search");
    input.setAttribute("placeholder", "Search within...");
    label.appendChild(input);
  }
}

customElements.define("section-search", SectionSearch);
