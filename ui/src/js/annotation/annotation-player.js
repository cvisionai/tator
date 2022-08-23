import { TatorElement } from "../components/tator-element.js";
import { Utilities } from "../util/utilities.js";
import { guiFPS } from "../annotator/video.js";
import { RATE_CUTOFF_FOR_ON_DEMAND } from "../annotator/video.js";
import { frameToTime, handle_video_error, handle_decoder_error, PlayInteraction } from "./annotation-common.js";

export class AnnotationPlayer extends TatorElement {
  constructor() {
    super();

    const playerDiv = document.createElement("div");
    playerDiv.setAttribute("class", "annotation__video-player d-flex flex-column rounded-bottom-2");
    this._shadow.appendChild(playerDiv);

    this._video = document.createElement("video-canvas");
    let alert_sent = false;
    this._video.addEventListener("videoError", (evt) => {
      if (alert_sent == false)
      {
        handle_video_error(evt, this._shadow);
        alert_sent = true;
      }
    });
    this._video.addEventListener("codecNotSupported", (evt) => {
      if (alert_sent == false)
      {
        handle_decoder_error(evt, this._shadow);
        alert_sent = true;
      }
    });
    this._video.domParents.push({"object":this});
    playerDiv.appendChild(this._video);

    const div = document.createElement("div");
    div.setAttribute("class", "video__controls d-flex flex-items-center flex-justify-between px-4");
    playerDiv.appendChild(div);
    this._controls = div;

    const playButtons = document.createElement("div");
    playButtons.setAttribute("class", "d-flex flex-items-center");
    div.appendChild(playButtons);

    const rewind = document.createElement("rewind-button");
    playButtons.appendChild(rewind);
    this._rewind = rewind;

    const play = document.createElement("play-button");
    this._play = play;
    this._play.setAttribute("is-paused", "");
    playButtons.appendChild(this._play);

    const fastForward = document.createElement("fast-forward-button");
    playButtons.appendChild(fastForward);
    this._fastForward = fastForward;

    this._playInteraction = new PlayInteraction(this);

    const settingsDiv = document.createElement("div");
    settingsDiv.setAttribute("class", "d-flex flex-items-center");
    div.appendChild(settingsDiv);

    this._rateControl = document.createElement("rate-control");
    settingsDiv.appendChild(this._rateControl);

    this._qualityControl = document.createElement("quality-control");
    settingsDiv.appendChild(this._qualityControl);

    this._timelineDiv = document.createElement("div");
    this._timelineDiv.setAttribute("class", "scrub__bar d-flex flex-items-center flex-grow px-4");
    playerDiv.appendChild(this._timelineDiv);

    const timeDiv = document.createElement("div");
    timeDiv.setAttribute("class", "d-flex flex-items-center flex-justify-between");
    playButtons.appendChild(timeDiv);

    this._currentTimeInput = document.createElement("input");
    this._currentTimeInput.setAttribute("class", "form-control input-sm1 f2 text-center");
    this._currentTimeInput.setAttribute("type", "text");
    this._currentTimeInput.style.display = "none";
    this._currentTimeInput.style.width = "100px";
    playButtons.appendChild(this._currentTimeInput);

    this._currentTimeText = document.createElement("div");
    this._currentTimeText.textContent = "0:00";
    this._currentTimeText.style.width = "35px";
    playButtons.appendChild(this._currentTimeText);

    this._totalTime = document.createElement("div");
    this._totalTime.setAttribute("class", "px-2 text-gray");
    this._totalTime.textContent = "/ 0:00";
    playButtons.appendChild(this._totalTime);

    this._timelineMore = document.createElement("entity-more");
    this._timelineMore.style.display = "block";
    this._timelineDiv.appendChild(this._timelineMore);
    this._displayTimelineLabels = false;

    var outerDiv = document.createElement("div");
    outerDiv.style.width="100%";
    var seekDiv = document.createElement("div");
    this._slider = document.createElement("seek-bar");
    seekDiv.appendChild(this._slider);
    outerDiv.appendChild(seekDiv);

    this._zoomSliderDiv = document.createElement("div");
    this._zoomSliderDiv.style.marginTop = "10px";
    outerDiv.appendChild(this._zoomSliderDiv);

    this._zoomSlider = document.createElement("seek-bar");
    this._zoomSlider.changeVisualType("zoom");
    this._zoomSliderDiv.hidden = true;
    this._zoomSliderDiv.appendChild(this._zoomSlider);

    this._slider.setPair(this._zoomSlider);

    var innerDiv = document.createElement("div");
    this._timelineD3 = document.createElement("timeline-d3");
    this._timelineD3.rangeInput = this._slider;
    innerDiv.appendChild(this._timelineD3);
    outerDiv.appendChild(innerDiv);
    this._timelineDiv.appendChild(outerDiv);

    const frameDiv = document.createElement("div");
    frameDiv.setAttribute("class", "d-flex flex-items-center flex-justify-between");
    playButtons.appendChild(frameDiv);

    const framePrev = document.createElement("frame-prev");
    frameDiv.appendChild(framePrev);

    const currentFrameWrapper = document.createElement("div");
    frameDiv.appendChild(currentFrameWrapper);

    this._currentFrameInput = document.createElement("input");
    this._currentFrameInput.setAttribute("class", "form-control input-sm1 f2 text-center");
    this._currentFrameInput.setAttribute("type", "text");
    this._currentFrameInput.setAttribute("id", "frame_num_ctrl");
    this._currentFrameInput.style.display = "none";
    this._currentFrameInput.style.width = "100px";
    frameDiv.appendChild(this._currentFrameInput);

    this._currentFrameText = document.createElement("div");
    this._currentFrameText.setAttribute("id", "frame_num_display");
    this._currentFrameText.setAttribute("class", "f2 text-center");
    this._currentFrameText.textContent = "0";
    this._currentFrameText.style.minWidth = "15px";
    currentFrameWrapper.appendChild(this._currentFrameText);

    const frameNext = document.createElement("frame-next");
    frameDiv.appendChild(frameNext);

    this._volume_control = document.createElement("volume-control");
    settingsDiv.appendChild(this._volume_control);
    this._volume_control.addEventListener("volumeChange", (evt) => {
      this._video.setVolume(evt.detail.volume);
    });
    const fullscreen = document.createElement("video-fullscreen");
    settingsDiv.appendChild(fullscreen);

    this._shortcutsDisabled = false;

    this._scrubInterval = 16;
    this._lastScrub = Date.now();
    this._rate = 1;

     // Magic number matching standard header + footer
     // #TODO This should be re-thought and more flexible initially
    this._videoHeightPadObject = {height: 210};
    this._headerFooterPad = 100; // Another magic number based on the header and padding below controls footer

    const searchParams = new URLSearchParams(window.location.search);
    this._quality = 720;
    this._seekQuality = null;
    this._scrubQuality = null;
    this._allowSafeMode = true;
    if (searchParams.has("playQuality")) {
      this._quality = Number(searchParams.get("playQuality"));
    }
    if (searchParams.has("seekQuality")) {
      this._seekQuality = Number(searchParams.get("seekQuality"));
    }
    if (searchParams.has("scrubQuality")) {
      this._scrubQuality = Number(searchParams.get("scrubQuality"));
    }
    if (searchParams.has("safeMode")) {
      this._allowSafeMode = Number(searchParams.get("safeMode")) == 1;
    }

    this._timelineMore.addEventListener("click", () => {
      this._displayTimelineLabels = !this._displayTimelineLabels;
      this._timelineD3.showFocus(this._displayTimelineLabels);
      this._videoHeightPadObject.height = this._headerFooterPad + this._controls.offsetHeight + this._timelineDiv.offsetHeight;
      window.dispatchEvent(new Event("resize"));
    });

    this._video.addEventListener("bufferLoaded", evt => {

      let frame = Math.round(evt.detail.percent_complete * Number(this._mediaInfo.num_frames)-1);
      this._zoomSlider.setLoadProgress(frame);
      this._slider.onBufferLoaded(evt);
    });

    this._video.addEventListener("onDemandDetail", evt => {
      this._slider.onDemandLoaded(evt);
    });

    this._video.addEventListener("videoLengthChanged", evt =>
    {
      this._slider.setAttribute('max',evt.detail.length);
      this._totalTime.textContent = "/ " + frameToTime(evt.detail.length, this._mediaInfo.fps);
      this._totalTime.style.width = 10 * (this._totalTime.textContent.length - 1) + 5 + "px";
    });

    // In the event the first frame of the video isn't frame 0.
    this._video.addEventListener("firstFrame", evt =>
    {
      this._slider.setAttribute('min', evt.detail.value);
    });

    // When a playback is stalled, pause the video
    this._video.addEventListener("playbackStalled", evt => {
      Utilities.warningAlert("Video playback stalled.");
      this.pause();
    });

    this._video.addEventListener("rateChange", evt => {
      if (this.is_paused())
      {
        this._video.onDemandDownloadPrefetch();
        this.checkReady();
      }
    });

    // #TODO Combine with this._slider.addEventListener
    this._zoomSlider.addEventListener("input", evt => {
      this.handleSliderInput(evt);
    });

    // #TODO Combine with this._slider.addEventListener
    this._zoomSlider.addEventListener("change", evt => {
      this.handleSliderChange(evt);
    });

    this._slider.addEventListener("input", evt => {
      this.handleSliderInput(evt);
    });

    this._slider.addEventListener("change", evt => {
      this.handleSliderChange(evt);
    });

    play.addEventListener("click", () => {
      if (this.is_paused())
      {
        this.play();
      }
      else
      {
        this.pause();
      }
    });

    rewind.addEventListener("click", () => {
      this.playBackwards();
    });

    fastForward.addEventListener("click", () => {
      this._video.pause();
      this._video.rateChange(2 * this._rate);
      if (this._video.play())
      {
        this.dispatchEvent(new Event("playing", {composed: true}));
        play.removeAttribute("is-paused");
      }
    });

    framePrev.addEventListener("click", () => {
      if (this.is_paused() == false)
      {
        this.dispatchEvent(new Event("paused", {composed: true}));
        fastForward.removeAttribute("disabled");
        rewind.removeAttribute("disabled");
        this._video.pause().then(() => {
          this._video.back();
        });
      }
      else
      {
        this._video.back();
      }
    });

    frameNext.addEventListener("click", () => {
      if (this.is_paused() == false)
      {
        this.dispatchEvent(new Event("paused", {composed: true}));
        fastForward.removeAttribute("disabled");
        rewind.removeAttribute("disabled");
        this._video.pause().then(() => {
          this._video.advance();
        });
      }
      else
      {
        this._video.advance();
      }
    });

    this._video.addEventListener("canvasResized", () => {
      this._timelineD3.redraw();
    });

    this._video.addEventListener("frameChange", evt => {
      const frame = evt.detail.frame;
      
      this._slider.value = frame;
      this._zoomSlider.value = frame;
      const time = frameToTime(frame, this._mediaInfo.fps);
      this._currentTimeText.textContent = time;
      this._currentFrameText.textContent = frame;
      this._currentTimeText.style.width = 10 * (time.length - 1) + 5 + "px";
      this._currentFrameText.style.width = (15 * String(frame).length) + "px";
    });

    this._video.addEventListener("playbackEnded", evt => {
      this.pause();
    });

    this._video.addEventListener("safeMode", () => {
      this.safeMode();
    });

    this._video.addEventListener("playbackReady", () =>{
      if (this.is_paused()) {
        this._playInteraction.enable();
      }
    });

    this._timelineD3.addEventListener("zoomedTimeline", evt => {
      if (evt.detail.minFrame < 1 || evt.detail.maxFrame < 1) {
        // Reset the slider
        this._zoomSliderDiv.hidden = true;
        this._zoomSlider.setAttribute("min", 0);
        this._zoomSlider.setAttribute("max", Number(this._mediaInfo.num_frames)-1);
      }
      else {
        this._zoomSliderDiv.hidden = false;
        this._zoomSlider.setAttribute("min", evt.detail.minFrame);
        this._zoomSlider.setAttribute("max", evt.detail.maxFrame);
        this._zoomSlider.value = this._slider.value;
      }
    });

    this._timelineD3.addEventListener("graphData", evt => {
      if (evt.detail.numericalData.length > 0 || evt.detail.stateData.length > 0) {
        this._timelineMore.style.display = "block";
      }
      else {
        this._timelineMore.style.display = "none";
      }
      const newHeight = this._headerFooterPad + this._controls.offsetHeight + this._timelineDiv.offsetHeight;
      if (newHeight != this._videoHeightPadObject.height)
      {
        this._videoHeightPadObject.height = newHeight;
        window.dispatchEvent(new Event("resize"));
      }
    });

    this._timelineD3.addEventListener("select", evt => {
      this.goToFrame(evt.detail.frame);
    });

    fullscreen.addEventListener("click", evt => {
      if (fullscreen.hasAttribute("is-maximized")) {
        fullscreen.removeAttribute("is-maximized");
        playerDiv.classList.remove("is-full-screen");
        this.dispatchEvent(new Event("minimize", {composed: true}));
      } else {
        fullscreen.setAttribute("is-maximized", "");
        playerDiv.classList.add("is-full-screen");
        this.dispatchEvent(new Event("maximize", {composed: true}));
      }
      window.dispatchEvent(new Event("resize"));
    });

    this._currentFrameInput.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    this._currentFrameInput.addEventListener("change", () => {
      this._currentFrameInput.blur(); // Lose focus to invoke the blur event
    });

    this._currentFrameInput.addEventListener("blur", () => {
      document.body.classList.remove("shortcuts-disabled");
      this._currentFrameText.style.display = "block";
      this._currentFrameInput.style.display = "none";
      this.processFrameInput();
    });

    this._currentFrameText.addEventListener("click", () => {
      this._currentFrameInput.style.display = "block";
      this._currentFrameInput.focus();
      this._currentFrameText.style.display = "none";
    });

    this._currentTimeInput.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    this._currentTimeInput.addEventListener("change", () => {
      this._currentTimeInput.blur(); // Lose focus to invoke the blur event
    });

    this._currentTimeInput.addEventListener("blur", () => {
      document.body.classList.remove("shortcuts-disabled");
      this._currentTimeText.style.display = "block";
      this._currentTimeInput.style.display = "none";
      this.processTimeInput();
    });

    this._currentTimeText.addEventListener("click", () => {
      this._currentTimeInput.style.display = "block";
      this._currentTimeInput.focus();
      this._currentTimeText.style.display = "none";
    });

    this._qualityControl.addEventListener("setQuality", (evt) => {
      this.dispatchEvent(new CustomEvent("setPlayQuality",
      {
        composed: true,
        detail: {
          quality: evt.detail.quality
        }
      }));
    });

    document.addEventListener("keydown", evt => {

      if (this._shortcutsDisabled) {
        return;
      }

      if (document.body.classList.contains("shortcuts-disabled"))
      {
        return;
      }


      if (evt.ctrlKey && (evt.key == "m")) {
        fullscreen.click();
      }
      else if (evt.key == "t") {
        this.dispatchEvent(new Event("toggleTextOverlay", {composed: true}));
      }
      else if (evt.code == "Space")
      {
        evt.preventDefault();
        if (this._play._button.hasAttribute("disabled")) {
          return;
        }
        if (this.is_paused())
        {
          this.play();
        }
        else
        {
          this.pause();
        }
      }
      else if (evt.key == "r")
      {
        evt.preventDefault();
        if (this._play._button.hasAttribute("disabled")) {
          return;
        }
        if (this.is_paused())
        {
          this.playBackwards();
        }
      }
      else if (evt.key == 1) {
        if (!this._rateControl.hasAttribute("disabled")) {
          this._rateControl.setValue(1);
        }
      }
      else if (evt.key == 2) {
        if (!this._rateControl.hasAttribute("disabled")) {
          this._rateControl.setValue(2);
        }
      }
      else if (evt.key == 4) {
        if (!this._rateControl.hasAttribute("disabled")) {
          this._rateControl.setValue(4);
        }
      }
      else if (evt.key == 'ArrowUp' && evt.ctrlKey)
      {
        if (!this._rateControl.hasAttribute("disabled")) {
          const newIdx = this._rateControl.getIdx()+1;
          const newRate = this._rateControl.rateForIdx(newIdx);
          if (this._ratesAvailable == null || (newRate >= this._ratesAvailable.minimum && newRate <= this._ratesAvailable.maximum))
          {
            this._rateControl.setIdx(newIdx);
          }
        }
      }
      else if (evt.key == 'ArrowDown' && evt.ctrlKey)
      {
        if (!this._rateControl.hasAttribute("disabled")) {
          const newIdx = this._rateControl.getIdx()-1;
          const newRate = this._rateControl.rateForIdx(newIdx);
          if (this._ratesAvailable == null || (newRate >= this._ratesAvailable.minimum && newRate <= this._ratesAvailable.maximum))
          {
            this._rateControl.setIdx(newIdx);
          }
        }
      }
    });

    this._videoStatus = "paused"; // Possible values: playing | paused | scrubbing
  }

