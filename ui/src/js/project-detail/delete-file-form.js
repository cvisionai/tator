import { ModalDialog } from "../components/modal-dialog.js";
import { getCookie } from "../util/get-cookie.js";

export class DeleteFileForm extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This cannot be undone";
    this._main.appendChild(warning);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.textContent = "Delete File";
    this._footer.appendChild(this._accept);
    
    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._accept.addEventListener("click", async evt => {
      const mediaId = this.getAttribute("media-id");
      const projecId = this.getAttribute("project-id");
      const single = !(mediaId.indexOf(",") > -1);

      if (single) {
        this._deleteSingle(projecId, mediaId);
      } else {
        this._deleteMultiple(projecId, mediaId);
      }
    });
  }

  _deleteSingle(projecId, mediaId) {
    return fetch("/rest/Media/" + mediaId, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    }).then(() => { 
      this.dispatchEvent(new CustomEvent("confirmFileDelete", {
        detail: {mediaId: mediaId}
      }));
    })
    .catch(err => console.log(err)); 
    
  }

  _deleteMultiple(projecId, mediaId) {
    return fetch(`/rest/Medias/${projecId}?media_id=${mediaId}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
      .then(() => { 
        this.dispatchEvent(new CustomEvent("confirmFileDelete", {
          detail: {mediaId: mediaId}
        }));
      })
      .catch(err => console.log(err));  
  }

  static get observedAttributes() {
    return ["media-name"].concat(ModalDialog.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "media-name":
        this._title.nodeValue = "Delete \"" + newValue + "\"";
        break;
      case "is-open":
        break;
    }
  }
}

customElements.define("delete-file-form", DeleteFileForm);
