import { AnnotationCanvas } from "./annotation.js";
import { DownloadManager } from "./download_manager.js"
import { TatorVideoDecoder} from "./video-codec.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { getCookie } from "../util/get-cookie.js";
import { PeriodicTaskProfiler } from "./periodic_task_profiler";
import { VideoBufferDemux } from "./video_buffer_demux";
import { MotionComp } from "./motion_comp";
import { ConcatDownloadManager } from "./concat_download_manager.js";


// Video export class handles interactions between HTML presentation layer and the
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
export var guiFPS=30;

var Direction = { BACKWARDS:-1, STOPPED: 0, FORWARD: 1};
var State = {PLAYING: 0, IDLE: 1, LOADING: -1};

var src_path="/static/js/annotator/";

export var RATE_CUTOFF_FOR_ON_DEMAND = 16.0;
const RATE_CUTOFF_FOR_AUDIO = 4.0;

export class VideoCanvas extends AnnotationCanvas {
  constructor() {
    super();

    // Set global variable to find us
    window.tator_video = this;
    var that = this;
    this._diagnosticMode = false;
    this._videoVersion = 1;
    this._decode_profiler = new PeriodicTaskProfiler("Video Decode");
    this._playerProfiler = new PeriodicTaskProfiler("Display Logic");
    this._glProfiler = new PeriodicTaskProfiler("GL Draw");
    this._firstFrame = 0;

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
    this._lastDirection=Direction.FORWARD;
    this._direction=Direction.STOPPED;
    this._fpsDiag=0;
    this._fpsLoadDiag=0;

    this._playCb = [this.onPlay.bind(this)];
    this._pauseCb = [this.onPause.bind(this), this.onDemandDownloadPrefetch.bind(this)];

    // This flag is used to force a vertex reload
    this._dirty = true;

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
      //Utilities.sendNotification(msg, true);
    }

    this._waitPlayback = false;
    this._waitId = null;

    this._videoDiagnostics = {
      id: null,
      currentFrame: null,
      sourceFPS: null,
      actualFPS: null,
      playQuality: null,
      scrubQuality: null,
      seekQuality: null
    };

    this._addVideoDiagnosticOverlay();
    this._ftypInfo = {};
    this._disableAutoDownloads = false;
    this.allowSafeMode = true;

    // Set the onDemand watchdog download thread
    // This will request to download segments if needed
    this._onDemandInit = false;
    this._onDemandInitSent = false;
    this._onDemandPlaybackReady = false;
    this._onDemandFinished = false;
    this._onDemandId = 0;