  static get observedAttributes() {
    return ["rate"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "rate":
        if (newValue >= 1) {
          this._rateControl.textContent = Math.round(newValue) + "x";
        } else {
          this._rateControl.textContent = Number(newValue).toFixed(2) + "x";
        }
        break;
    }
  }

  disableAutoDownloads() {
    this._playerDownloadDisabled = true;
    this._video.disableAutoDownloads();
  }

  enableShortcuts() {
    this._shortcutsDisabled = false;
    this._video.enableShortcuts();
  }

  disableShortcuts() {
    this._shortcutsDisabled = true;
    this._video.disableShortcuts();
  }

  set quality(val)
  {
    this._qualityControl.quality = val;
  }

  enableQualityChange()
  {
    this._qualityControl.removeAttribute("disabled");
  }
  disableQualityChange()
  {
    this._qualityControl.setAttribute("disabled", "");
  }

  enableRateChange()
  {
    this._rateControl.removeAttribute("disabled");
  }
  disableRateChange()
  {
    this._rateControl.setAttribute("disabled", "");
  }

  hideVideoControls() {
    this._controls.style.display = "none";
    this._timelineDiv.style.display = "none";
  }

  hideVideoText() {
    this._video.toggleTextOverlays(false);
  }

  /**
   * Callback used when user clicks on one of the seek bar sliders
   */
  handleSliderInput(evt) {
    // Along allow a scrub display as the user is going slow
    const now = Date.now();
    const frame = Number(evt.target.value);
    const waitOk = now - this._lastScrub > this._scrubInterval;
    this._video.scrubbing = true;
    if (this._video.keyframeOnly == false && Math.abs(frame-this._video.currentFrame()) > 25)
    {
      this._video.keyframeOnly = true;
    }
    else
    {
      // Let the user slow down and get frame by frame scrubing
      this._video.keyframeOnly = false;
    }
    if (waitOk) {
      this._lastScrub = Date.now();
      this._videoStatus = "paused";

      this._play.setAttribute("is-paused","");
      this._video.stopPlayerThread();
      this._video.shutdownOnDemandDownload();
      this._video.seekFrame(frame, this._video.drawFrame);
    }
  }

