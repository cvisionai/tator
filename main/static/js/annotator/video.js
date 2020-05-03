// Video class handles interactions between HTML presentation layer and the
// javascript application.
//

/// The video player uses seek+display strategy to an off-screen buffer.
///
/// The off-screen buffer is then copied to a buffer of GPU-backed
/// textures, whose depth is configurable by 'bufferDepth' variable in
/// 'loadFromVideoElement'.
///
/// The 'playGeneric' routine is kicked off for forward/rewind activities
/// and drives to userspace threads.
/// - The Player runs at the display rate (guiFPS is the max, but nominal
///   displays at the video FPS).
/// - The Loader runs at the fastest rate a browser codec can seek+load the
///   frame buffer. Assuming the frame buffer fills faster than the display
///   the load thread retreats for half the buffer size to fill back up again.
/// - A diagnostic thread runs to report FPS to the javascript console.
///
/// Supported formats:
/// - The video player works with any codec the html5 video object in the
///   given browser supports. This is browser specific, but both Chrome
///   and firefox support the following formats:
///      + video/mp4 (codec: libx264)
///      + video/webm (codec: vp8)
///      + video/webm (codec: vp9)
///
///
/// Frame rate limiting:
/// - guiFPS is a way to limit the maximum attempted FPS. If a video with
///   an FPS faster than guiFPS is loaded, playback rate is lowered.
/// - Playback rate can be adjusted to 'fast forward'. Frame droppage
///   occurs when the fast forward FPS exceeds the GUI FPS.
///      + As an example if the guiFPS is 30, and you load a 15 FPS video
///        the FPS of playback rate 1.0 is 15. at 2.0, the FPS is 30. If
///        the user requests a playback rate of 4.0 the FPS is 60, but the
///        screen can only display 30 fps. In this case every other frame is
///        loaded + displayed (@ 30 fps).
///
/// Known issues/Erratta:
///
///
/// - In order for the 'seek+play' strategy to work, videos need to have
///   fixed size GOP (i.e. number of frames per key frame region). This
///   aligns with notes on making videos 'streamable'. Videos should have
///   a key frame at least every 2 seconds for optimal performance. With
///   ffmpeg one can do something like `ffmpeg ... -r <fps> -g <fps*2>
///
/// - Performance in firefox is markedly less than Chrome which seems to have
///   a better implementation of handing `<video>`. On a XPS 15 9570 (2018 era)
///   the chrome browser was able to display video at 60 FPS. Firefox had
///   performance in the teens. On an XPS 15 (2008 era), Chrome performed
///   in the teens.

// Constrain the video display FPS to not allow dropped frames during playback
//
var guiFPS=30;

var Direction = { BACKWARDS:-1, STOPPED: 0, FORWARD: 1};
var State = {PLAYING: 0, IDLE: 1, LOADING: -1};

var src_path="/static/js/annotator/";

/// Support multiple off-screen videos at varying resolutions
/// the intention is this class is used to store raw video
/// frames as they are downloaded. There are two
/// internal buffers the default ; and a seek buffer.
/// The default can be filled linearly or
class VideoBufferDemux
{
  constructor(streaming_files, play_idx, scrub_idx, hq_idx)
  {
    // By default use 100 megabytes
    this._bufferSize = 100*1024*1024;
    this._numBuffers = 30;

    this._totalBufferSize = this._bufferSize*this._numBuffers;
    this._vidBuffers=[];
    this._inUse=[];
    this._full=[];
    this._mediaSources=[];
    this._sourceBuffers=[];
    this._compat = false;
    this._activeBuffers = 0;

    // Video, source, and buffer for seek track
    this._seekVideo = document.createElement("VIDEO");
    this._seekBuffer = null;
    this._seekSource = new MediaSource();
    this._seekReady = false;
    this._pendingSeeks = [];

    var mime_str='video/mp4; codecs="avc1.64001e"';

    this._seekSource.onsourceopen=() => {
      this._seekSource.onsourceopen = null;
      this._seekBuffer = this._seekSource.addSourceBuffer(mime_str);
      if (this._pendingSeeks.length > 0)
      {
        console.info("Applying pending seek data.");
        var pending = this._pendingSeeks.shift();
        this.appendSeekBuffer(pending.data, pending.time, pending.delete_range);
      }
    };

    this._seekVideo.src = URL.createObjectURL(this._seekSource);
    var makeSourceBuffer = function(idx, event)
    {
      var args=this;
      var ms = args["ms"];
      var idx = args["idx"];
      ms.onsourceopen=null;
      // Need to add a source buffer for the video.
      that._sourceBuffers[idx]=ms.addSourceBuffer(mime_str);
    }
    var that = this;
    for (var idx = 0; idx < this._numBuffers; idx++)
    {
      this._vidBuffers.push(document.createElement("VIDEO"));
      this._inUse.push(0);
      this._full.push(false);
      var ms=new MediaSource();
      this._mediaSources[idx] = ms;
      this._sourceBuffers.push(null);
      this._vidBuffers[idx].src=URL.createObjectURL(this._mediaSources[idx]);
      ms.onsourceopen=makeSourceBuffer.bind({"idx": idx, "ms": ms});
    }
  }

