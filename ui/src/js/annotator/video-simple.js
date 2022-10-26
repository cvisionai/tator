// Module using WebCodecs API to decode video instead of MediaSource Extensions
// reference: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API

// Attempt is made to partially implement the HTML5 MediaElement interface
// such that this is a drop-in replacement for frame accurate MSE applications
// 
// @TODO: Supply a 'cv2.VideoDecode.read()' type interface for client-side decode
//        operations.

import Hls from "hls.js";

class SimpleVideoWrapper {
  constructor(parent, name, path)
  {
    this._name = name;
    this._parent = parent;
    this._video = document.createElement("VIDEO");
    this._video.setAttribute("crossorigin", "anonymous");
    this.use_codec_buffer = true;
    this._path = path;
    this._bias = 0;
    this._keyframeOnly = false;
    this._scrubbing = false;
    this._mute = false;
    this._checked = false;
  }

  // Simple pass through to the underlying video
  get codec_image_buffer()
  {
    this._video.time = this._video.currentTime;
    return this._video;
  }

  init()
  {
    this._video.onloadeddata = () => {
      this._video.onloadeddata = null;
    };
    this._video.oncanplay = () => {
      if (this.oncanplay && this._mute == false)
      {
        this.oncanplay();
      }
    }
    if (this._path)
    {
      this._video.src = this._path;
      console.info(`${this._name} is initialized with ${this._path}`);
    }
  }

  set oncanplay(val)
  {
    this._oncanplay = val;
  }

  get oncanplay()
  {
    return this._oncanplay;
  }
  get canplay()
  {
    for (let idx = 0; idx < this._video.buffered.length; idx++)
    {
      if (this._video.currentTime >= this._video.buffered.start(idx) && this._video.currentTime < this._video.buffered.end(idx))
      {
        return true;
      }
    }
    return false;
  }

  set keyframeOnly(val)
  {
    // Simple mode doesn't support this
  }

  set frameIncrement(val)
  {
    
  }

  set scrubbing(val)
  {

  }

  get keyframeOnly()
  {
    return false;
  }

  clearPending()
  {
    
  }

  // Returns true if the cursor is in the range of the hot frames
  _cursor_is_hot()
  {
    let timestamps = this._hot_frames.keys() // make sure keys are sorted!
    for (let timestamp of timestamps)
    {
      let image_timescale = this._hot_frames.get(timestamp).timescale;
      let frame_delta = this._hot_frames.get(timestamp).frameDelta;
      let cursor_in_ctx = this._current_cursor * image_timescale;
      if (cursor_in_ctx >= timestamp && cursor_in_ctx < timestamp+frame_delta)
      {
        return true;
      }
    }
   
    return false;
  }

  images_near_cursor(max_distance, limit)
  {
    
  }

  get_image(timestamp)
  {
    
  }

  // Returns true if the cursor is in the range of the hot frames
  time_is_hot(time)
  {
  
  }

  _returnFrame(frame)
  {

  }

  _safeCall(func_ptr)
  {
    if (func_ptr)
    {
      func_ptr();
    }
    else
    {
      console.info("Safe call can't call null function");
    }
  }

  // The seek buffer can keep up to 10 frames pre-decoded ready to go in either direction
  // to support extra fast prev/next 
  _clean_hot(force)
  {
   
  }

  _closest_frame_to_cursor()
  {
    
  }

  ///////////////////////////////////////////////////////////
  // Public interface mirrors that of a standard HTML5 video
  ///////////////////////////////////////////////////////////

  set bias(bias)
  {
    this._bias = bias;
  }

  set mute(val)
  {
    this._mute = val;
  }

  get mute()
  {
    return this._mute;
  }
  // Set the current video time
  //
  // Timing considerations:
  // - This will either grab from pre-decoded frames and run very quickly or
  //   jump to the nearest preceding keyframe and decode new frames (slightly slower)
  set currentTime(video_time)
  {
    // If we are approximating seeking, we should land on the nearest buffered time
    if (this.summaryLevel)
    {
      // Round to the nearest Nth second based on the summary level
      const approx = Math.floor((video_time + this._bias)/ this.summaryLevel)*this.summaryLevel;
      let lastDistance = 40000000;
      for (let idx = 0; idx < this.buffered.length; idx++)
      {
        if (idx == 0 && approx < this.buffered.start(idx))
        {
          this._current_cursor = this.buffered.start(idx);
          break;
        }
        const fromBufStart = Math.abs(approx - this.buffered.start(idx));
        //console.info(`${idx}: APPX=${approx} ${fromBufStart} ${this.buffered.start(idx)} SL=${this.summaryLevel}`);
        if (approx >= this.buffered.start(idx) && approx < this.buffered.end(idx))
        {
          this._current_cursor = approx;
          break;
        }
        else if (lastDistance < fromBufStart)
        {
          // If we went past it pick the last good start
          this._current_cursor = this.buffered.start(idx-1);
          break;
        }
        else
        {
          lastDistance = fromBufStart;
        }
      }
      //console.info(`${this._name}: SUMMARIZING ${video_time+this._bias} to ${this._current_cursor} via ${this.summaryLevel}`);
    }
    else
    {
      // Keep worker and manager up to date.
      this._current_cursor = video_time+this._bias;
    }
    // If we didn't set up oncanplay, ignore the cursor change.
    if (this.oncanplay != undefined && this._mute == false)
    {
      this._video.currentTime = this._current_cursor;
    }
  }

