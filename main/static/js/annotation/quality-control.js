class QualityControl extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.setAttribute("class", "annotation__setting d-flex flex-items-center px-3 rounded-1");
    details.appendChild(summary);

    const rateSpan = document.createElement("div");
    rateSpan.setAttribute("class", "text-gray");
    rateSpan.textContent = "Rate:";
    summary.appendChild(rateSpan);

    const span = document.createElement("span");
    span.setAttribute("class", "px-1");
    span.textContent = "1x";
    summary.appendChild(span);

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "files__main files-wrap");
    details.appendChild(styleDiv);

    const div = document.createElement("div");
    div.setAttribute("class", "more d-flex flex-column f2 py-3 px-2");
    styleDiv.appendChild(div);

    const slider = document.createElement("input");
    slider.setAttribute("class", "range flex-grow");
    slider.setAttribute("type", "range");
    slider.setAttribute("step", "1");
    slider.setAttribute("value", "3");
    slider.setAttribute("min", "0");
    slider.setAttribute("max", "6");
    div.appendChild(slider);

    const rates = [0.125, 0.25, 0.5, 1, 2, 4, 8];

    slider.addEventListener("input", evt => {
      const index = evt.target.value;
      const rate = rates[index];
      span.textContent = rate + "x";
      this.dispatchEvent(new CustomEvent("rateChange", {
        detail: {rate: rate},
        composed: true
      }));
    });
  }
}

customElements.define("quality-control", QualityControl);