  status()
  {
    console.info("Buffer Status");
    console.info(`Active Buffer Count = ${this._activeBuffers}`);
    var bufferSizeMb=this._bufferSize/(1024*1024);
    for (var idx = 0; idx < this._numBuffers; idx++)
    {
      var mbInUse=this._inUse[idx]/(1024*1024);
      console.info(`\t${idx} = ${mbInUse}/${bufferSizeMb} MB`);
      if (this._vidBuffers[idx] == null)
      {
        return;
      }
      var ranges=this._vidBuffers[idx].buffered;
      if (ranges.length > 0)
      {
        console.info("\tRanges:");
        for (var rIdx = 0; rIdx < ranges.length; rIdx++)
        {
          console.info(`\t\t${rIdx}: ${ranges.start(rIdx)}:${ranges.end(rIdx)}`);
        }
      }
      else
      {
        console.info("\tEmpty");
      }

    }

    console.info("Seek Buffer:")
    if (this._seekBuffer == null)
    {
      return;
    }
    var ranges=this._seekBuffer.buffered;
    if (ranges.length > 0)
    {
      console.info("\tRanges:");
      for (var rIdx = 0; rIdx < ranges.length; rIdx++)
      {
        console.info(`\t\t${rIdx}: ${ranges.start(rIdx)}:${ranges.end(rIdx)}`);
      }
    }
    else
    {
      console.info("\tEmpty");
    }
  }

  currentVideo()
  {
    for (var idx = 0; idx < this._numBuffers; idx++)
    {
      if (this._full[idx] != true)
      {
        return this._vidBuffers[idx];
      }
    }
    return null;
  }

  forTime(time, direction)
  {
    if (this._compat)
    {
      return this._vidBuffers[0];
    }
    for (var idx = this._activeBuffers-1; idx >= 0; idx--)
    {
      var ranges = this._vidBuffers[idx].buffered;
      for (var rangeIdx = 0; rangeIdx < ranges.length; rangeIdx++)
      {
        var start=ranges.start(rangeIdx);
        var end = ranges.end(rangeIdx);
        if (time >= start &&
            time <= end)
        {
          return this._vidBuffers[idx];
        }
      }
    }

    return null;
  }

  // Returns the seek buffer if it is present, or
  // The time buffer if in there
  returnSeekIfPresent(time, direction)
  {
    let time_result= this.forTime(time, direction);
    if (time_result)
    {
      return time_result;
    }
    for (let idx = 0; idx < this._seekVideo.buffered.length; idx++)
    {
      // If the time is comfortably in the range don't bother getting
      // additional data
      let timeFromStart = time - this._seekVideo.buffered.start(idx);
      let bufferedLength = (this._seekVideo.buffered.end(idx) - this._seekVideo.buffered.start(idx)) * 0.90;
      if (timeFromStart <= bufferedLength && timeFromStart > 0)
      {
        return this._seekVideo;
      }
    }
    return null;
  }
  seekBuffer()
  {
    return this._seekVideo;
  }

  currentIdx()
  {
    for (var idx = 0; idx < this._numBuffers; idx++)
    {
      if (this._full[idx] != true)
      {
        return idx;
      }
    }
    return null;
  }

  error()
  {
    var currentVid = this.currentVideo();
    if (currentVid)
    {
      return currentVid.error;
    }
    else
    {
      return {code: 500, message: "All buffers full."};
    }
  }

  compat(videoUrl)
  {
    this._vidBuffers[0].src=videoUrl;
    this._vidBuffers[0].load();
    this._compat = true;
  }

  pause()
  {
    for (var idx = 0; idx < this._numBuffers; idx++)
    {
      this._vidBuffers[idx].pause();
    }
  }

  loadedDataPromise(video)
  {
    var that = this;
    var promise = new Promise(
      function(resolve,reject)
      {
        that._vidBuffers[0].onloadeddata = function()
        {
          // In version 2 buffers are immediately available
          if (video._videoVersion >= 2)
          {
            that._vidBuffers[0].onloadeddata = null;
            resolve();
          }
          else
          {
            // attempt to go to the frame that is requested to be loaded
            console.log("Going to frame " + video._dispFrame);
            video.gotoFrame(video._dispFrame).then(() => {
              resolve();
              that._vidBuffers[0].onloadeddata = null;
            });
          }
        }
        that._vidBuffers[0].onerror = function()
        {
          reject();
          that._vidBuffers[0].onerror = null;
        }

        if (that._vidBuffers[0].readyState > 0)
        {
          resolve();
        }
      });
    return promise;
  }

  appendSeekBuffer(data, time=undefined, delete_range=undefined)
  {
    // Add to the buffer directly else add to the pending
    // seek to get it there next go around
    if (this._seekBuffer.updating == false && this._seekReady == true)
    {
      this._seekBuffer.onupdateend = () => {

        // Remove this handler
        this._seekBuffer.onupdateend = null;
        // Seek to the time requested now that it is loaded
        if (time != undefined)
        {
          this._seekVideo.currentTime = time;
        }

        if (this._pendingSeeks.length > 0)
        {
          var pending = this._pendingSeeks.shift();
          this.appendSeekBuffer(pending.data, pending.time, pending.delete_range);
        }
      };

      // If this is a data request delete the stuff currently in the buffer
      if (data != null)
      {
        for (let idx = 0; idx < this._seekBuffer.buffered.length; idx++)
        {
          this._pendingSeeks.push({"delete_range": [this._seekBuffer.buffered.start(idx),
                                                    this._seekBuffer.buffered.end(idx)]});
        }
        this._seekBuffer.appendBuffer(data);
      }
      else if (delete_range)
      {
        this._seekBuffer.remove(delete_range[0], delete_range[1]);
      }
    }
    else
    {
      this._pendingSeeks.push({'data': data,
                               'time': time});
    }
  }

