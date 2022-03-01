// Module using WebCodecs API to decode video instead of MediaSource Extensions
// reference: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API

import * as MP4Box from "mp4box";

function arrayBufferConcat () {
  var length = 0
  var buffer = null

  for (var i in arguments) {
    buffer = arguments[i]
    length += buffer.byteLength
  }

  var joined = new Uint8Array(length)
  var offset = 0

  for (var i in arguments) {
    buffer = arguments[i]
    joined.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }

  return joined.buffer
}

class Writer {
  constructor(size) {
    this.data = new Uint8Array(size);
    this.idx = 0;
    this.size = size;
  }

  getData() {
    if(this.idx != this.size)
      throw "Mismatch between size reserved and sized used"

    return this.data.slice(0, this.idx);
  }

  writeUint8(value) {
    this.data.set([value], this.idx);
    this.idx++;
  }

  writeUint16(value) {
    // TODO: find a more elegant solution to endianess.
    var arr = new Uint16Array(1);
    arr[0] = value;
    var buffer = new Uint8Array(arr.buffer);
    this.data.set([buffer[1], buffer[0]], this.idx);
    this.idx +=2;
  }

  writeUint8Array(value) {
    this.data.set(value, this.idx);
    this.idx += value.length;
  }
}

class TatorVideoBuffer {
  constructor(parent, name)
  {
    this._name = name;
    this._parent = parent;
    this.use_codec_buffer = true;

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
    this._current_duration = 0.0;
  }

  _mp4OnError(e)
  {
    console.error(`${this._name} buffer reports ${e}`);
    if (this._loadedDataError)
    {
      this._loadedDataError();
    }
  }

  _getExtradata(avccBox) {
    var i;
    var size = 7;
    for (i = 0; i < avccBox.SPS.length; i++) {
      // nalu length is encoded as a uint16.
      size+= 2 + avccBox.SPS[i].length;
    }
    for (i = 0; i < avccBox.PPS.length; i++) {
      // nalu length is encoded as a uint16.
      size+= 2 + avccBox.PPS[i].length;
    }

    var writer = new Writer(size);

    writer.writeUint8(avccBox.configurationVersion);
    writer.writeUint8(avccBox.AVCProfileIndication);
    writer.writeUint8(avccBox.profile_compatibility);
    writer.writeUint8(avccBox.AVCLevelIndication);
    writer.writeUint8(avccBox.lengthSizeMinusOne + (63<<2));

    writer.writeUint8(avccBox.nb_SPS_nalus + (7<<5));
    for (i = 0; i < avccBox.SPS.length; i++) {
      writer.writeUint16(avccBox.SPS[i].length);
      writer.writeUint8Array(avccBox.SPS[i].nalu);
    }

    writer.writeUint8(avccBox.nb_PPS_nalus);
    for (i = 0; i < avccBox.PPS.length; i++) {
      writer.writeUint16(avccBox.PPS[i].length);
      writer.writeUint8Array(avccBox.PPS[i].nalu);
    }

    return writer.getData();
  }

  _mp4OnReady(info)
  {
    this._codecString = info.tracks[0].codec;
    this._trackWidth = Math.round(info.tracks[0].track_width);
    this._trackHeight = Math.round(info.tracks[0].track_height);
    this._timescale = info.tracks[0].timescale;
    let codecConfig = {
      codec: this._codecString,
      codedWidth: Number(this._trackWidth),
      codedHeight: Number(this._trackHeight),
      description: this._getExtradata(this._mp4File.moov.traks[0].mdia.minf.stbl.stsd.entries[0].avcC),
      //hardwareAcceleration: "prefer-hardware"//,
      //optimizeForLatency: true
    };
    console.info(JSON.stringify(info.tracks[0]));
    console.info(`${this._name} is configuring decoder = ${JSON.stringify(codecConfig)}`);
    this._videoDecoder.configure(codecConfig);
    console.info(`${this._name} decoder reports ${this._videoDecoder.state}`);

    // Configure segment callback
    this._mp4File.setExtractionOptions(info.tracks[0].id);
    this._muted = true;
    this._mp4File.start();
    console.info(JSON.stringify(info));

    // Notify higher level code we loaded our first bit of data
    if (this._parent._loadedDataCallback)
    {
      this._parent._loadedDataCallback();
      this._parent._loadedDataCallback=null;
    }
    this._duration_time = 0;
    this._hot_frames = new Map(); // This stores the hot frames (decoded) ready to serve up via image_buffer property
  }

