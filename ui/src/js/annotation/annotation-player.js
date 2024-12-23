import { TatorElement } from "../components/tator-element.js";
import { Utilities } from "../util/utilities.js";
import { RATE_CUTOFF_FOR_ON_DEMAND } from "../../../../scripts/packages/tator-js/src/annotator/video.js";
import {
  frameToTime,
  handle_video_error,
  handle_decoder_error,
  PlayInteraction,
} from "./annotation-common.js";
import { TimeStore } from "./time-store.js";

export class AnnotationPlayer extends TatorElement {
  constructor() {
    super();

    const playerDiv = document.createElement("div");
    playerDiv.setAttribute(
      "class",
      "annotation__video-player d-flex flex-column rounded-bottom-2"
    );
    this._shadow.appendChild(playerDiv);

    this._video = document.createElement("video-canvas");
    let alert_sent = false;
    this._video.addEventListener("videoError", (evt) => {
      if (alert_sent == false) {
        handle_video_error(evt, this._shadow);
        alert_sent = true;
      }
    });
    this._video.addEventListener("codecNotSupported", (evt) => {
      if (alert_sent == false) {
        handle_decoder_error(evt, this._shadow);
        alert_sent = true;
      }
    });
    this._video.domParents.push({ object: this });
    playerDiv.appendChild(this._video);

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "video__controls d-flex flex-items-center flex-justify-between px-4"
    );
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
    this._timelineZoomMenu.setAttribute(
      "class",
      "annotation-canvas-overlay-menu d-flex flex-row flex-items-center flex-justify-between rounded-1"
    );
    this._timelineZoomMenu.style.display = "none";
    this._shadow.appendChild(this._timelineZoomMenu);

