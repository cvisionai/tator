class UploadButton extends UploadElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "btn");
    label.textContent = "Upload";
    this._shadow.appendChild(label);

    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("class", "sr-only");
    input.setAttribute("multiple", "");
    label.appendChild(input);

    input.addEventListener("change", this._fileSelectCallback);
  }

  static get observedAttributes() {
    return UploadElement.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    UploadElement.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }
}

customElements.define("upload-button", UploadButton);
