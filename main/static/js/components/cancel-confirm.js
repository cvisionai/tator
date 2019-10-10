class CancelConfirm extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This will stop jobs in progress";
    this._main.appendChild(warning);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.textContent = "Stop Jobs";
    this._footer.appendChild(this._accept);
    
    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._title.nodeValue = "Stop Jobs";

    this._accept.addEventListener("click", async evt => {
      fetch("/rest/JobGroup/" + this._gid, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      })
      .catch(err => console.log(err));
      this.dispatchEvent(new Event("confirmGroupCancel"));
    });
  }

  set gid(val) {
    this._gid = val;
  }

  static get observedAttributes() {
    return ModalDialog.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }
}

customElements.define("cancel-confirm", CancelConfirm);