    this._timelineZoomButtons = {
      panLeft: null,
      panRight: null,
      zoomIn: null,
      zoomOut: null,
      reset: null,
    };
    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
      "Pan Timeline Left",
      "pan-timeline-left-btn"
    );
    btn._button.setAttribute("title", "Pan Left");
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
    btn._button.setAttribute("title", "Pan Right");
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
    btn._button.setAttribute("title", "Zoom In");
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
    btn._button.setAttribute("title", "Zoom Out");
    this._timelineZoomMenu.appendChild(btn);
    this._timelineZoomButtons.zoomOut = btn;
    btn.addEventListener("click", () => {
      if (this._videoMode == "play") {
        this._videoTimeline.zoomOut();
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(
      `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"  stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M21 21l-6 -6" />
        <path d="M3.268 12.043a7.017 7.017 0 0 0 6.634 4.957a7.012 7.012 0 0 0 7.043 -6.131a7 7 0 0 0 -5.314 -7.672a7.021 7.021 0 0 0 -8.241 4.403" />
        <path d="M3 4v4h4" />
      </svg>`,
      "Reset Timeline",
      "reset-timeline-btn"
    );
    btn._button.setAttribute("title", "Reset Zoom");
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
    btn._button.setAttribute("title", "Zoom Timeline Controls");
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
      } else {
        this._hideCanvasMenus();
        this._timelineZoomMenu.style.display = "flex";
      }
    });

    var btn = document.createElement("small-svg-button");
    btn.init(
      `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"  stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <line x1="4" y1="19" x2="20" y2="19" />
        <polyline points="4 15 8 9 12 11 16 6 20 10" />
      </svg>`,
      "Entity Timeline Info",
      "entity-timeline-expand-btn"
    );
    btn._button.setAttribute("title", "Toggle Entity Timeline Controls");
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
    this._playerSettingsMenu.setAttribute(
      "class",
      "annotation-canvas-overlay-menu d-flex flex-column rounded-1"
    );
    this._playerSettingsMenu.style.display = "none";
    this._shadow.appendChild(this._playerSettingsMenu);

    this._timelineUnitsMenu = document.createElement("div");
    this._timelineUnitsMenu.setAttribute(
      "class",
      "annotation-canvas-overlay-menu d-flex flex-column rounded-1"
    );
    this._timelineUnitsMenu.style.display = "none";
    this._shadow.appendChild(this._timelineUnitsMenu);

    this._videoQualityMenu = document.createElement("div");
    this._videoQualityMenu.setAttribute(
      "class",
      "annotation-canvas-overlay-menu d-flex flex-column rounded-1"
    );
    this._videoQualityMenu.style.display = "none";
    this._shadow.appendChild(this._videoQualityMenu);

    // Video settings menu
    this._playerTimelineUnits = document.createElement("div");
    this._playerTimelineUnits.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    this._playerTimelineUnits.textContent = "Timeline Units";
    this._playerSettingsMenu.appendChild(this._playerTimelineUnits);

    this._playerTimelineUnits.addEventListener("click", () => {
      this._displayTimelineUnitsMenu();
    });

    this._playerTimelineUnitsContent = document.createElement("div");
    this._playerTimelineUnitsContent.setAttribute(
      "class",
      "f3 text-purple text-semibold text-uppercase d-flex flex-grow px-2 flex-justify-right"
    );
    this._playerTimelineUnitsContent.textContent = "";
    this._playerTimelineUnits.appendChild(this._playerTimelineUnitsContent);

    var rightArrow = document.createElement("div");
    rightArrow.textContent = ">";
    this._playerTimelineUnits.appendChild(rightArrow);

    this._playerQuality = document.createElement("div");
    this._playerQuality.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    this._playerQuality.textContent = "Quality";
    this._playerSettingsMenu.appendChild(this._playerQuality);

    this._playerQuality.addEventListener("click", () => {
      this._displayQualityMenu();
    });

    this._playerQualityContent = document.createElement("div");
    this._playerQualityContent.setAttribute(
      "class",
      "f3 text-purple text-semibold text-uppercase d-flex flex-grow px-2 flex-justify-right"
    );
    this._playerQualityContent.textContent = "";
    this._playerQuality.appendChild(this._playerQualityContent);

    var rightArrow = document.createElement("div");
    rightArrow.textContent = ">";
    this._playerQuality.appendChild(rightArrow);

    this._playerPlaybackSettings = document.createElement("div");
    this._playerPlaybackSettings.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2"
    );
    this._playerPlaybackSettings.textContent = "Video Settings";
    this._playerSettingsMenu.appendChild(this._playerPlaybackSettings);

    this._playerPlaybackSettings.addEventListener("click", () => {
      this._hideCanvasMenus();
      this.dispatchEvent(
        new CustomEvent("openVideoSettings", {
          composed: true,
        })
      );
    });

    this._playerTimelineSettings = document.createElement("div");
    this._playerTimelineSettings.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2"
    );
    this._playerTimelineSettings.textContent = "Timeline Settings";
    this._playerSettingsMenu.appendChild(this._playerTimelineSettings);

    this._playerTimelineSettings.addEventListener("click", () => {
      this._hideCanvasMenus();
      this.dispatchEvent(
        new CustomEvent("openTimelineSettings", {
          composed: true,
        })
      );
    });

    // Timeline units menu
    var backOption = document.createElement("div");
    backOption.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-back annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    backOption.textContent = "< Back";
    this._timelineUnitsMenu.appendChild(backOption);
    backOption.addEventListener("click", () => {
      this._displayPlayerSettingsMenu();
    });

    this._timelineUnitsFrame = document.createElement("div");
    this._timelineUnitsFrame.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    this._timelineUnitsFrame.textContent = "Frame";
    this._timelineUnitsMenu.appendChild(this._timelineUnitsFrame);

    this._timelineUnitsFrame.addEventListener("click", () => {
      this.setTimelineDisplayMode("frame");
    });

    this._timelineUnitsRelativeTime = document.createElement("div");
    this._timelineUnitsRelativeTime.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    this._timelineUnitsRelativeTime.textContent = "Relative Time";
    this._timelineUnitsMenu.appendChild(this._timelineUnitsRelativeTime);

    this._timelineUnitsRelativeTime.addEventListener("click", () => {
      this.setTimelineDisplayMode("relativeTime");
    });

    this._timelineUnitsUTC = document.createElement("div");
    this._timelineUnitsUTC.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    this._timelineUnitsUTC.textContent = "UTC Time";
    this._timelineUnitsMenu.appendChild(this._timelineUnitsUTC);

    this._timelineUnitsUTC.addEventListener("click", () => {
      this.setTimelineDisplayMode("utc");
    });

    // Video quality menu
    var backOption = document.createElement("div");
    backOption.setAttribute(
      "class",
      "annotation-canvas-overlay-menu-back annotation-canvas-overlay-menu-option f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    backOption.textContent = "< Back";
    this._videoQualityMenu.appendChild(backOption);
    backOption.addEventListener("click", () => {
      this._displayPlayerSettingsMenu();
    });

    var wrapper = document.createElement("div");
    wrapper.setAttribute(
      "class",
      "f3 text-gray text-semibold text-uppercase d-flex flex-grow px-2 py-2 flex-items-center"
    );
    wrapper.textContent = "Playback Quality";
    this._videoQualityMenu.appendChild(wrapper);

    this._qualityControl = document.createElement("quality-control");
    this._qualityControl._advancedSettings.style.display = "none";
    this._qualityControl.setAttribute("class", "px-2");
    wrapper.appendChild(this._qualityControl);

    // Main button
    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      "Player Settings",
      "player-settings-btn"
    );
    btn._button.setAttribute("title", "Player Settings");
    btn._button.classList.remove("px-2");
    settingsDiv.appendChild(btn);
    this._playerSettingsBtn = btn;

    this._playerSettingsBtn.addEventListener("click", () => {
      this._playerSettingsBtn.blur();
      if (this._playerSettingsMenu.style.display == "flex") {
        this._hideCanvasMenus();
      } else {
        this._displayPlayerSettingsMenu();
      }
    });

    //
    // Timeline div
    //
    this._timelineDiv = document.createElement("div");
    this._timelineDiv.setAttribute(
      "class",
      "scrub__bar d-flex flex-items-center flex-grow px-4"
    );
    playerDiv.appendChild(this._timelineDiv);

    const timeDiv = document.createElement("div");
    timeDiv.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between"
    );
    playButtons.appendChild(timeDiv);

    this._currentTimeInput = document.createElement("input");
    this._currentTimeInput.setAttribute(
      "class",
      "form-control input-sm1 f2 text-center"
    );
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
    outerDiv.style.width = "100%";
    var seekDiv = document.createElement("div");
    this._slider = document.createElement("seek-bar");
    seekDiv.appendChild(this._slider);
    outerDiv.appendChild(seekDiv);
    this._preview = document.createElement("media-seek-preview");
    this._slider._shadow.appendChild(this._preview);

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
    frameDiv.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between"
    );
    playButtons.appendChild(frameDiv);

    const framePrev = document.createElement("frame-prev");
    frameDiv.appendChild(framePrev);
    this._framePrev = framePrev;

    const currentFrameWrapper = document.createElement("div");
    frameDiv.appendChild(currentFrameWrapper);

    this._currentFrameInput = document.createElement("input");
    this._currentFrameInput.setAttribute(
      "class",
      "form-control input-sm1 f2 text-center"
    );
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
    this._frameNext = frameNext;

    this._utcBtn = document.createElement("button");
    this._utcBtn.setAttribute(
      "class",
      "btn btn-small-height btn-fit-content btn-clear btn-outline text-gray f3 text-semibold px-2"
    );
    this._utcBtn.textContent = "UTC";
    this._utcBtn.style.marginLeft = "10px";
    playButtons.appendChild(this._utcBtn);

    this._utcDiv = document.createElement("div");
    this._utcDiv.setAttribute(
      "class",
      "annotation-canvas-overlay-menu d-flex flex-row flex-items-center flex-justify-between rounded-1"
    );
    this._utcDiv.style.display = "none";
    this._shadow.appendChild(this._utcDiv);

    this._utcLabel = document.createElement("span");
    this._utcLabel.setAttribute("class", "f2 text-center text-gray px-2");
    this._utcLabel.textContent = "N/A";
    this._utcDiv.appendChild(this._utcLabel);

    var btn = document.createElement("small-svg-button");
    btn.init(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
      "Copy UTC",
      "copy-utc-btn"
    );
    btn._button.classList.remove("px-2");
    this._utcDiv.appendChild(btn);
    btn.addEventListener("click", () => {
      btn.blur();
      navigator.clipboard.writeText(this._utcLabel.textContent).then(() => {
        Utilities.showSuccessIcon("Copied UTC time to clipboard!");
      });
    });

    this._utcBtn.addEventListener("click", () => {
      this._utcBtn.blur();
      var pos = this._utcBtn.getBoundingClientRect();
      this._utcDiv.style.top = `${pos.top - 60}px`;
      this._utcDiv.style.left = `${pos.left - 60}px`;
      if (this._utcDiv.style.display == "flex") {
        this._hideCanvasMenus();
        this._utcDiv.style.display = "none";
      } else {
        this._hideCanvasMenus();
        this._utcDiv.style.display = "flex";
      }
    });

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
    this.setTimelineDisplayMode("frame");
    this._videoMode = "play"; // Future growth (e.g. play | summary)

    this._shortcutsDisabled = false;

    // Magic number matching standard header + footer
    // #TODO This should be re-thought and more flexible initially
    this._videoHeightPadObject = { height: 210 };
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

    this._timelineMore.addEventListener("click", () => {
      this._hideCanvasMenus();
      this._displayTimelineLabels = !this._displayTimelineLabels;
      this._entityTimeline.showFocus(
        this._displayTimelineLabels,
        this._video.currentFrame()
      );
      this._videoHeightPadObject.height =
        this._headerFooterPad +
        this._controls.offsetHeight +
        this._timelineDiv.offsetHeight;
      window.dispatchEvent(new Event("resize"));
    });

    this._video.addEventListener("bufferLoaded", (evt) => {
      this._slider.onBufferLoaded(evt);
    });

    this._video.addEventListener("onDemandDetail", (evt) => {
      this._slider.onDemandLoaded(evt);
    });

    this._video.addEventListener("maxPlaybackRate", (evt) => {
      this._rateControl.max = evt.detail.rate;
    });

    this._video.addEventListener("videoLengthChanged", (evt) => {
      this._slider.setAttribute("max", evt.detail.length);
      this._totalTime.textContent =
        "/ " + frameToTime(evt.detail.length - 1, this._mediaInfo.fps);
      this._totalTime.style.width =
        10 * (this._totalTime.textContent.length - 1) + 5 + "px";
    });

    // In the event the first frame of the video isn't frame 0.
    this._video.addEventListener("firstFrame", (evt) => {
      this._slider.setAttribute("min", evt.detail.value);
    });

    // When a playback is stalled, pause the video
    this._video.addEventListener("playbackStalled", (evt) => {
      Utilities.warningAlert("Video playback stalled.");
      this.pause();
    });

    this._video.addEventListener("rateChange", (evt) => {
      if (this.is_paused()) {
        this._video.onDemandDownloadPrefetch();
        this.checkReady();
      }
    });

    this._slider.addEventListener("input", (evt) => {
      this.handleSliderInput(evt);
    });

    this._slider.addEventListener("change", (evt) => {
      this.handleSliderChange(evt);
    });

    this._slider.addEventListener("framePreview", (evt) => {
      this.handleFramePreview(evt);
    });

    this._slider.addEventListener("hidePreview", () => {
      this._preview.hide();
    });

    play.addEventListener("click", () => {
      this._hideCanvasMenus();
      if (this.is_paused()) {
        this.play();
      } else {
        this.pause();
      }
    });

    rewind.addEventListener("click", () => {
      this._hideCanvasMenus();
      this.playBackwards();
    });

    fastForward.addEventListener("click", () => {
      this._hideCanvasMenus();
      this._video.pause();
      this._video.rateChange(2 * this._rate);
      if (this._video.play()) {
        play.removeAttribute("is-paused");
      }
    });

    framePrev.addEventListener("click", () => {
      this._hideCanvasMenus();
      if (this.is_paused() == false) {
        fastForward.removeAttribute("disabled");
        rewind.removeAttribute("disabled");
        this._video.pause().then(() => {
          this._video.back();
        });
      } else {
        this._video.back();
      }
    });

    frameNext.addEventListener("click", () => {
      this._hideCanvasMenus();
      if (this.is_paused() == false) {
        fastForward.removeAttribute("disabled");
        rewind.removeAttribute("disabled");
        this._video.pause().then(() => {
          this._video.advance();
        });
      } else {
        this._video.advance();
      }
    });

    this._video.addEventListener("canvasResized", () => {
      this._videoTimeline.redraw();
      this._entityTimeline.redraw();
    });

    this._video.addEventListener("frameChange", (evt) => {
      const frame = evt.detail.frame;

      const time = frameToTime(frame, this._mediaInfo.fps);
      this._currentTimeText.textContent = time;
      this._currentFrameText.textContent = frame;
      this._currentTimeText.style.width = 10 * (time.length - 1) + 5 + "px";
      this._currentFrameText.style.width = 15 * String(frame).length + "px";

      if (this._timeStore != null) {
        if (this._timeStore.utcEnabled()) {
          this._utcLabel.textContent =
            this._timeStore.getAbsoluteTimeFromFrame(frame);
        }
      }
      this._slider.value = frame;
    });

    this._video.addEventListener("playbackEnded", (evt) => {
      this.pause();
    });

    this._video.addEventListener("playbackReady", () => {
      if (this.is_paused()) {
        this._playInteraction.enable();
      }
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
      if (this._currentFrameText.getAttribute("disabled") != null) {
        return;
      }
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
      document.body.classList.remove("shortcuts-disabled");
      this._currentTimeText.style.display = "block";
      this._currentTimeInput.style.display = "none";
      this.processTimeInput();
    });

    this._currentTimeText.addEventListener("click", () => {
      if (this._currentTimeText.getAttribute("disabled") != null) {
        return;
      }
      this._hideCanvasMenus();
      this._currentTimeInput.style.display = "block";
      this._currentTimeInput.focus();
      this._currentTimeText.style.display = "none";
    });

    /**
     * Seek/timeline event listeners
     */
    this._videoTimeline.addEventListener("input", (evt) => {
      this.handleSliderInput(evt);
    });

    this._videoTimeline.addEventListener("newFrameRange", (evt) => {
      this._slider.setAttribute("min", evt.detail.start);
      this._slider.setAttribute("max", evt.detail.end);
      this._entityTimeline.init(evt.detail.start, evt.detail.end);
    });

    this._entityTimeline.addEventListener("selectFrame", (evt) => {
      this._slider.value = evt.detail.frame;
      this.handleSliderChange(evt);
    });

    this._entityTimeline.addEventListener("graphData", (evt) => {
      if (
        evt.detail.numericalData.length > 0 ||
        evt.detail.stateData.length > 0
      ) {
        this._timelineMore.style.display = "block";
      } else {
        this._timelineMore.style.display = "none";
      }
      this._videoHeightPadObject.height =
        this._headerFooterPad +
        this._controls.offsetHeight +
        this._timelineDiv.offsetHeight;
      window.dispatchEvent(new Event("resize"));
    });

    fullscreen.addEventListener("click", (evt) => {
      this._hideCanvasMenus();
      if (fullscreen.hasAttribute("is-maximized")) {
        fullscreen.removeAttribute("is-maximized");
        playerDiv.classList.remove("is-full-screen");
        this.dispatchEvent(new Event("minimize", { composed: true }));
      } else {
        fullscreen.setAttribute("is-maximized", "");
        playerDiv.classList.add("is-full-screen");
        this.dispatchEvent(new Event("maximize", { composed: true }));
      }
      window.dispatchEvent(new Event("resize"));
    });

    this._qualityControl.addEventListener("setQuality", (evt) => {
      this.dispatchEvent(
        new CustomEvent("setPlayQuality", {
          composed: true,
          detail: {
            quality: evt.detail.quality,
          },
        })
      );
    });

    document.addEventListener("keydown", (evt) => {
      if (this._shortcutsDisabled) {
        return;
      }

      if (document.body.classList.contains("shortcuts-disabled")) {
        return;
      }

      if (evt.ctrlKey && evt.key == "m") {
        fullscreen.click();
      } else if (evt.key == "t") {
        this.dispatchEvent(new Event("toggleTextOverlay", { composed: true }));
      } else if (evt.code == "Space") {
        evt.preventDefault();
        if (this._play._button.hasAttribute("disabled")) {
          return;
        }
        if (this.is_paused()) {
          this.play();
        } else {
          this.pause();
        }
      } else if (evt.key == "r") {
        evt.preventDefault();
        if (this._play._button.hasAttribute("disabled")) {
          return;
        }
        if (this.is_paused()) {
          this.playBackwards();
        }
      } else if (evt.key == 1) {
        if (!this._rateControl.hasAttribute("disabled")) {
          this._rateControl.setValue(1);
        }
      } else if (evt.key == 2) {
        if (!this._rateControl.hasAttribute("disabled")) {
          this._rateControl.setValue(2);
        }
      } else if (evt.key == 4) {
        if (!this._rateControl.hasAttribute("disabled")) {
          this._rateControl.setValue(4);
        }
      } else if (evt.key == "ArrowUp" && evt.ctrlKey) {
        if (!this._rateControl.hasAttribute("disabled")) {
          const newIdx = this._rateControl.getIdx() + 1;
          const newRate = this._rateControl.rateForIdx(newIdx);
          if (
            this._ratesAvailable == null ||
            (newRate >= this._ratesAvailable.minimum &&
              newRate <= this._ratesAvailable.maximum)
          ) {
            this._rateControl.setIdx(newIdx);
          }
        }
      } else if (evt.key == "ArrowDown" && evt.ctrlKey) {
        if (!this._rateControl.hasAttribute("disabled")) {
          const newIdx = this._rateControl.getIdx() - 1;
          const newRate = this._rateControl.rateForIdx(newIdx);
          if (
            this._ratesAvailable == null ||
            (newRate >= this._ratesAvailable.minimum &&
              newRate <= this._ratesAvailable.maximum)
          ) {
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

  _setToPlayMode() {
    this._videoMode = "play";

    this._videoTimeline.style.display = "block";

    this._videoTimeline.init(0, this._timeStore.getLastGlobalFrame());
    this._entityTimeline.init(0, this._timeStore.getLastGlobalFrame());
    this._displayTimelineLabels = false;

    this._slider.setAttribute("min", 0);
    this._slider.setAttribute("max", this._timeStore.getLastGlobalFrame());

    this._qualityControl.removeAttribute("disabled");
    this._rateControl.removeAttribute("disabled");

    this._resizeWindow();
  }

  _resizeWindow() {
    this._videoHeightPadObject.height =
      this._headerFooterPad +
      this._controls.offsetHeight +
      this._timelineDiv.offsetHeight;
    window.dispatchEvent(new Event("resize"));
  }

  _resizeHandler() {
    this._hideCanvasMenus();
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

  set quality(val) {
    this._qualityControl.quality = val;
  }

  enableQualityChange() {
    this._qualityControl.removeAttribute("disabled");
  }
  disableQualityChange() {
    this._qualityControl.setAttribute("disabled", "");
  }

  enableRateChange() {
    this._rateControl.removeAttribute("disabled");
  }
  disableRateChange() {
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
   * Callback used when user slides on one of the seek bar sliders
   */
  handleSliderInput(evt) {
    // Along allow a scrub display as the user is going slow
    const now = Date.now();
    const frame = Number(evt.target.value);
    const waitOk = now - this._lastScrub > this._scrubInterval;
    this._video.scrubbing = true;
    if (
      this._video.keyframeOnly == false &&
      Math.abs(frame - this._video.currentFrame()) > 10
    ) {
      this._video.keyframeOnly = true;
    } else {
      // Let the user slow down and get frame by frame scrubing
      this._video.keyframeOnly = false;
    }
    if (waitOk) {
      this._lastScrub = Date.now();
      this._videoStatus = "paused";

      this._play.setAttribute("is-paused", "");
      this._video.stopPlayerThread();
      this._video.shutdownOnDemandDownload();
      this._video.seekFrame(frame, this._video.drawFrame);
      this.dispatchEvent(new CustomEvent("updateURL", { composed: true }));
    }
  }

  /**
   * Callback used when a user hovers over the seek bar
   */
  async handleFramePreview(evt) {
     let proposed_value = evt.detail.frame;
     if (proposed_value > 0) {
      // Get frame preview image
      const existing = this._preview.info;

      // If we are already on this frame save some resources and just show the preview as-is
      if (existing.frame != proposed_value) {
        let frame = await this._video.getScrubFrame(proposed_value);
        this._preview.image = frame;
        frame.close();
      }


      if (this._timeMode == "utc") {
        let timeStr =
          this._timeStore.getAbsoluteTimeFromFrame(proposed_value);
        timeStr = timeStr.split("T")[1].split(".")[0];

        this._preview.info = {
          frame: proposed_value,
          x: evt.detail.clientX,
          y: evt.detail.clientY+15, // Add 15 due to page layout
          time: timeStr,
          image: true,
        };
      } else {
        this._preview.info = {
          frame: proposed_value,
          x: evt.detail.clientX,
          y: evt.detail.clientY+15, // Add 15 due to page layout
          time: frameToTime(proposed_value, this._fps),
          image: true,
        };
      }
    } else {
      this._preview.hide();
    }
  }
  /**
   * Callback used when user clicks one of the seek bars
   */
  handleSliderChange(evt) {
    this._play.setAttribute("is-paused", "");
    this.dispatchEvent(new Event("displayLoading", { composed: true }));
    // Only use the current frame to prevent glitches
    let frame = this._video.currentFrame();
    if (evt.detail) {
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
      this._lastScrub = Date.now();
      this._videoStatus = "paused";
      this.checkReady();
      this.dispatchEvent(new Event("hideLoading", { composed: true }));
      this.dispatchEvent(new CustomEvent("updateURL", { composed: true }));
    }); /*;.catch((e) => {
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
      console.log(
        "Provided invalid frame input: " + this._currentFrameInput.value
      );
      this._currentFrameInput.classList.add("has-border");
      this._currentFrameInput.classList.add("is-invalid");
      return;
    }

    const maxFrame = this._mediaInfo.num_frames - 1;
    if (frame > maxFrame - 1) {
      // #TODO Fix in the future once video.js has been sorted out.
      frame = maxFrame - 1;
    } else if (frame < 0) {
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
    if (timeTokens.length != 2) {
      console.log(
        "Provided invalid time (minutes:seconds) expected: " +
          this._currentTimeInput.value
      );
      this._currentTimeInput.classList.add("has-border");
      this._currentTimeInput.classList.add("is-invalid");
      return;
    }

    var minutes = parseInt(timeTokens[0]);
    if (isNaN(minutes)) {
      console.log(
        "Provided invalid time (minutes:seconds) expected: " +
          this._currentTimeInput.value
      );
      this._currentTimeInput.classList.add("has-border");
      this._currentTimeInput.classList.add("is-invalid");
      return;
    }

    var seconds = parseInt(timeTokens[1]);
    if (isNaN(seconds)) {
      console.log(
        "Provided invalid time (minutes:seconds) expected: " +
          this._currentTimeInput.value
      );
      this._currentTimeInput.classList.add("has-border");
      this._currentTimeInput.classList.add("is-invalid");
      return;
    }

    var frame = this._timeToFrame(minutes, seconds);
    const maxFrame = this._mediaInfo.num_frames - 1;
    if (frame > maxFrame) {
      frame = maxFrame;
    } else if (frame < 0) {
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

  addDomParent(val) {
    this._video.domParents.push(val);
  }

  set undoBuffer(val) {
    this._video.undoBuffer = val;
  }

  set mediaInfo(val) {
    const searchParams = new URLSearchParams(window.location.search);
    this._video.mediaInfo = val;
    this._mediaInfo = val;
    const dims = [val.width, val.height];
    this._slider.setAttribute("min", 0);
    // Max value on slider is 1 less the frame count.
    this._slider.setAttribute("max", Number(val.num_frames) - 1);
    this._slider.fps = val.fps;
    this._preview.mediaInfo = val;
    this._fps = val.fps;
    this._totalTime.textContent =
      "/ " + frameToTime(val.num_frames, this._mediaInfo.fps);
    this._totalTime.style.width =
      10 * (this._totalTime.textContent.length - 1) + 5 + "px";
    this._video
      .loadFromVideoObject(
        val,
        this.mediaType,
        this._quality,
        null,
        null,
        null,
        this._videoHeightPadObject,
        this._seekQuality,
        this._scrubQuality
      )
      .then(() => {
        if (this._video.allowSafeMode) {
          this._video.allowSafeMode = this._allowSafeMode;
        } else {
          this._allowSafeMode = false;
        }
        if (searchParams.has("playbackRate")) {
          this._rateControl.setValue(Number(searchParams.get("playbackRate")));
          this.setRate(Number(searchParams.get("playbackRate")));
        }
        const seekInfo = this._video.getQuality("seek");
        const scrubInfo = this._video.getQuality("scrub");
        const playInfo = this._video.getQuality("play");
        this.checkReady();

        this._timeStore = new TimeStore(this._mediaInfo, this.mediaType);
        if (!this._timeStore.utcEnabled()) {
          this._utcBtn.style.display = "none";
          this._timelineUnitsUTC.style.display = "none";
        }
        this._videoTimeline.timeStore = this._timeStore;
        this._entityTimeline.timeStore = this._timeStore;
        this._videoTimeline.timeStoreInitialized();
        this._entityTimeline.timeStoreInitialized();

        this._setToPlayMode();

        this.dispatchEvent(
          new CustomEvent("defaultVideoSettings", {
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
              allowSafeMode: this._allowSafeMode,
            },
          })
        );

        this.dispatchEvent(
          new Event("canvasReady", {
            composed: true,
          })
        );
      })
      .catch((exc) => {
        console.error(exc);
        this._video.displayErrorMessage(
          `Error occurred. Could not load media: ${val.id}`
        );
        this.dispatchEvent(
          new Event("videoInitError", {
            composed: true,
          })
        );
      });
    if (this._video.audio != true) {
      // Hide volume on videos with no audio
      this._volume_control.style.display = "none";
    }
    this._volume_control.volume = this.mediaType["default_volume"];
    if (val.media_files && "streaming" in val.media_files) {
      let quality_list = [];
      for (let media_file of val.media_files["streaming"]) {
        quality_list.push(media_file.resolution[0]);
      }
      this._qualityControl.resolutions = quality_list;
      this._qualityControl.show();
    } else {
      this._qualityControl.hide();
    }
  }

  set annotationData(val) {
    this._video.annotationData = val;
    this._entityTimeline.annotationData = val;
  }

  set timelineSettings(val) {
    this._timelineSettings = val;
    this._entityTimeline.timelineSettings = val;
  }

  set stretch(val) {
    // Note: This could potentially move into annotation.js
    //       This is required whenever stretch is reverted back from true to false.
    if (this._video._stretch == true && val == false) {
      this._video._draw.resizeViewport(
        this._video._dims[0],
        this._video._dims[1]
      );
    }

    this._video.stretch = val;
    this._video.forceSizeChange();
  }

  _displayPlayerSettingsMenu() {
    this._hideCanvasMenus();

    var pos = this._playerSettingsBtn.getBoundingClientRect();
    this._playerSettingsMenu.style.top = `${pos.top - 150}px`;
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
    } else {
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
    this._utcDiv.style.display = "none";
  }

  /**
   * Sets display mode to be used for the timelines
   * @param {string} mode "frame"|"relativeTime"|"utc"
   */
  setTimelineDisplayMode(mode) {
    this._displayMode = mode;
    if (this._timeStore != null) {
      if (!this._timeStore.utcEnabled() && mode == "utc") {
        this._displayMode = "frame";
      }
    }

    if (["frame", "relativeTime", "utc"].indexOf(mode) < 0) {
      this._displayMode = "frame";
      console.warn(`Invalid timeline display mode: ${mode}`);
    }

    this._videoTimeline.setDisplayMode(this._displayMode);
    this._entityTimeline.setDisplayMode(this._displayMode);

    if (this._displayMode == "utc") {
      this._timeMode = "utc";
    } else {
      this._timeMode = "relative";
    }

    this.dispatchEvent(
      new CustomEvent("setTimelineDisplayMode", {
        composed: true,
        detail: {
          mode: this._displayMode,
        },
      })
    );
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

  is_paused() {
    return this._play.hasAttribute("is-paused");
  }

  checkReady() {
    if (
      this._video.bufferDelayRequired() &&
      this._video.onDemandBufferAvailable() == false
    ) {
      this.handleNotReadyEvent();
    } else {
      // TODO refactor this into a member function
      this._playInteraction.enable();
    }
  }
  handleNotReadyEvent() {
    if (this._playerDownloadDisabled) {
      // Don't bother attempting to check if playback is ready if downloads have been disabled.
      return;
    }

    if (this._video.isInCompatibilityMode() == true) {
      // Compatibility videos are always ready to play.
      return;
    }

    if (this._handleNotReadyTimeout != null) {
      console.log("Already handling a not ready event");
      return;
    }
    this._video.onDemandDownloadPrefetch(-1);
    this._playInteraction.disable();

    const timeouts = [3000, 6000, 12000, 16000];
    var timeoutIndex = 0;
    var timeoutCounter = 0;
    const clock_check = 1000 / 3;
    this._last_duration = this._video.playBufferDuration();

    var last_check = performance.now();
    let check_ready = (checkFrame) => {
      clearTimeout(this._handleNotReadyTimeout);
      this._handleNotReadyTimeout = null;

      if (this._videoStatus == "playing") {
        console.warn(
          `Player status == ${this._videoStatus} | Cancelling check_ready`
        );
        return;
      }

      const now = performance.now();
      timeoutCounter += now - last_check;
      console.info(
        `${now}: Timeout Counter ${timeoutCounter} LAST=${last_check}`
      );
      last_check = now;

      let not_ready = false;
      if (checkFrame != this._video.currentFrame()) {
        console.log(
          `check_ready frame ${checkFrame} and current frame ${this._video.currentFrame()} do not match. restarting check_ready`
        );
        timeoutIndex = 0;
        timeoutCounter = 0;
        clearTimeout(this._handleNotReadyTimeout);
        this._handleNotReadyTimeout = null;
        this._handleNotReadyTimeout = setTimeout(() => {
          check_ready(this._video.currentFrame());
        }, 100);
        return;
      }
      if (this._video.onDemandBufferAvailable() == false) {
        not_ready = true;
        if (timeoutCounter >= timeouts[timeoutIndex]) {
          timeoutCounter = 0;
          timeoutIndex += 1;
          console.log(
            `Video playback check - restart [Now: ${new Date().toISOString()}]`
          );
          this._video.onDemandDownloadPrefetch(
            Math.max(0, this._video.currentFrame() - 200)
          );
        }
      }
      if (not_ready == true) {
        // Heal the buffer state if duration increases since the last time we looked
        if (this._video.playBufferDuration() > this._last_duration) {
          timeoutCounter = 0; //truncate
          timeoutIndex = 0;
        }
        this._last_duration = this._video.playBufferDuration();
        // For this logic to work it is actually based off the worst case
        // number of clocks in a given timeout attempt.
        if (timeoutIndex < timeouts[timeouts.length - 1] / clock_check) {
          //console.log(`Video playback check - Not ready: checking in ${timeouts[timeoutIndex]/1000} seconds [Now: ${new Date().toISOString()}]`);
          clearTimeout(this._handleNotReadyTimeout);
          this._handleNotReadyTimeout = null;
          this._handleNotReadyTimeout = setTimeout(() => {
            check_ready(checkFrame);
          }, clock_check);
        } else {
          Utilities.warningAlert(
            "Video player unable to reach ready state.",
            "#ff3e1d",
            false
          );
          console.error(`Video player unable to reach ready state`);
        }
      }
      if (not_ready == false) {
        this._video
          .seekFrame(
            this._video.currentFrame(),
            this._video.drawFrame,
            true,
            null,
            true
          )
          .then(() => {
            console.log(
              `Video playback check - Ready [Now: ${new Date().toISOString()}]`
            );
            this._playInteraction.enable();
          })
          .catch((e) => {
            console.log(e);
            console.log(
              `Video playback check - Ready [Now: ${new Date().toISOString()}] (not hq pause)`
            );
            this._playInteraction.enable();
          });
      }
    };

    clearTimeout(this._handleNotReadyTimeout);
    this._handleNotReadyTimeout = null;
    // We can be faster in single play mode
    this._handleNotReadyTimeout = setTimeout(
      check_ready(this._video.currentFrame()),
      clock_check
    );
  }

  play() {
    if (this._rate > RATE_CUTOFF_FOR_ON_DEMAND) {
      // Check to see if the video player can play at this rate
      // at the current frame. If not, inform the user.
      if (!this._video.canPlayRate(this._rate, this._video.currentFrame())) {
        window.alert(
          "Please wait until this portion of the video has been downloaded. Playing at speeds greater than 4x require the video to be buffered."
        );
        return;
      }
    }
    this._ratesAvailable = this._video.playbackRatesAvailable();

    if (
      this._video.bufferDelayRequired() &&
      this._video.onDemandBufferAvailable() == false
    ) {
      this.handleNotReadyEvent();
      return;
    }

    if (this._video.currentFrame() >= this._video._numFrames - 1) {
      this.pause();
      return;
    }

    this._fastForward.setAttribute("disabled", "");
    this._rewind.setAttribute("disabled", "");

    const paused = this.is_paused();
    if (paused) {
      this._video.rateChange(this._rate);
      if (this._video.play()) {
        this._videoStatus = "playing";
        this._play.removeAttribute("is-paused");
      }
    }
  }

  playBackwards() {
    if (this._video.currentFrame() <= 0) {
      this.pause();
      return;
    }

    const paused = this.is_paused();
    if (paused) {
      this._fastForward.setAttribute("disabled", "");
      this._rewind.setAttribute("disabled", "");
      this.disableRateChange();
      //if (this._rateControl.value > 1)
      //{
      //  this._rateControl.setValue(1.0, true);
      //  this._video.rateChange(this._rate);
      //}
      if (this._video.playBackwards()) {
        this._videoStatus = "playing";
        this._play.removeAttribute("is-paused");
      }
    }
  }

  pause() {
    this._ratesAvailable = null;
    this._fastForward.removeAttribute("disabled");
    this._rewind.removeAttribute("disabled");
    this.enableRateChange();

    const paused = this.is_paused();
    if (paused == false) {
      this._videoStatus = "paused";
      this._video.pause();
      this._play.setAttribute("is-paused", "");
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
    this.dispatchEvent(new CustomEvent("updateURL", { composed: true }));
  }

  setQuality(quality, buffer) {
    // For now reload the video
    if (this.is_paused()) {
      this._video.setQuality(quality, buffer);
    } else {
      this.pause();
      this._video.setQuality(quality, buffer);
    }
    this._playInteraction.disable();
    this._video.onDemandDownloadPrefetch(this._video.currentFrame());
    this.checkReady();
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
    this._video.style.cursor = "zoom-in";
    this._video.zoomIn();
  }

  zoomOut() {
    this._video.zoomOut();
  }

  pan() {
    this._video.style.cursor = "move";
    this._video.pan();
  }

  // Go to the frame at the highest resolution
  goToFrame(frame) {
    this._video.onPlay();
    return this._video.gotoFrame(frame, true);
  }

  selectNone() {
    this._video.selectNone();
    this.selectTimelineData();
  }

  selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame) {
    this._video.selectLocalization(
      loc,
      skipAnimation,
      muteOthers,
      skipGoToFrame
    );
    this.selectTimelineData(loc);
  }

  selectTrackUsingId(stateId, stateTypeId, frameHint, skipGoToFrame) {
    this._video.selectTrackUsingId(
      stateId,
      stateTypeId,
      frameHint,
      skipGoToFrame
    );
  }

  selectTrack(track, frameHint, skipGoToFrame) {
    this._video.selectTrack(track, frameHint, skipGoToFrame);
    this.selectTimelineData(track);
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

  /**
   * This highlights a particular localization, frame range state, or track on the entity timeline.
   * Provide null to deselect.
   *
   * @param {Tator.Localization | Tator.State | null} data
   */
  selectTimelineData(data) {
    this._entityTimeline.selectEntity(data);
  }

  updateTimeline() {
    this._entityTimeline.updateData();
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
      allowSafeMode: this._allowSafeMode,
    };
  }
}

customElements.define("annotation-player", AnnotationPlayer);