    this.initialized = false;
  }

  /**
   * Permanently disable downloading the scrub buffer.
   * #TODO Allow some ability to re-enable downloading the scrub buffer.
   */
   disableAutoDownloads() {
    this._disableAutoDownloads = true;
  }

  // #TODO Refactor this so that it uses internal variables?
  updateVideoDiagnosticOverlay(display, currentFrame, sourceFPS, actualFPS, playQuality, scrubQuality, seekQuality, id) {
    if (this._mediaType.dtype == "video" || this._mediaType.dtype == "multi") {

      if (currentFrame != undefined) {
        this._videoDiagnostics.currentFrame = currentFrame;
      }
      if (sourceFPS != undefined) {
        this._videoDiagnostics.sourceFPS = sourceFPS;
      }
      if (actualFPS != undefined) {
        this._videoDiagnostics.actualFPS = actualFPS;
      }
      if (playQuality != undefined) {
        this._videoDiagnostics.playQuality = playQuality;
      }
      if (scrubQuality != undefined) {
        this._videoDiagnostics.scrubQuality = scrubQuality;
      }
      if (seekQuality != undefined) {
        this._videoDiagnostics.seekQuality = seekQuality;
      }
      if (id != undefined) {
        this._videoDiagnostics.id = id;
      }

      var textContent = `
      Frame: ${this._videoDiagnostics.currentFrame}\r\n
      Rate: ${this._playbackRate}\r\n
      1x-4x Playback Quality: ${this._videoDiagnostics.playQuality}\r\n
      Scrub Quality: ${this._videoDiagnostics.scrubQuality}\r\n
      Seek Quality: ${this._videoDiagnostics.seekQuality}\r\n
      Source FPS: ${this._videoDiagnostics.sourceFPS}\r\n
      Actual FPS: ${this._videoDiagnostics.actualFPS}\r\n
      ID: ${this._videoDiagnostics.id}\r\n
      `;

      var enableDisplay = null;
      if (display === false) {
        enableDisplay = false;
      }
      else if (display === true) {
        enableDisplay = true;
      }

      this._textOverlay.modifyText(
        this._videoDiagOverlay,
        {content: textContent,
         style: {
           "whiteSpace": "pre-line",
           "fontSize": "10pt",
           "fontWeight": "bold",
           "color": "white",
           "background": "rgba(0,0,0,0.33)"}},
        enableDisplay);
    }
  }

  _addVideoDiagnosticOverlay() {
    this._videoDiagOverlay = this._textOverlay.addText(0.5, 0.5, "");
    this._textOverlay.toggleTextDisplay(this._videoDiagOverlay, false);
  }

  playBufferDuration() {
    let duration = 0.0;
    const ranges = this._videoElement[this._play_idx].playBuffer().buffered;
    for (let idx = 0; idx < ranges.length; idx++)
    {
      duration += ranges.end(idx) - ranges.start(idx);
    }
    return duration;
  }

  refresh(forceSeekBuffer)
  {
    // Refresh defaults to high-res buffer
    if (forceSeekBuffer == undefined)
    {
      forceSeekBuffer = true;
    }
    this._draw.beginDraw();
    return this.gotoFrame(this._dispFrame, forceSeekBuffer);
  }

  currentFrame()
  {
    return this._dispFrame;
  }

  stopDownload()
  {
    // If there is an existing download worker, kill it
    if (this._dlWorker != null)
    {
      this._dlWorker.terminate();
    }
  }

  setVolume(volume)
  {
    if (this._audioPlayer)
    {
      this._audioPlayer.volume = volume / 100;
    }
  }

  isPlaybackReady() {
    return this._onDemandPlaybackReady;
  }

  sendPlaybackReady() {
    this.dispatchEvent(new CustomEvent(
      "playbackReady",
      {
        composed: true,
        detail: {playbackReadyId: this._waitId},
      }));
  }

  startDownload(streaming_files, offsite_config)
  {
    if (this._children)
    {
      console.info("Launching concat downloader.");
      this._dlWorker = new ConcatDownloadManager(this, this._children, this._videoObject.media_files.concat);
      this._dlWorker.postMessage({"type": "start",
                                  "play_idx": this._play_idx,
                                  "hq_idx": this._seek_idx,
                                  "scrub_idx": this._scrub_idx,
                                  "offsite_config": offsite_config});
    }
    else if (streaming_files[0].hls)
    {
      this._videoElement[0].hls(streaming_files[0].hls).then(() => {
        this.dispatchEvent(new CustomEvent("bufferLoaded",
                                            {composed: true,
                                            detail: {"percent_complete":1.00}
                                            }));
        this.dispatchEvent(new CustomEvent("playbackReady",
                                          {composed: true,
                                            detail: {playbackReadyId: this._waitId},
                                            }));
        this._onDemandPlaybackReady = true; // fake it
        this.sendPlaybackReady();
        // TODO get the real length...
        //const new_length =  1176*this._fps;
        //this.dispatchEvent(new CustomEvent("videoLengthChanged",
        //                                  {composed: true,
         //                                  detail: {length:new_length}}));
      }); 
      return;
    }
    else
    {
      this._dlWorker = new DownloadManager(this);
      this._scrubDownloadCount = 0;

      // Start downloading the scrub buffer
      this._dlWorker.postMessage({"type": "start",
                                  "media_files": streaming_files,
                                  "play_idx": this._play_idx,
                                  "hq_idx": this._seek_idx,
                                  "scrub_idx": this._scrub_idx,
                                  "offsite_config": offsite_config});
    }
  }

  /**
   * Returns the video quality information of the provided video buffer
   *
   * @param {string} buffer - play|scrub|seek
   * @returns {object} Object will have the following fields:
   *    .quality {float}
   *    .fps {float}
   */
  getQuality(buffer)
  {
    var outVal = {quality: null, fps: null};
    if (buffer == "play")
    {
      outVal.quality = this._videoObject.media_files["streaming"][this._play_idx].resolution[0];
      outVal.fps = this._videoObject.fps;
    }
    else if (buffer == "scrub")
    {
      outVal.quality = this._videoObject.media_files["streaming"][this._scrub_idx].resolution[0];
      outVal.fps = this._videoObject.fps;
    }
    else if (buffer = "seek")
    {
      outVal.quality = this._videoObject.media_files["streaming"][this._seek_idx].resolution[0];
      outVal.fps = this._videoObject.fps;
    }
    return outVal;
  }

  /**
   * @param {integer} quality - e.g. 144,360,720 (width parameter)
   * @returns {object} Object will have the following fields:
   *    .quality {float}
   *    .fps {float}
   */
  nearestQuality(quality)
  {
    let selectedIndex = this.find_closest(this._videoObject, quality);
    let outValue = {
      quality: this._videoObject.media_files["streaming"][selectedIndex].resolution[0],
      fps: this._videoObject.fps
    };
    return outValue;
  }

  /**
   *
   * @param {Number} quality - Target width dimension
   * @param {string} buffer - scrub|seek|play
   */
  setQuality(quality, buffer)
  {
    quality = Math.min(quality, this._maxHeight); // defensive programming

    if (this._videoObject)
    {
      let new_play_idx = this.find_closest(this._videoObject, quality);

      if (buffer == undefined) {
        this._play_idx = new_play_idx;
      }
      else if (buffer == "play") {
        this._play_idx = new_play_idx;
      }
      else if (buffer == "seek") {
        this._seek_idx = new_play_idx;
      }
      else if (buffer == "scrub") {
        if (new_play_idx != this._scrub_idx) {
          this.stopDownload();
          this._videoElement[this._scrub_idx].clearScrubBuffer();
          this.startDownload(this._videoObject.media_files["streaming"], this._offsiteConfig);
        }
        this._scrub_idx = new_play_idx;
      }
      console.log("Setting 1x-4x playback quality to: " + quality);

      // This try/catch exists only because setQuality is sometimes called and
      // invalid indexes are selected.
      // #TODO Understand why this occurs in multiview
      try {
        this.updateVideoDiagnosticOverlay(
          null, this._dispFrame, "N/A", "N/A",
          this._videoObject.media_files["streaming"][this._play_idx].resolution[0],
          this._videoObject.media_files["streaming"][this._scrub_idx].resolution[0],
          this._videoObject.media_files["streaming"][this._seek_idx].resolution[0],
          this._videoObject.id);
      }
      catch {}
    }
  }

  video_id()
  {
    return this._videoObject.id;
  }

  construct_demuxer(idx, resolution) 
  {
    let use_hls = (this._videoObject.media_files.streaming[0].hls ? true : false);
    let searchParams = new URLSearchParams(window.location.search);
    console.info(`VideoDecoder: ${'VideoDecoder' in window}; Secure Context: ${window.isSecureContext}`);
    if ('VideoDecoder' in window == false || Number(searchParams.get('force_mse'))==1 || use_hls == true)
    {
      // TODO: Can possibly make this a warning and fall back to compat mode.
      // with some caveats on performance.
      let decoder = 'VideoDecoder' in window;
      if (Number(searchParams.get('force_mse'))==1)
      {
        decoder = false;
      }
      this.dispatchEvent(new CustomEvent("videoError",
                         {composed: true,
                          detail: {"videoDecoderPresent": decoder,
                                   "secureContext": window.isSecureContext}}));
      return new VideoBufferDemux(); // TODO, per above, Turn this into simple demuxer
    }
    else
    {
      let p = new TatorVideoDecoder(resolution);
      // Hook up summary level indication
      if (idx == this._scrub_idx && this._scrub_idx != this._play_idx)
      {
        p.playBuffer().summaryLevel = this._mediaInfo.summaryLevel;
      }
      if (idx == this._play_idx)
      {
        p.onBuffered = () => {
          if (idx == this._scrub_idx)
          {
            return;
          }
          const ranges = p.playBuffer().buffered;
          let ranges_list = [];
          for (let idx = 0; idx < ranges.length; idx++)
          {
            let startFrame = this.timeToFrame(ranges.start(idx));
            let endFrame = this.timeToFrame(ranges.end(idx));
            if (this.currentFrame() >= startFrame && this.currentFrame() <= endFrame)
            {
              ranges_list.push([startFrame, endFrame]);
            }
          }
          this.dispatchEvent(new CustomEvent("onDemandDetail",
                                            {composed: true,
                                             detail: {"ranges": ranges_list}}));
        };
      }
      return p;
    }
  }

  find_closest(videoObject, target_quality) 
  {
    let play_idx = -1;
    let max_delta = this._maxHeight;
    let resolutions = videoObject.media_files["streaming"].length;
    for (let idx = 0; idx < resolutions; idx++)
    {
      let height = videoObject.media_files["streaming"][idx].resolution[0];
      let delta = Math.abs(target_quality - height);
      if (delta < max_delta)
      {
        max_delta = delta;
        play_idx = idx;
      }
    }
    return play_idx;
  };

  // Based on the video object and the resolutions identifed set the various playback buffer
  // indices
  identify_qualities(videoObject, playQuality, scrubQuality, seekQuality, offsite_config)
  {
    let play_idx = -1;
    let scrub_idx = -1;
    let hq_idx = -1;
    let streaming_files = null;
    this._lastDownloadSeekFrame = -1;
    
    if (videoObject.media_files)
    {
      streaming_files = videoObject.media_files["streaming"];
      play_idx = this.find_closest(videoObject, playQuality);

      if (Number.isInteger(scrubQuality)) {
        scrub_idx = this.find_closest(videoObject, scrubQuality);
      }
      else {
        scrub_idx = this.find_closest(videoObject, Math.min(playQuality,320));
      }
      console.info(`NOTICE: Choose video stream ${play_idx}`);

      if ('audio' in videoObject.media_files && !offsite_config.hasOwnProperty('host'))
      {
        let audio_def = videoObject.media_files['audio'][0];
        this._audioPlayer = document.createElement("AUDIO");
        console.log("MediaSource element created: AUDIO");
        this._audioPlayer.setAttribute('src', audio_def.path);
        this._audioPlayer.volume = 0.5; // Default volume
        this.audio = true;
        this.addPauseListener(() => {
          this._audioPlayer.pause();
        });
      }

      // The streaming files may not be in order, find the largest resolution
      hq_idx = 0;
      var largest_height = 0;
      var largest_width = 0;
      for (let idx = 0; idx < videoObject.media_files["streaming"].length; idx++)
      {
        let height = videoObject.media_files["streaming"][idx].resolution[0];
        if (height > largest_height)
        {
          largest_height = height;
          largest_width = videoObject.media_files["streaming"][idx].resolution[1];
          hq_idx = idx;
        }
      }
      if (Number.isInteger(seekQuality)) {
        hq_idx = this.find_closest(videoObject, seekQuality);
      }
    }
    else
    {
      largest_height = videoObject.height;
      largest_width = vidoObject.width;
    }

    if (play_idx == -1)
    {
      videoUrl = "/media/" + videoObject.file;
      dims = [videoObject.width,videoObject.height];
      console.warn("Using old access method!");
      streaming_files = [{"path": "/media/" + videoObject.file,
                          "resolution": [videoObject.height,videoObject.width]}];
      play_idx = 0;
      scrub_idx = 0;
      hq_idx = 0;
    }

    this._play_idx = play_idx;
    this._scrub_idx = scrub_idx;
    this._seek_idx = hq_idx;
    console.log(`video buffer indexes: ${play_idx} ${scrub_idx} ${hq_idx}`);

    return [largest_width, largest_height];
  }
  /// Load a video from URL (whole video) with associated metadata
  /// Returns a promise when the video resource is loaded
  //
  // @param {integer} seekQuality - If provided, closest quality to this will be used for the
  //                                seek buffer. Otherwise be the highest quality will be used.
  // @param {integer} scrubQuality - If provided, closest quality to this will be used for the
  //                                 scrub buffer. Otherwise, closest quality to 320 will be used.
  loadFromVideoObject(videoObject, mediaType, quality, resizeHandler, offsite_config, numGridRows, heightPadObject, seekQuality, scrubQuality)
  {
    this.mediaInfo = videoObject;
    if (mediaType)
      this.mediaType = mediaType;
    this._videoObject = videoObject;

    if (numGridRows != undefined)
    {
      RATE_CUTOFF_FOR_ON_DEMAND = 4.0; // Cap multi at 4x on-demand playback
    }

    if ('concat' in videoObject.media_files)
    {
      let ids=[];
      let offsetMap=new Map();
      for (let idx = 0; idx< videoObject.media_files.concat.length; idx++)
      {
        ids.push(videoObject.media_files.concat[idx].id);
      }
      return new Promise((resolve, reject) => { 
      fetchRetry(`/rest/Medias/${videoObject.project}`,
                 {method: "PUT",
                 credentials: "same-origin",
                 headers: {
                   "X-CSRFToken": getCookie("csrftoken"),
                   "Accept": "application/json",
                   "Content-Type": "application/json"},
                 body: JSON.stringify({"ids": ids, 'presigned': 86400}),
                  }).then(response => response.json())
                    .then(json => {
                      console.info(json)
                      this._children = json;
                      if (this._children.length != this._videoObject.media_files.concat.length)
                      {
                        console.error("returned children doesn't match request count")
                        reject();
                      }
                      else
                      {
                        let new_length = 0;
                        let streaming_files=[];

                        // If quality is not supplied default to 720 or highest available
                        let resolutions = this._children[0].media_files["streaming"].length;
                        this._maxHeight = 0;
                        for (let idx = 0; idx < resolutions; idx++)
                        {
                          let height = this._children[0].media_files["streaming"][idx].resolution[0];
                          if (height > this._maxHeight)
                          {
                            this._maxHeight = height;
                          }
                        }
                        if (quality == undefined || quality == null)
                        {
                          quality = 720;
                        }
                        quality = Math.min(quality, this._maxHeight);
                        if (resizeHandler == undefined)
                        {
                          resizeHandler = true;
                        }
                        if (offsite_config == undefined)
                        {
                          offsite_config = {}
                        }

                        for (let idx = 0; idx < this._children.length; idx++)
                        {
                          if (idx + 1 < this._children.length)
                          {
                            new_length += (videoObject.media_files.concat[idx+1].timestampOffset-videoObject.media_files.concat[idx].timestampOffset)*this._children[idx].fps;
                          }
                          else
                          {
                            new_length += this._children[idx].num_frames;
                          }
                          streaming_files.push(this._children[idx].media_files.streaming);
                        }
                        this._numFrames = new_length;
                        this.dispatchEvent(new CustomEvent("videoLengthChanged",
                                           {composed: true,
                                            detail: {length:new_length}}));

                        // Set the streaming objects to the same as the first media file
                        // TODO: make this smarter.
                        this._videoObject.media_files.streaming = json[0].media_files.streaming;
                        this.dispatchEvent(new CustomEvent("discoveredQualities",
                                          {composed: true, detail: {media: json[0]}}));
                                          this._videoElement = [];

                        // Setup resize handler
                        let dims = this.identify_qualities(this._children[0], quality, scrubQuality, seekQuality, offsite_config);
                        this.setupResizeHandler(dims, numGridRows, heightPadObject);

                        var largest_height = 0;
                        var largest_width = 0;
                        for (let idx = 0; idx < streaming_files[0].length; idx++)
                        {
                          if (streaming_files[0][idx].resolution[0] > largest_height)
                          {
                            largest_height = streaming_files[0][idx].resolution[0];
                          }
                          if (streaming_files[0][idx].resolution[1] > largest_width)
                          {
                            largest_width = streaming_files[0][idx].resolution[1];
                          }
                          this._videoElement.push(this.construct_demuxer(idx, streaming_files[0][idx].resolution[0]));
                          this._videoElement[idx].named_idx = idx;
                        }

                        this.dispatchEvent(new CustomEvent("discoveredQualities",
                       {composed: true, detail: {media: this._children[0]}}));
                        
                        // Clear the buffer in case this is a hot-swap
                        this.startDownload(streaming_files, offsite_config);
                        this._draw.clear();
                        this._draw.resizeViewport(dims[0], dims[1]);
                        this._fps=Math.round(1000*this._children[0].fps)/1000;
                        this._numFrames=new_length;
                        this._numSeconds=new_length / this._fps;
                        this._dims=dims;
                        this.resetRoi();
                        this.seekFrame(this._dispFrame, ()=>{}, true);
                        resolve();
                      }
                    });
      });
    }

    this.dispatchEvent(new CustomEvent("discoveredQualities",
                       {composed: true, detail: {media: videoObject}}));


    // If quality is not supplied default to 720 or highest available
    let resolutions = videoObject.media_files["streaming"].length;
    this._maxHeight = 0;
    for (let idx = 0; idx < resolutions; idx++)
    {
      let height = videoObject.media_files["streaming"][idx].resolution[0];
      if (height > this._maxHeight)
      {
        this._maxHeight = height;
      }
    }
    if (quality == undefined || quality == null)
    {
      quality = 720;
    }
    quality = Math.min(quality, this._maxHeight);
    if (resizeHandler == undefined)
    {
      resizeHandler = true;
    }
    if (offsite_config == undefined)
    {
      offsite_config = {}
    }
    this._offsiteConfig = offsite_config;

    // Initialize the resize handler to a nominal size prior to loading the media info (which
    // may cause an error if there's something wrong with the media)
    this._dims = [400, 400];
    this._gridRow = numGridRows;
    this.heightPadObject = heightPadObject;
    this.forceSizeChange();

    // Note: dims is width,height here
    let videoUrl, fps, numFrames, dims;

    fps = videoObject.fps;
    numFrames = videoObject.num_frames;

    // Use the largest resolution to set the viewport
    dims = this.identify_qualities(videoObject, quality, scrubQuality, seekQuality, offsite_config);

    this._videoElement = [];
    let streaming_files = this._videoObject.media_files.streaming;
    for (let idx = 0; idx < streaming_files.length; idx++)
    {
      this._videoElement.push(this.construct_demuxer(idx, streaming_files[idx].resolution[0]));
      this._videoElement[idx].named_idx = idx;
    }
    // Clear the buffer in case this is a hot-swap
    this._draw.clear();

    console.info(`Video dimensions = ${dims}`);

    // Resize the viewport
    this._draw.resizeViewport(dims[0], dims[1]);
    this._fps=Math.round(1000*fps)/1000;
    this._numFrames=numFrames-1;
    this._numSeconds=fps*numFrames;
    this._dims=dims;
    this.resetRoi();

    this.stopDownload();
    var promise = this._videoElement[this._scrub_idx].loadedDataPromise(this);

    this.startDownload(streaming_files, offsite_config);
    if (fps < 20)
    {
      console.info("Disable safe mode for low FPS");
      this.allowSafeMode = false;
    }
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
    this.scrubThreshold = Math.max(25,numFrames/200);
    this._draw.resizeViewport(dims[0], dims[1]);
    if (resizeHandler)
    {
      this.setupResizeHandler(dims, numGridRows, heightPadObject);
    }

    // #debug
    // Display the video qualities used for each of the buffers
    console.log(`--- Quality on scrub ${streaming_files[this._scrub_idx].resolution[0]}`)
    console.log(`--- Quality on play ${streaming_files[this._play_idx].resolution[0]}`)
    console.log(`--- Quality on pause ${streaming_files[this._seek_idx].resolution[0]}`)

    this.updateVideoDiagnosticOverlay(
      null, this._dispFrame, "N/A", "N/A",
      streaming_files[this._play_idx].resolution[0],
      streaming_files[this._scrub_idx].resolution[0],
      streaming_files[this._seek_idx].resolution[0],
      videoObject.id);

    this.initialized = true;
    this.hideErrorMessage();

    // On load seek to frame 0
    return promise;
  }

  isInCompatibilityMode()
  {
    return this._videoElement[0]._compat;
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

  /**
   * Emits the latest image in the off-screen buffer
   *
   * Only call this function from the context of an animation frame
   * Only call this function if the drawing context can play.
   *
   * @param {boolean} hold - Defaults to false. #TODO fill in with more information
   * @emits frameChange Emitted with frame info
   * @emits playbackEnded Only emitted if we've reached either end of the video
   */
  displayLatest(hold)
  {
    let gl_start = performance.now();
    this._fpsDiag++;
    this._dispFrame=this._draw.dispImage(hold);
    
    this.dispatchEvent(new CustomEvent("frameChange", {
      detail: {frame: this._dispFrame},
      composed: true
    }));

    this.updateVideoDiagnosticOverlay(null, this._dispFrame);

    let ended = false;
    if (this._direction == Direction.FORWARD &&
        this._dispFrame >= (this._numFrames - 1))
    {
      ended = true;
    }
    else if (this._direction == Direction.BACKWARDS &&
             this._dispFrame <= 0)
    {
      ended = true;
    }

    if (ended == true)
    {
      console.log("video.playbackEnded");
      this.dispatchEvent(new CustomEvent("playbackEnded", {
      composed: true
      }));
    }
    this._glProfiler.push(performance.now()-gl_start);
  }

  /**
   * Pushes the frame stored in the given source into the drawGL buffer
   *
   * @param {integer} frameIdx - Frame number
   * @param {array} source - Array of bytes representing the frame image
   * @param {float} width - Width of image
   * @param {float} height - Height of image
   */
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

  /**
   * Get the video element associated with the given buffer type and frame number
   *
   * A feature both scrub and play will return the best available buffer for the frame in question.
   *
   * @param {integer} frame - Target frame number
   * @param {string} bufferType - "scrub" | "play" | "seek"
   * @param {bool} force - true to force "play" over seek fallback.
   * @returns {video HTMLelement}
   */
  videoBuffer(frame, bufferType, force)
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

    if (bufferType == "seek")
    {
      return this._videoElement[this._seek_idx].returnSeekIfPresent(time, direction);
    }
    else
    {
      // Treat play and scrub buffer as best available.
      let play_attempt = null;

      // If our play and scrub buffer are different, opportunistically fetch the higher
      // quality frame out of the on-demand buffer.
      if (this._play_idx != this._scrub_idx)
      {
        play_attempt = this._videoElement[this._play_idx].forTime(time, "play", direction, this._numSeconds);
      }

      // To test degraded mode (every 10th frame is degraded):
      //if (frame % 10 == 0)
      //{
      //  play_attempt = null;
      //}

      // Log every 5 frames if we go to degraded mode.
      if (play_attempt == null && bufferType == "play" && frame % 5 == 0)
      {
        console.warn("Video degraded, attempting scrub buffer.");
      }
      if (play_attempt || force)
      {
        return play_attempt;
      }
      return this._videoElement[this._scrub_idx].forTime(time, "scrub", direction, this._numSeconds);
    }
  }

  frameToTime(frame)
  {
    let comps = this.frameToComps(frame);
    return comps.bias + comps.time;
  }

  frameToComps(frame)
  {
    const time = ((1/this._fps)*frame)+(1/(this._fps*4));
    const bias = this._dlWorker.biasForTime(time);
    return {'time': time, 'bias': bias};
  }

  timeToFrame(time, bias)
  {
    let video_time = time - this._dlWorker.biasForTime(time);
    if (bias)
    {
      video_time -= (1/(this._fps*4));
    }
    return Math.round(video_time * this._fps);
  }

  frameToAudioTime(frame)
  {
    const time = ((1/this._fps)*frame);
    return this._dlWorker.biasForTime(time) + time;
  }

  /**
   * Seeks to a specific frame of playback
   *
   * This is used for both jumping to a particular frame and for scrubbing as well.
   * If scrubbing (which involves jumping frames very quickly), then the forceSeekBuffer
   * should not be used.
   *
   * @param {integer} frame - Frame number to jump to
   * @param {function} callback - Callback to execute when the frame has been updated.
   *                              Expected callback signature -> data, width, height
   * @param {bool} forceSeekBuffer - True if the high quality, single fetch should be used.
   *                                 False if the downloaded scrub buffer should be used.
   * @param {bool} bufferType - Buffer to use if seek buffer is not forced
   */
  seekFrame(frame, callback, forceSeekBuffer, bufferType, forceSeekDownload)
  {
    // If the goto frame precedes the 1st frame adjust it.
    if (frame < this._firstFrame)
    {
      frame = this._firstFrame;
    }
    var that = this;
    var time_comps = this.frameToComps(frame);
    var time = time_comps.time+time_comps.bias;
    var audio_time = this.frameToAudioTime(frame);
    var downloadSeekFrame = false;
    var createTimeout = false;

    if (bufferType == undefined)
    {
      bufferType = "scrub";
    }
    if (forceSeekBuffer)
    {
      bufferType = "seek";
    }

    // If the scrub buffer and the seek buffer are using the same resolution, then attempt
    // to query the video frame using the scrub buffer. If it's not present, fall back to
    // the seek buffer.
    //
    // Otherwise, utilize the requested buffer.
    var video;
    if (this._scrub_idx == this._seek_idx) {
      video = this.videoBuffer(frame, "scrub");
      if (video == null) {
        video = this.videoBuffer(frame, "seek");
      }
    }
    else {
      video = this.videoBuffer(frame, bufferType);
    }

    // Only support seeking if we are stopped (i.e. not playing) and we are not
    // attempting to seek to another frame
    if (video == null && this._direction == Direction.STOPPED)
    {
      // Set the seek buffer, and command worker to get the seek
      // response
      document.body.style.cursor = "progress";

      this._masked=true;
      // Only mask edits if seeking to a different frame
      if (this.currentFrame() != frame)
      {
        this.dispatchEvent(new CustomEvent("temporarilyMaskEdits",
                                       {composed: true,
                                        detail: {enabled: true}}));
      }
      video = this._videoElement[this._seek_idx].seekBuffer();
      this._seekStart = performance.now();

      // Use the frame as a cookie to keep track of duplicated
      // seek operations
      this._seekFrame = frame;

      if (this._lastDownloadSeekFrame != this._seekFrame || forceSeekDownload)
      {
        downloadSeekFrame = true;
        this._lastDownloadSeekFrame = this._seekFrame;
      }

      clearTimeout(this._seek_expire);
      createTimeout = true;
    }
    else if (video == null)
    {
      return new Promise(
        function(resolve,reject)
        {
          callback = callback.bind(that);
          callback(frame, video, that._dims[0], that._dims[1]);
          resolve();
        });
    }

    var promise = new Promise(
      function(resolve,reject)
      {
        // Because we are using off-screen rendering we need to defer
        // updating the canvas until the video/frame is actually ready, we do this
        // by waiting for a signal off the video + then scheduling an animation frame.
        video.oncanplay=function()
        {
          if (video.summaryLevel)
          {
            frame = that.timeToFrame(video.currentTime);
            if (frame == that._lastSummaryFrame)
            {
              return;
            }
            that._lastSummaryFrame = frame;
          }

          clearTimeout(that._seek_expire);
          that._seek_expire = null;
          // if we are masked, take it off
          if (that._masked == true)
          {
            that._masked = false;
            that.dispatchEvent(new CustomEvent("temporarilyMaskEdits",
                                               {composed: true,
                                                detail: {enabled: false}}));
          }
          // Don't do anything busy in the canplay interrupt as it holds up the GUI
          // rasterizer.
          // Need to bind the member function to the result handler
          callback=callback.bind(that);
          let image_buffer = video;
          if (video.use_codec_buffer)
          {
            image_buffer = video.codec_image_buffer;
          }
          if (image_buffer == null)
          {
            console.warn("Image buffered cleared itself before we could use it.");
            return;
          }
          
          callback(frame, image_buffer, that._dims[0], that._dims[1]);
          that._decode_profiler.push(performance.now()-that._decode_start);
          resolve();
          video.oncanplay=null;
          if (that._direction == Direction.STOPPED)
          {
            that.dispatchEvent(new CustomEvent("seekComplete",
                                        {composed: true,
                                          detail: {
                                            forceSeekBuffer: forceSeekBuffer
                                          }}));
          }
          if (forceSeekBuffer && that._audioPlayer)
          {
            if (that._audioPlayer.currentTime != audio_time)
            {
              that._audioPlayer.currentTime = audio_time;
            }
          }

          // Remove entries (if required to do so) now that we've drawn the frame
          that._videoElement[that._seek_idx].cleanSeekBuffer();
        };

        if (createTimeout)
        {
          that._seek_expire = setTimeout(() => {
            if (that.videoBuffer(that._seekFrame, "seek") == null) {
              // Current seek frame is still not in buffer, allow redownload
              that._lastDownloadSeekFrame = -1;
            }
            that._seekFrame = -1;
            that._seek_expire = null;
            document.body.style.cursor = null;
            console.warn("Network Seek expired");
            that.refresh(false);
            reject();
          }, 3000);
        }

        if (downloadSeekFrame)
        {
          that._dlWorker.postMessage(
            {"type": "seek",
             "frame": frame,
             "time": time,
             "buf_idx": that._seek_idx});
        }
      });


    
    // Always update play buffer.
    if (this._videoElement[this._play_idx].playBuffer().use_codec_buffer && 
        video != this._videoElement[this._play_idx].playBuffer())
    {
      //console.info(`Given ${time} ${video.currentTime} to play buffer`);
      this._videoElement[this._play_idx].playBuffer().bias = time_comps.bias;
      this._videoElement[this._play_idx].playBuffer().currentTime = time_comps.time;//video.currentTime;   
    }
    this._decode_start = performance.now();
    if (time <= video.duration || isNaN(video.duration))
    {
      if (video.use_codec_buffer)
      {
        // Let the video decoder do the bias addition
        video.bias = time_comps.bias;
        video.currentTime = time_comps.time;
      }
      else
      {
        video.currentTime = time;
      }
    }
    else if (time > video.duration)
    {
      var end = video.duration;
      time = end;
      frame = end*this._fps;
      video.currentTime = end;
    }
    else
    {
      time = 0;
      frame = 0;
      video.currentTime = 0;
    }
    return promise;
  }

  /**
   * Note: Once in safe mode, there's no mechanism to get out of it.
   */
  safeMode()
  {
    this._motionComp.safeMode();
  }

  ////////////////////////////////
  /// Button handlers
  ////////////////////////////////
  rateChange(newRate)
  {
    this._playbackRate=newRate;
    if (this._direction != Direction.STOPPED)
    {
      // If we are playing trim the frame buffer to a quarter second to make the rate change
      // feel responsive.
      this._motionComp.computePlaybackSchedule(this._fps,this._playbackRate);
      const oldLoad = this._loadFrame;
      this._loadFrame = this._draw.trimBuffer(Math.round(this._fps*0.5));
      console.info(`Load: ${oldLoad} to ${this._loadFrame}, dispFrame = ${this._dispFrame}`);
      clearTimeout(this._loaderTimeout);
      this._loaderTimeout = setTimeout(() => {this.loaderThread(false, this._loaderBuffer)}, 0);
    }
    this._onDemandPlaybackReady = (this.onDemandBufferAvailable(this._dispFrame) == "yes" ? true : false);
    this.dispatchEvent(new CustomEvent("rateChange", {
      detail: {rate: newRate},
      composed: true,
    }));
  }

  processRateChange(event)
  {
    this._playbackRate=this._controls.rateControl.val();
    console.log("Set playback rate to: " + this._playbackRate);
    return false;
  }

  /**
   * Only attempt to seek to a frame if the player is paused
   *
   * @param {integer} frameIdx - Frame number to go to
   * @param {boolean} forceSeekBuffer - True if use high quality fetch, false uses scrub buffer
   */
  gotoFrame(frameIdx, forceSeekBuffer)
  {
    if (this._direction != Direction.STOPPED)
    {
      return;
    }

    if (frameIdx < 0 || frameIdx >= this._numFrames) {
      return;
    }

    // In the event some out of band drawing has happened, make sure to clear any latent
    // draw buffers.
    this._draw.beginDraw();

    var finalPromise = new Promise((resolve, reject) => {
      var promise = this.seekFrame(parseInt(frameIdx), this.drawFrame, forceSeekBuffer);
      promise.then(() =>
        {
          this._pauseCb.forEach(cb => {cb(frameIdx);
          document.body.style.cursor=null;
          resolve();
        });
      }).catch(error =>
        {
          resolve();
        });
    });
    return finalPromise;
  }

  advanceOneSecond(forceSeekBuffer)
  {
    let newFrame = this._dispFrame + this._fps;
    return this.gotoFrame(newFrame, forceSeekBuffer);
  }

  backwardOneSecond(forceSeekBuffer)
  {
    let newFrame = this._dispFrame - this._fps;
    return this.gotoFrame(newFrame, forceSeekBuffer);
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


  _playGenericScrub(direction)
  {
    console.log("Setting playback direction " + direction);
    this._direction=direction;

    // Reset the GPU buffer on a new play action
    this._draw.clear();

    // Reset perioidc health check in motion comp
    this._motionComp.clearTimesVector();

    this._playing = false;

    // We are eligible for audio if we are at a supported playback rate
    // have audio, and are going forward.
    this._audioEligible=false;
    if (this._playbackRate >= 1.0 &&
        this._playbackRate <= RATE_CUTOFF_FOR_AUDIO &&
        this._audioPlayer &&
        direction == Direction.FORWARD && 
        this._children == undefined) // TODO: Support audio in concat mode
    {
      this._audioEligible = true;
      this._audioPlayer.playbackRate = this._playbackRate;
    }

    // Diagnostics and audio readjust thread
    this._fpsDiag = 0;
    this._fpsLoadDiag = 0;
    this._fpsScore = 7;
    this._networkUpdate = 0;
    this._audioCheck = 0;

    this._motionComp.computePlaybackSchedule(this._fps,this._playbackRate);


    this._lastTime = performance.now();
    this._animationIdx = 0;

    if (this._videoElement[this._scrub_idx].playBuffer().use_codec_buffer && this._videoElement[this._scrub_idx]._compat != true && direction == Direction.FORWARD)
    {
      this.frameCallbackMethod(this._scrub_idx);
    }
    else
    {
      this._loaderTimeout=setTimeout(()=>{this.loaderThread(true, "scrub");}, 0);
    }
    this._sentPlaybackReady = false;
    // Kick off the loader
    
  }

  /**
   * Debug only
   */
  _createVideoError() {
    this._makeVideoError = true;
  }

  /**
   * Start the video onDemand playback
   *
   * Launches the following threads:
   * - player thread
   * - loader thread
   * - diagnostics/audiosync thread
   *
   * @param {Direction} direction Forward or backward playback
   */
  _playGenericOnDemand(direction)
  {
    var that = this;
    console.log(`_playGenericOnDemand (ID:${this._videoObject.id}) Setting direction ${direction}`);
    this._direction=direction;

    /*
    // If we are going backwards re-init the buffers
    // as we are optimized for forward playback on pause.
    if (this._direction == Direction.BACKWARDS)
    {
      this._onDemandInit = false;
      this._onDemandInitSent = false;
      this._onDemandPlaybackReady = false;
      this._onDemandFinished = false;
      var that = this;
      this._videoElement[this._play_idx].resetOnDemandBuffer().then(() => {
        that.onDemandDownload(true);
      });
    }
    */
    // Reset the GPU buffer on a new play action
    this._draw.clear();

    // Reset perioidc health check in motion comp
    this._motionComp.clearTimesVector();

    this._playing = false;

    // We are eligible for audio if we are at a supported playback rate
    // have audio, and are going forward.
    this._audioEligible=false;
    if (this._playbackRate >= 1.0 &&
        this._playbackRate <= RATE_CUTOFF_FOR_AUDIO &&
        this._audioPlayer &&
        direction == Direction.FORWARD &&
        this._children == undefined)
    {
      this._audioEligible = true;
      this._audioPlayer.playbackRate = this._playbackRate;
    }

    // Diagnostics and audio readjust thread
    this._fpsDiag = 0;
    this._fpsLoadDiag = 0;
    this._fpsScore = 7;
    this._networkUpdate = 0;
    this._audioCheck = 0;




    this._loaderStarted = false;
    this._sentPlaybackReady = false;
    this._lastTime = null;
    this._animationIdx = 0;

    this._motionComp.computePlaybackSchedule(this._fps,this._playbackRate);
    // Kick off the onDemand thread immediately
    this._onDemandDownloadTimeout = setTimeout(() => {this.onDemandDownload();}, 0);

  }

  // This function gets proxy called from requestAnimationFrame which supplies a hi-res timer
  // as the argument
  playerThread(domtime)
  {
    /// This is the notional scheduled diagnostic interval
    var schedDiagInterval=5000.0;
    //console.info(`PLAYER @ ${performance.now()}`);

    let player = (domtime) => {this.playerThread(domtime);};
    // Video player thread
    // This schedules the browser to update with the latest image and audio
    // Start the FPS monitor once we start playing
    let function_start = performance.now();
    if (this._diagTimeout == null)
    {
      const lastTime = performance.now();
      this._diagTimeout = setTimeout(() => {this.diagThread(lastTime);}, schedDiagInterval);
    }

    let increment = 0;
    if (this._lastTime)
    {
      //this._motionComp.periodicRateCheck(this._lastTime);
      increment = this._motionComp.animationIncrement(domtime, this._lastTime);
    }
    else
    {
      this._lastTime = domtime;
    }
    
    
    if (increment > 0)
    {
      this._lastTime=domtime;
      // Based on how many clocks happened we may actually
      // have to update late
      for (let tempIdx = increment; tempIdx > 0; tempIdx--)
      {
        if (this._motionComp.timeToUpdate(this._animationIdx+increment))
        {
          this.displayLatest();
          if (this._audioEligible && this._audioPlayer.paused)
          {
            this._audioPlayer.play();
          }
          break;
        }
      }
      this._animationIdx = this._animationIdx + increment;
      
    }
    

    if (this._draw.canPlay() > 0)
    {
      // Ready to update the video.
      // Request browser to call player function to update an animation before the next repaint
      this._playerTimeout = window.requestAnimationFrame(player);
    }
    else
    {
      // Done playing, clear playback.
      if (this._audioEligible && this._audioPlayer.paused)
      {
        this._audioPlayer.pause();
      }
      this._motionComp.clearTimesVector();
      this._playerTimeout = null;
    }
    this._playerProfiler.push(performance.now()-function_start);
  }

  diagThread(last)
  {
    const AUDIO_CHECK_INTERVAL = 1; // This could be tweaked if we are too CPU intensive
    var diagInterval = performance.now()-last;
    var calculatedFPS = (this._fpsDiag / diagInterval)*1000.0;
    var loadFPS = ((this._fpsLoadDiag / diagInterval)*1000.0);
    var targetFPS = this._motionComp.targetFPS;
    let fps_msg = "";
    this._audioCheck++;
    if (this._audioEligible && this._audioPlayer && this._audioCheck % AUDIO_CHECK_INTERVAL == 0)
    {
      // Audio can be corrected by up to a +/- 1% to arrive at audio/visual sync
      const audioDelta = (this.frameToAudioTime(this._dispFrame)-this._audioPlayer.currentTime) * 1000;
      const correction = 1.0 + (audioDelta/2000);
      const swag = Math.max(0.99,Math.min(1.01,correction));
      this._audioPlayer.playbackRate = (swag) * this._playbackRate;

      fps_msg = `(ID:${this._videoObject.id}) FPS = ${calculatedFPS}, Load FPS = ${loadFPS}, Score=${this._fpsScore}, targetFPS=${targetFPS}, Audio drift = ${audioDelta}ms`;
      if (Math.abs(audioDelta) >= 100)
      {
        console.info("Readjusting audio time");
        const audio_increment = 1+this._motionComp.frameIncrement(this._fps,this._playbackRate);
        this._audioPlayer.currentTime = this.frameToAudioTime(this._dispFrame+audio_increment);
      }
    }
    else
    {
      fps_msg = `(ID:${this._videoObject.id}) FPS = ${calculatedFPS}, Load FPS = ${loadFPS}, Score=${this._fpsScore}, targetFPS=${targetFPS}`;
    }
    console.info(fps_msg);
    this._fpsDiag=0;
    this._fpsLoadDiag=0;

    //if ((this._networkUpdate % 3) == 0 && this._diagnosticMode == true)
    //{
    //  Utilities.sendNotification(fps_msg);
    //}
    this._networkUpdate += 1;

    if (this._fpsScore)
    {
      var healthyFPS = targetFPS * 0.90;
      if (calculatedFPS < healthyFPS)
      {
        this._fpsScore--;
      }
      else
      {
        this._fpsScore = Math.min(this._fpsScore + 1,7);
      }

      if (this._fpsScore == 0)
      {
        if (this.allowSafeMode) {
          console.warn(`(ID:${this._videoObject.id}) Detected slow performance, entering safe mode.`);

          this.dispatchEvent(new Event("safeMode"));
          this._motionComp.safeMode();
          this.rateChange(this._playbackRate);
        }
      }
    }

    this.updateVideoDiagnosticOverlay(
      null, this._dispFrame, targetFPS.toFixed(2), calculatedFPS.toFixed(2),
      this._videoObject.media_files["streaming"][this._play_idx].resolution[0],
      this._videoObject.media_files["streaming"][this._scrub_idx].resolution[0],
      this._videoObject.media_files["streaming"][this._seek_idx].resolution[0],
      this._videoObject.id);

    last = performance.now();
    if (this._direction!=Direction.STOPPED)
    {
      this._diagTimeout = setTimeout(() => {this.diagThread(last);}, 5000.0);
    }
  }

  pendingFramesMethod()
  {
    if (this._pendingTimeout != null)
    {
      return;
    }
    this._push_profiler = new PeriodicTaskProfiler("Push");
    let push_pending = () => {
      
      if (this._draw.canLoad() > 0)
      {
        let start = performance.now();
        let frame = this._pendingFrames.shift();
        this.pushFrame(frame.frameNumber, frame, frame.displayWidth, frame.displayHeight);
        frame.close();
        this._push_profiler.push(performance.now()-start);
      }
      if (this._pendingFrames.length > 0)
      {
        this._pendingTimeout = setTimeout(push_pending, (1000/this._videoFps)/2);
      }
      
    }

    if (this._pendingFrames.length > 0)
    {
      this._pendingTimeout = setTimeout(push_pending, (1000/this._videoFps)/2);
    }
  }
  frameCallbackMethod(index)
  {
    if (index == undefined)
    {
      index = this._play_idx;
    }
    let frameIncrement = this._motionComp.frameIncrement(this._fps, this._playbackRate);
    let video = this._videoElement[index].playBuffer();
    let frameProfiler = new PeriodicTaskProfiler("Frame Fetch");

    // Clear any old frames
    this._pendingFrames = [];
    clearTimeout(this._pendingTimeout);
    this._pendingTimeout = null;

    // on frame processing logic

    let increment_clk = 0;
    video.onFrame = (frame, timescale, timestampOffset) => {
      this._playing = true;
      let start = performance.now();
      frame.frameNumber = this.timeToFrame((frame.timestamp/timescale));
      this._fpsLoadDiag++;
      if (increment_clk % frameIncrement != 0)
      {
        frame.close();
      }
      else if (this._draw.canLoad() > 0 && this._pendingFrames.length == 0)
      {
        this.pushFrame(frame.frameNumber, frame, frame.displayWidth, frame.displayHeight);
        frame.close();
      }
      else
      {
        this._pendingFrames.push(frame);
        this.pendingFramesMethod();
      }

      // Don't let increment clock blow up
      increment_clk = (increment_clk + 1) % frameIncrement;
      frameProfiler.push(performance.now()-start)
      
      // Kick off the player thread once we have 25 frames loaded
      if (this._playerTimeout == null && this._draw.canPlay() > 4)
      {
        this._playerTimeout = setTimeout(()=>{this.playerThread();}, 250);
      }
      return true; 
    };
    video.play();
  }

  loaderThread(initialize, bufferName)
  {
    let fpsInterval = 1000.0 / (this._fps);
    var bufferWaitTime=Math.min(fpsInterval*4, 100); // max delay is 10ms
    if (bufferName == undefined)
    {
      bufferName = "seek";
    }
    this._loaderBuffer = bufferName;
    let loader = () => {this.loaderThread(false, bufferName)};
    // Loader thread that seeks to the current frame and continually kicks off seeking
    // to the next frame.
    //
    // If the draw buffer is full try again in the load interval
    if (this._draw.canLoad() == 0)
    {
      //console.info("Loader Full");
      this._loaderTimeout = setTimeout(loader, 0);
      return;
    }

    if (initialize)
    {
      this._loadFrame = this._dispFrame;
    }

    let frameIncrement = this._motionComp.frameIncrement(this._fps, this._playbackRate);
    var nextFrame = this._loadFrame + (this._direction * frameIncrement);

    // Callback function that pushes the given frame/image to the drawGL buffer
    // and then schedules the next frame to be loaded
    var pushAndGoToNextFrame=function(frameIdx, source, width, height)
    {
      if (source == null) // To test stalls: || Math.round(Math.random() * 50) == 5)
      {
        // Video isn't ready yet, wait and try again
        console.log(`video buffer not ready for loading - (ID:${this._videoObject.id}) frame: ` + frameIdx);
        this._loaderTimeout = setTimeout(loader, 250);
        this.dispatchEvent(new CustomEvent("playbackStalled", {composed: true}));
      }
      else
      {
        // Normal playback
        this._fpsLoadDiag++;
        this.pushFrame(frameIdx, source, width, height);
        this._playing = true;

        // If the next frame is loadable and we didn't get paused set a timer, else exit
        if (nextFrame >= 0 && nextFrame < this._numFrames && this._direction != Direction.STOPPED)
        {
          this._loadFrame = nextFrame;
          this._loaderTimeout = setTimeout(loader, 0);
        }
        else
        {
          this._loaderTimeout = null;
        }
      }
    }

    // Seek to the current frame and call our atomic callback
    this.seekFrame(this._loadFrame, pushAndGoToNextFrame, false, bufferName);

    // Kick off the player thread once we have 25 frames loaded
    if (this._playerTimeout == null && this._draw.canPlay() > 4)
    {
      this._playerTimeout = setTimeout(()=>{this.playerThread();}, 250);
    }
  }

  //Calculate the appropriate appendThreshold
  _calculateAppendThreshold()
  {
    // FPS swag accounts for low frame rate videos that get sped up to 15x on playback
    // @TODO: Can probably make this 30 now, but should make it a constant at top of file.
    const fps_swag = Math.max(1, 15 / this._fps);
    return 15 * Math.min(RATE_CUTOFF_FOR_ON_DEMAND, Math.max(1,this._playbackRate)) * fps_swag;
  }

  // Calculate if the on-demand buffer is present and has sufficient runway to play.
  // Returns "yes", false, "more"
  onDemandBufferAvailable(frame)
  {
    if (frame == undefined)
    {
      frame = this._dispFrame;
    }
    let appendThreshold = this._calculateAppendThreshold();
    let video = this.videoBuffer(frame, "play", true);
    if (video == null)
    {
      return false;
    }
    else
    {
      let timeToEnd = null;
      var ranges = video.buffered;
      const absEnd = this.frameToTime(this._numFrames-1);
      const absStart = this.frameToTime(0);
      let timeToAbsEnd = null;
      const currentTime = this.frameToTime(frame);
      for (var rangeIdx = 0; rangeIdx < ranges.length; rangeIdx++)
      {
        var end = ranges.end(rangeIdx);
        var start = ranges.start(rangeIdx);

        if (this._direction == Direction.STOPPED) {
          if (this._lastDirection == Direction.FORWARD) {
            timeToEnd = end - currentTime;
            timeToAbsEnd = absEnd - currentTime;
          }
          else {
            timeToEnd = currentTime - start;
            timeToAbsEnd = currentTime - absStart;
          }
        }
        else if (this._direction == Direction.FORWARD)
        {
          this._lastDirection = this._direction;
          timeToEnd = end - currentTime;
          timeToAbsEnd = absEnd - currentTime;
        }
        else
        {
          this._lastDirection = this._direction;
          timeToEnd = currentTime - start;
          timeToAbsEnd = currentTime - absStart;
        }
      }
      
      appendThreshold = Math.min(timeToAbsEnd, appendThreshold);
      return (timeToEnd >= appendThreshold ? "yes" : "more");
    }
  }

  scrubBufferAvailable(frame)
  {
    return this.videoBuffer(frame, "scrub") != null;
  }


  // Returns true if on-demand buffer check + delay is required based on current settings.
  bufferDelayRequired()
  {
    return (this._playbackRate <= RATE_CUTOFF_FOR_ON_DEMAND && this._play_idx != this._scrub_idx);
  }

  onDemandDownloadPrefetch(reqFrame)
  {
    if (reqFrame == -1)
    {
      reqFrame = this._dispFrame;
    }
    // This function can be called at anytime. If auto-download is disabled, then just stop
    // onDemand functionality completely
    if (this._disableAutoDownloads) {
      return;
    }

    // If we aren't using on-demand buffering based on settings then don't pre-fetch.
    if (this.bufferDelayRequired() == false)
    {
      return;
    }

    if (reqFrame == undefined)
    {
      reqFrame = this.currentFrame();
    }

    // Skip prefetch if the current frame is already in the buffer
    // If we're using onDemand, check that buffer. If we're using scrub, check that buffer too.
    let onDemandStatus = this.onDemandBufferAvailable(reqFrame);
    if (onDemandStatus == "yes" && reqFrame == this._dispFrame) {
      return;
    }
    else if (this.videoBuffer(this.currentFrame(), "scrub") && this._play_idx == this._scrub_idx) {
      this._onDemandPlaybackReady = true;
      this.sendPlaybackReady();
      return;
    }

    // Don't use on-demand downloading for legacy videos.
    if (this.isInCompatibilityMode() == true)
    {
      return;
    }

    console.log(`******* onDemandDownloadPrefetch STATUS=${onDemandStatus}`);
    if (this._direction != Direction.BACKWARDS && onDemandStatus == "more")
    {
      // In this case the on-demand buffer needs more data, but is otherwise in good shape.
      // This logic is optimized for forward playback, we always re-init going forward on pause.
      this.onDemandDownload(true);
      return;
    }
    else if (this._direction == Direction.BACKWARDS)
    {
      // Always re-initialize on pause going backwards.
      onDemandStatus = false;
    }

    this.stopPlayerThread();
    this.shutdownOnDemandDownload();

    // Prefetch ondemand download data so it's ready to go.
    this._onDemandInit = false;
    this._onDemandInitSent = false;
    this._onDemandPlaybackReady = false;
    this._onDemandFinished = false;

    // Assumed that you're going forward on seek (when this function is expected to be called)
    this._lastDirection = Direction.FORWARD;
    var that = this;
    var restartOnDemand = function () {

      console.log("******* restarting onDemand: Clearing old buffer");
      that.stopPlayerThread();
      clearTimeout(that._onDemandDownloadTimeout);
      that._onDemandDownloadTimeout = null;
      var video = that._videoElement[that._play_idx];
      if (that._ftypInfo[that._play_idx] == undefined) { return; }

      var setupCallback = function() {
        console.log("******* restarting onDemand: Setting up new buffer");
        clearTimeout(that._onDemandDownloadTimeout);
        that._onDemandDownloadTimeout = null;
        var offsets2 = that._ftypInfo[that._play_idx]["offsets"];
        var data2 = that._ftypInfo[that._play_idx]["buffer"];
        var begin2 = offsets2[0][0];
        var end2 = offsets2[1][0]+offsets2[1][1];
        var bufferToSend = data2.slice(begin2, end2);
        bufferToSend.fileStart = 0;
        video.appendOnDemandBuffer(bufferToSend, playCallback);
      }

      var playCallback = function () {
        that._onDemandInit = false;
        that._onDemandInitSent = false;
        that._onDemandPlaybackReady = false;
        that._onDemandFinished = false;
        setTimeout(() => {that.onDemandDownload(true)},0);
      };

      video.recreateOnDemandBuffers(playCallback);
    }

    let timeToEnd = 0;
    let ranges = this._videoElement[this._play_idx].playBuffer().buffered;
    let absEnd = this.frameToTime(this._numFrames-1);
    let timeToAbsEnd = Number.MAX_SAFE_INTEGER;
    let this_time =  this.frameToTime(reqFrame);
    timeToAbsEnd = absEnd - this_time;
    let found_it = false;
    for (let idx = 0; idx < ranges.length; idx++)
    {
      if (reqFrame >= ranges.start(idx) && reqFrame <= ranges.end(idx))
      {
        timeToEnd = ranges.end(idx) - this_time;
        found_it = true;
      }
    } 

    console.info(`FOUND IT = ${found_it}`);
    // If we moved out of the current on-demand buffer reload it.
    if (reqFrame == -1 || found_it == false)
    {
      console.info(`reqFrame == ${reqFrame}, ${timeToEnd}, ${timeToAbsEnd}`);
      clearTimeout(this._restartOnDemandTimer);
      this._restartOnDemandTimer = setTimeout(function() {
        restartOnDemand();
      },0);
    }
    /*
    this._videoElement[this._play_idx].resetOnDemandBuffer().then(() => {
      that.onDemandDownload(true);
    })
    */;
  }
  onDemandDownload(inhibited)
  {
    if (this._disableAutoDownloads) {
      return;
    }

    if (inhibited == undefined)
    {
      inhibited = false;
    }

    if (this._direction == Direction.STOPPED && inhibited == false)
    {
      return;
    }

    const video = this._videoElement[this._play_idx];
    const ranges = video.playBuffer().buffered;
    let currentFrame = this._dispFrame;
    var downloadDirection;
    if (this._direction == Direction.FORWARD || inhibited)
    {
      downloadDirection = "forward";
    }
    else if (this._direction == Direction.BACKWARDS)
    {
      downloadDirection = "backward";
    }
    else {
      if (this._lastDirection == Direction.FORWARD) {
        downloadDirection = "forward";
      }
      else {
        downloadDirection = "backward";
      }
    }

    if (!this._onDemandInit)
    {
      if (!this._onDemandInitSent)
      {
        // Have not initialized yet.
        // Send out the onDemandInit only if the buffer is clear. Otherwise, reset the
        // underlying source buffer.
        if (ranges.length == 0 && !video.isOnDemandBufferBusy())
        {
          this._onDemandPendingDownloads = 0;
          this._onDemandCompletedDownloads = 0;
          this._onDemandDownloadCheck = {lastDownloadCount: 0, lastStartTime: 0, lastEndTime: 0, lastDispFrame: -1};
          this._onDemandInitSent = true;

          // Note: These are here because it's possible that currentFrame gets out of sync.
          //       Perhaps this is more of a #TODO, but this is some defensive programming
          //       to keep things in line.
          this._onDemandInitStartFrame = this._dispFrame;
          currentFrame = this._dispFrame;

          this._onDemandId += 1;
          console.log(`(ID:${this._videoObject.id}) Requesting more onDemand data: onDemandInit`);

          this._dlWorker.postMessage(
            {
              "type": "onDemandInit",
              "frame": this._dispFrame,
              "fps": this._fps,
              "maxFrame": this._numFrames - 1,
              "direction": downloadDirection,
              "mediaFileIndex": this._play_idx,
              "id": this._onDemandId
            }
          );
        }
      }
    }
    else
    {
      // Stop if we've reached the end
      if (this._direction == Direction.FORWARD)
      {
        // #TODO This needs to be relooked at
        if ((this._numFrames - 1) == this._dispFrame)
        {
          return;
        }
      }
      else if (this._direction == Direction.BACKWARDS)
      {
        if (this._dispFrame == 0)
        {
          return;
        }
      }

      // Look at how much time is stored in the buffer and where we currently are.
      // If we are within X seconds of the end of the buffer, drop the frames before
      // the current one and start downloading again.
      //console.log(`Pending onDemand downloads: ${this._onDemandPendingDownloads} ranges.length: ${ranges.length}`);

      var needMoreData = false;
      if (ranges.length == 0 && this._onDemandPendingDownloads < 1)
      {
        // No data in the buffer, big surprise - need more data.
        needMoreData = true;
      }
      else
      {
        const currentTime = this.frameToTime(this._dispFrame);
        // Make these scale to the selected playback rate
        const appendThreshold = this._calculateAppendThreshold();
        var playbackReadyThreshold = appendThreshold;
        const totalVideoTime = this.frameToTime(this._numFrames);
        if (this._direction == Direction.FORWARD &&
          (totalVideoTime - currentTime < playbackReadyThreshold))
        {
          playbackReadyThreshold = 0;
        }
        else if (this._direction == Direction.BACKWARDS &&
            (currentTime < playbackReadyThreshold))
        {
          playbackReadyThreshold = 0;
        }

        var foundMatchingRange = false;
        for (var rangeIdx = 0; rangeIdx < ranges.length; rangeIdx++)
        {
          var end = ranges.end(rangeIdx);
          var start = ranges.start(rangeIdx);
          var timeToEnd;

          if (this._direction == Direction.STOPPED) {
            if (this._lastDirection == Direction.FORWARD) {
              timeToEnd = end - currentTime;
            }
            else {
              timeToEnd = currentTime - start;
            }
          }
          else if (this._direction == Direction.FORWARD)
          {
            this._lastDirection = this._direction;
            timeToEnd = end - currentTime;
          }
          else
          {
            this._lastDirection = this._direction;
            timeToEnd = currentTime - start;
          }

          if (currentTime <= end && currentTime >= start)
          {
            foundMatchingRange = true;
            if (timeToEnd > playbackReadyThreshold)
            {
              //#TODO This block can probably be removed since this was here to support sync'ing
              //      when hitting play
              if (this._waitPlayback)
              {
                if (!this._sentPlaybackReady)
                {
                  if (video.playBuffer().readyState == "open" && this.videoBuffer(this.currentFrame(), "play") != null)
                  {
                    console.log(`(ID:${this._videoObject.id}) playbackReady (start/end/current/timeToEnd): ${start} ${end} ${currentTime} ${timeToEnd}`)
                    this._sentPlaybackReady = true;
                    this.dispatchEvent(new CustomEvent(
                      "playbackReady",
                      {
                        composed: true,
                        detail: {playbackReadyId: this._waitId},
                      }));
                  }
                }
              }
              else
              {
                // Enough data to start playback
                if (!this._onDemandPlaybackReady)
                {
                  console.log(`(ID:${this._videoObject.id}) onDemandPlaybackReady (start/end/current/timeToEnd): ${start} ${end} ${currentTime} ${timeToEnd}`);
                  this._onDemandPlaybackReady = true;
                  this.sendPlaybackReady();
                }
              }
            }

            //console.info(`TIME CHECK: ${timeToEnd} to ${appendThreshold}`);
            if (timeToEnd < appendThreshold)
            {
              // Need to download more video playback data
              // Since we are requesting more data, trim the buffer
              needMoreData = true;
            }

            // We can do GC even if we don't need more data.
            if (this._direction == Direction.FORWARD)
            {
              var trimEnd = currentTime - 30;
              if (trimEnd > start && this._playing)
              {
                console.log(`(ID:${this._videoObject.id}) ...Removing seconds ${start} to ${trimEnd} in sourceBuffer`);
                video.deletePendingOnDemand([start, trimEnd]);
              }
            }
            else if (this._direction == Direction.BACKWARDS)
            {
              var trimEnd = currentTime + 30;
              if (trimEnd < end && this._playing)
              {
                console.log(`(ID:${this._videoObject.id}) ...Removing seconds ${trimEnd} to ${end} in sourceBuffer`);
                video.deletePendingOnDemand([trimEnd, end]);
              }
            }
          }
          else
          {
            //console.warn("Video playback buffer range not overlapping currentTime");
          }

          //console.log(`(start/end/current/timeToEnd): ${start} ${end} ${currentTime} ${timeToEnd}`)
        }
        if (!foundMatchingRange && this._onDemandPendingDownloads < 1 && !this._onDemandPlaybackReady)
        {
          if (this._onDemandInitStartFrame != this._dispFrame)
          {
            // If for some reason the onDemand was initialized incorrectly, reinitialize
            // #TODO Worth looking at in the future to figure out how to prevent this scenario.
            console.log(`(ID:${this._videoObject.id}) onDemand was initialized with frame ${this._onDemandInitStartFrame} - reinitializing with ${this._dispFrame}`);
            this._onDemandInitSent = false;
            this._onDemandInit = false;
            this._onDemandPlaybackReady = false;
          }
          else
          {
            // #TODO This block of code is a candidate for removal, but it's here as defensive programming
            //       if the user somehow gets into this state.

            // Did not find a matching range. Have we already downloaded
            if (this._onDemandCompletedDownloads > this._onDemandDownloadCheck.lastDownloadCount &&
                !this._onDemandFinished &&
                ranges.length > 0 &&
                this._dispFrame == this._onDemandDownloadCheck.lastDispFrame) {

              this._onDemandDownloadCheck.lastDownloadCount = this._onDemandCompletedDownloads;

              // Subsequent downloads are increasing the range but not incorporating the current frame. #TODO maybe accumulate durations instead
              // Reset the downloader
              console.log("onDemand - fragmented data (no matching range) - restarting downloader");

                for (let innerIdx = 0; innerIdx < ranges.length; innerIdx++) {
                  video.deletePendingOnDemand([ranges.start(innerIdx), ranges.end(innerIdx)]);
                }
                video.resetOnDemandBuffer().then(() => {
                  this._onDemandDownloadTimeout = setTimeout(() => {
                    this._onDemandInit = false;
                    this._onDemandInitSent = false;
                    this._onDemandPlaybackReady = false;
                    this._onDemandFinished = false;
                    this.onDemandDownload()}, 50);
                });
                return;
            }
            this._onDemandDownloadCheck.lastDispFrame = this._dispFrame;
            // #TODO do we need this?
            // Request more data, we received a block of data but it's likely on the boundary.
            //console.log(`(ID:${this._videoObject.id}) playback not ready -- downloading additional data`);
            needMoreData = true;
          }
        }
      }

      if (needMoreData && !this._onDemandFinished && this._onDemandPendingDownloads == 0)// && !(this._direction == Direction.STOPPED && this._onDemandPlaybackReady))
      {
        // Kick of the download worker to get the next onDemand segments
        console.log(`(ID:${this._videoObject.id}) Requesting more onDemand data (pendingDownloads/playbackReady/ranges.length): ${this._onDemandPendingDownloads} ${this._onDemandPlaybackReady} ${ranges.length}`);
        for (var rangeIdx = 0; rangeIdx < ranges.length; rangeIdx++)
        {
          var end = ranges.end(rangeIdx);
          var start = ranges.start(rangeIdx);
          console.log(`    range ${rangeIdx} (start/end/current) - ${start} ${end} ${this.frameToTime(this._dispFrame)}`)
        }
        this._onDemandPendingDownloads += 1;
        this._dlWorker.postMessage({
          "type": "onDemandDownload",
          "playing": !this.isPaused()});
      }

      // Clear out unecessary parts of the video if there are pending deletes
      video.cleanOnDemandBuffer();

      // Kick off the loader thread once we have buffered enough data (do this just once)
      if (this._onDemandPlaybackReady && !this._loaderStarted && !inhibited)
      {
        console.log(`(ID:${this._videoObject.id}) Launching playback loader`);
        if (this._videoElement[this._scrub_idx].playBuffer().use_codec_buffer && this._direction == Direction.FORWARD)
        {
          this._loaderStarted = true;
          this.frameCallbackMethod();
        }
        else
        {
          this._loaderStarted = true;
          this._loaderTimeout = setTimeout(() => {this.loaderThread(true, "play")}, 0);
        }
      }
    }

    // Sleep for a period before checking the onDemand buffer again
    if (!this._onDemandPlaybackReady)
    {
      this._onDemandDownloadTimeout = setTimeout(() => {this.onDemandDownload(inhibited)}, 100);
    }
    else
    {
      if (!this._onDemandFinished && !inhibited)
      {
        this._onDemandDownloadTimeout = setTimeout(() => {this.onDemandDownload()}, 100);
      }
    }
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

  /**
   * @param {boolean} waitStatus - True if playback should wait until this is set to false.
   *                               False, playback immediately
   * @param {integer} waitId - Unique ID associated with this wait used for synchronization purposes
   */
  waitPlayback(waitStatus, waitId)
  {
    this._waitPlayback = waitStatus;
    this._waitId = waitId;
    console.log(`waitPlayback (status/ID) ${waitStatus} ${waitId}`)
  }

  /**
   * @param {float} rate - Playback rate
   * @param {integer} frame - Frame number to start playing at
   * @returns {boolean} True if video can play with the given parameters. False otherwise.
   */
  canPlayRate(rate, frame)
  {
    // If the rate is 1.0 or less, we will use the onDemand buffer so we're good to go.
    if (rate <= RATE_CUTOFF_FOR_ON_DEMAND)
    {
      return true;
    }

    // Rate is higher than 1.0, we need to check if we've buffered enough data in
    // the scrub buffer.
    const video = this.videoBuffer(frame, "scrub");
    return video != null;
  }

  /**
   * @returns {object} Returns an object specifying the current playback settings
   */
  playbackRatesAvailable()
  {
    let onDemandLogic = true;
    if (this._playbackRate > RATE_CUTOFF_FOR_ON_DEMAND)
    {
      onDemandLogic = false;
    }
    else if (this._play_idx == this._scrub_idx && this.videoBuffer(this.currentFrame(), "scrub") != null)
    {
      onDemandLogic = false;
    }

    if (onDemandLogic == false)
    {
      return {"frameInterval": 1, //Growth for segmentation optimization
              "minimum": 0,
              "maximum": Infinity};
    }
    else
    {
      return {"frameInterval": 1, //On-demand always uses 1
              "minimum": 0,
              "maximum": RATE_CUTOFF_FOR_ON_DEMAND};
    }
  }

  play()
  {
    if (this._dispFrame >= (this._numFrames))
    {
      return false;
    }
    else
    {
      this._playCb.forEach(cb => {cb();});
      if (this._playbackRate > RATE_CUTOFF_FOR_ON_DEMAND)
      {
        this._playGenericScrub(Direction.FORWARD);
      }
      else
      {
        if (this._play_idx == this._scrub_idx && this.videoBuffer(this.currentFrame(), "scrub") != null)
        {
          this._playGenericScrub(Direction.FORWARD);
        }
        else
        {
          this._playGenericOnDemand(Direction.FORWARD);
        }
      }
      return true;
    }
  }

  playBackwards()
  {
    if (this._dispFrame <= 0)
    {
      return false;
    }
    else
    {
      this._oldRate = this._playbackRate;
      this._playbackRate = 0.50;
      this._playCb.forEach(cb => {cb();});
      this._playGenericScrub(Direction.BACKWARDS);
      return true;
    }
  }

  /**
   * Stops the threads that are kicked off when playing
   * Seek frame and scrub buffer downloading will resume.
   */
  stopPlayerThread()
  {
    if (this._audioPlayer)
    {
      this._audioPlayer.pause();
    }
    if (this._playerTimeout)
    {
      clearTimeout(this._playerTimeout);
      cancelAnimationFrame(this._playerTimeout)
      this._playerTimeout=null;
    }
    if (this._pendingTimeout)
    {
      clearTimeout(this._pendingTimeout)
      this._pendingTimeout = null;
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
    /*
    if (this._onDemandDownloadTimeout)
    {
      clearTimeout(this._onDemandDownloadTimeout);
      this._onDemandDownloadTimeout=null;
      console.log(`(ID:${this._videoObject.id}) Requesting more onDemand data: shutdown`);
      this._dlWorker.postMessage({"type": "onDemandShutdown"});
    }
    */
  }

  shutdownOnDemandDownload() {
    if (this._onDemandDownloadTimeout)
    {
      clearTimeout(this._onDemandDownloadTimeout);
      this._onDemandDownloadTimeout=null;
    }
  }

  /**
   * This will stop all the player threads and set the video player to paused
   * A redraw of the currently displayed frame will occur using the highest quality source
   */
  pause()
  {
    // Stoping the player thread sets the direction to stop
    const currentDirection = this._direction;

    this._playing = false;

    // Stop the player thread first
    this.stopPlayerThread();

    if (this._oldRate)
    {
      this._playbackRate = this._oldRate;
      this._oldRate = null;
    }

    // Let the downloader know the ondemand is paused.
    // Doesn't matter if the player was using the scrub buffer for playback
    if (this._dlWorker)
    {
      this._dlWorker.postMessage({"type": "onDemandPaused"});
    }

    // If we weren't already paused send the event
    if (currentDirection != Direction.STOPPED)
    {
      this._pauseCb.forEach(cb => {cb();});

      this._direction=Direction.STOPPED;
      this._videoElement[this._play_idx].pause(this.frameToTime(this._dispFrame));
      this._videoElement[this._scrub_idx].pause(this.frameToTime(this._dispFrame));

      // force a redraw at the currently displayed frame
      var finalPromise = new Promise((resolve, reject) => {
        var seekPromise = this.seekFrame(this._dispFrame, this.drawFrame, true);
        seekPromise.then(() => {
          document.body.style.cursor=null;
          resolve();
        }).catch(() => {
          resolve();
        });
      });
      return finalPromise;
    }
  }

  /**
   * Move a single frame backward, forcing a fetch from the highest quality source
   */
  back()
  {
    var newFrame=this._dispFrame-1;
    if (newFrame >= 0)
    {
      this.gotoFrame(newFrame, true);
    }
  }

  /**
   * Move a single frame forward, forcing a fetch from the highest quality source
   */
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

if (!customElements.get("video-canvas")) {
  customElements.define("video-canvas", VideoCanvas);
}