  /**
   * Callback used when user slides one of the seek bars
   */
  handleSliderChange(evt) {
    this._play.setAttribute("is-paused","");
    this.dispatchEvent(new Event("displayLoading", {composed: true}));
    // Only use the current frame to prevent glitches
    let frame = this._video.currentFrame();
    if (evt.detail)
    {
      frame = evt.detail.frame;
    }
    this._video.keyframeOnly = false;
    this._video.scrubbing = false;
    this._videoStatus = "scrubbing";

    this._video.stopPlayerThread();
    this._video.shutdownOnDemandDownload();

    // Use the hq buffer when the input is finalized
    this._playInteraction.disable(); // disable play on seek
    this._video.seekFrame(frame, this._video.drawFrame, true).then(() => {
      this._lastScrub = Date.now()
      this._videoStatus = "paused";
      this.checkReady();
      this.dispatchEvent(new Event("hideLoading", {composed: true}));
    });/*;.catch((e) => {
      console.error(`"ERROR: ${e}`)
      throw e;
      this.dispatchEvent(new Event("hideLoading", {composed: true}));
    });*/
  }

  /**
   * Process the frame input text field and attempts to jump to that frame
   */
  processFrameInput() {

    this._videoStatus = "paused";

    var frame = parseInt(this._currentFrameInput.value);
    if (isNaN(frame)) {
      console.log("Provided invalid frame input: " + this._currentFrameInput.value);
      this._currentFrameInput.classList.add("has-border");
      this._currentFrameInput.classList.add("is-invalid");
      return;
    }

    const maxFrame = this._mediaInfo.num_frames - 1;
    if (frame > maxFrame - 1)  // #TODO Fix in the future once video.js has been sorted out.
    {
      frame = maxFrame - 1;
    }
    else if (frame < 0)
    {
      frame = 0;
    }

    this._currentFrameInput.classList.remove("has-border");
    this._currentFrameInput.classList.remove("is-invalid");
    this.goToFrame(frame);
    this.checkReady();
  }

