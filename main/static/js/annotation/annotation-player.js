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

    const playButtons = document.createElement("div");
    playButtons.setAttribute("class", "d-flex flex-items-center");
    div.appendChild(playButtons);

    const rewind = document.createElement("rewind-button");
    playButtons.appendChild(rewind);

    const play = document.createElement("play-button");
    this._play = play;
    this._play.setAttribute("is-paused", "");
    playButtons.appendChild(this._play);

    const fastForward = document.createElement("fast-forward-button");
    playButtons.appendChild(fastForward);

    const timelineDiv = document.createElement("div");
    timelineDiv.setAttribute("class", "d-flex flex-items-center flex-grow px-4");
    div.appendChild(timelineDiv);

    const timeDiv = document.createElement("div");
    timeDiv.style.display = "flex";
    timelineDiv.appendChild(timeDiv);

    const currentTime = document.createElement("div");
    currentTime.textContent = "0:00";
    currentTime.style.width = "35px";
    //currentTime.style.float = "right";
    timeDiv.appendChild(currentTime);

    this._totalTime = document.createElement("div");
    this._totalTime.setAttribute("class", "px-2 text-gray");
    this._totalTime.textContent = "/ 0:00";
    timeDiv.appendChild(this._totalTime);

    var outerDiv = document.createElement("div");
    outerDiv.style.width="100%";
    var seekDiv = document.createElement("div");
    this._slider = document.createElement("seek-bar");
    this._video.addEventListener("bufferLoaded",
                               this._slider.onBufferLoaded.bind(this._slider));
    seekDiv.appendChild(this._slider);
    outerDiv.appendChild(seekDiv);

    var innerDiv = document.createElement("div");
    this._timeline = document.createElement("timeline-canvas");
    this._timeline.rangeInput = this._slider;
    innerDiv.appendChild(this._timeline);
    outerDiv.appendChild(innerDiv);
    timelineDiv.appendChild(outerDiv);

    const frameDiv = document.createElement("div");
    frameDiv.style.display = "flex";
    timelineDiv.appendChild(frameDiv);
    const framePrev = document.createElement("frame-prev");
    frameDiv.appendChild(framePrev);

    const currentFrame = document.createElement("div");
    currentFrame.setAttribute("class", "f2 text-center");
    currentFrame.textContent = "0";
    currentFrame.style.width = "15px";
    frameDiv.appendChild(currentFrame);

    const frameNext = document.createElement("frame-next");
    frameDiv.appendChild(frameNext);

    const fullscreen = document.createElement("video-fullscreen");
    div.appendChild(fullscreen);

    this._scrubInterval = 1000.0/Math.min(guiFPS,30);
    this._lastScrub = Date.now();
    this._rate = 1;

    const searchParams = new URLSearchParams(window.location.search);
    this._quality = 720;
    if (searchParams.has("quality"))
    {
      this._quality = Number(searchParams.get("quality"));
    }
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
      // Only use the current frame to prevent glitches
      let frame = this._video.currentFrame();
      if (evt.detail)
      {
        frame = evt.detail.frame;
      }
      this._video.stopPlayerThread();
      // Use the hq buffer when the input is finalized
      this._video.seekFrame(frame, this._video.drawFrame, true)
      .then(this._lastScrub = Date.now());
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
      this._video.pause();
      this._video.rateChange(this._rate);
      if (this._video.playBackwards())
      {
        play.removeAttribute("is-paused");
      }
    });

    fastForward.addEventListener("click", () => {
      this._video.pause();
      this._video.rateChange(2 * this._rate);
      if (this._video.play())
      {
        play.removeAttribute("is-paused");
      }
    });

    framePrev.addEventListener("click", () => {
      if (this.is_paused() == false)
      {
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
        this._video.pause().then(() => {
          this._video.advance();
        });
      }
      else
      {
        this._video.advance();
      }
    });

    this._video.addEventListener("frameChange", evt => {
      const frame = evt.detail.frame;
      this._slider.value = frame;
      const time = this._frameToTime(frame);
      currentTime.textContent = time;
      currentFrame.textContent = frame;
      currentTime.style.width = 10 * (time.length - 1) + 5 + "px";
      currentFrame.style.width = (15 * String(frame).length) + "px";
    });

    this._video.addEventListener("playbackEnded", evt => {
      this.pause();
    });

    this._video.addEventListener("safeMode", () => {
      this.safeMode();
    });

    this._timeline.addEventListener("select", evt => {
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

    document.addEventListener("keydown", evt => {
      if (evt.ctrlKey && (evt.key == "m")) {
        fullscreen.click();
      }
    });
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
    // Have to wait for canvas to draw.
    new Promise(async resolve => {
      while (true) {
        if (this._video._canvas.clientHeight > 0) {
          break;
        }
        await new Promise(res => setTimeout(res, 10));
      }
      this._video.loadFromVideoObject(val, this._quality)
      .then(() => {
        this.dispatchEvent(new Event("canvasReady", {
            composed: true
        }));
      });
    });
  }

  set annotationData(val) {
    this._video.annotationData = val;
    this._timeline.annotationData = val;
  }

  newMetadataItem(dtype, metaMode) {
    this._video.style.cursor = "crosshair";
    this._video.newMetadataItem(dtype, metaMode);
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
    const paused = this.is_paused();
    if (paused) {
      this._video.rateChange(this._rate);
      if (this._video.play())
      {
        this._play.removeAttribute("is-paused");
      }
    }
  }

  pause()
  {
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

  setQuality(quality) {
    // For now reload the video
    if (this.is_paused())
    {
      this._video.setQuality(quality);
    }
    else
    {
      this.pause();
      this._video.setQuality(quality);
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

  goToFrame(frame) {
    this._video.onPlay();
    return this._video.gotoFrame(frame);
  }

  selectNone() {
    this._video.selectNone();
  }

  selectLocalization(loc) {
    this._video.selectLocalization(loc);
  }

  selectTrack(track, frameHint) {
    this._video.selectTrack(track, frameHint);
  }

  safeMode() {
    this._scrubInterval = 1000.0/guiFPS;
    console.info("Entered video safe mode");
    return 0;
  }

  drawTimeline(typeId) {
    this._timeline.draw(typeId);
  }

  _frameToTime(frame) {
    const totalSeconds = frame / this._fps;
    const seconds = Math.floor(totalSeconds % 60);
    const secFormatted = ("0" + seconds).slice(-2);
    const minutes = Math.floor(totalSeconds / 60);
    return minutes + ":" + secFormatted;
  }
}

customElements.define("annotation-player", AnnotationPlayer);
