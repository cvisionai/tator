import { frameToTime, getMediaStartDatetime } from "./annotation-common.js"

/**
 * This store contains information about the annotator's time domain.
 * It's a utility library used to get the bounds of the media's time.
 * 
 * There are 4 time domains:
 * - media frame: Frame relative to a particular media
 * - global frame: 0-based frame index of stitched media
 * - relative time: 0-based time index of stitched media
 * - absolute time: time based on absolute start time of stitched media
 */
 export class TimeStore {

  /**
   * @param {Tator.Media} media - Top level media to base the entire timeline based on
   * @param {Tator.MediaType} mediaType - Media type associated with media param
   */
  constructor(media, mediaType) {

    // Check if media has a defined start datetime. If yes, then UTC is enabled.
    this._startGlobalDate = getMediaStartDatetime(media=media)
    this._utcEnabled = this._startGlobalDate != null;

    // #TODO Support .multi data type
    this._mediaMap = {};

    if (mediaType.dtype == "video") {
      this._globalFPS = media.fps;
      this._lastGlobalFrame = media.num_frames - 1;
      this._minSecondsFromEpoch = this._startGlobalDate.getTime() / 1000;
      
      var mediaInfo = {
        startSecondsFromEpoch: this._minSecondsFromEpoch,
        media: media,
        channelIndex: 0,
        globalStartFrame: 0,
        globalEndFrame: media.num_frames - 1 
      };
      this._mediaMap[media.id] = mediaInfo;
    }

  }

  /**
   * @returns {bool} True if UTC-based time querying is enabled. False otherwise.
   */
  utcEnabled() {
    return this._utcEnabled;
  }

  /**
   * @param {string} mode - "mediaStart" | "mediaEnd" | "matchFrame" | "utc"
   * @param {array} mediaIdList - Loop through this list of media IDs. If there's a match use that
   *                              to determine the media frame -> global frame mapping.
   * @param {integer|string} time - integer, if "matchFrame", represents frame
   *                                string, if "utc", represets isoformat datetime
   * @returns {integer} Global frame associated with provided parameters
   */
  getGlobalFrame(mode, mediaList, time) {
    var globalFrame;
    var mediaId;

    for (const id of mediaList) {
      if (id in this._mediaMap) {
        mediaId = id;
        break;
      }
    }

    if (mode == "mediaStart") {
      globalFrame = this._mediaMap[mediaId].globalStartFrame;
    }
    else if (mode == "mediaEnd") {
      globalFrame = this._mediaMap[mediaId].globalEndFrame;
    }
    else if (mode == "matchFrame") {
      globalFrame = this._mediaMap[mediaId].globalStartFrame + time;
    }
    else if (mode == "utc") {

      if (!this.utcEnabled()) {
        throw "getGlobalFrame(): UTC is not enabled."; 
      }

      let secondsSinceEpoch = Date.parse(time) / 1000.0;
      globalFrame = (secondsSinceEpoch - this._minSecondsFromEpoch) * this._globalFPS;
    }
    return Math.floor(globalFrame);
  }

  /**
   * @param {integer} globalFrame
   * @returns {array} Tator.Media objects that match the provided globalFrame
   */
  getMediaFromFrame(globalFrame) {
    var out = [];
    for (const [mediaId, mediaInfo] of Object.entries(this._mediaMap)) {
      if (globalFrame >= mediaInfo.globalStartFrame && globalFrame <= mediaInfo.globalEndFrame) {
        out.push(mediaInfo.media);
      }
    }
    return out;
  }

  /**
   * @returns {integer} Last global frame. Add one to this to get number of global frames.
   */
  getLastGlobalFrame() {
    return this._lastGlobalFrame;
  }

  /**
   * Gets the absolute time from the given global frame.
   *
   * @param {integer} globalFrame
   * @return {string} Provided frame represented as an isostring in absolute time
   */
  getAbsoluteTimeFromFrame(globalFrame) {

    if (!this.utcEnabled()) {
      throw "getAbsoluteTimeFromFrame(): UTC is not enabled."; 
    }

    // Convert globalFrame into global seconds
    var globalSeconds = globalFrame / this._globalFPS;

    // Add seconds padding to the start
    var msFromEpoch = 1000 * (this._minSecondsFromEpoch + globalSeconds);

    // Convert seconds from epoch to a date object
    var thisDate = new Date(0);
    thisDate.setUTCMilliseconds(msFromEpoch);

    // Return the isostring
    return thisDate.toISOString();
  }

  /**
   * Gets the relative time from the given global frame.
   *
   * @param {integer} globalFrame
   * @return {string} Provided frame represented as HH:MM:SS in relative time
   */
  getRelativeTimeFromFrame(globalFrame) {
    return frameToTime(globalFrame, this._globalFPS);
  }
}