  /**
   * Process the time input text field and attempts to jump to the corresponding frame
   */
  processTimeInput() {

    this._videoStatus = "paused";

    var timeTokens = this._currentTimeInput.value.split(":");
    if (timeTokens.length != 2)
    {
      console.log("Provided invalid time (minutes:seconds) expected: " + this._currentTimeInput.value);
      this._currentTimeInput.classList.add("has-border");
      this._currentTimeInput.classList.add("is-invalid");
      return;
    }

    var minutes = parseInt(timeTokens[0]);
    if (isNaN(minutes))
    {
      console.log("Provided invalid time (minutes:seconds) expected: " + this._currentTimeInput.value);
      this._currentTimeInput.classList.add("has-border");
      this._currentTimeInput.classList.add("is-invalid");
      return;
    }

    var seconds = parseInt(timeTokens[1]);
    if (isNaN(seconds))
    {
      console.log("Provided invalid time (minutes:seconds) expected: " + this._currentTimeInput.value);
      this._currentTimeInput.classList.add("has-border");
      this._currentTimeInput.classList.add("is-invalid");
      return;
    }

    var frame = this._timeToFrame(minutes, seconds);
    const maxFrame = this._mediaInfo.num_frames - 1;
    if (frame > maxFrame)
    {
      frame = maxFrame;
    }
    else if (frame < 0)
    {
      frame = 0;
    }

    this._currentTimeInput.classList.remove("has-border");
    this._currentTimeInput.classList.remove("is-invalid");
    this.goToFrame(frame);
    this.checkReady();
  }

