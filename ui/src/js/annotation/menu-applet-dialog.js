import { ModalDialog } from "../components/modal-dialog.js";
import { Utilities } from "../util/utilities.js";

export class MenuAppletDialog extends ModalDialog {
  constructor() {
    super();

    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._div.style.margin = "10vh auto";
    this._title.nodeValue = "Menu Applet";

    // All applets will be stored in this modal and only the active applet will not be hidden.
    this._appletViews = {};

    this._main.classList.remove("px-6");
    this._main.classList.add("px-2");

    this._acceptBtn = document.createElement("button");
    this._acceptBtn.setAttribute("class", "btn btn-clear");
    this._acceptBtn.textContent = "Accept";
    this._footer.appendChild(this._acceptBtn);

    // Stores the Tator Applet objects this dialog will utilize
    // Each object property/key will be the applet name
    this._applets = {};

    // Will point to the applet element to interface with inside the iframe
    this._appletElement = null;
    this._appletData = null;

    // When the user clicks on the accept button,
    // call the active applet's accept function and close the dialog
    this._acceptBtn.addEventListener("click", () => {
      this.removeAttribute("is-open");
      this.dispatchEvent(new Event("close"));
      this._appletElement.accept();
    });
  }

  /**
   * @param {string} width - default|wide|extra-wide
   */
  _setModalWidth(width) {
    if (width == "default") {
      this._div.classList.remove("modal-wide");
      this._div.classList.remove("modal-extra-wide");
      this._div.classList.remove("modal-super-wide");
    } else if (width == "wide") {
      this._div.classList.add("modal-wide");
      this._div.classList.remove("modal-extra-wide");
      this._div.classList.remove("modal-super-wide");
    } else if (width == "extra-wide") {
      this._div.classList.remove("modal-wide");
      this._div.classList.remove("modal-super-wide");
      this._div.classList.add("modal-extra-wide");
    } else if (width == "super-wide") {
      this._div.classList.remove("modal-wide");
      this._div.classList.remove("modal-extra-wide");
      this._div.classList.add("modal-super-wide");
    }
  }

  /**
   * @param {string} title - Title to display in dialog
   */
  _setModalTitle(title) {
    this._title.nodeValue = title;
  }

  /**
   * @param {string} msg - Message to display using the window utilities
   */
  _displayProgressMessage(msg) {
    Utilities.showSuccessIcon(msg, "#00000000");
  }
  _displayErrorMessage(msg) {
    Utilities.warningAlert(msg, "#ff3e1d");
  }
  _displaySuccessMessage(msg) {
    Utilities.showSuccessIcon(msg);
  }

  /**
   * @param {string} text - Text of accept button
   */
  _setAcceptButtonText(text) {
    this._acceptBtn.textContent = text;
  }

  /**
   * Expected to be done at initialization
   * @param {annotation-data} dataInterface - Interface to annotation page's data buffer
   */
  setDataInterface(dataInterface) {
    this._dataInterface = dataInterface;
  }

  /**
   * Saves the applet object internally
   * @param {Tator.Applet} applet
   */
  saveApplet(applet) {
    var appletView = document.createElement("iframe");
    appletView.setAttribute("class", "d-flex col-12");
    appletView.style.display = "none";
    Utilities.setIframeSrc(appletView, applet);
    this._main.appendChild(appletView);
    this._appletViews[applet.name] = appletView;
    this._applets[applet.name] = applet;

    // #TODO Potentially need a check to ensure the iframe gets loadeds for each saved applet
  }

  /**
   * Set the applet to display using the provided applet name
   * @param {string} appletName - Name of loaded applet to display in modal
   * @param {Object} data - Applet data. Expected to have the following properties:
   *     frame {int}
   *     version {Tator.Version}
   *     media {Tator.Media}
   *     projectId {int}
   */
  setApplet(appletName, data) {
    for (const key in this._appletViews) {
      this._appletViews[key].style.display = "none";
    }
    this._appletData = data;
    this._appletName = appletName;
    this.initApplet();

    this._appletViews[appletName].style.display = "flex";
  }

  initApplet() {
    if (this._appletData == null) {
      return;
    }

    this._appletElement =
      this._appletViews[this._appletName].contentWindow.document.getElementById(
        "mainApplet"
      );

    var height = this._appletElement.getModalHeight();
    if (height.includes("px")) {
      this._appletViews[this._appletName].style.height = height;
    }

    var title = this._appletElement.getModalTitle();
    this._setModalTitle(title);

    var width = this._appletElement.getModalWidth();
    this._setModalWidth(width);

    var acceptText = this._appletElement.getAcceptButtonText();
    this._setAcceptButtonText(acceptText);

    // Attach the standard event listeners.
    // If this is changed, update the corresponding documentation since this is an applet API change
    this._appletElement.addEventListener("displayProgressMessage", (evt) => {
      this._displayProgressMessage(evt.detail.message);
    });

    this._appletElement.addEventListener("displayErrorMessage", (evt) => {
      this._displayErrorMessage(evt.detail.message);
    });

    this._appletElement.addEventListener("displaySuccessMessage", (evt) => {
      this._displaySuccessMessage(evt.detail.message);
    });

    this._appletElement.addEventListener("displayLoadingScreen", () => {
      this.dispatchEvent(new Event("displayLoadingScreen"));
    });

    this._appletElement.addEventListener("hideLoadingScreen", () => {
      this.dispatchEvent(new Event("hideLoadingScreen"));
    });

    this._appletElement.addEventListener("closeApplet", () => {
      this.removeAttribute("is-open");
      this.dispatchEvent(new Event("close"));
    });

    this._appletElement.addEventListener("refreshDataType", (evt) => {
      // Get the key expected by the annotation data interface (e.g. box_1)
      // and use that to get the data type object
      const dataType = evt.detail.dataType;
      const dataTypeKey = `${dataType.dtype}_${dataType.id}`;
      const typeToUpdate = this._dataInterface._dataTypes[dataTypeKey];
      this._dataInterface.updateType(typeToUpdate);
    });

    this._appletElement.addEventListener("refreshMedia", () => {
      this._dataInterface.updateMedia();
    });

    this._appletElement.addEventListener("updateAcceptText", (evt) => {
      this._setAcceptButtonText(evt.detail.text);
    });

    this._appletElement.addEventListener("displayAcceptButton", () => {
      this._acceptBtn.style.display = "flex";
    });

    this._appletElement.addEventListener("hideAcceptButton", () => {
      this._acceptBtn.style.display = "none";
    });

    this._appletElement.addEventListener("updateHeight", (evt) => {
      this._appletViews[this._appletName].style.height = evt.detail.height;
    });

    // Set the applet data
    this._appletElement.updateData(this._appletData);

    // Update the UI
    this._appletElement.updateUI();

    this.dispatchEvent(new Event("appletReady"));
  }
}

customElements.define("menu-applet-dialog", MenuAppletDialog);