  appendLatestBuffer(data, callback)
  {
    var latest=this.currentIdx();
    if (latest != null)
    {
      var newSize = this._inUse[latest] + data.byteLength;
      if (newSize > this._bufferSize)
      {
        console.log(`${latest} is full, proceeding to next buffer`);
        this._full[latest] = true;
        this.appendLatestBuffer(data, callback);
      }
      else
      {
        // If we are 2% away from the end, start overlapping
        // Except for the last buffer because then we are
        // SoL.
        if (newSize > (this._bufferSize *0.98) &&
            latest != (this._numBuffers - 1))
        {
          this._updateBuffers([latest,latest+1],data,callback);
        }
        else
        {
          this._updateBuffers([latest],data,callback);
        }
      }
    }
    else
    {
      console.error("No Buffers available!");
    }

  }

  _updateBuffers(buffersToUpdate, data, callback)
  {
    var semaphore = buffersToUpdate.length;
    var that = this;
    this._activeBuffers=Math.max(...buffersToUpdate)+1;
    var wrapper=function()
    {
      that._sourceBuffers[this].onupdateend=null;
      semaphore--;
      if (semaphore == 0)
      {
        callback();
      }
    };

    for (var idx = 0; idx < buffersToUpdate.length; idx++)
    {
      var bIdx = buffersToUpdate[idx];
      this._sourceBuffers[bIdx].onupdateend=wrapper.bind(idx);
      var error = this._vidBuffers[bIdx].error;
      if (error)
      {
        console.error("Error " + error.code + "; details: " + error.message);
        updateStatus("Video Decode Error", "danger", -1);
        return;
      }
      this._sourceBuffers[bIdx].appendBuffer(data);
      this._inUse[bIdx] += data.byteLength;
    }
  }

  appendAllBuffers(data, callback)
  {
    console.info(`VIDEO: Updating all buffers with ${data.byteLength}`)
    var semaphore = this._numBuffers;
    var wrapper = function()
    {
      semaphore--;
      if (semaphore==0)
      {
        callback();
      }
    }

    // Update the seek buffer first; then the rest
    this._seekBuffer.onupdateend=() =>
      {
        this._seekBuffer.onupdateend = null;
        this._seekReady = true;
        // Handle any pending seeks
        if (this._pendingSeeks.length > 0)
        {
          var pending = this._pendingSeeks.shift();
          this.appendSeekBuffer(pending.data, pending.time);
        }

        // Now fill the rest of the buffers
        for (var idx = 0; idx < this._numBuffers; idx++)
        {
          this._sourceBuffers[idx].onupdateend=function()
          {
            this.onupdateend=null;
            wrapper();
          }
          this._sourceBuffers[idx].appendBuffer(data);
          this._inUse[idx] += data.byteLength;
        }
      }
    this._seekBuffer.appendBuffer(data);
  }
}

/// Used to determine system fps and calculate playback
/// schedules based on a given video fps
class MotionComp {
  constructor() {
    this._interval = null;
    this._monitorFps = null;
    this._times = [];

    // This takes ~1/3 sec
    this._TRIALS = 20;

    // First we need to do a couple of trials to figure out what the
    // interval of the system is.
    let calcTimes = (now) => {
      this._times.push(now);
      if (this._times.length > this._TRIALS)
      {
        this.calculateMonitorFPS();
        console.info(`Calculated FPS interval = ${this._interval} (${this._monitorFps})`);
      }
      else
      {
        window.requestAnimationFrame(calcTimes);
      }
    };
    window.requestAnimationFrame(calcTimes);
  }

  calculateMonitorFPS() {
    let mode = new Map();
    // Calculate the mode of the delta over the calls ignoring the first few.
    for (let idx = 2; idx < this._TRIALS-1; idx++)
    {
      let fps = Math.round(1000.0/(this._times[idx+1]-this._times[idx]));
      if (mode.has(fps))
      {
        mode.set(fps, mode.get(fps) + 1);
      }
      else
      {
        mode.set(fps, 1);
      }
    }

    let maxOccurance = 0;

    for (const canidate of mode.keys())
    {
      let occurance = mode.get(canidate)
      if (occurance > maxOccurance)
      {
        maxOccurance = occurance;
        this._monitorFps = canidate;
      }
    }

    if (Math.abs(this._monitorFps-240) < 10)
    {
      this._monitorFps = 240;
    }
    else if (Math.abs(this._monitorFps-120) < 10)
    {
      this._monitorFps = 120;
    }
    else if (Math.abs(this._monitorFps-60) < 5)
    {
      this._monitorFps = 60;
    }
    else if (Math.abs(this._monitorFps-30) < 5)
    {
      this._monitorFps = 30;
    }

    this._interval = 1000.0 / this._monitorFps;
    this._times = []
  }

  clearTimesVector()
  {
    this._times = [];
  }

