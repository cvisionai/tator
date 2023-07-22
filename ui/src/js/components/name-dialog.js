import { ModalDialog } from "./modal-dialog.js";

export class NameDialog extends ModalDialog {
  constructor() {
    super();

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control f1");
    this._input.setAttribute("placeholder", "Give it a name...");
    this._input.style.width = "100%";
    this._main.appendChild(this._input);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-purple");
    this._accept.textContent = "Save";
    this._footer.appendChild(this._accept);

    // Indicates whether name was saved.
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

  init(name, sectionType) {
    this._title.nodeValue = name;
    this._input.value = "";
    this._confirm = false;
    this._sectionType = sectionType; // folder, playlist, or savedSearch
  }
}

customElements.define("name-dialog", NameDialog);
