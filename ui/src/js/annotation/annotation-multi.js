import { TatorElement } from "../components/tator-element.js";
import { Utilities } from "../util/utilities.js";
import { guiFPS } from "../annotator/video.js";
import { MultiRenderer } from "../annotator/multi-renderer";
import { RATE_CUTOFF_FOR_ON_DEMAND } from "../annotator/video.js";
import { handle_video_error, handle_decoder_error, frameToTime, PlayInteraction } from "./annotation-common.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { TimeStore } from "./time-store.js"

let MAGIC_PAD = 5; // if videos are failing at the end jump back this number of frames

export class AnnotationMulti extends TatorElement {
  constructor() {
    super();

    window.tator_multi = this;

    const playerDiv = document.createElement("div");
    playerDiv.setAttribute("class", "annotation__multi-player rounded-bottom-2");
    this._shadow.appendChild(playerDiv);

    this._vidDiv = document.createElement("div");
    playerDiv.appendChild(this._vidDiv);

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
    this._timelineZoomMenu = document.createElement("div");
    this._timelineZoomMenu.setAttribute("class", "annotation-canvas-overlay-menu d-flex flex-row flex-items-center flex-justify-between rounded-1");
    this._timelineZoomMenu.style.display = "none";
    this._shadow.appendChild(this._timelineZoomMenu);

    this._timelineZoomButtons = {
      panLeft: null,
      panRight: null,
      zoomIn: null,
      zoomOut: null,
      reset: null
    }
    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
      "Pan Timeline Left",
      "pan-timeline-left-btn"
    );
    this._timelineZoomMenu.appendChild(btn);
    this._timelineZoomButtons.panLeft = btn;
    btn.addEventListener("click", () => {
      if (this._videoMode == "play") {
        this._videoTimeline.panLeft();
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
      "Pan Timeline Right",
      "pan-timeline-right-btn"
    );
    this._timelineZoomMenu.appendChild(btn);
    this._timelineZoomButtons.panRight = btn;
    btn.addEventListener("click", () => {
      if (this._videoMode == "play") {
        this._videoTimeline.panRight();
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`,
      "Zoom Timeline In",
      "zoom-timeline-in-btn"
    );
    this._timelineZoomMenu.appendChild(btn);
    this._timelineZoomButtons.zoomIn = btn;
    btn.addEventListener("click", () => {
      if (this._videoMode == "play") {
        this._videoTimeline.zoomIn();
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`,
      "Zoom Timeline Out",
      "zoom-timeline-out-btn"
    );
    this._timelineZoomMenu.appendChild(btn);
    this._timelineZoomButtons.zoomOut = btn;
    btn.addEventListener("click", () => {
      if (this._videoMode == "play") {
        this._videoTimeline.zoomOut();
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"  stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M21 21l-6 -6" />
        <path d="M3.268 12.043a7.017 7.017 0 0 0 6.634 4.957a7.012 7.012 0 0 0 7.043 -6.131a7 7 0 0 0 -5.314 -7.672a7.021 7.021 0 0 0 -8.241 4.403" />
        <path d="M3 4v4h4" />
      </svg>`,
      "Reset Timeline",
      "reset-timeline-btn"
    );
    this._timelineZoomMenu.appendChild(btn);
    this._timelineZoomButtons.reset = btn;
    btn.addEventListener("click", () => {
      if (this._videoMode == "play") {
        this._videoTimeline.resetZoom();
      }
    });

    this._rateControl = document.createElement("rate-control");
    settingsDiv.appendChild(this._rateControl);
    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`,
      "Zoom Timeline Controls",
      "zoom-timeline-controls-btn"
    );
    btn._button.classList.remove("px-2");
    settingsDiv.appendChild(btn);
    this._videoTimelineControlsBtn = btn;
    btn.addEventListener("click", () => {
      btn.blur();
      var pos = this._videoTimelineControlsBtn.getBoundingClientRect();
      this._timelineZoomMenu.style.top = `${pos.top - 60}px`;
      this._timelineZoomMenu.style.left = `${pos.left - 115}px`;
      if (this._timelineZoomMenu.style.display == "flex") {
        this._hideCanvasMenus();
      }
      else {
        this._hideCanvasMenus();
        this._timelineZoomMenu.style.display = "flex";
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"  stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <line x1="4" y1="19" x2="20" y2="19" />
        <polyline points="4 15 8 9 12 11 16 6 20 10" />
      </svg>`,
      "Entity Timeline Info",
      "entity-timeline-expand-btn"
    );
    btn._button.classList.remove("px-2");
    settingsDiv.appendChild(btn);
    this._timelineMore = btn;

    //
    // Player settings menu:
    //   Timeline Units >
    //   Quality >
    //   Playback Settings
    //
    this._playerSettingsMenu = document.createElement("div");
    this._playerSettingsMenu.setAttribute("class", "annotation-canvas-overlay-menu d-flex flex-column rounded-1");
    this._playerSettingsMenu.style.display = "none";
    this._shadow.appendChild(this._playerSettingsMenu);

    this._timelineUnitsMenu = document.createElement("div");
    this._timelineUnitsMenu.setAttribute("class", "annotation-canvas-overlay-menu d-flex flex-column rounded-1");
    this._timelineUnitsMenu.style.display = "none";
    this._shadow.appendChild(this._timelineUnitsMenu);

    this._videoQualityMenu = document.createElement("div");
    this._videoQualityMenu.setAttribute("class", "annotation-canvas-overlay-menu d-flex flex-column rounded-1");
    this._videoQualityMenu.style.display = "none";
    this._shadow.appendChild(this._videoQualityMenu);

    // Video settings menu
    this._playerTimelineUnits = document.createElement("div");
    this._playerTimelineUnits.setAttribute("class", "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    this._playerTimelineUnits.textContent = "Timeline Units";
    this._playerSettingsMenu.appendChild(this._playerTimelineUnits);

    this._playerTimelineUnits.addEventListener("click", () => {
      this._displayTimelineUnitsMenu();
    });

    this._playerTimelineUnitsContent = document.createElement("div");
    this._playerTimelineUnitsContent.setAttribute("class", "f3 text-purple text-semibold text-uppercase d-flex flex-grow px-2 flex-justify-right");
    this._playerTimelineUnitsContent.textContent = "";
    this._playerTimelineUnits.appendChild(this._playerTimelineUnitsContent);

    var rightArrow = document.createElement("div");
    rightArrow.textContent = ">"
    this._playerTimelineUnits.appendChild(rightArrow);

    this._playerQuality = document.createElement("div");
    this._playerQuality.setAttribute("class", "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    this._playerQuality.textContent = "Quality";
    this._playerSettingsMenu.appendChild(this._playerQuality);

    this._playerQuality.addEventListener("click", () => {
      this._displayQualityMenu();
    });

    this._playerQualityContent  = document.createElement("div");
    this._playerQualityContent.setAttribute("class", "f3 text-purple text-semibold text-uppercase d-flex flex-grow px-2 flex-justify-right");
    this._playerQualityContent.textContent = "";
    this._playerQuality.appendChild(this._playerQualityContent);

    var rightArrow = document.createElement("div");
    rightArrow.textContent = ">"
    this._playerQuality.appendChild(rightArrow);

    this._playerPlaybackSettings = document.createElement("div");
    this._playerPlaybackSettings.setAttribute("class", "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2");
    this._playerPlaybackSettings.textContent = "Playback Settings";
    this._playerSettingsMenu.appendChild(this._playerPlaybackSettings);

    this._playerPlaybackSettings.addEventListener("click", () => {
      this._hideCanvasMenus();
      this.dispatchEvent(new CustomEvent("openVideoSettings", {
        composed: true
      }));
    });

    // Timeline units menu
    var backOption = document.createElement("div");
    backOption.setAttribute("class", "annotation-canvas-overlay-menu-back annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    backOption.textContent = "< Back";
    this._timelineUnitsMenu.appendChild(backOption);
    backOption.addEventListener("click", () => {
      this._displayPlayerSettingsMenu();
    });

    this._timelineUnitsFrame = document.createElement("div");
    this._timelineUnitsFrame.setAttribute("class", "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    this._timelineUnitsFrame.textContent = "Frame";
    this._timelineUnitsMenu.appendChild(this._timelineUnitsFrame);

    this._timelineUnitsFrame.addEventListener("click", () => {
      this._setTimelineDisplayMode("frame");
    });

    this._timelineUnitsRelativeTime = document.createElement("div");
    this._timelineUnitsRelativeTime.setAttribute("class", "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    this._timelineUnitsRelativeTime.textContent = "Relative Time";
    this._timelineUnitsMenu.appendChild(this._timelineUnitsRelativeTime);

    this._timelineUnitsRelativeTime.addEventListener("click", () => {
      this._setTimelineDisplayMode("relativeTime");
    });

    this._timelineUnitsUTC = document.createElement("div");
    this._timelineUnitsUTC.setAttribute("class", "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    this._timelineUnitsUTC.textContent = "UTC Time";
    this._timelineUnitsMenu.appendChild(this._timelineUnitsUTC);

    this._timelineUnitsUTC.addEventListener("click", () => {
      this._setTimelineDisplayMode("utc");
    });

    // Video quality menu
    var backOption = document.createElement("div");
    backOption.setAttribute("class", "annotation-canvas-overlay-menu-back annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    backOption.textContent = "< Back";
    this._videoQualityMenu.appendChild(backOption);
    backOption.addEventListener("click", () => {
      this._displayPlayerSettingsMenu();
    });

    var wrapper = document.createElement("div");
    wrapper.setAttribute("class", "f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center");
    wrapper.textContent = "Playback Quality";
    this._videoQualityMenu.appendChild(wrapper);

    this._qualityControl = document.createElement("quality-control");    this._qualityControl._advancedSettings.style.display = "none";
    this._qualityControl.setAttribute("class", "px-2");
    wrapper.appendChild(this._qualityControl);

    // Main button
    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      "Player Settings",
      "player-settings-btn"
    );
    btn._button.classList.remove("px-2");
    settingsDiv.appendChild(btn);
    this._playerSettingsBtn = btn;

    this._playerSettingsBtn.addEventListener("click", () => {
      this._playerSettingsBtn.blur();
      if (this._playerSettingsMenu.style.display == "flex") {
        this._hideCanvasMenus();
      }
      else {
        this._displayPlayerSettingsMenu();
      }
    });

    //
    // Timeline div
    //
    const timelineDiv = document.createElement("div");
    timelineDiv.setAttribute("class", "scrub__bar d-flex flex-items-center flex-grow px-4");
    playerDiv.appendChild(timelineDiv);
    this._timelineDiv = timelineDiv;

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

    var outerDiv = document.createElement("div");
    outerDiv.setAttribute("class", "py-2");
    outerDiv.style.width="100%";
    var seekDiv = document.createElement("div");
    this._slider = document.createElement("seek-bar");

    this._domParents = []; //handle defered loading of video element
    seekDiv.appendChild(this._slider);
    outerDiv.appendChild(seekDiv);

    var innerDiv = document.createElement("div");
    this._videoTimeline = document.createElement("video-timeline");
    innerDiv.appendChild(this._videoTimeline);
    outerDiv.appendChild(innerDiv);
    this._timelineDiv.appendChild(outerDiv);

    var innerDiv = document.createElement("div");
    this._entityTimeline = document.createElement("entity-timeline");
    innerDiv.appendChild(this._entityTimeline);
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
    this._currentFrameText.setAttribute("class", "f2 text-center");
    this._currentFrameText.setAttribute("id", "frame_num_display");
    this._currentFrameText.textContent = "0";
    this._currentFrameText.style.minWidth = "15px";
    currentFrameWrapper.appendChild(this._currentFrameText);

    const frameNext = document.createElement("frame-next");
    frameDiv.appendChild(frameNext);

    this._utcLabel = document.createElement("span");
    this._utcLabel.setAttribute("class", "f2 text-center text-gray px-2");
    this._utcLabel.textContent = "N/A";
    playButtons.appendChild(this._utcLabel);

    this._volume_control = document.createElement("volume-control");
    settingsDiv.appendChild(this._volume_control);
    this._volume_control.addEventListener("volumeChange", (evt) => {
      this._video.setVolume(evt.detail.volume);
    });
    const fullscreen = document.createElement("video-fullscreen");
    settingsDiv.appendChild(fullscreen);

    this._scrubInterval = 16;
    this._lastScrub = Date.now();
    this._rate = 1;
    this._playbackDisabled = false;
    this._setTimelineDisplayMode("frame");
    this._videoMode = "play"; // Future growth (e.g. play | summary)

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
      this._hideCanvasMenus();
      this._displayTimelineLabels = !this._displayTimelineLabels;
      this._entityTimeline.showFocus(this._displayTimelineLabels, this._videos[this._primaryVideoIndex].currentFrame());
      this._videoHeightPadObject.height = this._headerFooterPad + this._controls.offsetHeight + this._timelineDiv.offsetHeight;
      window.dispatchEvent(new Event("resize"));
    });

    this._slider.addEventListener("input", evt => {
      this.handleSliderInput(evt);
    });

    this._slider.addEventListener("change", evt => {
      this.handleSliderChange(evt);
    });

    play.addEventListener("click", () => {
      this._hideCanvasMenus();
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
      this._hideCanvasMenus();
      this.playBackwards();
    });

    fastForward.addEventListener("click", () => {
      this._hideCanvasMenus();
      let prime_fps = this._fps[this._longest_idx];
      for (let idx = 0; idx < this._videos.length; idx++)
      {
        let video = this._videos[idx];
        video.pause();
        video.rateChange(2 * this._rate * (prime_fps/video._videoObject.fps));
      }
      this.play();
    });

    framePrev.addEventListener("click", () => {
      this._hideCanvasMenus();
      for (let video of this._videos)
      {
        if (this.is_paused() == false)
        {
          this.dispatchEvent(new Event("paused", {composed: true}));
          fastForward.removeAttribute("disabled");
          rewind.removeAttribute("disabled");
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
      this._hideCanvasMenus();
      for (let video of this._videos)
      {
        if (this.is_paused() == false)
        {
          this.dispatchEvent(new Event("paused", {composed: true}));
          fastForward.removeAttribute("disabled");
          rewind.removeAttribute("disabled");
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

    this._videoStatus = "paused"; // Possible values: playing | paused | scrubbing

    // Start out with play button disabled.
    this._playInteraction.disable();

    fullscreen.addEventListener("click", evt => {
      this._hideCanvasMenus();
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

    this._currentFrameInput.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    this._currentFrameInput.addEventListener("change", () => {
      this._currentFrameInput.blur(); // Lose focus to invoke the blur event
    });

    this._currentFrameInput.addEventListener("blur", () => {
      this._hideCanvasMenus();
      document.body.classList.remove("shortcuts-disabled");
      this._currentFrameText.style.display = "block";
      this._currentFrameInput.style.display = "none";
      this.processFrameInput();
    });

    this._currentFrameText.addEventListener("click", () => {
      this._hideCanvasMenus();
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
      this._hideCanvasMenus();
      document.body.classList.remove("shortcuts-disabled");
      this._currentTimeText.style.display = "block";
      this._currentTimeInput.style.display = "none";
      this.processTimeInput();
    });

    this._currentTimeText.addEventListener("click", () => {
      this._hideCanvasMenus();
      this._currentTimeInput.style.display = "block";
      this._currentTimeInput.focus();
      this._currentTimeText.style.display = "none";
    });

    /**
     * Seek/timeline event listeners
     */
    this._videoTimeline.addEventListener("input", evt => {
      this.handleSliderInput(evt);
    });

    this._videoTimeline.addEventListener("newFrameRange", evt => {
      this._slider.setAttribute("min", evt.detail.start);
      this._slider.setAttribute("max", evt.detail.end);
      this._entityTimeline.init(evt.detail.start, evt.detail.end);
    });

    this._entityTimeline.addEventListener("selectFrame", evt => {
      this._slider.value = evt.detail.frame;
      this.handleSliderChange(evt);
    });

    this._entityTimeline.addEventListener("graphData", evt => {
      if (evt.detail.numericalData.length > 0 || evt.detail.stateData.length > 0) {
        this._timelineMore.style.display = "block";
      }
      else {
        this._timelineMore.style.display = "none";
      }
      this._videoHeightPadObject.height = this._headerFooterPad + this._controls.offsetHeight + this._timelineDiv.offsetHeight;
      window.dispatchEvent(new Event("resize"));
    });

    fullscreen.addEventListener("click", evt => {
      this._hideCanvasMenus();
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
        if (this._playbackDisabled) {
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
        if (this._playbackDisabled) {
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
  }

  _setToPlayMode() {
    this._videoMode = "play";

    this._videoTimeline.style.display = "block";

    this._videoTimeline.init(0, this._timeStore.getLastGlobalFrame());
    this._entityTimeline.init(0, this._timeStore.getLastGlobalFrame());

    this._slider.setAttribute("min", 0);
    this._slider.setAttribute("max", this._timeStore.getLastGlobalFrame());

    this._qualityControl.removeAttribute("disabled");
    this._rateControl.removeAttribute("disabled");

    this._resizeWindow();
  }

  _resizeWindow() {
    this._videoHeightPadObject.height = this._headerFooterPad + this._controls.offsetHeight + this._timelineDiv.offsetHeight;
    window.dispatchEvent(new Event("resize"));
  }

  _resizeHandler() {
    this._hideCanvasMenus();
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

  /**
   * Callback used when user clicks on one of the seek bar sliders
   */
  handleSliderInput(evt) {
    // Along allow a scrub display as the user is going
    // slow
    const now = Date.now();
    const frame = Number(evt.target.value);
    const waitOk = now - this._lastScrub > this._scrubInterval;
    this._playInteraction.disable(); // disable play on scrub
    if (waitOk) {
      this._lastScrub = Date.now();
      this._videoStatus = "paused";
      this._play.setAttribute("is-paused","");
      let prime_fps = this._fps[this._longest_idx];
      let prime_frame = this._videos[this._longest_idx].currentFrame();
      let promises = [];
      console.info(`${performance.now()}: Requesting seek to ${frame}`);
      for (let idx = 0; idx < this._videos.length; idx++)
      {
        let video = this._videos[idx];
        video.scrubbing = true;
        if (video.keyframeOnly == false && Math.abs(frame-prime_frame) > 10)
        {
          video.keyframeOnly = true;
        }
        else
        {
          video.keyframeOnly = false;
        }
        let this_frame = Math.round(frame * (this._fps[idx]/prime_fps));
        this_frame += this._frameOffsets[idx];
        video.stopPlayerThread(); // Don't use video.pause because we are seeking ourselves
        video.shutdownOnDemandDownload();

        // Seek callbacks are called from the perspective of the video class
        let cb=(frameIdx,source,width,height) => {
          video._draw.clear();
          video._effectManager.clear();
          video.pushFrame(frameIdx,source,width,height);
          video.updateOffscreenBuffer(frameIdx,source,width,height);
        }
        if (this_frame < video.length)
        {
          promises.push(video.seekFrame(this_frame, cb));
        }
        else
        {
          if (video.currentFrame() < video.length-MAGIC_PAD)
          {
            const seekPromise = video.seekFrame(video.length-MAGIC_PAD, cb);
            promises.push(seekPromise);
          }
        }
      }
      Promise.allSettled(promises).then(() => {
		    for (let idx = 0; idx < this._videos.length; idx++)
        {
          let video = this._videos[idx];
          // Update the display with the latest
          video.displayLatest(true);
        }
        this._videoStatus = "paused";
      });
    }
  }

  /**
   * Callback used when user slides one of the seek bars
   */
  handleSliderChange(evt) {
    this._play.setAttribute("is-paused","");
    this.dispatchEvent(new Event("displayLoading", {composed: true}));

    // Only use the current frame to prevent glitches
    let frame = this._videos[this._longest_idx].currentFrame();
    if (evt.detail)
    {
      frame = evt.detail.frame;
    }

    this._videoStatus = "scrubbing";
    this._playInteraction.disable(); // disable play on seek
    var seekPromiseList = [];
    let prime_fps = this._fps[this._longest_idx];
    for (let idx = 0; idx < this._videos.length; idx++)
    {
      let video = this._videos[idx];
      video.keyframeOnly = false;
      video.scrubbing = false;
      let this_frame = Math.round(frame * (this._fps[idx]/prime_fps));
      this_frame += this._frameOffsets[idx];
      video.stopPlayerThread();  // Don't use video.pause because we are seeking ourselves
      video.shutdownOnDemandDownload();
      let cb=(frameIdx,source,width,height) => {
        video._draw.clear();
        video._effectManager.clear();
        video.pushFrame(frameIdx,source,width,height);
        video.updateOffscreenBuffer(frameIdx,source,width,height);
      }
      if (this_frame < video.length)
      {
        const seekPromise = video.seekFrame(this_frame, cb, true);
        seekPromiseList.push(seekPromise);
      }
      else
      {
        if (video.currentFrame() < video.length-MAGIC_PAD)
        {
          const seekPromise = video.seekFrame(video.length-MAGIC_PAD, cb, true);
          seekPromiseList.push(seekPromise);
        }
      }
    }

    Promise.allSettled(seekPromiseList).then(() => {
        for (let idx = 0; idx < this._videos.length; idx++)
        {
          let video = this._videos[idx];
          // Update the display with the latest
          video.displayLatest(true);
          video.onDemandDownloadPrefetch();
        }
        this._videoStatus = "paused";
        setTimeout(()=>{this.checkReady();},33);
      });

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

    const maxFrame = this._maxFrameNumber;
    if (frame > maxFrame - 1) // #TODO Fix in the future once video.js has been sorted out.
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
    this.checkAllReady();
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
    const maxFrame = this._maxFrameNumber;
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
    this.checkAllReady();
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
    this._videos = [];
    this._multi_layout = val.media_files['layout'];

    let searchParams = new URLSearchParams(window.location.search);
    if (val.media_files.quality && searchParams.has("playQuality") == false)
    {
      this._quality = val.media_files.quality;
    }

    this._timeStore = new TimeStore(this._mediaInfo, this.mediaType);
    if (!this._timeStore.utcEnabled()) {
      this._utcLabel.style.display = "none";
      this._timelineUnitsUTC.style.display = "none";
    }

    const total_video_spots = this._multi_layout[0] * this._multi_layout[1];
    if (val.media_files['ids'].length > total_video_spots)
    {
      window.alert("Invalid multiview object! Not enough grid spots for media.");
    }

    const video_count = val.media_files['ids'].length;

    let global_frame = new Array(video_count).fill(0);
    // Functor to monitor any frame drift
    let global_frame_change = (vid_idx,evt) => {
      global_frame[vid_idx] = evt.detail.frame;
      if (evt.detail.frame % 60 == 0 && vid_idx == 0)
      {
        let max_diff = 0;
        for (let j = 0; j < global_frame.length; j++)
        {
          for (let i = 0; i < global_frame.length; i++)
          {
            const diff = Math.abs(global_frame[i]-global_frame[j]);
            if (diff > max_diff)
            {
              max_diff = diff;
            }
          }
        }
        if (max_diff > 10)
        {
          console.warn("Frame slippage occuring in multi-view " + max_diff);
        }
      }
    }
    // Functor to normalize the progress bar
    let global_progress = new Array(video_count).fill(0);
    let global_on_demand_progress = new Array(video_count).fill([0,0]);
    let handle_buffer_load = (vid_idx,evt) =>
        {
          if (global_progress[vid_idx] == 0)
          {
            setTimeout(() => {
              this._videos[vid_idx].refresh(); //draw first frame
            }, 333);
          }
          global_progress[vid_idx] = evt.detail.percent_complete;
          let fakeEvt = {
            detail: {
              percent_complete:Math.min(...global_progress)
            }
          };
          this._slider.onBufferLoaded(fakeEvt);

          let frame = Math.round(fakeEvt.detail.percent_complete * this._maxFrameNumber);
        };

        let handle_ondemand_load = (vid_idx,evt) =>
        {
          if (evt.detail.ranges.length == 0)
          {
            return;
          }
          global_on_demand_progress[vid_idx] = evt.detail.ranges[0];
          let minStart = Number.MAX_SAFE_INTEGER;
          let minEnd = Number.MAX_SAFE_INTEGER;
          for (let idx = 0; idx < global_on_demand_progress.length; idx++)
          {
            if (global_on_demand_progress[idx][0] < minStart)
            {
              minStart = global_on_demand_progress[idx][0];
            }
            if (global_on_demand_progress[idx][0] < minEnd)
            {
              minEnd = global_on_demand_progress[idx][1];
            }
          }
          let fakeEvt = {
            detail: {
              ranges: [[minStart,minEnd]]
            }
          };
          this._slider.onDemandLoaded(fakeEvt);
        };
    let setup_video = (idx, video_info) => {
      this._slider.setAttribute("min", 0);

      // This is the array of all
      this._fps[idx] = video_info.fps;
      this._videos[idx].addEventListener("codecNotSupported", (evt) => {
        if (alert_sent == false)
        {
          handle_decoder_error(evt, this._shadow);
          alert_sent = true;
        }
      });
      if (idx == this._longest_idx)
      {
        let prime = this._videos[idx];
        this.parent._browser.canvas = prime;
        let alert_sent = false;

        this._timeStore.setPrimaryMedia(video_info);
        this._timeStore.addChannelMedia(video_info, idx);

        this._videoTimeline.timeStore = this._timeStore;
        this._entityTimeline.timeStore = this._timeStore;
        this._videoTimeline.timeStoreInitialized();
        this._entityTimeline.timeStoreInitialized();
    
        this._setToPlayMode();

        prime.addEventListener("videoError", (evt) => {
          if (alert_sent == false)
          {
            handle_video_error(evt, this._shadow);
            alert_sent = true;
          }
        });
        prime.addEventListener("frameChange", evt => {
             const frame = evt.detail.frame;
             this._slider.value = frame;
             const time = frameToTime(frame, this._fps[this._longest_idx]);
             this._currentTimeText.textContent = time;
             this._currentFrameText.textContent = frame;
             this._currentTimeText.style.width = 10 * (time.length - 1) + 5 + "px";
             this._currentFrameText.style.width = (15 * String(frame).length) + "px";
             let prime_fps = this._fps[this._longest_idx];
             // Update global renderer
             for (let idx = 0; idx < this._videos.length; idx++)
            {
              let this_frame = Math.round(frame * (this._fps[idx]/prime_fps));
              this._multiRenderer.setFrameReq(this._videos[idx]._videoObject.id, this_frame);
            }
            if (this._timeStore != null) {
              if (this._timeStore.utcEnabled()) {
                this._utcLabel.textContent = this._timeStore.getAbsoluteTimeFromFrame(frame);
              }
            }
           });
      }
      else {
        this._timeStore.addChannelMedia(video_info, idx);
      }

      this._videos[idx].addEventListener("playbackEnded", () => {
        this.pause();
      });
      this._videos[idx].addEventListener("canvasResized", () => {
        this._videoTimeline.redraw();
        this._entityTimeline.redraw();
      });
      this._videos[idx].addEventListener("safeMode", () => {
        this.safeMode();
      });
      this._videos[idx].addEventListener("bufferLoaded",
                             (evt) => {
                               handle_buffer_load(idx,evt);
                             });
      this._videos[idx].addEventListener("onDemandDetail",
                             (evt) => {
                               handle_ondemand_load(idx,evt);
                             });
      // When a playback is stalled, pause all the videos.
      this._videos[idx].addEventListener("playbackStalled",
                            (evt) => {
                                Utilities.warningAlert("Video playback stalled.");
                                this.pause();
                             });
      this._videos[idx].addEventListener("frameChange",
                             (evt) => {
                               global_frame_change(idx,evt);
                             });
      const smallTextStyle =
        {"fontSize": "16pt",
         "fontWeight": "bold",
         "color": "white",
         "background": "rgba(0,0,0,0.33)"};
      this._videos[idx].overlayTextStyle = smallTextStyle;

      this._videos[idx].loadFromVideoObject(
        video_info, this.mediaType, this._quality, undefined, undefined, this._multi_layout[0], this._videoHeightPadObject, this._seekQuality, this._scrubQuality)
      .then(() => {
        if (this._videos[idx].allowSafeMode) {
          this._videos[idx].allowSafeMode = this._allowSafeMode;
        }
        else {
          this._allowSafeMode = false;
        }
        this.setDefaultVideoSettings(idx);
        this.handleNotReadyEvent(idx);
        if (idx == 0) {
          this.dispatchEvent(new CustomEvent("primaryVideoLoaded", {
            composed: true,
            detail: {
              media: video_info
            }
          }));
        }
      });
      // #TODO This should be changed to dispatched events vs. calling the parent directly.
      this.parent._getMetadataTypes(this,
                                    this._videos[idx]._canvas,
                                    idx != 0, //whether to block signal registration
                                    video_info.id, // sub-element real-id
                                    false,// only update on last video
                                    );
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

    // First, setup the nominal grid section which will be based off the predefined configuration
    this._gridDiv = document.createElement("div");
    this._gridDiv.setAttribute("class", "annotation__multi-grid")
    this._gridDiv.style.gridTemplateColumns =
      "auto ".repeat(this._multi_layout[1]);
      this._gridDiv.style.gridTemplateRows =
      "auto ".repeat(this._multi_layout[0]);
    this._vidDiv.appendChild(this._gridDiv);

    // Next, setup the focus video/dock areas.
    this._focusTopDiv = document.createElement("div");
    this._focusTopDiv.setAttribute("class", "d-flex");
    this._vidDiv.appendChild(this._focusTopDiv);

    this._focusDiv = document.createElement("div");
    this._focusDiv.setAttribute("class", "d-flex flex-justify-right");
    this._focusTopDiv.appendChild(this._focusDiv);

    this._focusTopDockDiv = document.createElement("div");
    this._focusTopDockDiv.setAttribute("class", "d-flex flex-wrap");
    this._focusTopDiv.appendChild(this._focusTopDockDiv);

    this._focusBottomDiv = document.createElement("div");
    this._focusBottomDiv.setAttribute("class", "d-flex");
    this._vidDiv.appendChild(this._focusBottomDiv);

    this._focusBottomDockDiv = document.createElement("div");
    this._focusBottomDockDiv.setAttribute("class", "annotation__multi-secondary d-flex flex-row");
    this._focusBottomDiv.appendChild(this._focusBottomDockDiv);

    this._videoDivs = {};
    this._videoGridInfo = {};
    let idx = 0;
    let video_resp = [];
    this._selectedDock = null; // Set with right click options
    this._handleNotReadyTimeout = [];
    this._timeoutIndex = [];

    this._playbackReadyId = 0;
    this._numVideos = val.media_files['ids'].length;
    this._frameOffsets = [];
    this._multiRenderer = new MultiRenderer();
    for (const vid_id of val.media_files['ids'])
    {
      const wrapper_div = document.createElement("div");
      wrapper_div.setAttribute("class", "annotation__multi-grid-entry d-flex");
      this._videoDivs[vid_id] = wrapper_div;

      let roi_vid = document.createElement("video-canvas");
      this._videoGridInfo[vid_id] = {row: Math.floor(idx / this._multi_layout[1])+1, col: (idx % this._multi_layout[1])+1, video: roi_vid};

      roi_vid.renderer = this._multiRenderer;
      this._multiRenderer.addVideo(vid_id, roi_vid);
      if ('frameOffset' in val.media_files)
      {
        this._frameOffsets.push(val.media_files.frameOffset[idx]);
      }
      else
      {
        this._frameOffsets.push(0);
      }
      this._videos.push(roi_vid);
      wrapper_div.appendChild(roi_vid);
      video_resp.push(fetchRetry(`/rest/Media/${vid_id}?presigned=28800`));
      this._handleNotReadyTimeout.push(null);
      this._timeoutIndex.push(0);

      roi_vid.addEventListener("playbackReady", () => {
        let allVideosReady = true;
        for (let vidIdx = 0; vidIdx < this._videos.length; vidIdx++)
        {
          if (this._videos[vidIdx].bufferDelayRequired() && this._videos[vidIdx].onDemandBufferAvailable() == false)
          {
            allVideosReady = false;
          }
        }

        if (allVideosReady) {
          console.log("allVideosReady");
          if (this.is_paused()) {
            this._playInteraction.enable();
            this._playbackDisabled = false;
            //this._rateControl.setValue(this._rate);
          }
        }
      });

      // Setup addons for multi-menu and initialize the gridview
      this.assignToGrid(false);
      this.setupMultiMenu(vid_id);
      idx += 1;

    }


    let video_info = [];
    Promise.all(video_resp).then((values) => {
      let idx = 0;
      for (let resp of values)
      {
        video_info.push(resp.json());
      }
      Promise.all(video_info).then((info) => {
        let max_frames = 0;
        let max_time = 0;
        let fps_of_max = 0;
        this._fps = Array(video_info.length);
        this._lengths = Array(video_info.length);
        this._lengthTimes = Array(video_info.length);
        this._longest_idx = 0;
        for (let idx = 0; idx < video_info.length; idx++)
        {
          let this_time = Number(info[idx].num_frames) / Number(info[idx].fps);
          if (this_time > max_time)
          {
            max_time = this_time;
            max_frames = Number(info[idx].num_frames);
            fps_of_max = Number(info[idx].fps);
          }
          this._fps[idx] = info[idx].fps;
          this._lengths[idx] = info[idx].num_frames;
          this._lengthTimes[idx] = info[idx].num_frames / info[idx].fps;
          if (this._lengths[idx] > this._lengths[this._longest_idx])
          {
            this._longest_idx = idx;
          }
        }
        this._primaryVideoIndex = this._longest_idx;
        for (let idx = 0; idx < video_info.length; idx++)
        {
          setup_video(idx, info[idx]);
          if (this._frameOffsets[idx] != 0)
          {
            const searchParams = new URLSearchParams(window.location.search);
            let frameInit = 0;
            if (searchParams.has("frame"))
            {
              frameInit = Number(searchParams.get("frame"));
            }
            this._videos[idx].gotoFrame(val.media_files.frameOffset[idx], true);
            this._videos[idx]._dispFrame = frameInit + val.media_files.frameOffset[idx];
            this._videos[idx]._frameOffset = val.media_files.frameOffset[idx];
          }
        }
        this._fps_of_max = fps_of_max;
        this._totalTime.textContent = "/ " + frameToTime(max_frames, fps_of_max);
        this._totalTime.style.width = 10 * (this._totalTime.textContent.length - 1) + 5 + "px";
        this._slider.setAttribute("max", max_frames-1);
        this._slider.fps = this._fps[this._primaryVideoIndex];
        this._maxFrameNumber = max_frames - 1;

        let multiview = null;
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has("multiview"))
        {
          multiview = searchParams.get("multiview");
          let focusNumber = parseInt(multiview);
          if (multiview == "hGrid")
          {
            this.setHorizontal();
          }
          else if (!isNaN(focusNumber))
          {
            this._selectedDock = this._focusTopDockDiv;

            let currentIndex = 0;
            for (let videoId in this._videoDivs)
            {
              if (currentIndex == focusNumber)
              {
                this.setFocus(videoId);
                break;
              }
              currentIndex++;
            }
          }
        }

        this.dispatchEvent(new Event("canvasReady", {
          composed: true
        }));
      })
      .catch((exc) => {
        console.error(exc);
        for (let idx = 0; idx < this._videos.length; idx++) {
          if (!this._videos[idx].initialized) {
            this._videos[idx].displayErrorMessage(`Error occurred. Could not load media: ${this._mediaInfo.media_files.ids[idx]}`);
          }
        }

        this.dispatchEvent(new Event("videoInitError", {
          composed: true
        }));
      });

    });

    // Audio for multi might get fun...
    // Hide volume on videos with no audio
    this._volume_control.style.display = "none";
  }

  /**
   * Expected to occur at initialization. Dispatches the default video settings.
   */
  setDefaultVideoSettings(idx) {

    console.log(`Setting default video settings for: ${idx}`)

    const seekInfo = this._videos[idx].getQuality("seek");
    const scrubInfo = this._videos[idx].getQuality("scrub");
    const playInfo = this._videos[idx].nearestQuality(this._quality);

    this.dispatchEvent(new CustomEvent("defaultVideoSettings", {
      composed: true,
      detail: {
        media: this._videos[idx],
        seekQuality: seekInfo.quality,
        seekFPS: seekInfo.fps,
        scrubQuality: scrubInfo.quality,
        scrubFPS: scrubInfo.fps,
        playQuality: playInfo.quality,
        playFPS: playInfo.fps,
        allowSafeMode: this._allowSafeMode
      }
    }));
  }

  setMultiviewUrl(multiviewType, vid_id)
  {
    let get_pos = () => {
      let idx = 0;
      for (let videoId in this._videoDivs)
      {
        if (videoId == vid_id)
        {
          break;
        }
        else
        {
          idx++;
        }
      }
      return idx;
    };

    if (multiviewType == "horizontal")
    {
      var multiview = "hGrid";
    }
    else
    {
      var multiview = get_pos(vid_id);
    }
    var search_params = new URLSearchParams(window.location.search);
    search_params.set("multiview", multiview);
    const path = document.location.pathname;
    const searchArgs = search_params.toString();
    var newUrl = path + "?" + searchArgs;
    if (this.pushed_state)
    {
      window.history.replaceState(this.multview_state_obj, "Multiview", newUrl);
    }
    else
    {
      window.history.pushState(this.multview_state_obj, "Multiview", newUrl);
      this.pushed_state = true;
    }
  }

  setFocus(vid_id)
  {
    this._multiLayoutState = "focus";
    for (let videoId in this._videoDivs)
    {
      let video = this._videoDivs[videoId].children[0];
      video.contextMenuNone.hideMenu();
      if (videoId != vid_id)
      {
        this.assignToSecondary(Number(videoId), this._quality);
      }
      else
      {
        this.setMultiviewUrl("focus", Number(videoId));
        this.assignToPrimary(Number(videoId), this._quality*2);
      }
    }
    this.goToFrame(this._videos[this._primaryVideoIndex].currentFrame());
  }

  setFocusVertical(vid_id)
  {
    this._selectedDock = this._focusTopDockDiv;
    this.setFocus(vid_id);
  }

  setHorizontal()
  {
    this._multiLayoutState = "horizontal";
    this._selectedDock = this._focusBottomDockDiv;
    this.setMultiviewUrl("horizontal");
    for (let videoId in this._videoDivs)
    {
      let video = this._videoDivs[videoId].children[0];
      video.contextMenuNone.hideMenu();
      this.assignToSecondary(Number(videoId), this._quality);
      video.contextMenuNone.displayEntry("Focus Video", true);
      video.contextMenuNone.displayEntry("Horizontal Multiview", false);
      video.contextMenuNone.displayEntry("Reset Multiview", true);
    }
  }

  setupMultiMenu(vid_id)
  {
    let div = this._videoDivs[vid_id];
    let video_element = div.children[0];

    this.pushed_state = false;
    this.multview_state_obj = {"state": "multiview"};
    let reset_url = () => {
      var search_params = new URLSearchParams(window.location.search);
      if (search_params.has("multiview"))
      {
        search_params.delete("multiview");
        const path = document.location.pathname;
        const searchArgs = search_params.toString();
        var newUrl = path + "?" + searchArgs;
        if (this.pushed_state)
        {
          window.history.replaceState(this.multview_state_obj, "Multiview", newUrl);
        }
        else
        {
          window.history.pushState(this.multview_state_obj, "Multiview", newUrl);
          this.pushed_state = true;
        }
      }
    };

    // Move all the videos back into their respective spots in the grid
    let reset = () => {
      for (let videoId in this._videoDivs)
      {
        let video = this._videoDivs[videoId].children[0];
        video.contextMenuNone.hideMenu();
      }
      this.assignToGrid();
      reset_url();
    };

    let focusVertical = () => {
      this.setFocusVertical(vid_id);
    };

    video_element.contextMenuNone.addMenuEntry("Focus Video", focusVertical);
    video_element.contextMenuNone.addMenuEntry("Horizontal Multiview", this.setHorizontal.bind(this));
    video_element.contextMenuNone.addMenuEntry("Reset Multiview", reset);
  }

  // Move all but the first to secondary
  debug_multi()
  {
    let pos = 0;
    for (let video in this._videoDivs)
    {
      if (pos != 0)
      {
        this.assignToSecondary(Number(video));
      }
      pos++;
    }
  }

  makeAllVisible(node)
  {
    node.style.visibility = null;
    for (let child of node.children)
    {
      this.makeAllVisible(child);
    }

    // Don't forget about the shadow children
    if (node._shadow)
    {
      for (let child of node._shadow.children)
      {
        this.makeAllVisible(child);
      }
    }
  }
  assignToPrimary(vid_id, quality)
  {
    let div = this._videoDivs[vid_id];
    this._focusDiv.appendChild(div);
    this.setMultiProportions();
    // These go invisible on a move.
    this.makeAllVisible(div);
    let video = div.children[0];
    video.setQuality(quality);

    for (let idx = 0; idx < this._videos.length; idx++) {
      if (vid_id == this._videos[idx].video_id()) {
        this._primaryVideoIndex = idx;
        break;
      }
    }
  }

  assignToSecondary(vid_id, quality)
  {
    let div = this._videoDivs[vid_id];
    this._selectedDock.appendChild(div);
    this.setMultiProportions();
    // These go invisible on a move.
    this.makeAllVisible(div);
    let video = div.children[0];
    video.setQuality(quality);
  }

  assignToGrid(setContextMenu=true)
  {
    this._multiLayoutState = "grid";

    for (let idx = 0; idx < this._mediaInfo.media_files['ids'].length; idx++)
    {
      let videoId = this._mediaInfo.media_files['ids'][idx];
      if (videoId in this._videoDivs == false)
      {
        continue;
      }
      let div = this._videoDivs[videoId];
      this._gridDiv.appendChild(div);
      this.makeAllVisible(div);

      let video = div.children[0];
      video.setQuality(this._quality);

      if (setContextMenu)
      {
        video.contextMenuNone.displayEntry("Focus Video", true);
        video.contextMenuNone.displayEntry("Horizontal Multiview", true);
        video.contextMenuNone.displayEntry("Reset Multiview", false);
      }
      video.gridRows = this._multi_layout[0];

      let gridInfo = this._videoGridInfo[videoId];
      video.style.gridColumn = gridInfo.col;
      video.style.gridRow = gridInfo.row;
    }
    this._primaryVideoIndex = this._longest_idx;

    this._gridDiv.style.display = "grid";
    this._focusDiv.style.display = "none";
    this._focusBottomDockDiv.style.display = "none";
    this._focusTopDockDiv.style.display = "none";

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
  }

  /**
   * Expected to be called only when a video is being focused
   */
  setMultiProportions()
  {
    var horizontalDock = this._selectedDock == this._focusBottomDockDiv;

    if (horizontalDock)
    {
      this._focusDiv.style.display = "none";
      this._selectedDock.style.display = "flex";
      this._selectedDock.style.width = "100%";
    }
    else
    {
      this._focusDiv.style.display = "flex";
      this._selectedDock.style.display = "block";
      this._focusDiv.style.width = "70%";
      this._selectedDock.style.width = "30%";
    }
    this._gridDiv.style.display = "none";

    for (let primary of this._focusDiv.children)
    {
      primary.children[0].stretch = true;
      primary.children[0].contextMenuNone.displayEntry("Focus Video", false);
      primary.children[0].contextMenuNone.displayEntry("Horizontal Multiview", true);
      primary.children[0].contextMenuNone.displayEntry("Reset Multiview", true);
      primary.children[0].gridRows = 1;
      primary.children[0].style.gridColumn = null;
      primary.children[0].style.gridRow = null;
    }

    for (let docked of this._selectedDock.children)
    {
      docked.children[0].stretch = true;
      docked.children[0].contextMenuNone.displayEntry("Focus Video", true);
      docked.children[0].contextMenuNone.displayEntry("Horizontal Multiview", true);
      docked.children[0].contextMenuNone.displayEntry("Reset Multiview", true);
      docked.children[0].style.gridColumn = null;
      docked.children[0].style.gridRow = null;

      if (horizontalDock)
      {
        docked.children[0].gridRows = 1;
      }
      else
      {
        docked.children[0].gridRows = this._selectedDock.children.length;
      }
    }

    // Wait for reassignments to calculate resize event.
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
  }

  set annotationData(val) {
    // Debounce this
    if (this._annotationData)
    {
      return;
    }

    this._annotationData = val;
    for (let video of this._videos)
    {
      video.annotationData = val;
    }
    this._entityTimeline.annotationData = val;
  }

  _displayPlayerSettingsMenu() {
    this._hideCanvasMenus();

    var pos = this._playerSettingsBtn.getBoundingClientRect();
    this._playerSettingsMenu.style.top = `${pos.top - 120}px`;
    this._playerSettingsMenu.style.left = `${pos.left - 150}px`;

    this._playerTimelineUnitsContent.textContent = this._displayMode;
    this._playerQualityContent.textContent = this._qualityControl._quality;
    this._playerSettingsMenu.style.display = "flex";
  }

  _displayTimelineUnitsMenu() {
    this._hideCanvasMenus();

    var pos = this._playerSettingsBtn.getBoundingClientRect();

    if (this._timelineUnitsUTC.style.display == "none") {
      this._timelineUnitsMenu.style.top = `${pos.top - 120}px`;
      this._timelineUnitsMenu.style.left = `${pos.left - 100}px`;
    }
    else {
      this._timelineUnitsMenu.style.top = `${pos.top - 150}px`;
      this._timelineUnitsMenu.style.left = `${pos.left - 100}px`;
    }
    this._timelineUnitsMenu.style.display = "flex";
  }

  _displayQualityMenu() {
    this._hideCanvasMenus();

    var pos = this._playerSettingsBtn.getBoundingClientRect();
    this._videoQualityMenu.style.top = `${pos.top - 120}px`;
    this._videoQualityMenu.style.left = `${pos.left - 180}px`;

    this._videoQualityMenu.style.display = "flex";
  }

  /**
   * Hides all the annotator canvas overlay menus
   */
  _hideCanvasMenus() {
    this._playerSettingsMenu.style.display = "none";
    this._timelineUnitsMenu.style.display = "none";
    this._videoQualityMenu.style.display = "none";
    this._timelineZoomMenu.style.display = "none";
    //this._utcDiv.style.display = "none";
  }

  /**
   * Sets display mode to be used for the timelines
   * @param {string} mode "frame"|"relativeTime"|"utc"
   */
  _setTimelineDisplayMode(mode) {
    this._displayMode = mode;
    this._videoTimeline.setDisplayMode(this._displayMode);
    this._entityTimeline.setDisplayMode(this._displayMode);

    if (mode == "utc") {
      this._slider.useUtcTime(this._timeStore);
    }
    else {
      this._slider.useRelativeTime();
    }
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

  checkReady()
  {
    let notReady;
    for (let video of this._videos)
    {
      notReady |= video.bufferDelayRequired() && video.onDemandBufferAvailable() == false;
    }
    if (notReady)
    {
      this.handleAllNotReadyEvents();
    }
    else
    {
      this._playInteraction.enable();
      this._playbackDisabled = false;
    }
  }


  syncCheck()
  {
    return;

    /* #TODO Revisit this in the future. This may be mostly OBE for forward playing now that
             we are downloading video on pause.

    // Find the average frame so we can speed up or slow down videos appropriately
    let primeFrame = 0;
    for (let video of this._videos) {
      primeFrame += video.currentFrame();
    }
    primeFrame = Math.floor(primeFrame / this._videos.length);


    let idx = 0;
    for (let video of this._videos) {
      let expected_time = (primeFrame / this._fps[idx]);
      if (expected_time <= this._lengthTimes[idx])
      {
        // Convert to global frame space prior to conversion
        let delta = (video.currentFrame()*(this._fps[idx]/this._fps[this._longest_idx]))-primeFrame;
        if (Math.abs(delta) > Math.floor(this._fps[idx]/2))
        {
          const correction = 1.0 - (delta/100);
          const swag = Math.max(0.95,Math.min(1.05,correction));
          console.log(`syncCheck idx: ${idx} swag: ${swag} delta: ${delta} expectedTime: ${expected_time} primeFrame: ${primeFrame} currentFrame: ${video.currentFrame()} fps_ratio: ${this._fps[idx]/this._fps[this._longest_idx]} id: ${video._videoObject.id}`)
          video.rateChange(this._rate*swag);
        }
      }
      idx++;
    }

    // Re-enter sync check at interval
    this._syncThread = setTimeout(() => {this.syncCheck()},
                                  500);
    */
  }

  checkAllReady()
  {
    for (let idx = 0; idx < this._videos.length; idx++)
    {
	    if (this._videos[idx].onDemandBufferAvailable() == false)
	    {
        this.handleNotReadyEvent(idx);
        return;
	    }
    }
  }

  forcePlaybackDownload(videoIndex) {
    if (isNaN(videoIndex)) {
      for (let video of this._videos) {
        video.onDemandDownloadPrefetch(-1);
      }
      this.handleAllNotReadyEvents();
    }
    else {
      this._videos[videoIndex].onDemandDownloadPrefetch(-1);
      this.handleNotReadyEvent(videoIndex);
    }
  }

  handleAllNotReadyEvents() {
    for (let idx = 0; idx < this._videos.length; idx++) {
      this.handleNotReadyEvent(idx);
    }
  }

  handleNotReadyEvent(videoIndex)
  {
    if (this._handleNotReadyTimeout[videoIndex] != null)
    {
      console.log("Already handling a not ready event");
      return;
    }
    this._videos[videoIndex].onDemandDownloadPrefetch(-1);

    this._playInteraction.disable();

    const timeouts = [4000, 8000, 16000];
    var timeoutIndex = 0;
    var timeoutCounter = 0;
    const clock_check = 1000/3;
    this._last_duration = this._videos[videoIndex].playBufferDuration();

    var lastTime = performance.now();
    let check_ready = (checkFrame) => {

      if (this._videoStatus == "scrubbing") {
        console.log(`Player status == scrubbing | Cancelling check_ready for video: ${videoIndex}`);
        return;
      }
      if (this._videoStatus == "playing") {
        console.error(`Player status == playing | Cancelling check_ready for video: ${videoIndex}`);
        return;
      }

      timeoutCounter += performance.now() - lastTime;
      lastTime = performance.now();

      let not_ready = false;
      if (checkFrame != this._videos[videoIndex].currentFrame()) {
        console.log(`check_ready frame ${checkFrame} and current frame ${this._videos[videoIndex].currentFrame()} do not match. restarting check_ready`)
        timeoutIndex = 0;
        timeoutCounter = 0;
        clearTimeout(this._handleNotReadyTimeout[videoIndex]);
        this._handleNotReadyTimeout[videoIndex] = null;
        this._handleNotReadyTimeout[videoIndex] = setTimeout(() => {
          check_ready(this._videos[videoIndex].currentFrame())}, clock_check);
        return;
      }
      if (this._videos[videoIndex].bufferDelayRequired() && this._videos[videoIndex].onDemandBufferAvailable() == false)
      {
        not_ready = true;
        if (timeoutCounter >= timeouts[timeoutIndex]) {
          timeoutCounter = 0;
          timeoutIndex += 1;
          console.log(`Video ${videoIndex} playback check - restart [Now: ${new Date().toISOString()}]`);
          this._videos[videoIndex].onDemandDownloadPrefetch(-1);
        }
      }
      if (not_ready == true)
      {
        // Heal the buffer state if duration increases since the last time we looked
        if (this._videos[videoIndex].playBufferDuration() > this._last_duration)
        {
          timeoutCounter = 0;
          timeoutIndex = 0;
        }
        this._last_duration = this._videos[videoIndex].playBufferDuration();
        if (timeoutIndex < timeouts[timeouts.length-1]/clock_check) {
          clearTimeout(this._handleNotReadyTimeout[videoIndex]);
          this._handleNotReadyTimeout[videoIndex] = null;
          this._handleNotReadyTimeout[videoIndex] = setTimeout(() => {
            check_ready(checkFrame);
          }, clock_check);
        }
        else {
          Utilities.warningAlert("Video player unable to reach ready state.", "#ff3e1d", false);
          console.error(`Video player unable to reach ready state: ${videoIndex}`);
        }

      }
      if (not_ready == false)
      {
        console.log(`Video ${videoIndex} playback check - Ready [Now: ${new Date().toISOString()}]`);

        // Check if all videos are ready, if so then enable playback
        // This primary captures the case where this function is invoked by the frame itself hasn't
        // changed. The callback in the init function above primarily deals with the normal use
        // case where a user jumps a frame.
        let allVideosReady = true;
        for (let vidIdx = 0; vidIdx < this._videos.length; vidIdx++)
        {
          const buffer_required = this._videos[vidIdx].bufferDelayRequired();
          const on_demand_available = this._videos[vidIdx].onDemandBufferAvailable();
          console.info(`${vidIdx}: ${buffer_required} and ${on_demand_available}`);
          if (buffer_required == true && on_demand_available == false)
          {
            allVideosReady = false;
          }
        }

        if (allVideosReady) {
          console.log("allVideosReady");
          try
          {
            this._playInteraction.enable();
            this._playbackDisabled = false;
            return;
          }
          catch(exc)
          {
            console.warn("allVideosReady() seekFrame promises error caught")
            console.warn(exc);

            this._playInteraction.enable();
            this._playbackDisabled = false;
            //this._rateControl.setValue(this._rate);
          }
        }
      }
    };

    clearTimeout(this._handleNotReadyTimeout[videoIndex]);
    this._handleNotReadyTimeout[videoIndex] = null;
    this._handleNotReadyTimeout[videoIndex] = setTimeout(() => {
      check_ready(this._videos[videoIndex].currentFrame())
    }, 0);

  }

  play()
  {
    this._ratesAvailable = this.computeRatesAvailable();
    clearTimeout(this._failSafeTimer);
    if (this._rate > RATE_CUTOFF_FOR_ON_DEMAND)
    {
      let playing = false;
      // Check to see if the video player can play at this rate
      // at the current frame. If not, inform the user.
      for (let video of this._videos)
      {
        if (!video.canPlayRate(this._rate, video.currentFrame()))
        {
          window.alert("Please wait until this portion of the video has been downloaded. Playing at speeds greater than 4x require the video to be buffered.")
          return;
        }
      }

      let prime_fps = this._fps[this._longest_idx];
      for (let idx = 0; idx < this._videos.length; idx++)
      {
        let video = this._videos[idx];
        video.rateChange(this._rate * (prime_fps/video._videoObject.fps));
        playing |= video.play();
      }

      if (playing)
      {
        this._videoStatus = "playing";
        this._play.removeAttribute("is-paused");
        this._syncThread = setTimeout(() => {this.syncCheck()},
                                      500);
      }
      return;
    }

    for (let idx = 0; idx < this._videos.length; idx++)
    {
	    if (this._videos[idx].bufferDelayRequired() && this._videos[idx].onDemandBufferAvailable() == false)
	    {
	      console.info(`Video ${idx} not yet ready, ignoring play request.`);
	      this.handleNotReadyEvent(idx);
	      return;
	    }
    }
    this.dispatchEvent(new Event("playing", {composed: true}));
    this._fastForward.setAttribute("disabled", "");
    this._rewind.setAttribute("disabled", "");

    const paused = this.is_paused();
    if (paused) {
      let playing = false;
      this._playbackReadyId += 1;
      this._playbackReadyCount = 0;
      let prime_fps = this._fps[this._longest_idx];
      for (let idx = 0; idx < this._videos.length; idx++)
      {
        let video = this._videos[idx];
        video.rateChange(this._rate * (prime_fps/video._videoObject.fps));
        playing |= video.play();
      }
      if (playing)
      {
        this._videoStatus = "playing";
	      this._play.removeAttribute("is-paused");
      }
      this.syncCheck();
    }
  }

  playBackwards()
  {
      let playing = false;
      // Check to see if the video player can play at this rate
      // at the current frame. If not, inform the user.
      for (let video of this._videos)
      {
        if (!video.canPlayRate(1.0, video.currentFrame()))
        {
          window.alert("Please wait until this portion of the video has been downloaded. Playing at speeds greater than 4x require the video to be buffered.")
          return;
        }
      }
      this.disableRateChange();
      //if (this._rateControl.value > 1)
      //{
      //  this._rateControl.setValue(1.0, true);
      //}
      let prime_fps = this._fps[this._longest_idx];
      for (let idx = 0; idx < this._videos.length; idx++)
      {
        let video = this._videos[idx];
        playing |= video.playBackwards();
      }
      this._videoStatus = "playing";
      this._play.removeAttribute("is-paused");
      this._fastForward.setAttribute("disabled", "");
      this._rewind.setAttribute("disabled", "");
  }

  computeRatesAvailable()
  {
    let prime = this._videos[0].playbackRatesAvailable();
    for (let idx = 1; idx < this._videos.length; idx++)
    {
      let this_vid = this._videos[idx].playbackRatesAvailable();
      prime.minimum = Math.max(prime.minimum, this_vid.minimum);
      prime.maximum = Math.min(prime.maximum, this_vid.maximum);
      prime.frameInterval = Math.max(prime.frameInterval, this_vid.frameInterval);
    }
    return prime;
  }

  pause()
  {
    this._ratesAvailable = null;
    this.dispatchEvent(new Event("paused", {composed: true}));
    this.enableRateChange();
    //this._rateControl.setValue(this._rate);
    this.checkReady(); // Verify ready state, this will gray out elements if buffering is required.

    const paused = this.is_paused();
    var pausePromises = [];
    let failSafeFunction = () => {
      clearTimeout(this._failSafeTimer);
      this._videoStatus = "paused";
      this.goToFrame(this._videos[this._primaryVideoIndex].currentFrame());

    };
    clearTimeout(this._failSafeTimer);
    if (paused == false) {
      this._videoStatus = "paused";
      for (let video of this._videos)
      {
        pausePromises.push(video.pause());
      }
      this._play.setAttribute("is-paused", "");
      this._rateControl.setValue(this._videos[this._primaryVideoIndex].rate);
      this._failSafeTimer = setTimeout(failSafeFunction, 1500);
    }
    clearTimeout(this._syncThread);
    Promise.all(pausePromises).then(failSafeFunction);

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
    let prime_fps = this._fps[this._longest_idx];
    for (let idx = 0; idx < this._videos.length; idx++)
    {
        let video = this._videos[idx];
        video.rateChange(this._rate*(prime_fps/video._videoObject.fps));
    }

    if (this.is_paused())
    {
      let thisIdx = 0;
      for (let video of this._videos) {
        video.onDemandDownloadPrefetch();
      }
      this.checkReady();
    }

  }

  setQuality(quality, buffer, isDefault) {
    if (buffer == "focusPlayback") {
      for (let videoDiv of this._focusDiv.children) {
        videoDiv.children[0].setQuality(quality, "play");
      }
    }
    else if (buffer == "dockPlayback") {
      for (let videoDiv of this._focusTopDockDiv.children) {
        videoDiv.children[0].setQuality(quality, "play");
      }
    }
    else {
      this._quality = quality;
      if (this._qualityControl._select != null) {
        this._qualityControl.quality = quality;
      }
      for (let video of this._videos)
      {
        video.setQuality(quality, buffer);
      }

      if (isDefault) {
        this.setDefaultVideoSettings(0);
      }
    }
    this._playInteraction.disable();
    this.forcePlaybackDownload();
    this.checkReady();
  }

  /**
   * Expected to be set by something like annotation-page.
   * @param {tator.Media object} val
   */
  setAvailableQualities(val) {
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
    let p_list=[];
    let prime_fps = this._fps[this._longest_idx]
    let idx = 0;

    this._playInteraction.disable();
    for (let video of this._videos)
    {
      let this_frame = Math.round(frame * (this._fps[idx]/prime_fps));
      this_frame += this._frameOffsets[idx];
      let cb=(frameIdx,source,width,height) => {
        video._draw.clear();
        video._effectManager.clear();
        video.pushFrame(frameIdx,source,width,height);
        video.updateOffscreenBuffer(frameIdx,source,width,height);
      }
      if (this_frame < video.length)
      {
        p_list.push(video.seekFrame(Math.min(this_frame,video._numFrames-1), cb, true));
        idx++;
      }
      else
      {
        if (video.currentFrame() < video.length-MAGIC_PAD)
        {
          const seekPromise = video.seekFrame(video.length-MAGIC_PAD, cb, true);
          p_list.push(seekPromise);
        }
      }
    }
    let coupled_promise = new Promise((resolve,_) => {
      Promise.all(p_list).then(() =>{
        for (let idx = 0; idx < this._videos.length; idx++)
        {
          let video = this._videos[idx];
          // Update the display with the latest
          video.displayLatest(true);
          video.onDemandDownloadPrefetch();
        }
        setTimeout(()=>{this.checkReady();},33);
        resolve();
      });
    });
    return coupled_promise;
  }

  selectNone() {
    for (let video of this._videos)
    {
      video.selectNone();
    }
  }

  selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame) {
    for (let video of this._videos)
    {
      if (video.video_id() == loc.media ||
          video.video_id() == loc.media_id)
      {
        video.selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame);
      }
      else {
        video.selectNone();
      }
    }
  }

  selectTrack(track, frameHint, skipGoToFrame) {
    for (let video of this._videos)
    {
      if (video.video_id() == track.media ||
          video.video_id() == track.media_id)
      {
        video.selectTrack(track, frameHint, skipGoToFrame);
      }
      else {
        video.selectNone();
      }
    }
  }

  selectTrackUsingId(stateId, stateTypeId, frameHint, skipGoToFrame) {
    const ids = this._annotationData._dataByType.get(stateTypeId).map(elem => elem.id);
    const index = ids.indexOf(stateId);
    const track = this._annotationData._dataByType.get(stateTypeId)[index];
    this.selectTrack(track, frameHint, skipGoToFrame);
  }

  deselectTrack() {
    for (let video of this._videos)
    {
      video.deselectTrack();
    }
  }

  addCreateTrackType(stateTypeObj) {
    for (let video of this._videos)
    {
      video.addCreateTrackType(stateTypeObj);
    }
  }

  addAlgoLaunchOption(algoName) {
    for (let video of this._videos)
    {
      video.addAlgoLaunchOption(algoName);
    }
  }

  addAppletToMenu(appletName, categories) {
    for (let video of this._videos)
    {
      video.addAppletToMenu(appletName, categories);
    }
  }

  updateAllLocalizations() {
    for (let video of this._videos)
    {
      video.updateAllLocalizations();
    }
  }

  enableFillTrackGapsOption() {
    for (let video of this._videos)
    {
      video.enableFillTrackGapsOption();
    }
  }

  toggleBoxFills(fill) {
    for (let video of this._videos)
    {
      video.toggleBoxFills(fill);
    }
  }

  toggleTextOverlays(on) {
    for (let video of this._videos)
    {
      video.toggleTextOverlays(on);
    }
  }

  safeMode() {
    for (let video of this._videos)
    {
      video.safeMode();
    }

    this._scrubInterval = 1000.0/guiFPS;
    console.info("Entered video safe mode");
    return 0;
  }

  selectTimelineData(data) {
    //this._entityTimeline.selectEntity(data); #TODO
  }

  _timeToFrame(minutes, seconds) {
    var frame = minutes * 60 * this._fps_of_max + seconds * this._fps_of_max + 1;
    return frame;
  }

  displayVideoDiagnosticOverlay(display) {
    for (let video of this._videos)
    {
      video.updateVideoDiagnosticOverlay(display);
    }
  }

  allowSafeMode(allow) {
    for (let video of this._videos) {
      video.allowSafeMode = allow;
    }
  }

  getVideoSettings() {

    const seekInfo = this._videos[0].getQuality("seek");
    const scrubInfo = this._videos[0].getQuality("scrub");
    const playInfo = this._videos[0].getQuality("play");

    return {
        seekQuality: seekInfo.quality,
        seekFPS: seekInfo.fps,
        scrubQuality: scrubInfo.quality,
        scrubFPS: scrubInfo.fps,
        playQuality: playInfo.quality,
        playFPS: playInfo.fps,
        allowSafeMode: this._allowSafeMode
      };
  }
}

customElements.define("annotation-multi", AnnotationMulti);