  periodicRateCheck(now)
  {
    this._times.push(now);
    if (this._times.length > this._TRIALS)
    {
      const oldMonitor = this._monitorFps;
      this.calculateMonitorFPS();
      if (oldMonitor != this._monitorFps)
      {
        console.warn(`ALERT: New FPS interval = ${this._interval} (${this._monitorFps})`);
        console.warn("ALERT: Recalculating playback scheduled");
        this.computePlaybackSchedule(this._videoFps, this._factor);
      }
    }
  }
  /// Given a video at a frame rate calculate the frame update
  /// schedule:
  ///
  /// Example:
  ///
  ///  Animations  *       *       *       *       * ....
  ///  60 fps :    |   0   |   1   |   2   |   3   | ....
  ///  48 fps :    |   0      |    1      |     2     | ...
  ///  30 fps :    |   0   |   0   |   1   |   1   | ....
  ///  15 fps :    |   0   |   0   |   0   |   0   | ....
  ///
  /// Fractional fps are displayed at best effort based on the
  /// monitor's actual display rate (likely 60 fps)
  ///
  /// In the example above, 48fps is actually displayed at
  /// 60fps but interpolated to be as close to 48 fps
  /// Animations  *       *       *       *       * ....
  /// 48 fps :    |   0   |   1   |   1   |   2   | .... (effective 45 fps)
  ///
  computePlaybackSchedule(videoFps, factor)
  {
    // Cache these in case we need to recalculate later
    this._videoFps = videoFps;
    this._factor = factor;

    let displayFps = videoFps;
    if (factor < 1)
    {
      displayFps *= factor;
    }

    // Compute a 3-slot schedule for playback
    let animationCyclesPerFrame = (this._monitorFps / displayFps);
    if (this._safeMode)
    {
      // Safe mode slows things down by 2x
      animationCyclesPerFrame *= 2;
    }
    let regularSize = Math.floor(animationCyclesPerFrame);
    let fractional = animationCyclesPerFrame - regularSize;
    let largeSize = regularSize + Math.round(fractional*3)
    this._schedule = [ regularSize,
                       largeSize,
                       regularSize];
    this._lengthOfSchedule = regularSize * 2 + largeSize;
    this._updatesAt = [0,
                       regularSize,
                       regularSize + largeSize];
    this._targetFPS = 3000 / (this._lengthOfSchedule * this._interval)
    let msg = "Playback schedule = " + this._schedule + "\n";
    msg += "Updates @ " + this._updatesAt + "\n";
    msg += "Frame Increment = " + this.frameIncrement(videoFps, factor) + "\n";
    msg += "Target FPS = " + this._targetFPS + "\n";
    msg += "video FPS = " + videoFps + "\n";
    msg += "factor = " + factor + "\n";
    console.info(msg);
    if (this._diagnosticMode == true)
    {
      Utilities.sendNotification(msg, true);
    }
  }

  /// Given an animation idx, return true if it is an update cycle
  timeToUpdate(animationIdx)
  {
    let relIdx = animationIdx % this._lengthOfSchedule;
    return this._updatesAt.includes(relIdx);
  }
  frameIncrement(fps, factor)
  {
    let clicks = Math.ceil(fps / this._monitorFps);
    if (factor > 1)
    {
      clicks *= factor;
    }

    // We skip every other frame in safe mode
    if (this._safeMode)
    {
      clicks *= 2;
    }
    return clicks;
  }

  safeMode()
  {
    Utilities.sendNotification(`Entered safe mode on ${location.href}`);
    guiFPS = 15;
    this._safeMode = true;
  }

  // Returns the number of ticks that have occured since the last
  // report
  animationIncrement(now, last)
  {
    let difference = now-last;
    let increment = Math.round(difference/this._interval);
    // Handle start up burst
    if (isNaN(increment))
    {
      increment = 0;
    }
    increment = Math.min(increment,2);
    return increment;
  }

  get targetFPS()
  {
    return this._targetFPS;
  }
}
class VideoCanvas extends AnnotationCanvas {
  constructor() {
    super();
    var that = this;
    this._diagnosticMode = false;
    this._videoVersion = 1;

    let parameters = new URLSearchParams(window.location.search);
    if (parameters.has('diagnostic'))
    {
      console.info("Diagnostic Mode Enabled")
      this._diagnosticMode = true;
    }
    // Make a new off-screen video reference
    this._motionComp = new MotionComp();
    this._motionComp._diagnosticMode = this._diagnosticMode;
    this._playbackRate=1.0;
    this._dispFrame=0; //represents the currently displayed frame

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("frame"))
    {
      this._dispFrame = Number(searchParams.get("frame"));
    }
    this._direction=Direction.STOPPED;
    this._fpsDiag=0;
    this._fpsLoadDiag=0;

    this._playCb = [this.onPlay.bind(this)];
    this._pauseCb = [this.onPause.bind(this)];

    // This flag is used to force a vertex reload
    this._dirty = true;

    this._startBias = 0.0;