  /// Return a list of TimeRange objects representing the downloaded/playable regions of the
  /// video data.
  get buffered()
  {
    return this._video.buffered;
  }

  // Returns the current video cursor position
  get currentTime()
  {
    return this._current_cursor;
  }

  // Append data to the mp4 file
  // - This data should either be sequentially added or added on a segment boundary
  // - Prior to adding video segments the mp4 header must be supplied first.
  appendBuffer(data, timestampOffset)
  {
    
  }

   // Append data to the mp4 file (seek alt)
  // - This data should either be sequentially added or added on a segment boundary
  // - Prior to adding video segments the mp4 header must be supplied first.
  appendSeekBuffer(data, time, timestampOffset)
  {
   
  }

  deleteUpTo(seconds)
  {
    
  }

  pause()
  {
    
  }

  play()
  {
 
  }

  set named_idx(val)
  {
    this._named_idx = val;
  }

  get named_idx()
  {
    return this._named_idx;
  }
}

export class TatorSimpleVideo {
  constructor(id, path)
  {
    this._named_idx = id;
    console.info("Created Simple Video Decoder");
    this._buffer = new SimpleVideoWrapper(this, `Simple Video Buffer ${id}`, path)
    this._buffer.init();
    this._init = false;
    this._compat = true; // Set to tell higher level code this is the simple player.
  }

  hls(playlistUrl) {
    this._hls = new Hls();

    return new Promise((resolve) => {
      this._hls.on(Hls.Events.MANIFEST_LOADING, () => {
        console.info(`Parsed ${playlistUrl}`);
        resolve();
      });
      this._hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        this._hls.loadSource(playlistUrl);
      });
      this._hls.attachMedia(this._buffer._video);
    });
  }

  getMediaElementCount() {
    // 1 for seek video, 1 for onDemand video, 1 for all of the scrub
    return 1;
  }

  // Save off the initialization data for this mp4 file
  saveBufferInitData(data) {
   
  }

  clearScrubBuffer() {

  }

  recreateOnDemandBuffers(callback) {
   
  }

  status()
  {
    
  }

  pause(time)
  {
   
  }

  play()
  {
   
  }

  /**
   * Return the source buffer associated with the given frame / buffer type. Or null if not present
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
    for (let idx = 0; idx < this._buffer.buffered.length; idx++)
    {
      if (time >= this._buffer.buffered.start(idx) && time < this._buffer.buffered.end(idx))
      {
        return this._buffer;
      }
    }
    return null;
  }

  // Returns the seek buffer if it is present, or
  // The time buffer if in there
  returnSeekIfPresent(time, direction)
  {
    return this.forTime(time, "seek", direction);
  }

  playBuffer()
  {
    return this._buffer;
  }

  /**
   * Queues the requests to delete buffered onDemand video ranges
   */
  resetOnDemandBuffer()
  {
    let p_func = (resolve, reject) => 
    {
      this.reset().then(() => {
        resolve();
      });
    };
    let p = new Promise(p_func);
    return p;
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
    return false;
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
    this._buffer.deleteUpTo(delete_range[1]);
  }

  seekBuffer()
  {
    return this._buffer;
  }

  currentIdx()
  {
    
  }

  set named_idx(val)
  {
    this._named_idx = val;
    this._buffer.named_idx = val;
  }

  get named_idx()
  {
    return this._named_idx;
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
        resolve();
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

  reset()
  {
  
  }

  appendSeekBuffer(data, time, timestampOffset)
  {
    
  }

  appendLatestBuffer(data, callback, timestampOffset)
  {
    
  }

  /**
   * Appends the video data to the onDemand buffer.
   * After the buffer has been updated, the callback routine will be called.
   *
   * @param {bytes} data - Video segment
   * @param {function} callback - Callback executed once the buffer has been updated
   * @param {bool} force - Force update if true. False will yield updates only if init'd
   */
  appendOnDemandBuffer(data, callback, force, timestampOffset)
  {
    //console.info(`${JSON.stringify(data)}`);
    // Fail-safe, if we have a frame start this is the start of a new buffer
    // and we need to clear everything we had.
    
  }

  /**
   * Appends data to all buffers (generally init information)
   * @param {*} data 
   * @param {*} callback 
   * @param {*} force 
   */
  appendAllBuffers(data, callback, force, timestampOffset)
  {
    
  }
}
