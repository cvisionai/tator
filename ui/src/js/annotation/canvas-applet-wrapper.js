/**
 * Wrapper that instantiates an iframe that will contain the registered canvas applet
 * This will act as the interface between the annotation page and the canvas applet.
 * Expected to have one of these per canvas applet.
 */
import { TatorElement } from "../components/tator-element.js";
import { Utilities } from "../util/utilities.js";

export class CanvasAppletWrapper extends TatorElement {
  /**
   * Constructor
   */
  constructor() {
    super();

    this._applet = null; // Must call init()

    // Used to help determine if re-init is required
    this._lastMediaId = null;
    this._lastFrameUpdate = null;
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
   * @param {Tator.Applet} applet
   *    Applet to initialize the element with
   * @param {annotation-data} data
   *    Annotation page data buffer
   *    Used by the applets to query state/localization types necessary at initialization
   * @param {array of Tator.Applet} favorites
   *    List of user-associated favorites
   * @param {undo-buffer} undo
   *    Undo buffer for patching/posting required by elements like the save dialog
   * @return Promise
   *    Resolves when the applet element has been initialized
   */
  init(applet, data, favorites, undo) {
    this._applet = applet;
    return new Promise((resolve) => {
      var appletView = document.createElement("iframe");
      appletView.setAttribute("class", "d-flex col-12");

      var that = this;
      appletView.onload = function () {
        that._appletElement =
          appletView.contentWindow.document.getElementById("mainApplet");
        that._appletElement.init(applet, data, favorites, undo);

        that._appletElement.addEventListener("overrideCanvas", (event) => {
          that.dispatchEvent(
            new CustomEvent("overrideCanvas", { detail: event.detail })
          );
        });

        that._appletElement.addEventListener("clearOverrideCanvas", (event) => {
          that.dispatchEvent(new CustomEvent("clearOverrideCanvas"));
        });

        resolve();
      };

      Utilities.setIframeSrc(appletView, applet);
      this._shadow.appendChild(appletView);
    });
  }

  /**
   * @precondition init() must have been called
   */
  show(data) {
    this._appletElement.show(data);
  }

  /**
   * Update applet with current frame information
   * @precondition init() must have been called
   */
  async updateFrame(frame, blob) {
    this._lastFrameUpdate = frame;
    await this._appletElement.updateFrame(frame, blob);
  }

  async updateMedia(media) {
    this._lastMediaId = media.id;
    await this._appletElement.updateMedia(media);
  }

  // #TODO
  newData(newElement, associatedType) {
    this._appletElement.newData(newElement, associatedType);
  }

  /**
   * Forces the applet to have its canvas updated when loaded
   * @precondition init() must have been called
   */
  forceUpdateFrameOnLoad() {
    this._lastFrameUpdate = -1;
  }
}

customElements.define("canvas-applet-wrapper", CanvasAppletWrapper);