  set permission(val) {
    this._video.permission = val;
  }

  addDomParent(val)
  {
    this._video.domParents.push(val);
  }

  set undoBuffer(val) {
    this._video.undoBuffer = val;
  }

  set mediaInfo(val) {
    this._video.mediaInfo = val;
    this._mediaInfo = val;
    const dims = [val.width, val.height];
    this._slider.setAttribute("min", 0);
    // Max value on slider is 1 less the frame count.
    this._slider.setAttribute("max", Number(val.num_frames)-1);
    this._slider.fps = val.fps;
    this._zoomSlider.fps = val.fps;
    this._fps = val.fps;
    this._totalTime.textContent = "/ " + frameToTime(val.num_frames, this._mediaInfo.fps);
    this._totalTime.style.width = 10 * (this._totalTime.textContent.length - 1) + 5 + "px";
    this._video.loadFromVideoObject(val, this.mediaType, this._quality, null, null, null, this._videoHeightPadObject, this._seekQuality, this._scrubQuality)
      .then(() => {
        if (this._video.allowSafeMode) {
          this._video.allowSafeMode = this._allowSafeMode;
        }
        else {
          this._allowSafeMode = false;
        }
        const seekInfo = this._video.getQuality("seek");
        const scrubInfo = this._video.getQuality("scrub");
        const playInfo = this._video.getQuality("play");
        this.checkReady();

        this.dispatchEvent(new CustomEvent("defaultVideoSettings", {
          composed: true,
          detail: {
            seekQuality: seekInfo.quality,
            seekFPS: seekInfo.fps,
            scrubQuality: scrubInfo.quality,
            scrubFPS: scrubInfo.fps,
            playQuality: playInfo.quality,
            playFPS: playInfo.fps,
            focusedQuality: null,
            focusedFPS: null,
            dockedQuality: null,
            dockedFPS: null,
            allowSafeMode: this._allowSafeMode
          }
        }));

        this.dispatchEvent(new Event("canvasReady", {
          composed: true
        }));
      })
      .catch(() => {
        this._video.displayErrorMessage(`Error occurred. Could not load media: ${val.id}`);
        this.dispatchEvent(new Event("videoInitError", {
          composed: true
        }));
      });
    if (this._video.audio != true)
    {
      // Hide volume on videos with no audio
      this._volume_control.style.display = "none";
    }
    this._volume_control.volume = this.mediaType['default_volume'];
    if (val.media_files && 'streaming' in val.media_files)
    {
      let quality_list = [];
      for (let media_file of val.media_files["streaming"])
      {
        quality_list.push(media_file.resolution[0]);
      }
      this._qualityControl.resolutions = quality_list;
      this._qualityControl.show();
    }
    else
    {
      this._qualityControl.hide();
    }
  }

