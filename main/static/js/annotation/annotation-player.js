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
    play.setAttribute("is-paused", "");
    playButtons.appendChild(play);

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

    this._slider.addEventListener("input", evt => {
      // Along allow a scrub display as the user is going
      // slow
      const now = Date.now();
      const frame = Number(evt.target.value);
      const waitOk = now - this._lastScrub > this._scrubInterval;
      if (waitOk) {
        this._video.seekFrame(frame, this._video.drawFrame)
        .then(this._lastScrub = Date.now());
      }
    });

    this._slider.addEventListener("change", evt => {
      const frame = Number(evt.target.value);
      this._video.seekFrame(frame, this._video.drawFrame)
      .then(this._lastScrub = Date.now());
    });

    play.addEventListener("click", () => {
      const paused = play.hasAttribute("is-paused");
      if (paused) {
        this._video.rateChange(this._rate);
        this._video.play();
        play.removeAttribute("is-paused");
      } else {
        this._video.pause();
        play.setAttribute("is-paused", "");
      }
    });

    rewind.addEventListener("click", () => {
      this._video.pause();
      this._video.rateChange(this._rate);
      this._video._playCb.forEach(cb => {cb();});
      this._video._playGeneric(Direction.BACKWARDS);
      play.removeAttribute("is-paused");
    });

    fastForward.addEventListener("click", () => {
      this._video.pause();
      this._video.rateChange(2 * this._rate);
      this._video._playCb.forEach(cb => {cb();});
      this._video._playGeneric(Direction.FORWARD);
      play.removeAttribute("is-paused");
    });

    framePrev.addEventListener("click", () => {
      this._video.pause();
      this._video.back();
    });

    frameNext.addEventListener("click", () => {
      this._video.pause();
      this._video.advance();
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

    this._video.addEventListener("safeMode", () => {
      this.safeMode();
    });

    this._timeline.addEventListener("select", evt => {
      this.goToFrame(evt.detail.association.frame);
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
    const dims = [val.width, val.height];
    this._slider.setAttribute("min", 0);
    this._slider.setAttribute("max", val.num_frames);
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
      this._video.loadFromURL(val.url, val.fps, val.num_frames, dims)
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
    this._video.newMetadataItem(dtype, metaMode);
  }

  submitMetadata(data) {
    this._video.submitMetadata(data);
    this._video.refresh();
  }

  updateType(objDescription) {
    this._video.updateType(objDescription);
  }

  refresh() {
    this._video.refresh();
  }

  defaultMode() {
    this._video.defaultMode();
  }

  setRate(val) {
    this._rate = val;
    this._video.rateChange(this._rate);
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
    this._video.zoomIn();
  }

  zoomOut() {
    this._video.zoomOut();
  }

  pan() {
    this._video.pan();
  }

  goToFrame(frame) {
    this._video.onPlay();
    this._video.gotoFrame(frame);
  }

  selectNone() {
    this._video.selectNone();
  }

  selectLocalization(loc) {
    this._video.selectLocalization(loc);
  }

  selectTrack(track) {
    this._video.selectTrack(track);
  }

  safeMode() {
    guiFPS=15;
    this._video.rateChange(this._fps/guiFPS);
    this._scrubInterval = 1000.0/guiFPS;
    console.info("Entered video safe mode");
    return 0;
  }

  drawTimeline(typeId) {
    this._timeline.draw(typeId);
  }

  _frameToTime(frame) {
    const totalSeconds = frame / this._fps;
    const seconds = Math.round(totalSeconds % 60);
    const secFormatted = ("0" + seconds).slice(-2);
    const minutes = Math.floor(totalSeconds / 60);
    return minutes + ":" + secFormatted;
  }
}

customElements.define("annotation-player", AnnotationPlayer);
