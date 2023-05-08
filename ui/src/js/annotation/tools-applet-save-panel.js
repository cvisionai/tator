import { Utilities } from "../util/utilities.js";
import { TatorElement } from "../components/tator-element.js";

/**
 * To use this applet category must equal:  annotator-save-tools
 *
 */
export class ToolsAppletSavePanel extends TatorElement {
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
  saveApplet(applet, annotatorPage, canvas, saveDialog, type) {
    this._page = annotatorPage;
    this._canvas = canvas;
    this._saveDialog = saveDialog;
    this._type = type;

    // Then populate the panel
    this._appletView.src = applet.html_file;
    console.log("[Save tools] set applet view to " + applet.html_file);
    saveDialog.addAppletPanel(this._panel);
  }

  initApplet() {
    //
    this._appletElement =
      this._appletView.contentWindow.document.getElementById("toolsApplet");
    if (this._appletElement == null) {
      return;
    }

    // RUN THIS LAST! listeners need to be in place above first
    console.log("Run init on applet element.");
    this._appletElement.init({
      canvas: this._canvas,
      page: this._page,
      saveDialog: this._saveDialog,
    });
    this._panel.hidden = false;

    //
    this.dispatchEvent(new Event("appletReady"));
  }
}

customElements.define("tools-applet-save-panel", ToolsAppletSavePanel);
