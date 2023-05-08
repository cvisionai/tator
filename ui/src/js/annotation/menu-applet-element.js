import { TatorElement } from "../components/tator-element.js";

/**
 * Abstract class that annotator menu applets should inherit and override the existing methods
 */
export class MenuAppletElement extends TatorElement {
  constructor() {
    super();
  }

  /**
   * @returns string
   */
  getModalHeight() {
    return "";
  }

  /**
   * @returns string
   */
  getModalTitle() {
    return "";
  }

  /**
   * Review menu-applet-dialog.js for more information about expected values.
   * @returns string
   */
  getModalWidth() {
    return "default";
  }

  /**
   * @returns string
   */
  getAcceptButtonText() {
    return "Accept";
  }

  /**
   * @param {Object} data
   */
  updateData(data) {
    this._data = data;
  }

  /**
   * @postcondition UI has been updated
   */
  updateUI() {
    return;
  }

  /**
   * Called when the user hits the accept button in the dialog.
   */
  accept() {
    return;
  }
}

customElements.define("menu-applet-element", MenuAppletElement);
