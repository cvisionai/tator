class MediaMove extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "px-4 py-3");
    this._shadow.appendChild(div);

    const label = document.createElement("label");
    label.setAttribute("class", "position-relative");
    div.appendChild(label);

    const span = document.createElement("span");
    span.setAttribute("class", "d-flex py-2 f3 text-uppercase text-gray");
    span.textContent = "Move to:";
    label.appendChild(span);

    this._select = document.createElement("select");
    this._select.setAttribute("class", "form-select select-sm col-12");
    label.appendChild(this._select);

    const option = document.createElement("option");
    option.setAttribute("selected", "");
    option.setAttribute("disabled", "");
    option.textContent = "Select a section";
    this._select.appendChild(option);

    this._new = document.createElement("option");
    this._new.textContent = "+ New Section";
    this._select.appendChild(this._new);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "text-gray");
    svg.setAttribute("id", "icon-chevron-down");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.style.top = "2px";
    label.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M5.293 9.707l6 6c0.391 0.391 1.024 0.391 1.414 0l6-6c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z");
    svg.appendChild(path);

    this._select.addEventListener("change", evt => {
      const isReset = evt.target.value === "Select a section";
      const isNew = evt.target.value === "+ New Section";
      if (isNew) {
        this.dispatchEvent(new Event("moveToNew", {composed: true}));
      } else if (!isReset) {
        this.dispatchEvent(new CustomEvent("move", {
          detail: {to: evt.target.value},
          composed: true
        }));
      }
      this._select.value = "Select a section";
    });
  }

  set sections(val) {
    const options = [...this._select.querySelectorAll("option")];
    const names = options.map(elem => elem.value);
    for (const section of val) {
      if (!names.includes(section)) {
        const option = document.createElement("option");
        option.textContent = section;
        this._select.insertBefore(option, this._new);
      }
    }
    for (const option of options) {
      const isReset = option.value === "Select a section";
      const isNew = option.value === "+ New Section";
      if (isReset || isNew) {
        continue;
      }
      if (!val.includes(option.value)) {
        this._select.removeChild(option);
      }
    }
  }
}

customElements.define("media-move", MediaMove);
