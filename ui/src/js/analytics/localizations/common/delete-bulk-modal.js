import { ModalDialog } from "../../../components/modal-dialog.js";
import { fetchCredentials } from "../../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class DeleteBulkModal extends ModalDialog {
  constructor() {
    super();

    const icon = document.createElement("modal-warning");
    this._header.insertBefore(icon, this._titleDiv);

    const summary = document.createElement("p");
    summary.setAttribute("class", "text-gray py-3");
    this._main.appendChild(summary);

    this.textSummary = document.createElement("span");
    this.textSummary.innerHTML = "Confirm deletion of";
    summary.appendChild(this.textSummary);

    this._deleteIds = document.createElement("span");
    summary.appendChild(this._deleteIds);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This cannot be undone";
    this._main.appendChild(warning);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-red");
    this._accept.textContent = "Delete Localizations";
    this._footer.appendChild(this._accept);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._accept.addEventListener("click", async (evt) => {
      const localizationId = this.getAttribute("delete-id");
      const projecId = this.getAttribute("project-id");
      const single = !(localizationId.indexOf(",") > -1);
      const count = localizationId.split(",").length;

      

      if (single) {
        this._deleteSingle(localizationId);
      } else {
        this._deleteMultiple(projecId, localizationId, count);
      }
    });

    this._elementalIds = [];
  }

  open(objectMap) {
    this.setAttribute("is-open", "true");
    this._elementalIds = [];
    const localizationId = this.getAttribute("delete-id");
    const array = localizationId.split(",");
    this._deleteIds.innerText = ` ${array.length} localization${(array.length == 1) ? "" : "s"}. ID${(array.length == 1) ? "" : "s"}: ${localizationId.replace(",", ", ")}`;
  }

  _deleteSingle(localizationId) {
    return fetchCredentials("/rest/Localization/" + localizationId, {
      method: "DELETE",
    })
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("confirmFileDelete", {
            detail: { localizationId: [localizationId] },
          })
        );
      })
      .catch((err) => console.log(err));
  }

  async _deleteMultiple(projecId, localizationId, count) {
    // this._deleteId;
    const idsArray = localizationId.split(",").map(val => Number(val));
   
    const url = `/rest/Localizations/${projecId}?count=${count}&ids=${localizationId}`;
    return fetchCredentials(url, {
      method: "Delete",
      body: JSON.stringify({
        ids: idsArray
      })
    })
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("confirmFileDelete", {
            detail: { localizationId: localizationId },
          })
        );
      })
      .catch((err) => console.log(err));
  }

  static get observedAttributes() {
    return ["media-name", "media-id"].concat(ModalDialog.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "delete-name":
        this._title.nodeValue = 'Delete "' + newValue + '"';
        break;
      case "delete-id":
        // this._deleteId.textContent = ;
        this.textSummary.innerHTML = "IDs: "+newValue.replace(",", ", ");
        break;
      case "is-open":
        
        break;
    }
  }
}

customElements.define("delete-bulk-modal", DeleteBulkModal);
