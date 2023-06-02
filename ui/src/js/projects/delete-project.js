import { ModalDialog } from "../components/modal-dialog.js";
import { store } from "./store.js";

export class DeleteProject extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This cannot be undone";
    this._main.appendChild(warning);

    const texts = [
      "All files and annotations will be deleted",
      "All project history will be deleted",
      "All share links will be inaccessible",
    ];
    this._checks = new Array(texts.length);
    texts.forEach((item, index, array) => {
      this._checks[index] = document.createElement("labeled-checkbox");
      this._checks[index].setAttribute("text", item);
      this._main.appendChild(this._checks[index]);
    });

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.setAttribute("disabled", "");
    this._accept.textContent = "Delete Project";
    this._footer.appendChild(this._accept);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._checks.forEach((item, index, array) => {
      item.addEventListener("change", (evt) => {
        let allChecked = true;
        this._checks.forEach((item, index, array) => {
          if (!item.checked) {
            allChecked = false;
          }
        });
        if (allChecked) {
          this._accept.removeAttribute("disabled");
        } else {
          this._accept.setAttribute("disabled", "");
        }
      });
    });

    this._accept.addEventListener("click", (evt) => {
      const projectId = this.getAttribute("project-id");
      store.getState().removeProject(projectId);
      this.dispatchEvent(
        new CustomEvent("confirmDeleteProject", {
          detail: { projectId: projectId },
        })
      );
    });
  }

  static get observedAttributes() {
    return ["project-name"].concat(ModalDialog.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "project-name":
        this._title.nodeValue = 'Delete "' + newValue + '"';
        break;
      case "is-open":
        if (newValue === null) {
          this._checks.forEach((item, index, array) => {
            item.checked = false;
          });
          this._accept.setAttribute("disabled", "");
        }
    }
  }
}

customElements.define("delete-project", DeleteProject);