    if (this._diagnosticMode == true)
    {
      let msg = "Startup Diagnostic\n";
      let gl = this._draw.gl;
      let debug = gl.getExtension("WEBGL_debug_renderer_info");
      msg += "==== Browser Information ====\n";
      msg += `\tappVersion = ${navigator.appVersion}\n`;
      msg += `\turl = ${window.location.href}\n`;
      msg += "===== OpenGL Information ====\n";
      msg += `\tVENDOR = ${gl.getParameter(gl.VENDOR)}\n`;
      msg += `\tRENDERER = ${gl.getParameter(gl.RENDERER)}\n`;
      msg += `\tVERSION = ${gl.getParameter(gl.VERSION)}\n`;
      msg += `\tUNMASKED VENDOR = ${gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)}\n`;
      msg += `\tUNMASKED RENDERER = ${gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)}\n`;
      Utilities.sendNotification(msg, true);
    }
  }

  refresh(forceSeekBuffer)
  {
    // Refresh defaults to high-res buffer
    if (forceSeekBuffer == undefined)
    {
      forceSeekBuffer = true;
    }
    return this.gotoFrame(this._dispFrame, forceSeekBuffer);
  }

  currentFrame()
  {
    return this._dispFrame;
  }

  stopDownload()
  {
    // If there is an existing download, kill it
    if (this._dlWorker != null)
    {
      this._dlWorker.terminate();
    }
  }

  startDownload(streaming_files)
  {
    var that = this;

    this._dlWorker = new Worker(`${src_path}/vid_downloader.js`);

    this._dlWorker.onmessage =
      function(e)
    {
      const type = e.data["type"];
      if (type == "finished")
      {
        console.info("Stopping download worker.");
      }
      else if (type =="seek_result")
      {
        that._videoElement[that._hq_idx].appendSeekBuffer(e.data["buffer"], e.data['time']);
        document.body.style.cursor = null;
      }
      else if (type =="buffer")
      {
        let video_buffer = that._videoElement[e.data["buf_idx"]];
        var error = video_buffer.error();
        if (error)
        {
          updateStatus("Video decode error", "danger", "-1");
          return;
        }

        // recursive lamdba function to update source buffer
        var idx = 0;
        var offsets=e.data["offsets"];

        var data = e.data["buffer"];
        var appendBuffer=function(callback)
        {
          var offsets = e.data["offsets"];
          if (idx <  offsets.length)
          {
            if (offsets[idx][2] == 'ftyp')
            {
              var begin=offsets[idx][0];
              var end=offsets[idx+1][0]+offsets[idx+1][1];
              video_buffer.appendAllBuffers(data.slice(begin, end), callback);
              idx+=2;
            }
            else
            {
              var begin=offsets[idx][0];
              var end=offsets[idx][0] + offsets[idx][1];
              video_buffer.appendLatestBuffer(data.slice(begin, end), callback);
              idx++;
            }
          }
        };

        var afterUpdate = function(_)
        {
          var error = video_buffer.error();
          if (error)
          {
            console.error("Error " + error.code + "; details: " + error.message);
            updateStatus("Video Decode Error", "danger", -1);
            return;
          }

          if (idx == offsets.length && e.data["buf_idx"] == that._play_idx)
          {
            that.dispatchEvent(new CustomEvent("bufferLoaded",
                                               {composed: true,
                                                detail: {"percent_complete":e.data["percent_complete"]}
                                               }));

            that._dlWorker.postMessage({"type": "download",
                                        "buf_idx": e.data["buf_idx"]});
          }
          else
          {
            // Can't call append in this event handler + avoid a deep recursion stack
            setTimeout(function()
                       {
                         appendBuffer(afterUpdate);
                       },0);
          }
        };

        appendBuffer(afterUpdate);

      }
      else if (type == "ready")
      {
        if (e.data["buf_idx"] == that._play_idx)
        {
          that._dlWorker.postMessage({"type": "download",
                                      "buf_idx": e.data["buf_idx"]});
          that._startBias = e.data["startBias"];
          that._videoVersion = e.data["version"];
          console.info(`Video has start bias of ${that._startBias}`);
          console.info("Setting hi performance mode");
          guiFPS = 60;
        }
      }
      else if (type == "error")
      {
        // Go to compatibility mode
        console.warn("In video compatibility mode");
        that._videoElement[0].compat(streaming_files[0].path);
        that.seekFrame(0, that.drawFrame);
        that.dispatchEvent(new CustomEvent("bufferLoaded",
                                           {composed: true,
                                            detail: {"percent_complete":1.00}
                                           }));
      }
    };
    this._dlWorker.postMessage({"type": "start",
                                "media_files": streaming_files,
                                "play_idx": this._play_idx,
                                "hq_idx": this._hq_idx,
                                "scrub_idx": this._scrub_idx});
  }

  setQuality(quality)
  {
    let find_closest = (videoObject, resolution) => {
      let play_idx = -1;
      let max_delta = videoObject.height;
      let resolutions = videoObject.media_files["streaming"].length;
      for (let idx = 0; idx < resolutions; idx++)
      {
        let height = videoObject.media_files["streaming"][idx].resolution[0];
        let delta = Math.abs(quality - height);
        if (delta < max_delta)
        {
          max_delta = delta;
          play_idx = idx;
        }
      }
      return play_idx;
    };

    let new_play_idx = find_closest(this._videoObject, quality);
    if (new_play_idx == this._play_idx)
    {
      console.info("Ignoring duplicate quality change");
    }
    else
    {
      console.info(`Changing quality to ${new_play_idx}`);

      // Stop any existing download
      this.dispatchEvent(new CustomEvent("bufferLoaded",
                                               {composed: true,
                                                detail: {"percent_complete":0.0}
                                               }));
      this.stopDownload();

      // Reinitialize the buffers
      this._play_idx = new_play_idx;
      this._videoElement = [];
      let streaming_files = this._videoObject.media_files["streaming"];
      for (let idx = 0; idx < streaming_files.length; idx++)
      {
        this._videoElement.push(new VideoBufferDemux());
        this._videoElement[idx].named_idx = idx;
      }
      // Clear the buffer in case this is a hot-swap
      this._draw.clear();
      this.startDownload(streaming_files);

    }
  }
  /// Load a video from URL (whole video) with associated metadata
  /// Returns a promise when the video resource is loaded
  loadFromVideoObject(videoObject, quality)
  {
    this._videoObject = videoObject;
    // If quality is not supplied default to 720
    if (quality == undefined || quality == null)
    {
      quality = 720;
    }

    // Note: dims is width,height here
    let videoUrl, fps, numFrames, dims;
    fps = videoObject.fps;
    numFrames = videoObject.num_frames;

    let find_closest = (videoObject, resolution) => {
      let play_idx = -1;
      let max_delta = videoObject.height;
      let resolutions = videoObject.media_files["streaming"].length;
      for (let idx = 0; idx < resolutions; idx++)
      {
        let height = videoObject.media_files["streaming"][idx].resolution[0];
        let delta = Math.abs(quality - height);
        if (delta < max_delta)
        {
          max_delta = delta;
          play_idx = idx;
        }
      }
      return play_idx;
    };

    let play_idx = -1;
    let scrub_idx = -1;
    let hq_idx = -1;
    let streaming_files = null;
    if (videoObject.media_files)
    {
      streaming_files = videoObject.media_files["streaming"];
      play_idx = find_closest(videoObject, quality);
      // Todo parameterize this to maximize flexibility
      scrub_idx = find_closest(videoObject, 320);
      hq_idx = 0;
      console.info(`NOTICE: Choose video stream ${play_idx}`);

      // Use worst-case dims
      dims = [streaming_files[0].resolution[1],
              streaming_files[0].resolution[0]];

      let host = `${window.location.protocol}//${window.location.host}`;
      for (var idx = 0; idx < streaming_files.length; idx++)
      {
        if (streaming_files[idx].host)
        {
          host = streaming_files[idx].host;
        }
        streaming_files[idx].path = `${host}/${streaming_files[idx].path}`;
      }
    }
    // Handle cases when there are no streaming files in the set
    if (play_idx == -1)
    {
      videoUrl = videoObject.url;
      dims = [videoObject.width,videoObject.height];
      console.warn("Using old access method!");
      streaming_files = [{"path": videoObject.url,
                          "resolution": [videoObject.height,videoObject.width]}];
      play_idx = 0;
      scrub_idx = 0;
      hq_idx = 0;
    }

    // Set initial buffer index values
    this._play_idx = play_idx;
    this._scrub_idx = scrub_idx;
    this._hq_idx = hq_idx;

    this._videoElement = [];
    for (let idx = 0; idx < streaming_files.length; idx++)
    {
      this._videoElement.push(new VideoBufferDemux());
      this._videoElement[idx].named_idx = idx;
    }
    // Clear the buffer in case this is a hot-swap
    this._draw.clear();


    console.info(`Video dimensions = ${dims}`);
    var that = this;
    // Resize the viewport
    this._draw.resizeViewport(dims[0], dims[1]);
    this._fps=fps;
    this._numFrames=numFrames;
    this._dims=dims;
    this.resetRoi();

    this.stopDownload();
    var promise = this._videoElement[this._play_idx].loadedDataPromise(this);
    this.startDownload(streaming_files);
    if (fps > guiFPS)
    {
      this._playbackRate=guiFPS/fps;
      this.rateChange(this._playbackRate);
      var msg = "Loading a video with faster framerate than supported then display.\n";
      msg+= "Adjusting playrate to avoid dropping frames.\n";
      msg+= "\tDisplay FPS=" + guiFPS + "\n";
      msg+= "\tVideo FPS=" + fps + "\n";
      msg+= "\tPlayrate = " + this._playbackRate;
      console.warn(msg);
    }

    // Set up slider max + scrub thresholds
    //this._slider.slider("option", "max", numFrames);
    this.scrubThreshold = Math.max(25,numFrames/200);
    this._draw.resizeViewport(dims[0], dims[1]);
    this.setupResizeHandler(dims);
    // On load seek to frame 0
    return promise;
  }

  clearFrame()
  {
    var cWidth=this._canvas.width;
    var cHeight=this._canvas.height;
    this._draw.clearRect(0,0,cWidth, cHeight);

    //Clear the buffer too
    this._draw.clear();

    this._dispFrame=null;
  }

  // Update the canvas (immediate) with the source material, centered on
  // the view screen (resets GPU-bound frame buffer)
  // holds the buffer
  drawFrame(frameIdx, source, width, height)
  {
    // Need to draw the image to the viewable size of the canvas
    // .width is actually the rendering width which may be different
    // in high DPI monitors.
    var cWidth=this._draw.clientWidth;
    var cHeight=this._draw.clientHeight;
    // Calculate scaled image height, such that
    // the height matches the height of the viewscreen
    // and set the scaled width accordingly to maintain aspect
    var scale=cHeight/height;
    var sHeight=height*scale;
    var sWidth=width*scale;

    // Calculate the margin we have in width
    var margin=cWidth-sWidth;
    // We want half of the margin to the left of the image frame
    var leftSide=margin/2;

    // Handle the buffer synchronously because we are seeking in this
    // function. Clear the pipeline, Push the latest image, and display
    this._draw.clear();
    this._draw.pushImage(frameIdx,
                         source,
                         this._roi[0],this._roi[1],
                         this._roi[2],this._roi[3], //Image size
                         leftSide,0, //Place 'full-screen'
                         sWidth,sHeight, // Use canvas size
                         this._dirty
                        );
    this._dirty=false;

    this.displayLatest(true);
    this.updateOffscreenBuffer(frameIdx,
                               source,
                               width,
                               height);

  }

  /// Only call this function from the context of an animation frame
  /// Only call this function if the drawing context can play.
  displayLatest(hold)
  {
    this._fpsDiag++;
    this._dispFrame=this._draw.dispImage(hold);

    this.dispatchEvent(new CustomEvent("frameChange", {
      detail: {frame: this._dispFrame},
      composed: true
    }));
  }

  // Push a given frame into the drawGL buffer
  pushFrame(frameIdx, source, width, height)
  {
    var cWidth=this._canvas.width;
    var cHeight=this._canvas.height;
    // Calculate scaled image height, such that
    // the height matches the height of the viewscreen
    // and set the scaled width accordingly to maintain aspect
    var scale=cHeight/height;
    var sHeight=height*scale;
    var sWidth=width*scale;

    // Calculate the margin we have in width
    var margin=cWidth-sWidth;
    // We want half of the margin to the left of the image frame
    var leftSide=margin/2;

    this._draw.pushImage(frameIdx,
                         source,
                         this._roi[0],this._roi[1],
                         this._roi[2],this._roi[3], //Image size
                         leftSide,0, //Place 'full-screen'
                         sWidth,sHeight, // Use canvas size
                         this._dirty
                        );
    this._dirty=false;
  }

  /// Returns the raw HTML5 buffer for a given frame (default current)
  /// TODO: Add strategy for multires
  videoBuffer(frame, forceSeekBuffer)
  {
    if (frame == undefined)
    {
      frame = this.currentFrame();
    }
    var time=this.frameToTime(frame);
    var direction = this._direction;
    if (direction == Direction.STOPPED)
    {
      if (frame > this.currentFrame() || frame == this.currentFrame())
      {
        direction = Direction.FORWARD;
      }
      else
      {
        direction = Direction.BACKWARD;
      }
    }

    if (forceSeekBuffer)
    {
      return this._videoElement[this._hq_idx].returnSeekIfPresent(time, direction);
    }
    else
    {
      return this._videoElement[this._play_idx].forTime(time, direction);
    }
  }

  frameToTime(frame)
  {
    return this._startBias + ((1/this._fps)*frame)+(1/(this._fps*4));
  }
  /// Seeks to a specific frame of playback and calls callback when done
  /// with the signature of (data, width, height)
  seekFrame(frame, callback, forceSeekBuffer)
  {
    var that = this;
    var time=this.frameToTime(frame);
    var video=this.videoBuffer(frame, forceSeekBuffer);

    // Only support seeking if we are stopped (i.e. not playing)
    if (video == null && this._direction == Direction.STOPPED)
    {
      // Set the seek buffer, and command worker to get the seek
      // response
      document.body.style.cursor = "progress";
      video = this._videoElement[this._hq_idx].seekBuffer();
      that._dlWorker.postMessage({"type": "seek",
                                  "frame": frame,
                                  "time": time,
                                  "buf_idx": this._hq_idx});
    }
    else if (video == null)
    {
      console.warn("Video is not loaded yet.");
      return new Promise((f,r)=>{});
    }

    var promise = new Promise(
      function(resolve,reject)
      {
        // Because we are using off-screen rendering we need to defer
        // updating the canvas until the video/frame is actually ready, we do this
        // by waiting for a signal off the video + then scheduling an animation frame.
        video.oncanplay=function()
        {
          // Don't do anything busy in the canplay interrupt as it holds up the GUI
          // rasterizer.
          // Need to bind the member function to the result handler
          callback=callback.bind(that);
          callback(frame, video, that._dims[0], that._dims[1])
          resolve();
          video.oncanplay=null;
        };
      });

    if (time <= video.duration || isNaN(video.duration))
    {
      video.currentTime=time;
    }
    else if (time > video.duration)
    {
      var end = video.duration;
      time = end;
      frame = end*this._fps;
      video.currentTime=end;
    }
    else
    {
      time = 0;
      frame=0;
      video.currentTime=0;
    }

    return promise;
  }

  ////////////////////////////////
  /// Button handlers
  ////////////////////////////////
  rateChange(newRate)
  {
    this._playbackRate=newRate;
    if (this._direction != Direction.STOPPED)
    {
      this._motionComp.computePlaybackSchedule(this._fps,this._playbackRate);
    }
    this.dispatchEvent(new CustomEvent("rateChange", {
      detail: {rate: newRate},
      composed: true,
    }));
  }

  processRateChange(event)
  {
    this._playbackRate=this._controls.rateControl.val();
    console.log("set rate to: " + this._playbackRate);
    return false;
  }

  // Goto a given frame; optionally force usage of seek buffer
  gotoFrame(frameIdx, forceSeekBuffer)
  {
    if (this._direction != Direction.STOPPED)
    {
      return;
    }

    var promise = this.seekFrame(parseInt(frameIdx), this.drawFrame, forceSeekBuffer);
    promise.then(()=>
                 {this._pauseCb.forEach(cb => {cb(frameIdx);});
                 }
                );
    return promise;
  }

  captureFrame(localizations,frame)
  {
    if (frame == undefined)
    {
      frame = this.currentFrame()
    }

    const filename = `Frame_${frame}_${this._mediaInfo['name']}`;
    this.makeOffscreenDownloadable(localizations, filename);
  }

  _playGeneric(direction)
  {
    var that = this;
    this._direction=direction;

    // Reset the GPU buffer on a new play action
    this._draw.clear();

    // Reset perioidc health check in motion comp
    this._motionComp.clearTimesVector();

    /// This is the notional scheduled diagnostic interval
    var schedDiagInterval=2000.0;

    // set the current frame based on what is displayed
    var currentFrame=this._dispFrame;

    this._motionComp.computePlaybackSchedule(this._fps,this._playbackRate);
    let fpsInterval = 1000.0 / (this._fps);
    let frameIncrement = this._motionComp.frameIncrement(this._fps,this._playbackRate);
    // This is the time to wait to start playing when the buffer is dead empty.
    // 2 frame intervals gives the buffer to fill up a bit to have smooth playback
    // This may end up being a tuneable thing, or we may want to calculate it
    // more intelligently.
    var bufferWaitTime=fpsInterval*4;

    var lastTime=performance.now();
    var animationIdx = 0;

    var player=function(domtime){

      // Start the FPS monitor once we start playing
      if (that._diagTimeout == null)
      {
        that._diagTimeout = setTimeout(diagRoutine, schedDiagInterval, Date.now());
      }

      that._motionComp.periodicRateCheck(domtime);
      let increment = that._motionComp.animationIncrement(domtime, lastTime);
      if (increment > 0)
      {
        lastTime=domtime;
        // Based on how many clocks happened we may actually
        // have to update late
        for (let tempIdx = increment; tempIdx > 0; tempIdx--)
        {
          if (that._motionComp.timeToUpdate(animationIdx+increment))
          {
            that.displayLatest();
            break;
          }
        }
        animationIdx = animationIdx + increment;
      }

      if (that._draw.canPlay())
      {
        that._playerTimeout=window.requestAnimationFrame(player);
      }
      else
      {
        that._motionComp.clearTimesVector();
        that._playerTimeout=null;
      }
    };

    /// This is the loader thread it recalculates intervals based on GUI changes
    /// and seeks to the current frame in the off-screen buffer. If the player
    /// isn't running and there are sufficient frames it will kick off the player
    /// in 10 load cycles
    var loader=function(){

      // If the load buffer is full try again in the load interval
      if (that._draw.canLoad() == false)
      {
        that._loaderTimeout=setTimeout(loader, fpsInterval*4);
        return;
      }

      frameIncrement = that._motionComp.frameIncrement(that._fps,that._playbackRate);

      // Canidate next frame
      var nextFrame=currentFrame+(direction * frameIncrement);

      //Schedule the next load if we are done loading
      var pushAndGoToNextFrame=function(frameIdx, source, width, height)
      {
        that._fpsLoadDiag++;
        that.pushFrame(frameIdx, source, width, height);

        // If the next frame is loadable and we didn't get paused set a timer, else exit
        if (nextFrame >= 0 && nextFrame < that._numFrames && that._direction!=Direction.STOPPED)
        {
          // Update the next frame to display and recurse back at twice the framerate
          currentFrame=nextFrame;
          that._loaderTimeout=setTimeout(loader, 0);
        }
        else
        {
          that._loaderTimeout=null;
          that._direction=Direction.STOPPED;
        }
      }


      // Seek to the current frame and call our atomic callback
      that.seekFrame(currentFrame, pushAndGoToNextFrame);


      // If the player is dead, we should restart it
      if (that._playerTimeout == null && that._draw.canPlay())
      {
        that._playerTimeout=setTimeout(player, bufferWaitTime);
      }
    };

    // turn on/off diagnostics
    if (true)
    {
      this._fpsDiag=0;
      this._fpsLoadDiag=0;
      this._fpsScore=3;
      this._networkUpdate = 0;

      var diagRoutine=function(last)
      {
        var diagInterval = Date.now()-last;
        var calculatedFPS = (that._fpsDiag / diagInterval)*1000.0;
        var loadFPS = ((that._fpsLoadDiag / diagInterval)*1000.0);
        var targetFPS = that._motionComp.targetFPS;
        let fps_msg = `FPS = ${calculatedFPS}, Load FPS = ${loadFPS}, Score=${that._fpsScore}, targetFPS=${targetFPS}`;
        console.info(fps_msg);
        that._fpsDiag=0;
        that._fpsLoadDiag=0;

        if ((that._networkUpdate % 3) == 0 && that._diagnosticMode == true)
        {
          Utilities.sendNotification(fps_msg)
        }
        that._networkUpdate += 1;

        if (that._fpsScore)
        {
          var healthyFPS = targetFPS * 0.90;
          if (calculatedFPS < healthyFPS)
          {
            that._fpsScore--;
          }
          else
          {
            that._fpsScore = Math.min(that._fpsScore + 1,3);
          }

          if (that._fpsScore == 0)
          {
            console.warn("Detected slow performance, entering safe mode.");
            that.dispatchEvent(new Event("safeMode"));
            that._motionComp.safeMode();
            that.rateChange(that._playbackRate);
          }
        }

        if (that._direction!=Direction.STOPPED)
        {
          that._diagTimeout = setTimeout(diagRoutine, schedDiagInterval, Date.now());
        }

      };
    }

    // Kick off the loader
    this._loaderTimeout=setTimeout(loader, 0);
  }

  // Return whether the video is paused/stopped
  isPaused()
  {
    return this._direction == Direction.STOPPED;
  }

  addPlayListener(cb)
  {
    this._playCb.push(cb);
  }

  addPauseListener(cb)
  {
    this._pauseCb.push(cb);
  }

  play()
  {
    this._playCb.forEach(cb => {cb();});
    this._playGeneric(Direction.FORWARD);
  }

  playBackwards()
  {
    this._playCb.forEach(cb => {cb();});
    this._playGeneric(Direction.BACKWARDS);
  }

  // If running will clear player context
  stopPlayerThread()
  {
    if (this._playerTimeout)
    {
      clearTimeout(this._playerTimeout);
      cancelAnimationFrame(this._playerTimeout)
      this._playerTimeout=null;
    }
    if (this._loaderTimeout)
    {
      clearTimeout(this._loaderTimeout);
      this._loaderTimeout=null;
    }

    if (this._diagTimeout)
    {
      clearTimeout(this._diagTimeout);
      this._diagTimeout=null;
    }
  }

  pause()
  {
    // Stop the player thread first
    this.stopPlayerThread();

    // If we weren't already paused send the event
    if (this._direction != Direction.STOPPED)
    {
      this._pauseCb.forEach(cb => {cb();});

      this._direction=Direction.STOPPED;
      this._videoElement[this._play_idx].pause();

      // force a redraw at the currently displayed frame
      return this.seekFrame(this._dispFrame, this.drawFrame, true);
    }
  }

  back()
  {
    var newFrame=this._dispFrame-1;
    if (newFrame >= 0)
    {
      this.gotoFrame(newFrame, true);
    }
  }

  advance()
  {
    var newFrame=this._dispFrame+1;
    if (newFrame < this._numFrames)
    {
      this.gotoFrame(newFrame, true);
    }
  }

  //////////////////////////////////
  /// End button handlers
  //////////////////////////////////
};

customElements.define("video-canvas", VideoCanvas);
