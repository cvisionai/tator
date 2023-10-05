/**
 * Wrapper that instantiates an iframe that will contain the registered canvas applet
 * This will act as the interface between the annotation page and the canvas applet.
 * Expected to have one of these per canvas applet.
 */
import { TatorElement } from "../components/tator-element.js";

export class CanvasAppletWrapper extends TatorElement {
  /**
   * Constructor
   */
  constructor() {
    super();

    this._applet = null; // Must call init()
  }

  /**
   * @precondition init() must have been called
   * @returns boolean
   *    True if applet can close gracefully
   */
  allowedToClose() {
    return this._appletElement.allowedToClose();
  }

  /**
   * @precondition init() must have been called
   */
  close() {
    this._appletElement.close();
  }

  /**
   * @precondition init() must have been called
   * @returns string
   *    Applet's description
   */
  getDescription() {
    return this._appletElement.getDescription();
  }

  /**
   * @precondition init() must have been called
   * @returns string
   *    Applet's description
   */
  getTitle() {
    return this._appletElement.getTitle();
  }

  /**
   * @precondition init() must have been called
   * @returns string
   *    Applet's menu icon
   */
  getIcon() {
    return this._appletElement.getIcon();
  }

  /**
   * Call this at construction
   * @param {TatorElement.Applet} applet
   * @return Promise
   *    Resolves when the applet element has been initialized
   */
  init(applet) {
    return new Promise((resolve) => {
      var appletView = document.createElement("iframe");
      appletView.setAttribute("class", "d-flex col-12");

      var that = this;
      appletView.onload = function () {
        that._appletElement =
          appletView.contentWindow.document.getElementById("mainApplet");
        that._appletElement.init(applet);
        resolve();
      };

      appletView.src = applet.html_file;
      this._shadow.appendChild(appletView);
    });
  }

  /**
   * @precondition init() must have been called
   */
  show() {
    this._appletElement.show();
  }

  /**
   * Update applet with current frame information
   * @precondition init() must have been called
   */
  updateFrame(blob) {
    this._appletElement.updateFrame(blob);
  }
}

customElements.define("canvas-applet-wrapper", CanvasAppletWrapper);
