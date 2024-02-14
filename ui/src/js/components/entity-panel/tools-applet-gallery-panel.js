import { TatorElement } from "../tator-element.js";
import { Utilities } from "../util/utilities.js";

export class ToolsAppletGalleryPanel extends TatorElement {
  constructor() {
    super();

    this._panel = document.createElement("div");
    this._panel.setAttribute("style", "width: 100%; height: 100%;");
    this._panel.setAttribute("class", "py-2 px-2");
    this._panel.hidden = true;
    this._shadow.appendChild(this._panel);

    this._appletView = document.createElement("iframe");
    this._appletView.setAttribute("style", "width: 100%; height: 100%;"); //d-flex col-12
    this._panel.appendChild(this._appletView);

    // Will point to the applet element to interface with inside the iframe
    this._appletElement = null;
    this._canvas = null;

    this._appletView.addEventListener("load", this.initApplet.bind(this));
  }

  /**
   * Saves the applet object internally
   * @param {Tator.Applet} applet
   */
  saveApplet(applet, entityForm) {
    this._entityForm = entityForm;

    // Then populate the panel
    this._appletView.src = Utilities.getAppletSrc(applet);
    entityForm.addAppletPanel(this._panel);
  }

  /**
   * Set the applet to display using the provided applet name
   * @param {string} appletName - Name of loaded applet to display in modal
   *
   */
  setApplet(appletName) {
    this._appletView.src = Utilities.getAppletSrc(this._applets[appletName]);
    this.openPanel();
  }

  initApplet() {
    //
    this._appletElement =
      this._appletView.contentWindow.document.getElementById("toolsApplet");
    if (this._appletElement == null) {
      return;
    }

    // RUN THIS LAST! listeners need to be in place above first
    this._appletElement.init({ entityForm: this._entityForm });
    this._panel.hidden = false;

    //
    this.dispatchEvent(new Event("appletReady"));
  }
}

customElements.define("tools-applet-gallery-panel", ToolsAppletGalleryPanel);
