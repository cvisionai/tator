import { TatorElement } from "../components/tator-element.js";

/** @abstract */
export class BaseTimeline extends TatorElement {
  constructor() {
    super();

    // Refer to setDisplayMode() for valid options
    this._displayMode = "frame";

    // Set to true with timeStoreInitialized()
    this._timeStoreInitialized = false;
  }

  /**
   * Converts the provided frame number into a corresponding time string
   * @precondition timeStore must be set and initialized
   * @param {integer} frame
   * @returns {string} hh:mm:ss.aa
   */
  _createRelativeTimeString(frame) {
    return this._timeStore.getRelativeTimeFromFrame(frame);
  }

  /**
   * Converts the provided frame number into a corresponding UTC string
   * @precondition timeStore must be set and initialized
   * @param {integer} frame
   * @param {string} mode undefined (default) | "time"
   * @returns {string} isoformat datetime
   */
  _createUTCString(frame, mode) {
    var iso = this._timeStore.getAbsoluteTimeFromFrame(frame);
    if (mode == "time") {
      return iso.split("T")[1].split(".")[0];
    } else {
      return `${iso.split("T")[0]}\n${iso.split("T")[1].split(".")[0]}`;
    }
  }

  /**
   * @abstract
   * Function called whenever the timeline SVG components needs to be redrawn
   */
  _updateSvgData() {}

  /**
   * @param {GlobaltimeStore} val
   */
  set timeStore(val) {
    this._timeStore = val;
  }

  /**
   * Called when the timeStore has been initialized.
   * @precondition timeStore must have been set
   */
  timeStoreInitialized() {
    this._timeStoreInitialized = true;
  }

  /**
   * Call this to initialize the timeline.
   * This will default the display mode to frames.
   *
   * @abstract
   * @param {integer} minFrame
   * @param {integer} maxFrame
   */
  init(minFrame, maxFrame) {}

  /**
   * Force a redraw of the timeline
   */
  redraw() {
    this._updateSvgData();
  }

  /**
   * Sets the display mode of the timeline and forces a redraw
   * @param {string} mode "frame"|"relativeTime"|"utc"
   */
  setDisplayMode(mode) {
    const validOptions = ["frame", "relativeTime", "utc"];
    if (!validOptions.includes(mode)) {
      throw `Invalid mode (${mode}) provided to setDisplayMode`;
    }

    this._displayMode = mode;
    this.redraw();
  }

  /**
   * @returns {bool} True if display mode is frame
   */
  inFrameDisplayMode() {
    return this._displayMode == "frame";
  }

  /**
   * @returns {bool} True if display mode is frame
   */
  inRelativeTimeDisplayMode() {
    return this._displayMode == "relativeTime";
  }

  /**
   * @returns {bool} True if display mode is frame
   */
  inUTCDisplayMode() {
    return this._displayMode == "utc";
  }
}
