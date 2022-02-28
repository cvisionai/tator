// Module using WebCodecs API to decode video instead of MediaSource Extensions
// reference: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API

import * as MP4Box from "mp4box";

class TatorVideoBuffer {
  constructor(parent, name)
  {
    this._name = name;
    this._parent = parent;

    this._configured = false;

    // Create MP4 unpacking elements
    this._mp4File = MP4Box.createFile();
    this._mp4File.onError = this._mp4OnError.bind(this);
    this._mp4File.onReady = this._mp4OnReady.bind(this);
    this._mp4File.onSamples = this._mp4Samples.bind(this);

    this._videoDecoder = new VideoDecoder({
      output: this._frameReady.bind(this),
      error: this._frameError.bind(this)});

    // For  lack of a better guess put the default video cursor at 0
    this._current_cursor = 0.0;
  }

  _mp4OnError(e)
  {
    console.error(`${this._name} buffer reports ${e}`);
    if (this._loadedDataError)
    {
      this._loadedDataError();
    }
  }

  _mp4OnReady(info)
  {
    this._codecString = info.tracks[0].codec;
    this._trackWidth = Math.round(info.tracks[0].track_width);
    this._trackHeight = Math.round(info.tracks[0].track_height);
    let codecConfig = {
      codec: this._codecString,
      codedWidth: Number(this._trackWidth),
      codedHeight: Number(this._trackHeight),
      hardwareAcceleration: "prefer-hardware",
      optimizeForLatency: true
    };
    console.info(JSON.stringify(info.tracks[0]));
    console.info(`${this._name} is configuring decoder = ${JSON.stringify(codecConfig)}`);
    this._videoDecoder.configure(codecConfig);
    console.info(`${this._name} decoder reports ${this._videoDecoder.state}`);

    // Configure segment callback
    this._mp4File.setExtractionOptions(info.tracks[0].id);

    // Notify higher level code we loaded our first bit of data
    if (this._parent._loadedDataCallback)
    {
      this._parent._loadedDataCallback();
      this._parent._loadedDataCallback=null;
    }
  }

  _mp4Samples(track_id, ref, samples) {
    for (const sample of samples)
    {
      console.info(`Handling sample: ${sample.cts} ${sample.is_sync} ${sample.duration}`);
    }
  }

  _frameReady(frame)
  {
    console.info(`${this._name} decode frame callback`);
  }

  _frameError(error)
  {
    console.error(`${this._name} DECODE ERROR ${error}`);
  }

  // Public interface mirrors that of a standard HTML5 video

  set currentTime(video_time)
  {
    if (this._current_cursor == video_time)
    {
      console.debug("Not duping low-level seek")
      return;
    }
    console.info(`${this._name} commanded to ${video_time}`);
    this._mp4File.seek(video_time);
    this._seekComplete = false;
    this._mp4File.start();

  }
  get currentTime()
  {
    return this._current_cursor;
  }

  get currentFrame()
  {
    // TODO return decoded video image if available else
    return null;
  }
  appendBuffer(data)
  {
    this._mp4File.appendBuffer(data);
  }
}
export class TatorVideoDecoder {
  constructor()
  {
    console.info("Created WebCodecs based Video Decoder");

    this._seekBuffer = new TatorVideoBuffer(this, "Seek");
    this._onDemandBuffer = new TatorVideoBuffer(this, "OnDemand");
    this._scrubBuffer = new TatorVideoBuffer(this, "Scrub");
    this._init = false;
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
    this._scrubBuffer.appendBuffer(data);
    setTimeout(callback,0); // defer to next clock
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
      this._seekBuffer.appendBuffer(data);
      this._onDemandBuffer.appendBuffer(data);
      this._scrubBuffer.appendBuffer(data);
    }
    this._init = true;
    setTimeout(callback,0); // defer to next clock
  }
}