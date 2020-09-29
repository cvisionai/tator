class AnnotationMulti extends TatorElement {
  constructor() {
    super();

    this._playerDiv = document.createElement("div");
    this._playerDiv.setAttribute("class", "annotation__video-player d-flex flex-column rounded-bottom-2");
    this._shadow.appendChild(this._playerDiv);

    this._vidDiv = document.createElement("div");
    this._vidDiv.setAttribute("class", "annotation__multi-player d-flex flex-row rounded-bottom-2");
    this._playerDiv.appendChild(this._vidDiv);

    const div = document.createElement("div");
    div.setAttribute("class", "video__controls d-flex flex-items-center flex-justify-between px-4");
    this._playerDiv.appendChild(div);
    this._controls = div;

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
    timelineDiv.setAttribute("class", "d-flex flex-items-center flex-grow px-2");
    div.appendChild(timelineDiv);

    const timeDiv = document.createElement("div");
    timeDiv.style.display = "flex";
    timelineDiv.appendChild(timeDiv);

    this._currentTime = document.createElement("div");
    this._currentTime.textContent = "0:00";
    this._currentTime.style.width = "35px";
    //currentTime.style.float = "right";
    timeDiv.appendChild(this._currentTime);

    this._totalTime = document.createElement("div");
    this._totalTime.setAttribute("class", "px-2 text-gray");
    this._totalTime.textContent = "/ 0:00";
    timeDiv.appendChild(this._totalTime);

    var outerDiv = document.createElement("div");
    outerDiv.style.width="100%";
    var seekDiv = document.createElement("div");
    this._slider = document.createElement("seek-bar");

    this._domParents = []; //handle defered loading of video element
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

    this._currentFrame = document.createElement("div");
    this._currentFrame.setAttribute("class", "f2 text-center");
    this._currentFrame.textContent = "0";
    this._currentFrame.style.width = "15px";
    frameDiv.appendChild(this._currentFrame);

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
        for (let video of this._videos)
        {
          video.stopPlayerThread();
          video.seekFrame(frame, video.drawFrame)
            .then(this._lastScrub = Date.now());
        }
      }
    });

    this._slider.addEventListener("change", evt => {
      play.setAttribute("is-paused","");
      // Only use the current frame to prevent glitches
      let frame = this._videos[0].currentFrame();
      if (evt.detail)
      {
        frame = evt.detail.frame;
      }

      for (let video of this._videos)
      {
        video.stopPlayerThread();
        // Use the hq buffer when the input is finalized
        video.seekFrame(frame, video.drawFrame, true)
          .then(this._lastScrub = Date.now());
      }
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
      for (let video of this._videos)
      {
        video.pause();
        video.rateChange(2 * this._rate);
      }
      this.play();
    });

    framePrev.addEventListener("click", () => {
      for (let video of this._videos)
      {
        if (this.is_paused() == false)
        {
          video.pause().then(() => {
            video.back();
          });
        }
        else
        {
          video.back();
        }
      }
    });

    frameNext.addEventListener("click", () => {
      for (let video of this._videos)
      {
        if (this.is_paused() == false)
        {
          video.pause().then(() => {
            video.advance();
          });
        }
        else
        {
          video.advance();
        }
      }
    });

    /*

    */

    this._timeline.addEventListener("select", evt => {
      this.goToFrame(evt.detail.frame);
    });

    fullscreen.addEventListener("click", evt => {
      if (fullscreen.hasAttribute("is-maximized")) {
        fullscreen.removeAttribute("is-maximized");
        this._playerDiv.classList.remove("is-full-screen");
        this.dispatchEvent(new Event("minimize", {composed: true}));
      } else {
        fullscreen.setAttribute("is-maximized", "");
        this._playerDiv.classList.add("is-full-screen");
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
    for (let video of this._videos)
    {
      video.permission = val;
    }
    this._permission = val;
  }

  addDomParent(val)
  {
    this._domParents.push(val);
  }

  set undoBuffer(val) {
    this._undoBuffer = val;
    for (let video of this._videos)
    {
      video.undoBuffer = val;
    }
  }

  set mediaInfo(val) {
    this._mediaInfo = val;

    this._videos = []

    this._multi_layout = val.media_files['layout'];
    if (val.media_files.quality)
    {
      this._quality = val.media_files.quality;
    }
    const video_count = this._multi_layout[0] * this._multi_layout[1];

    if (video_count != val.media_files['ids'].length)
    {
      window.alert("Invalid object");
    }


    // Functor to normalize the
    let global_progress = new Array(video_count).fill(0);
    let handle_buffer_load = (vid_idx,evt) =>
        {
          global_progress[vid_idx] = evt.detail.percent_complete;
          let fakeEvt = {
            detail: {
              percent_complete:Math.min(...global_progress)
            }
          };
          this._slider.onBufferLoaded(fakeEvt);
        };
    let setup_video = (idx, video_info) => {
      this._slider.setAttribute("min", 0);

      if (idx == 0)
      {
        let prime = this._videos[idx];
        this._slider.setAttribute("max", Number(video_info.num_frames)-1);
        this._fps = video_info.fps;
        this._totalTime.textContent = "/ " + this._frameToTime(video_info.num_frames);
        this._totalTime.style.width = 10 * (this._totalTime.textContent.length - 1) + 5 + "px";
        this.parent._browser.canvas = prime;
        prime.addEventListener("frameChange", evt => {
             const frame = evt.detail.frame;
             this._slider.value = frame;
             const time = this._frameToTime(frame);
             this._currentTime.textContent = time;
             this._currentFrame.textContent = frame;
             this._currentTime.style.width = 10 * (time.length - 1) + 5 + "px";
             this._currentFrame.style.width = (15 * String(frame).length) + "px";
           });

        prime.addEventListener("playbackEnded", evt => {
          this.pause();
        });

        prime.addEventListener("safeMode", () => {
          this.safeMode();
        });
      }
      this._videos[idx].addEventListener("bufferLoaded",
                             (evt) => {
                               handle_buffer_load(idx,evt);
                             });
      this._videos[idx].loadFromVideoObject(video_info, this._quality)
      this.parent._getMetadataTypes(this, this._videos[idx]._canvas, idx != 0, video_info.id);
      // Mute multi-video
      this._videos[idx].setVolume(0);

      if (this._permission)
      {
        this._videos[idx].permission = this._permission;
      }
      if (this._undoBuffer)
      {
        this._videos[idx].undoBuffer = this._undoBuffer;
      }
    };

    let video_resp = [];
    let multi_container = document.createElement("div");
    multi_container.style.display = "grid";
    multi_container.style.gridTemplateColumns =
      "auto ".repeat(this._multi_layout[1]);
    multi_container.style.gridTemplateRows =
      "auto ".repeat(this._multi_layout[0]);
    this._vidDiv.appendChild(multi_container);
    let idx = 0;
    for (const vid_id of val.media_files['ids'])
    {
      let roi_vid = document.createElement("video-canvas");
      roi_vid.style.gridColumn = (idx % this._multi_layout[1])+1;
      roi_vid.style.gridRow = Math.floor(idx / this._multi_layout[1])+1;

      this._videos.push(roi_vid);
      roi_vid.domParents.push({"object":this});
      multi_container.appendChild(roi_vid);
      video_resp.push(fetch(`/rest/Media/${vid_id}`));
      idx += 1;
    }
    let video_info = [];
    Promise.all(video_resp).then((values) => {
      for (let resp of values)
      {
        video_info.push(resp.json());
      }
      Promise.all(video_info).then((info) => {
        for (let idx = 0; idx < video_info.length; idx++)
        {
          setup_video(idx, info[idx]);
        }
        this.dispatchEvent(new Event("canvasReady", {
          composed: true
        }));
      });
    });

    // Audio for multi might get fun...
    // Hide volume on videos with no audio
    this._volume_control.style.display = "none";
  }

  set annotationData(val) {
    for (let video of this._videos)
    {
      video.annotationData = val;
    }
    this._timeline.annotationData = val;
  }

  newMetadataItem(dtype, metaMode, objId) {
    for (let video of this._videos)
    {
      video.style.cursor = "crosshair";
      video.newMetadataItem(dtype, metaMode, objId);
    }
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
      let playing = false;
      for (let video of this._videos)
      {
        video.rateChange(this._rate);
        playing |= video.play();
      }
      if (playing)
      {
        this._play.removeAttribute("is-paused");
      }
    }
  }

  pause()
  {
    const paused = this.is_paused();
    if (paused == false) {
      for (let video of this._videos)
      {
        video.pause();
      }
      this._play.setAttribute("is-paused", "")
    }
  }

  refresh() {
    for (let video of this._videos)
    {
      video.refresh();
    }
  }

  defaultMode() {
    for (let video of this._videos)
    {
      video.style.cursor = "default";
      video.defaultMode();
    }
  }

  setRate(val) {
    this._rate = val;
    for (let video of this._videos)
    {
        video.rateChange(this._rate);
    }
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
    for (let video of this._videos)
    {
      let [x, y, width, height] = video._roi;
      width /= 2.0;
      height /= 2.0;
      x += width / 2.0;
      y += height / 2.0;
      video.setRoi(x, y, width, height);
      video._dirty = true;
      video.refresh();
    }
  }

  zoomMinus() {
    for (let video of this._videos)
    {
      let [x, y, width, height] = video._roi;
      width *= 2.0;
      height *= 2.0;
      x -= width / 4.0;
      y -= height / 4.0;
      width = Math.min(width, video._dims[0]);
      height = Math.min(height, video._dims[1]);
      x = Math.max(x, 0);
      y = Math.max(y, 0);
      video.setRoi(x, y, width, height);
      video._dirty = true;
      video.refresh();
    }
  }

  zoomIn() {
    for (let video of this._videos)
    {
      video.style.cursor="zoom-in";
      video.zoomIn();
    }
  }

  zoomOut() {
    for (let video of this._videos)
    {
      video.zoomOut();
    }
  }

  pan() {
    for (let video of this._videos)
    {
      video.style.cursor="move";
      video.pan();
    }
  }

  // Go to the frame at the highest resolution
  goToFrame(frame) {
    p_list=[];
    for (let video of this._videos)
    {
      video.onPlay();
      p_list.push(video.gotoFrame(frame, true));
    }
    return Promise.all(p_list);
  }

  selectNone() {
    for (let video of this._videos)
    {
      video.selectNone();
    }
  }

  selectLocalization(loc) {
    this._video.selectLocalization(loc);
  }

  selectTrack(track, frameHint) {
    this._video.selectTrack(track, frameHint);
  }

  deselectTrack() {
    for (let video of this._videos)
    {
      video.deselectTrack();
    }
  }

  toggleBoxFills(fill) {
    for (let video of this._videos)
    {
      video.toggleBoxFills(fill);
    }
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

customElements.define("annotation-multi", AnnotationMulti);
