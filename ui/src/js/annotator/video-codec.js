// Module using WebCodecs API to decode video instead of MediaSource Extensions
// reference: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API

import * as MP4Box from "mp4box";

class TatorVideoBuffer {
  constructor()
  {

  }
}
export class TatorVideoDecoder {
  constructor()
  {
    console.info("Created WebCodecs based Video Decoder");

    let setup_generic_callbacks = (name, file) => {
      file.onError = (e) => {
        console.error(`${name} buffer reports ${e}`);
        if (this._loadedDataError)
        {
          this._loadedDataError();
        }
      };
      file.onReady = (info) => {
        this._codecString = info.tracks[0].codec;
        console.info(`${name} buffer reports fragmented=${info.isFragmented} codec=${this._codecString}`)};
        if (this._loadedDataCallback)
        {
          this._loadedDataCallback();
          this._loadedDataCallback=null;
        }
      file.onMoovStart = () => {console.debug(`${name} buffer reports start of moov.`)};
    }
    this._codecString = null;
    this._seekFile = MP4Box.createFile();
    this._onDemandFile = MP4Box.createFile();
    this._scrubFile = MP4Box.createFile();
    this._init = false;
    setup_generic_callbacks("Seek", this._seekFile);
    setup_generic_callbacks("OnDemand", this._onDemandFile);
    setup_generic_callbacks("Scrub",this._scrubFile);

    this._seekBuffer = new TatorVideoBuffer();
    this._onDemandBuffer = new TatorVideoBuffer();
    this._scrubBuffer = new TatorVideoBuffer();
  }

  getMediaElementCount() {
    // 1 for seek video, 1 for onDemand video, 1 for all of the scrub
    return 3;
  }

  // Save off the initialization data for this mp4 file
  saveBufferInitData(data) {
    this._ftypInfo = data;
  }

  clearScrubBuffer() {

  }

  recreateOnDemandBuffers(callback) {
    // Do not need for WebCodec implementation
    callback();
  }

  status()
  {
    
  }

  /**
   * Return the source buffer associated with the given frame / buffer type.
   *
   * @param {float} time - Seconds timestamp of frame request
   * @param {string} buffer - "play" | "scrub"
   * @param {Direction} direction - Forward or backward class
   * @param {float} maxTime - Maximum number of seconds in the video
   * @returns Video element based on the provided time. Returns null if the given time does not
   *          match any of the video buffers.
   */
  forTime(time, buffer, direction, maxTime)
  {
    return this._scrubBuffer;
  }

  // Returns the seek buffer if it is present, or
  // The time buffer if in there
  returnSeekIfPresent(time, direction)
  {
    return this._scrubBuffer;
  }

  playBuffer()
  {
    return this._scrubBuffer;
  }

  /**
   * Queues the requests to delete buffered onDemand video ranges
   */
  resetOnDemandBuffer()
  {
    
  }

  /**
   * @returns {boolean} True if the onDemand buffer has no data
   */
  isOnDemandBufferCleared()
  {
    
  }

  /**
   * @returns {boolean} True if the onDemand buffer is busy
   */
  isOnDemandBufferBusy()
  {
    
  }

  /**
   * If there are any pending deletes for the onDemand buffer, this will rotate through
   * them and delete them
   */
  cleanOnDemandBuffer()
  {
 
  }

  /**
   * Removes the given range from the play buffer
   * @param {tuple} delete_range - start/end (seconds)
   */
  deletePendingOnDemand(delete_range)
  {
    
  }

  seekBuffer()
  {
    
  }

  currentIdx()
  {
    
  }

  error()
  {
    
  }

  /**
   * Used for initialization of the video object.
   * @returns Promise that is resolved when the first video element is in the ready state or
   *          data has been loaded. This promise is rejected if an error occurs
   *          with the video element.
   */
  loadedDataPromise(parent)
  {
    let p = new Promise((resolve, reject) => {
      if (this._init)
      {
        resolve();
      }
      else
      {
        this._loadedDataCallback = resolve;
        this._loadedDataError = reject;
      }
    });
    return p;
  }

  /**
   * If there are any pending deletes for the seek buffer, this will rotate through them
   * and delete them
   */
  cleanSeekBuffer()
  {

  }

  appendSeekBuffer(data, time=undefined)
  {
    //this._seekFile.appendBuffer(data);
  }

  appendLatestBuffer(data, callback)
  {
    //this._scrubFile.appendBuffer(data);
  }

  /**
   * Appends the video data to the onDemand buffer.
   * After the buffer has been updated, the callback routine will be called.
   *
   * @param {bytes} data - Video segment
   * @param {function} callback - Callback executed once the buffer has been updated
   * @param {bool} force - Force update if true. False will yield updates only if init'd
   */
  appendOnDemandBuffer(data, callback, force)
  {
    //data.fileStart = 0;
    //this._onDemandFile.appendBuffer(data);
  }

  /**
   * Appends data to all buffers (generally init information)
   * @param {*} data 
   * @param {*} callback 
   * @param {*} force 
   */
  appendAllBuffers(data, callback, force)
  {
    console.info("Appending All Buffers");
    if (this._init == false || force == true)
    {
      data.fileStart = 0; // init data is at the start of the file
      this._seekFile.appendBuffer(data);
      this._onDemandFile.appendBuffer(data);
      this._scrubFile.appendBuffer(data);
    }
    this._init = true;
    callback();
  }
}