import { ModalDialog } from "../components/modal-dialog.js";

export class BigDownloadForm extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);
    this._title.nodeValue = "That's a big download!";

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent =
      "Recommended max browser download size is 60GB or 5000 files.\n For larger downloads try tator-py.";
    this._main.appendChild(warning);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.textContent = "Download Anyway";
    this._footer.appendChild(this._accept);

    // Indicates whether big download was accepted.
    this._confirm = false;

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._accept.addEventListener("click", (evt) => {
      this._confirm = true;
      this._closeCallback();
    });
  }

  static get observedAttributes() {
    return ModalDialog.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "is-open":
        break;
    }
  }
}

customElements.define("big-download-form", BigDownloadForm);