  set annotationData(val) {
    this._video.annotationData = val;
    this._timelineD3.annotationData = val;
  }

  newMetadataItem(dtype, metaMode, objId) {
    this._video.style.cursor = "crosshair";
    this._video.newMetadataItem(dtype, metaMode, objId);
  }

  submitMetadata(data) {
    this._video.submitMetadata(data);
    this._video.refresh();
  }

  updateType(objDescription) {
    this._video.updateType(objDescription);
  }

  is_paused()
  {
    return this._play.hasAttribute("is-paused");
  }

  checkReady()
  {
    if (this._video.bufferDelayRequired() && this._video.onDemandBufferAvailable() != "yes")
    {
      this.handleNotReadyEvent();
    }
    else
    {
      // TODO refactor this into a member function
      this._playInteraction.enable();
    }
  }
  handleNotReadyEvent()
  {
    if (this._playerDownloadDisabled) {
      // Don't bother attempting to check if playback is ready if downloads have been disabled.
      return;
    }

    if (this._video.isInCompatibilityMode() == true)
    {
      // Compatibility videos are always ready to play.
      return;
    }

    if (this._handleNotReadyTimeout != null)
    {
      console.log("Already handling a not ready event");
      return;
    }
    this._playInteraction.disable();

    const timeouts = [3000, 6000, 12000, 16000];
    var timeoutIndex = 0;
    var timeoutCounter = 0;
    const clock_check = 1000/3;
    this._last_duration = this._video.playBufferDuration();

    var last_check = performance.now();
    let check_ready = (checkFrame) => {

      clearTimeout(this._handleNotReadyTimeout);
      this._handleNotReadyTimeout = null;

      if (this._videoStatus == "playing") {
        console.warn(`Player status == ${this._videoStatus} | Cancelling check_ready`);
        return;
      }

      const now = performance.now();
      timeoutCounter += now - last_check;
      console.info(`${now}: Timeout Counter ${timeoutCounter} LAST=${last_check}`);
      last_check = now;

      
      let not_ready = false;
      if (checkFrame != this._video.currentFrame()) {
        console.log(`check_ready frame ${checkFrame} and current frame ${this._video.currentFrame()} do not match. restarting check_ready`)
        timeoutIndex = 0;
        timeoutCounter = 0;
        clearTimeout(this._handleNotReadyTimeout);
        this._handleNotReadyTimeout = null;
        this._handleNotReadyTimeout = setTimeout(() => {
          check_ready(this._video.currentFrame())}, 100);
        return;
      }
      if (this._video.onDemandBufferAvailable() != "yes")
      {
        not_ready = true;
        if (timeoutCounter >= timeouts[timeoutIndex]) {
          timeoutCounter = 0;
          timeoutIndex += 1;
          console.log(`Video playback check - restart [Now: ${new Date().toISOString()}]`);
          this._video.onDemandDownloadPrefetch(-1);
        }
      }
      if (not_ready == true)
      {
        // Heal the buffer state if duration increases since the last time we looked
        if (this._video.playBufferDuration() > this._last_duration)
        {
          timeoutCounter = 0; //truncate 
          timeoutIndex = 0;
        }
        this._last_duration = this._video.playBufferDuration();
        // For this logic to work it is actually based off the worst case
        // number of clocks in a given timeout attempt.
        if (timeoutIndex < timeouts[timeouts.length-1]/clock_check) {
          //console.log(`Video playback check - Not ready: checking in ${timeouts[timeoutIndex]/1000} seconds [Now: ${new Date().toISOString()}]`);
          clearTimeout(this._handleNotReadyTimeout);
          this._handleNotReadyTimeout = null;
          this._handleNotReadyTimeout = setTimeout(() => {
            check_ready(checkFrame);
          }, clock_check);
        }
        else {
          Utilities.warningAlert("Video player unable to reach ready state.", "#ff3e1d", false);
          console.error(`Video player unable to reach ready state`);
        }
      }
      if (not_ready == false)
      {
        this._video.seekFrame(this._video.currentFrame(), this._video.drawFrame, true, null, true).then(() => {
          console.log(`Video playback check - Ready [Now: ${new Date().toISOString()}]`);
          this._playInteraction.enable();
        }).catch((e) => {
          console.log(e);
          console.log(`Video playback check - Ready [Now: ${new Date().toISOString()}] (not hq pause)`);
          this._playInteraction.enable();
        });
      }
    };

    clearTimeout(this._handleNotReadyTimeout);
    this._handleNotReadyTimeout = null;
    // We can be faster in single play mode
    this._handleNotReadyTimeout = setTimeout(check_ready(this._video.currentFrame()), clock_check);
  }

