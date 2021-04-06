class AnnotationPlayer extends TatorElement {
  constructor() {
    super();

    const playerDiv = document.createElement("div");
    playerDiv.setAttribute("class", "annotation__video-player d-flex flex-column rounded-bottom-2");
    this._shadow.appendChild(playerDiv);

    this._video = document.createElement("video-canvas");
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

    const timelineDiv = document.createElement("div");
    timelineDiv.setAttribute("class", "d-flex flex-items-center flex-grow px-2");
    div.appendChild(timelineDiv);

    const timeDiv = document.createElement("div");
    timeDiv.setAttribute("class", "d-flex flex-items-center flex-justify-between");
    timelineDiv.appendChild(timeDiv);

    this._currentTimeInput = document.createElement("input");
    this._currentTimeInput.setAttribute("class", "form-control input-sm1 f2 text-center");
    this._currentTimeInput.setAttribute("type", "text");
    this._currentTimeInput.style.display = "none";
    this._currentTimeInput.style.width = "100px";
    timeDiv.appendChild(this._currentTimeInput);

    this._currentTimeText = document.createElement("div");
    this._currentTimeText.textContent = "0:00";
    this._currentTimeText.style.width = "35px";
    timeDiv.appendChild(this._currentTimeText);

    this._totalTime = document.createElement("div");
    this._totalTime.setAttribute("class", "px-2 text-gray");
    this._totalTime.textContent = "/ 0:00";
    timeDiv.appendChild(this._totalTime);

    this._timelineMore = document.createElement("entity-more");
    this._timelineMore.style.display = "block";
    timelineDiv.appendChild(this._timelineMore);
    this._displayTimelineLabels = false;

    var outerDiv = document.createElement("div");
    outerDiv.setAttribute("class", "py-4");
    outerDiv.style.width="100%";
    var seekDiv = document.createElement("div");
    this._slider = document.createElement("seek-bar");
    this._video.addEventListener("bufferLoaded",
                               this._slider.onBufferLoaded.bind(this._slider));
    seekDiv.appendChild(this._slider);
    outerDiv.appendChild(seekDiv);

    var innerDiv = document.createElement("div");
    this._timelineD3 = document.createElement("timeline-d3");
    this._timelineD3.rangeInput = this._slider;
    innerDiv.appendChild(this._timelineD3);
    outerDiv.appendChild(innerDiv);
    timelineDiv.appendChild(outerDiv);

    const frameDiv = document.createElement("div");
    frameDiv.setAttribute("class", "d-flex flex-items-center flex-justify-between");
    timelineDiv.appendChild(frameDiv);

    const framePrev = document.createElement("frame-prev");
    frameDiv.appendChild(framePrev);

    const currentFrameWrapper = document.createElement("div");
    frameDiv.appendChild(currentFrameWrapper);

    this._currentFrameInput = document.createElement("input");
    this._currentFrameInput.setAttribute("class", "form-control input-sm1 f2 text-center");
    this._currentFrameInput.setAttribute("type", "text");
    this._currentFrameInput.style.display = "none";
    this._currentFrameInput.style.width = "100px";
    frameDiv.appendChild(this._currentFrameInput);

    this._currentFrameText = document.createElement("div");
    this._currentFrameText.setAttribute("class", "f2 text-center");
    this._currentFrameText.textContent = "0";
    this._currentFrameText.style.minWidth = "15px";
    currentFrameWrapper.appendChild(this._currentFrameText);

    const frameNext = document.createElement("frame-next");
    frameDiv.appendChild(frameNext);

    this._volume_control = document.createElement("volume-control");
    div.appendChild(this._volume_control);
    this._volume_control.addEventListener("volumeChange", (evt) => {
      this._video.setVolume(evt.detail.volume);
    });
    const fullscreen = document.createElement("video-fullscreen");
    div.appendChild(fullscreen);

    this._scrubInterval = 1000.0/Math.min(guiFPS,30);
    this._lastScrub = Date.now();
    this._rate = 1;

     // Magic number matching standard header + footer
     // #TODO This should be re-thought and more flexible initially
    this._videoHeightPadObject = {height: 210};
    this._headerFooterPad = 100; // Another magic number based on the header and padding below controls footer

    const searchParams = new URLSearchParams(window.location.search);
    this._quality = 720;
    if (searchParams.has("quality"))
    {
      this._quality = Number(searchParams.get("quality"));
    }

    this._timelineMore.addEventListener("click", () => {
      this._displayTimelineLabels = !this._displayTimelineLabels;
      this._timelineD3.showFocus(this._displayTimelineLabels);
      this._videoHeightPadObject.height = this._headerFooterPad + this._controls.offsetHeight;
      window.dispatchEvent(new Event("resize"));
    });

    this._slider.addEventListener("input", evt => {
      // Along allow a scrub display as the user is going
      // slow
      const now = Date.now();
      const frame = Number(evt.target.value);
      const waitOk = now - this._lastScrub > this._scrubInterval;
      if (waitOk) {
        play.setAttribute("is-paused","");
        this._video.stopPlayerThread();
        this._video.seekFrame(frame, this._video.drawFrame)
        .then(this._lastScrub = Date.now());
      }
    });

    this._slider.addEventListener("change", evt => {
      play.setAttribute("is-paused","");
      this.dispatchEvent(new Event("displayLoading", {composed: true}));
      // Only use the current frame to prevent glitches
      let frame = this._video.currentFrame();
      if (evt.detail)
      {
        frame = evt.detail.frame;
      }
      this._video.stopPlayerThread();

      // Use the hq buffer when the input is finalized
      this._video.seekFrame(frame, this._video.drawFrame, true).then(() => {
        this._lastScrub = Date.now()
        this.dispatchEvent(new Event("hideLoading", {composed: true}));
      }).catch(() => {
        this.dispatchEvent(new Event("hideLoading", {composed: true}));
      });
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
      const time = this._frameToTime(frame);
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

    this._timelineD3.addEventListener("graphData", evt => {
      if (evt.detail.numericalData.length > 0 || evt.detail.stateData.length > 0) {
        this._timelineMore.style.display = "block";
      }
      else {
        this._timelineMore.style.display = "none";
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

    document.addEventListener("keydown", evt => {

      if (document.body.classList.contains("shortcuts-disabled"))
      {
        return;
      }

      if (evt.ctrlKey && (evt.key == "m")) {
        fullscreen.click();
      }
      else if (evt.code == "Space")
      {
        evt.preventDefault();
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
        if (this.is_paused())
        {
          this.playBackwards();
        }
      }
    });
  }

  /**
   * Process the frame input text field and attempts to jump to that frame
   */
  processFrameInput() {

    var frame = parseInt(this._currentFrameInput.value);
    if (isNaN(frame)) {
      console.log("Provided invalid frame input: " + this._currentFrameInput.value);
      this._currentFrameInput.classList.add("has-border");
      this._currentFrameInput.classList.add("is-invalid");
      return;
    }

    const maxFrame = this._mediaInfo.num_frames - 1;
    if (frame > maxFrame)
    {
      frame = maxFrame;
    }
    else if (frame < 0)
    {
      frame = 0;
    }

    this._currentFrameInput.classList.remove("has-border");
    this._currentFrameInput.classList.remove("is-invalid");
    this.goToFrame(frame);
  }

  /**
   * Process the time input text field and attempts to jump to the corresponding frame
   */
  processTimeInput() {

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
    this._fps = val.fps;
    this._totalTime.textContent = "/ " + this._frameToTime(val.num_frames);
    this._totalTime.style.width = 10 * (this._totalTime.textContent.length - 1) + 5 + "px";
    this._video.loadFromVideoObject(val, this.mediaType, this._quality, null, null, null, this._videoHeightPadObject)
      .then(() => {
        const seekInfo = this._video.getQuality("seek");
        const scrubInfo = this._video.getQuality("scrub");
        const playInfo = this._video.getQuality("play");

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
          }
        }));

        this.dispatchEvent(new Event("canvasReady", {
          composed: true
        }));
      });
    if (this._video.audio != true)
    {
      // Hide volume on videos with no audio
      this._volume_control.style.display = "none";
    }
    this._volume_control.volume = this.mediaType['default_volume'];
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

  play()
  {
    if (this._rate > 1.0)
    {
      // Check to see if the video player can play at this rate
      // at the current frame. If not, inform the user.
      if (!this._video.canPlayRate(this._rate))
      {
        window.alert("Please wait until this portion of the video has been downloaded. Playing at speeds greater than 1x require the video to be buffered.")
        return;
      }
    }

    this.dispatchEvent(new Event("playing", {composed: true}));
    this._fastForward.setAttribute("disabled", "");
    this._rewind.setAttribute("disabled", "");

    const paused = this.is_paused();
    if (paused) {
      this._video.rateChange(this._rate);
      if (this._video.play())
      {
        this._play.removeAttribute("is-paused");
      }
    }
  }

  playBackwards()
  {
    this.dispatchEvent(new Event("playing", {composed: true}));
    this._fastForward.setAttribute("disabled", "");
    this._rewind.setAttribute("disabled", "");

    this._video.pause();
    this._video.rateChange(this._rate);
    if (this._video.playBackwards())
    {
      this._play.removeAttribute("is-paused");
    }
  }

  pause()
  {
    this.dispatchEvent(new Event("paused", {composed: true}));
    this._fastForward.removeAttribute("disabled");
    this._rewind.removeAttribute("disabled");

    const paused = this.is_paused();
    if (paused == false) {
      this._video.pause();
      this._play.setAttribute("is-paused", "")
    }
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

  _frameToTime(frame) {
    const totalSeconds = frame / this._fps;
    const seconds = Math.floor(totalSeconds % 60);
    const secFormatted = ("0" + seconds).slice(-2);
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60)
    {
      return minutes + ":" + secFormatted;
    }
    else
    {
      let hours = Math.floor(minutes / 60)
      const minFormatted = ("0" + Math.floor(minutes % 60)).slice(-2);
      return hours + ":" + minFormatted + ":" + secFormatted;
    }
  }

  _timeToFrame(minutes, seconds) {
    var frame = minutes * 60 * this._fps + seconds * this._fps + 1;
    return frame;
  }

  displayVideoDiagnosticOverlay(display) {
    this._video.updateVideoDiagnosticOverlay(display);
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
      };
  }
}

customElements.define("annotation-player", AnnotationPlayer);
