class ProgressJob extends TatorElement {
  constructor() {
    super();

    const li = document.createElement("li");
    li.setAttribute("class", "d-flex flex-column py-3");
    this._shadow.appendChild(li);

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-justify-between py-2");
    label.setAttribute("for", "header-processing");
    li.appendChild(label);

    this._text = document.createTextNode("");
    label.appendChild(this._text);

    this._cancel = document.createElement("cancel-button");
    label.appendChild(this._cancel);

    this._progress = document.createElement("progress");
    this._progress.setAttribute("class", "progress");
    this._progress.setAttribute("style", "width:100%;margin-top:8px");
    this._progress.setAttribute("id", "header-processing");
    li.appendChild(this._progress);

    this._cancel.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("groupCancel", {
        detail: {gid: this.getAttribute("gid")},
        composed: true,
      }));
    });
  }

  static get observedAttributes() {
    return ["max", "done", "text"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "max":
        this._progress.setAttribute("max", newValue);
        if (this.hasAttribute("done")) {
          const pct = this.getAttribute("done") / newValue;
          this._progress.textContent = pct + "%";
        }
        break;
      case "done":
        this._progress.setAttribute("value", newValue);
        if (this.hasAttribute("max")) {
          const pct = newValue / this.getAttribute("max");
          this._progress.textContent = pct + "%";
        }
        break;
      case "text":
        this._text.nodeValue = newValue;
        break;
    }
  }
}

customElements.define("progress-job", ProgressJob);