  play()
  {
    if (this._rate > RATE_CUTOFF_FOR_ON_DEMAND)
    {
      // Check to see if the video player can play at this rate
      // at the current frame. If not, inform the user.
      if (!this._video.canPlayRate(this._rate, this._video.currentFrame()))
      {
        window.alert("Please wait until this portion of the video has been downloaded. Playing at speeds greater than 4x require the video to be buffered.")
        return;
      }
    }
    this._ratesAvailable = this._video.playbackRatesAvailable();

    if (this._video.bufferDelayRequired() && this._video.onDemandBufferAvailable() != "yes")
    {
      this.handleNotReadyEvent();
      return;
    }

    if (this._video.currentFrame() >= this._video._numFrames - 1) {
      this.pause();
      return;
    }

    this.dispatchEvent(new Event("playing", {composed: true}));
    this._fastForward.setAttribute("disabled", "");
    this._rewind.setAttribute("disabled", "");

    const paused = this.is_paused();
    if (paused) {
      this._video.rateChange(this._rate);
      if (this._video.play())
      {
        this._videoStatus = "playing";
        this._play.removeAttribute("is-paused");
      }
    }
  }

  playBackwards()
  {
    if (this._video.currentFrame() <= 0) {
      this.pause();
      return;
    }

    const paused = this.is_paused();
    if (paused) {
      this.dispatchEvent(new Event("playing", {composed: true}));
      this._fastForward.setAttribute("disabled", "");
      this._rewind.setAttribute("disabled", "");
      this.disableRateChange();
      if (this._rateControl.value > 1)
      {
        this._rateControl.setValue(1.0, true);
        this._video.rateChange(this._rate);
      }
      if (this._video.playBackwards())
      {
        this._videoStatus = "playing";
        this._play.removeAttribute("is-paused");
      }
    }
  }

