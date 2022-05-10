import Hls from "hls.js";

/// Support multiple off-screen videos at varying resolutions
/// the intention is this export class is used to store raw video
/// frames as they are downloaded.

export class VideoBufferDemux {
  constructor() {
    this._bufferSize = 140 * 1024 * 1024; // 140Mb
    this._numBuffers = 1;

    this._vidBuffers = [];
    this._inUse = [];
    this._full = [];
    this._mediaSources = [];
    this._sourceBuffers = [];
    this._compat = false;
    this._activeBuffers = 0;

    // Video, source, and buffer for seek track
    this._seekVideo = document.createElement("VIDEO");
    this._seekVideo.setAttribute("crossorigin", "anonymous");
    console.log("MediaSource element created: VIDEO (seek)");
    this._seekReady = false;
    this._pendingSeeks = [];
    this._pendingSeekDeletes = [];

    this._mime_str = 'video/mp4; codecs="avc1.64001e"';

    for (var idx = 0; idx < this._numBuffers; idx++) {
      this._vidBuffers.push(document.createElement("VIDEO"));
      this._vidBuffers[idx].setAttribute("crossorigin", "anonymous");
      console.log("MediaSource element created: VIDEO (scrub)");
      this._inUse.push(0);
      this._sourceBuffers.push(null);
      this._full.push(false);
    }

    // Create another video buffer specifically used for onDemand playback
    this._onDemandBufferIndex = this._numBuffers;
    this._pendingOnDemandDeletes = [];
    this.recreateOnDemandBuffers(() => { return; });

    this._needNewScrubBuffer = true;
    this._init = false;
    this._dataLag = [];
    let init_buffers = () => {
      console.info("Init buffers");

      // Initialize the seek buffer
      this._seekBuffer = null;
      this._seekSource = new MediaSource();
      this._seekVideo.src = URL.createObjectURL(this._seekSource);
      this._seekSource.onsourceopen = () => {
        this._seekSource.onsourceopen = null;
        this._seekBuffer = this._seekSource.addSourceBuffer(this._mime_str);
        if (this._pendingSeeks.length > 0) {
          console.info("Applying pending seek data.");
          var pending = this._pendingSeeks.shift();
          this.appendSeekBuffer(pending.data, pending.time);
        }
      };

      // Initialize the playback buffers
      let that = this;
      var makeSourceBuffer = function (idx, event) {
        var args = this;
        var ms = args["ms"];
        var idx = args["idx"];
        ms.onsourceopen = null;

        // Need to add a source buffer for the video.
        that._sourceBuffers[idx] = ms.addSourceBuffer(that._mime_str);

        // Reached the onDemand buffer, rest of the function isn't associated with it
        if (idx == that._numBuffers) {
          if (that._initData) {
            that.appendOnDemandBuffer(that._initData, () => { }, true);
          }
          return;
        }

        for (let idx = 0; idx < that._numBuffers; idx++) {
          if (that._sourceBuffers[idx] == null)
            return;
        }

        if (that._initData) {
          let handleDataLag = () => {
            if (that._pendingSeeks.length > 0) {
              var pending = that._pendingSeeks.shift();
              that.appendSeekBuffer(pending.data, pending.time);
            }
            let lag = that._dataLag.shift();
            if (lag) {
              if (lag.callback && that._dataLag.length == 0) {
                setTimeout(() => { that.appendLatestBuffer(lag.data, lag.callback, "handlingDataLog"); }, 0);
              }
              else {
                setTimeout(() => { that.appendLatestBuffer(lag.data, handleDataLag, "handlingDataLog"); }, 0);
              }
            }

            else {
              that._initData = undefined;
            }
          };
          that.appendAllBuffers(that._initData, () => { that._init = true; handleDataLag(); }, true);
        }

        else {
          that._init = true;
        }
      };

      // This links the source element buffers with a paired video element and also
      // a media source
      for (var idx = 0; idx < this._numBuffers; idx++) {
        var ms = new MediaSource();
        this._mediaSources[idx] = ms;
        this._vidBuffers[idx].src = URL.createObjectURL(this._mediaSources[idx]);
        ms.onsourceopen = makeSourceBuffer.bind({ "idx": idx, "ms": ms });
      }
    };
    if (document.hidden == true) {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden == false && this._init == false) {
          init_buffers();
        }
      });
    }

    else {
      init_buffers();
    }
  }

  getMediaElementCount() {
    // 1 for seek video, 1 for onDemand video, numBuffers for scrub video
    return this._numBuffers + 2;
  }

  saveBufferInitData(data) {
    this._ftypInfo = data;
  }

  clearScrubBuffer() {

    if (this._ftypInfo == null) {
      return;
    }

    for (let idx = 0; idx < this._numBuffers; idx++) {

      this._vidBuffers[idx].pause();
      this._vidBuffers[idx].removeAttribute('src');
      this._vidBuffers[idx].load();

      delete this._mediaSources[idx];
      delete this._sourceBuffers[idx];
    }

    this._numBuffers = 0;
    this.appendNewScrubBuffer(() => { }, true);
  }

  appendNewScrubBuffer(callback, skipInit) {
    this._numBuffers += 1;
    var idx = this._numBuffers - 1;

    this._vidBuffers.push(document.createElement("VIDEO"));
    console.log("MediaSource element created: VIDEO (scrub)");
    this._vidBuffers[idx].setAttribute("crossorigin", "anonymous");
    this._inUse.push(0);
    this._sourceBuffers.push(null);
    this._full.push(false);

    var ms = new MediaSource();
    this._mediaSources[idx] = ms;
    this._vidBuffers[idx].src = URL.createObjectURL(this._mediaSources[idx]);
    ms.onsourceopen = () => {
      ms.onsourceopen = null;
      this._sourceBuffers[idx] = ms.addSourceBuffer(this._mime_str);
      console.log("appendNewScrubBuffer - onsourceopen");
      if (skipInit != true) {
        this._updateBuffers([idx], this._ftypInfo, callback);
      };
    };
  }

  recreateOnDemandBuffers(callback) {

    if (this._onDemandVideo != null) {
      this._onDemandVideo.pause();
      this._onDemandVideo.removeAttribute('src');
      this._onDemandVideo.load();
    }

    this._onDemandSource = new MediaSource();
    this._onDemandVideo = document.createElement("VIDEO");
    console.log("MediaSource element created: VIDEO (onDemand)");
    this._onDemandVideo.setAttribute("crossorigin", "anonymous");
    this._onDemandVideo.src = URL.createObjectURL(this._onDemandSource);

    this._onDemandSource.onsourceopen = () => {
      if (this._onDemandSource.readyState == "open") {
        this._onDemandSource.onsourceopen = null;
        this._onDemandSourceBuffer = this._onDemandSource.addSourceBuffer(this._mime_str);
        console.log("recreateOnDemandBuffers - onsourceopen");
        callback();
      }
    };
  }

  status() {
    console.info("Buffer Status");
    console.info(`Active Buffer Count = ${this._activeBuffers}`);
    var bufferSizeMb = this._bufferSize / (1024 * 1024);
    for (var idx = 0; idx < this._numBuffers; idx++) {
      var mbInUse = this._inUse[idx] / (1024 * 1024);
      console.info(`\t${idx} = ${mbInUse}/${bufferSizeMb} MB`);
      if (this._vidBuffers[idx] == null) {
        return;
      }
      var ranges = this._vidBuffers[idx].buffered;
      if (ranges.length > 0) {
        console.info("\tRanges:");
        for (var rIdx = 0; rIdx < ranges.length; rIdx++) {
          console.info(`\t\t${rIdx}: ${ranges.start(rIdx)}:${ranges.end(rIdx)}`);
        }
      }

      else {
        console.info("\tEmpty");
      }

    }

    console.info("Seek Buffer:");
    if (this._seekBuffer == null) {
      return;
    }
    var ranges = this._seekBuffer.buffered;
    if (ranges.length > 0) {
      console.info("\tRanges:");
      for (var rIdx = 0; rIdx < ranges.length; rIdx++) {
        console.info(`\t\t${rIdx}: ${ranges.start(rIdx)}:${ranges.end(rIdx)}`);
      }
    }

    else {
      console.info("\tEmpty");
    }
  }

  currentVideo() {
    for (var idx = 0; idx < this._numBuffers; idx++) {
      if (this._full[idx] != true) {
        return this._vidBuffers[idx];
      }
    }
    return null;
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
  forTime(time, buffer, direction, maxTime) {
    if (this._compat == true) {
      return this._vidBuffers[0];
    }

    if (buffer == "play") {
      const video = this.playBuffer();
      var ranges = video.buffered;

      // Note: The way it's setup right now, there should only be a continuous range
      //       But we'll keep the for loop for now.
      for (var rangeIdx = 0; rangeIdx < ranges.length; rangeIdx++) {
        var start = ranges.start(rangeIdx);
        var end = ranges.end(rangeIdx);

        if (time >= start && time <= end) {
          return video;
        }
      }

      /*
      if (ranges.length > 0)
      {
        console.warn(`Playback buffer doesn't contain time (ranges/start/end/time) ${ranges.length} ${start} ${end} ${time}`);
      }
      */
    }
    else if (buffer == "scrub") {
      for (var idx = this._activeBuffers - 1; idx >= 0; idx--) {
        var ranges = this._vidBuffers[idx].buffered;
        for (var rangeIdx = 0; rangeIdx < ranges.length; rangeIdx++) {
          var start = ranges.start(rangeIdx);
          var end = ranges.end(rangeIdx);
          if (time >= start &&
            time <= end) {
            return this._vidBuffers[idx];
          }
        }
      }
    }

    return null;
  }

  // Returns the seek buffer if it is present, or
  // The time buffer if in there
  returnSeekIfPresent(time, direction) {
    //let time_result= this.forTime(time, "scrub");
    //if (time_result)
    //{
    //  return time_result;
    //}
    for (let idx = 0; idx < this._seekVideo.buffered.length; idx++) {
      // If the time is comfortably in the range don't bother getting
      // additional data
      let timeFromStart = time - this._seekVideo.buffered.start(idx);
      let bufferedLength = (this._seekVideo.buffered.end(idx) - this._seekVideo.buffered.start(idx)) * 0.75;
      if (timeFromStart <= bufferedLength && timeFromStart > 0) {
        return this._seekVideo;
      }
    }
    return null;
  }

  playBuffer() {
    return this._onDemandVideo;
  }

  playSource() {
    return this._onDemandSource;
  }

  playSourceBuffer() {
    return this._onDemandSourceBuffer;
  }

  /**
   * Queues the requests to delete buffered onDemand video ranges
   */
  resetOnDemandBuffer() {
    const video = this.playBuffer();
    this._pendingOnDemandDeletes = [];
    for (var rangeIdx = 0; rangeIdx < video.buffered.length; rangeIdx++) {
      let start = video.buffered.start(rangeIdx);
      let end = video.buffered.end(rangeIdx);
      this.deletePendingOnDemand([start, end]);
    }

    let promise = new Promise((resolve, _) => {
      let checkBuffer = () => {
        if (!this.isOnDemandBufferCleared()) {
          setTimeout(checkBuffer, 100);
        }
        else {
          console.log(`resetOnDemandBuffer: length - ${video.buffered.length}`);
          resolve();
        }
      };

      checkBuffer();
    });

    return promise;
  }

  /**
   * @returns {boolean} True if the onDemand buffer has no data
   */
  isOnDemandBufferCleared() {
    return this.playBuffer().buffered.length == 0;
  }

  /**
   * @returns {boolean} True if the onDemand buffer is busy
   */
  isOnDemandBufferBusy() {
    return this.playSourceBuffer().updating;
  }

  /**
   * If there are any pending deletes for the onDemand buffer, this will rotate through
   * them and delete them
   */
  cleanOnDemandBuffer() {
    if (this._pendingOnDemandDeletes.length > 0) {
      var pending = this._pendingOnDemandDeletes.shift();
      this.deletePendingOnDemand(pending.delete_range);
    }
  }

  /**
   * Removes the given range from the play buffer
   * @param {tuple} delete_range - start/end (seconds)
   */
  deletePendingOnDemand(delete_range) {
    const buffer = this.playSourceBuffer();
    if (buffer.updating == false) {
      buffer.onupdateend = () => {
        buffer.onupdateend = null;
        this.cleanOnDemandBuffer();
      };

      buffer.remove(delete_range[0], delete_range[1]);
    }

    else {
      this._pendingOnDemandDeletes.push(
        { "delete_range": delete_range });
    }
  }

  seekBuffer() {
    return this._seekVideo;
  }

  currentIdx() {
    for (var idx = 0; idx < this._numBuffers; idx++) {
      if (this._full[idx] != true) {
        return idx;
      }
    }
    return null;
  }

  error() {
    var currentVid = this.currentVideo();
    if (currentVid) {
      return currentVid.error;
    }

    else {
      return { code: 500, message: "All buffers full." };
    }
  }

  /**
   * Set to compatibility mode
   */
  compat(videoUrl) {
    this._vidBuffers[0].src = videoUrl;
    this._vidBuffers[0].load();
    this._compat = true;
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
      this._hls.attachMedia(this._vidBuffers[0]);

      this._compat = true;
    });
  }

  /**
   * Pause each of the video elements
   */
  pause() {
    for (var idx = 0; idx < this._numBuffers; idx++) {
      this._vidBuffers[idx].pause();
    }
    this.playBuffer().pause();
  }

  /**
   * Used for initialization of the video object.
   * @returns Promise that is resolved when the first video element is in the ready state or
   *          data has been loaded. This promise is rejected if an error occurs
   *          with the video element.
   */
  loadedDataPromise(video) {
    var that = this;
    var promise = new Promise(
      function (resolve, reject) {
        let loaded_data_callback = function () {
          console.info("Called promise");
          // In version 2 buffers are immediately available
          if (video._videoVersion >= 2) {
            that._vidBuffers[0].onloadeddata = null;
            resolve();
          }

          else {
            // attempt to go to the frame that is requested to be loaded
            console.log("Going to frame " + video._dispFrame);
            video.gotoFrame(video._dispFrame).then(() => {
              resolve();
              that._vidBuffers[0].onloadeddata = null;
            });
          }
        };
        that._vidBuffers[0].onloadeddata = loaded_data_callback;
        that._vidBuffers[0].onerror = function () {
          reject();
          that._vidBuffers[0].onerror = null;
        };

        if (that._vidBuffers[0].readyState == "open") {
          resolve();
        }
      });
    return promise;
  }

  /**
   * If there are any pending deletes for the seek buffer, this will rotate through them
   * and delete them
   */
  cleanSeekBuffer() {
    if (this._pendingSeekDeletes.length > 0) {
      var pending = this._pendingSeekDeletes.shift();
      this.deletePendingSeeks(pending.delete_range);
    }
  }

  /**
   * Removes the given start/end time segment from the seek buffer
   * @param {*} delete_range
   */
  deletePendingSeeks(delete_range = undefined) {
    // Add to the buffer directly else add to the pending
    // seek to get it there next go around
    if (this._seekReady) {
      if (this._seekBuffer.updating == false) {
        this._seekBuffer.onupdateend = () => {

          // Remove this handler
          this._seekBuffer.onupdateend = null;
          this.cleanSeekBuffer();
        };

        if (delete_range) {
          this._seekBuffer.remove(delete_range[0], delete_range[1]);
        }
      }

      else {
        this._pendingSeekDeletes.push(
          { 'delete_range': delete_range });
      }
    }
  }
  appendSeekBuffer(data, time = undefined) {
    // Add to the buffer directly else add to the pending
    // seek to get it there next go around
    if (this._seekReady) {
      if (this._seekBuffer.updating == false) {
        this._seekBuffer.onupdateend = () => {

          // Remove this handler
          this._seekBuffer.onupdateend = null;
          // Seek to the time requested now that it is loaded
          if (time != undefined) {
            this._seekVideo.currentTime = time;
          }
        };

        // If this is a data request delete the stuff currently in the buffer
        if (data != null) {
          for (let idx = 0; idx < this._seekBuffer.buffered.length; idx++) {
            let begin = this._seekBuffer.buffered.start(idx);
            let end = this._seekBuffer.buffered.end(idx);

            // If the seek buffer has 3 seconds extra on either side
            // of the request chop of 1 seconds on either side this
            // means there is a maximum of ~4 second buffer in the
            // hq seek buffer.
            if (begin < time - 3) {
              this._pendingSeekDeletes.push({
                "delete_range": [begin,
                  time - 1]
              });
            }
            if (end > time + 3) {
              this._pendingSeekDeletes.push({
                "delete_range": [time + 1,
                  end]
              });
            }
          }
          this._seekBuffer.appendBuffer(data);
        }
      }

      else {
        this._pendingSeeks.push({
          'data': data,
          'time': time
        });
      }

    }
  }

  appendLatestBuffer(data, callback) {
    if (this._init == false) {
      this._dataLag.push({ data: data, callback: null });
      setTimeout(callback, 100);
      return;
    }

    var latest = this.currentIdx();
    if (latest != null) {
      var newSize = this._inUse[latest] + data.byteLength;
      if (newSize > this._bufferSize) {
        console.log(`${latest} is full, proceeding to next buffer`);
        this._full[latest] = true;
        this._needNewScrubBuffer = true;
        this.appendLatestBuffer(data, callback);
      }

      else {
        // If we are 5% away from the end, start overlapping with a new buffer
        // If this does not happen, we will get short segments of missing time.
        if (newSize > (this._bufferSize * 0.95)) {
          if (this._needNewScrubBuffer) {
            this._needNewScrubBuffer = false;
            this.appendNewScrubBuffer(() => {
              this._updateBuffers([latest, latest + 1], data, callback);
            });
          }
          else {
            this._updateBuffers([latest, latest + 1], data, callback);
          }
        }

        else {
          this._updateBuffers([latest], data, callback);
        }
      }
    }

    else {
      console.error("No Buffers available!");
    }

  }

  /**
   * Appends the video data to the onDemand buffer.
   * After the buffer has been updated, the callback routine will be called.
   *
   * @param {bytes} data - Video segment
   * @param {function} callback - Callback executed once the buffer has been updated
   * @param {bool} force - Force update if true. False will yield updates only if init'd
   */
  appendOnDemandBuffer(data, callback, force) {
    if (this._init == false && force != true) {
      console.info("Waiting for init... (onDemand)");
      return;
    }
    this._updateOnDemandBuffer(data, callback);
  }

  _updateOnDemandBuffer(data, callback) {

    var that = this;

    // Callback wrapper function used to help keep track of how many buffers
    // have been updated.
    var semaphore = 1;
    var wrapper = function () {
      that.playSourceBuffer().onupdateend = null;
      semaphore--;
      if (semaphore == 0) {
        callback();
      }
    };

    // Place the provided frame data into each of the buffers if it's safe to do so.
    // Once the all the buffers have been updated, perform the callback
    var error = this.playBuffer().error;
    if (error) {
      console.error("Error " + error.code + "; details: " + error.message);
      updateStatus("Video Decode Error", "danger", -1);
      throw `Video Decode Error: ${bufferType}`;
    }
    this.safeUpdate(this.playSourceBuffer(), data).then(wrapper);
  }

  /**
   *
   * @param {array} buffersToUpdate - List of buffer indices to add data to
   * @param {array} data - Array of video bytes to store
   * @param {function} callback - Callback function
   */
  _updateBuffers(buffersToUpdate, data, callback) {
    var that = this;
    this._activeBuffers = Math.max(...buffersToUpdate) + 1;

    // Callback wrapper function used to help keep track of how many buffers
    // have been updated.
    var semaphore = buffersToUpdate.length;
    var wrapper = function () {
      that._sourceBuffers[this].onupdateend = null;
      semaphore--;
      if (semaphore == 0) {
        callback();
      }
    };

    // Place the provided frame data into each of the buffers if it's safe to do so.
    // Once the all the buffers have been updated, perform the callback
    for (var idx = 0; idx < buffersToUpdate.length; idx++) {
      var bIdx = buffersToUpdate[idx];
      var error = this._vidBuffers[bIdx].error;
      if (error) {
        console.error("Error " + error.code + "; details: " + error.message);
        updateStatus("Video Decode Error", "danger", -1);
        throw `Video Decode Error: ${bufferType}`;
      }
      this.safeUpdate(this._sourceBuffers[bIdx], data).then(wrapper.bind(bIdx));
      this._inUse[bIdx] += data.byteLength;
    }
  }

  appendAllBuffers(data, callback, force) {
    if (force == undefined) {
      force = false;
    }
    if (this._init == false && force == false) {
      console.info("Waiting for init... (appendAllBuffers)");
      this._initData = data;
      setTimeout(callback, 0);
      return;
    }
    var semaphore = this._numBuffers;
    var wrapper = function () {
      semaphore--;
      if (semaphore == 0) {
        callback();
      }
    };

    this.safeUpdate(this._seekBuffer, data).then(() => {
      this._seekReady = true;
      // Handle any pending seeks
      if (this._pendingSeeks.length > 0) {
        var pending = this._pendingSeeks.shift();
        this.appendSeekBuffer(pending.data, pending.time);
      }

      // Now fill the rest of the buffers
      for (var idx = 0; idx < this._numBuffers; idx++) {
        this.safeUpdate(this._sourceBuffers[idx], data).then(wrapper);
        this._inUse[idx] += data.byteLength;
      }
    });
  }

  // Source buffers need a mutex to protect them, return a promise when
  // the update is finished.
  safeUpdate(buffer, data) {
    let promise = new Promise((resolve, reject) => {
      if (buffer.updating) {
        setTimeout(() => {
          this.safeUpdate(buffer, data).then(resolve);
        }, 100);
      }

      else {
        buffer.onupdateend = () => {
          buffer.onupdateend = null;
          resolve();
        };
        buffer.appendBuffer(data);
      }
    });
    return promise;
  }
}
