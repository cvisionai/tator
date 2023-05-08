import { ModalDialog } from "../components/modal-dialog.js";

export class EntityDeleteConfirm extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-gray f1");
    warning.innerText = `Check "Don't confirm again" to allow deletion for the remainder of your session without confirming.`;
    this._main.appendChild(warning);

    const alwaysAllowP = document.createElement("p");
    alwaysAllowP.setAttribute("class", "py-3 f1");
    this._main.appendChild(alwaysAllowP);

    this._alwaysAllow = document.createElement("checkbox-input");
    this._alwaysAllow.default = "off";
    this._alwaysAllow.setAttribute("name", "Don't confirm again");
    alwaysAllowP.appendChild(this._alwaysAllow);

    //  const alwaysAllowText = document.createTextNode("Check to always allow delete during this session.");
    //  alwaysAllowP.appendChild(alwaysAllowText);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.textContent = "Delete";
    this._footer.appendChild(this._accept);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._title.nodeValue = "Delete Object?";

    this._accept.addEventListener("click", () => {
      // when they accept only, save their preference to storage
      const allSessionDelete = this._alwaysAllow.getValue();
      console.log("always allow value " + allSessionDelete);

      if (allSessionDelete == "on") {
        sessionStorage.setItem("allowSessionDelete", "true");
      }

      this._closeCallback();
      this.dispatchEvent(new Event("confirmDelete"));
    });
  }

  set objectName(val) {
    this._title.nodeValue = `Delete '${val}'?`;
  }

  confirm() {
    console.log(
      "Checking session var... allowSessionDelete: " +
        sessionStorage.getItem("allowSessionDelete")
    );
    // Check for stored item and dispatch event to delete; or open confirm
    if (
      typeof sessionStorage.getItem("allowSessionDelete") !== "undefined" &&
      sessionStorage.getItem("allowSessionDelete") == "true"
    ) {
      this.dispatchEvent(new Event("confirmDelete"));
    } else {
      this.setAttribute("is-open", "true");
    }
  }
}

customElements.define("entity-delete-confirm", EntityDeleteConfirm);