  pause()
  {
    this._ratesAvailable = null;
    this.dispatchEvent(new Event("paused", {composed: true}));
    this._fastForward.removeAttribute("disabled");
    this._rewind.removeAttribute("disabled");
    this._rateControl.setValue(this._rate);
    this.enableRateChange();

    const paused = this.is_paused();
    if (paused == false) {
      this._videoStatus = "paused";
      this._video.pause();
      this._play.setAttribute("is-paused", "")
    }
    this.checkReady();
  }

  refresh() {
    this._video.refresh();
  }

  defaultMode() {
    this._video.style.cursor = "default";
    this._video.defaultMode();
  }

  setRate(val) {
    this._rate = val;
    this._video.rateChange(this._rate);
  }

  setQuality(quality, buffer) {
    // For now reload the video
    if (this.is_paused())
    {
      this._video.setQuality(quality, buffer);
    }
    else
    {
      this.pause();
      this._video.setQuality(quality, buffer);
    }
    this._video.onDemandDownloadPrefetch(this._video.currentFrame());
    this._video.refresh(true);
  }

  zoomPlus() {
    let [x, y, width, height] = this._video._roi;
    width /= 2.0;
    height /= 2.0;
    x += width / 2.0;
    y += height / 2.0;
    this._video.setRoi(x, y, width, height);
    this._video._dirty = true;
    this._video.refresh();
  }

  zoomMinus() {
    let [x, y, width, height] = this._video._roi;
    width *= 2.0;
    height *= 2.0;
    x -= width / 4.0;
    y -= height / 4.0;
    width = Math.min(width, this._video._dims[0]);
    height = Math.min(height, this._video._dims[1]);
    x = Math.max(x, 0);
    y = Math.max(y, 0);
    this._video.setRoi(x, y, width, height);
    this._video._dirty = true;
    this._video.refresh();
  }

  zoomIn() {
    this._video.style.cursor="zoom-in";
    this._video.zoomIn();
  }

  zoomOut() {
    this._video.zoomOut();
  }

  pan() {
    this._video.style.cursor="move";
    this._video.pan();
  }

  // Go to the frame at the highest resolution
  goToFrame(frame) {
    this._video.onPlay();
    return this._video.gotoFrame(frame, true);
  }

  selectNone() {
    this._video.selectNone();
  }

  selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame) {
    this._video.selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame);
  }

  selectTrackUsingId(stateId, stateTypeId, frameHint, skipGoToFrame) {
    this._video.selectTrackUsingId(stateId, stateTypeId, frameHint, skipGoToFrame);
  }

  selectTrack(track, frameHint, skipGoToFrame) {
    this._video.selectTrack(track, frameHint, skipGoToFrame);
  }

  deselectTrack() {
    this._video.deselectTrack();
  }

  addCreateTrackType(stateTypeObj) {
    this._video.addCreateTrackType(stateTypeObj);
  }

  addAlgoLaunchOption(algoName) {
    this._video.addAlgoLaunchOption(algoName);
  }

  addAppletToMenu(appletName, categories) {
    this._video.addAppletToMenu(appletName, categories);
  }

  updateAllLocalizations() {
    this._video.updateAllLocalizations();
  }

  enableFillTrackGapsOption() {
    this._video.enableFillTrackGapsOption();
  }

  toggleBoxFills(fill) {
    this._video.toggleBoxFills(fill);
  }

  toggleTextOverlays(on) {
    this._video.toggleTextOverlays(on);
  }

  safeMode() {
    this._scrubInterval = 1000.0/guiFPS;
    console.info("Entered video safe mode");
    return 0;
  }

  selectTimelineData(data) {
    this._timelineD3.selectData(data);
  }

  _timeToFrame(minutes, seconds) {
    var frame = minutes * 60 * this._fps + seconds * this._fps + 1;
    return frame;
  }

  displayVideoDiagnosticOverlay(display) {
    this._video.updateVideoDiagnosticOverlay(display);
  }

  allowSafeMode(allow) {
    this._video.allowSafeMode = allow;
  }

  getVideoSettings() {

    const seekInfo = this._video.getQuality("seek");
    const scrubInfo = this._video.getQuality("scrub");
    const playInfo = this._video.getQuality("play");

    return {
        seekQuality: seekInfo.quality,
        seekFPS: seekInfo.fps,
        scrubQuality: scrubInfo.quality,
        scrubFPS: scrubInfo.fps,
        playQuality: playInfo.quality,
        playFPS: playInfo.fps,
        focusedQuality: null,
        focusedFPS: null,
        dockedQuality: null,
        dockedFPS: null,
        allowSafeMode: this._allowSafeMode
      };
  }
}

customElements.define("annotation-player", AnnotationPlayer);