  _mp4Samples(track_id, ref, samples)
  {
    console.info(`${this._name}: Got samples ${samples.length}`);

    if (this._muted == false)
    {
      console.info(`${this._name}: UNMUTED processing ${samples.length}`);
      let timestamp = samples[0].cts;
      let buffers = [];
      if (samples[0].is_sync != true)
      {
        // Did not seek to the nearest keyframe; oops
        console.error("Invalid seek attempted (not aligned to key frame!)");
      }
      let idx = 0;
      let duration = 0;
      // initialize CTS vector
      this._cts = [];
      this._segment_pos = 0;
      for (idx = 0; idx < samples.length; idx++)
      {
        // Only decode one segment at a time.
        if (idx > 0 && samples[idx].is_sync)
        {
          break;
        }
        buffers.push(samples[idx].data);
        this._cts.push(samples[idx].cts);
        duration += samples[idx].duration;
      }
      console.info(`Sending ${idx} frames for decode`);
      let bigBuffer = arrayBufferConcat(...buffers);
      const chunk = new EncodedVideoChunk({
        type: "key",
        timestamp: timestamp,
        data: bigBuffer,
        duration: duration
      });
      this._videoDecoder.decode(chunk);
      this._videoDecoder.flush();
      this._muted = true;
      this._mp4File.seek(0);
    }
    else
    {
      // Figure out buffered regions here
    }
  }

  _hot_frame_range()
  {
    let min = Number.MAX_SAFE_INTEGER;
    let max = Number.MIN_SAFE_INTEGER;
    let timestamps = this._hot_frames.keys();
    for (let timestamp of timestamps)
    {
      const frame_time = timestamp/ this._timescale;
      if (frame_time < min)
      {
        min = frame_time;
      }
      if (frame_time > max)
      {
        max = frame_time;
      }
    }
    return {'min': min, 'max': max};
  }

  // Returns true if the cursor is in the range of the hot frames
  _cursor_is_hot()
  {
    const min_max = this._hot_frame_range();
    if (this._current_cursor >= min_max.min && this._current_cursor <= min_max.max)
    {
      return true;
    }
    else
    {
      return false;
    }
  }

  // Trims out the hot buffer based on the cursor position
  _run_garbage_collect()
  {
    // @TODO: Implement this routine (needs frames per second)
  }
  _frameReady(frame)
  {
    console.info(`${this._name} decode frame callback TS=${frame.timestamp} DUR=${frame.duration}`);

    // Can't trust timestamp from frame
    this._hot_frames.set(this._cts[this._segment_pos],frame);
    if (this._cursor_is_hot())
    {
      this._seekComplete = true;
      this._safeCall(this.oncanplay);
    }
    this._segment_pos++;
  }

  _safeCall(func_ptr)
  {
    if (func_ptr)
    {
      func_ptr();
    }
  }

  _frameError(error)
  {
    console.error(`${this._name} DECODE ERROR ${error}`);
  }

  _closest_frame_to_cursor()
  {
    const cursorInCts = this._current_cursor*this._timescale;
    let lastDistance = Number.MAX_VALUE;
    let lastTimestamp = 0;
    for (let timestamp of this._hot_frames.keys())
    {
      let thisDistance = Math.abs(timestamp-cursorInCts);
      if (thisDistance > lastDistance)
      {
        break;
      }
      else
      {
        lastDistance = thisDistance
        lastTimestamp = timestamp;
      }
    }
    console.info(`${this._name}: Returning ${lastTimestamp} for ${cursorInCts}`);
    return this._hot_frames.get(lastTimestamp);
  }

  // Public interface mirrors that of a standard HTML5 video

  set currentTime(video_time)
  {
    if (this._codecString == undefined)
    {
      console.info("Can not seek until file is loaded.")
      return;
    }
    if (this._current_cursor == video_time)
    {
      console.debug("Not duping low-level seek")
      return;
    }
    console.info(`${this._name} commanded to ${video_time}`);
    this._mp4File.stop();
    this._mp4File.seek(video_time);
    this._muted = false;
    this._seekComplete = false;
    this._mp4File.start();
    this._current_cursor = video_time;

  }
  get currentTime()
  {
    return this._current_cursor;
  }

  // Property to get the underlying video object R/O property
  // Would be nice if we could somehow derive off of canvas image source
  get codec_image_buffer()
  {
    if (this._cursor_is_hot() && this._seekComplete == true)
    {
      return this._closest_frame_to_cursor();
    }
    else
    {
      return null;
    }
  }
  appendBuffer(data)
  {
    this._mp4File.appendBuffer(data);
  }

  pause()
  {
    // Shouldn't be called
    console.error("Calling pause() on underlying media.");
  }

  play()
  {
    // Shouldn't be called
    console.error("Calling play() on underlying media.");
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

  pause()
  {
    // Shouldn't be called
    console.error("Calling pause() on underlying media.");
  }

  play()
  {
    // Shouldn't be called
    console.error("Calling play() on underlying media.");
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