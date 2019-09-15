class RecentsPanel extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel-group py-2 text-gray f2");
    this._shadow.appendChild(div);

    const header = document.createElement("div");
    header.setAttribute("class", "py-3 text-semibold");
    header.textContent = "Recent";
    div.appendChild(header);

    this._buttons = document.createElement("div");
    this._buttons.setAttribute("class", "annotation__recents d-flex");
    div.appendChild(this._buttons);

    this._identifier = null;
  }

  connectedCallback() {
    this.style.display = "none";
  }

  static get maxRecent() {
    return 3;
  }

  set dataType(val) {
    this._identifier = identifyingAttribute(val);
  }

  store(values) {
    if (typeof this._identifier === "undefined") {
      this.style.display = "none";
    } else {
      this.style.display = "block";
      const button = document.createElement("button");
      button.setAttribute("class", "btn btn-outline btn-small f2");
      button.textContent = values[this._identifier.name];
      for (const other of this._buttons.children) {
        if (other.textContent == button.textContent) {
          this._buttons.removeChild(other);
          break;
        }
      }
      this._buttons.insertBefore(button, this._buttons.firstChild);
      if (this._buttons.children.length > RecentsPanel.maxRecent) {
        this._buttons.removeChild(this._buttons.lastChild);
      }
      
      button.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("recent", {
          detail: values,
        }));
      });
    }
  }
}

customElements.define("recents-panel", RecentsPanel);
