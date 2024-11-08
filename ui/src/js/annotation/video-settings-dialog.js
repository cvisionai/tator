import { ModalDialog } from "../components/modal-dialog.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../util/utilities.js";

export class VideoSettingsDialog extends ModalDialog {
  constructor() {
    super();

    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._title.nodeValue = "Advanced Video Settings";

    this._tabsDiv = document.createElement("div");
    this._tabsDiv.setAttribute(
      "class",
      "d-flex flex-grow flex-justify-center mb-3"
    );
    this._main.appendChild(this._tabsDiv);

    this._controlsButton = document.createElement("button");
    this._controlsButton.setAttribute("class", "tab-btn");
    this._controlsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill mr-1" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path>
    <circle cx="12" cy="12" r="3"></circle>
 </svg> Controls`;
    this._tabsDiv.appendChild(this._controlsButton);

    this._infoButton = document.createElement("button");
    this._infoButton.setAttribute("class", "tab-btn");
    this._infoButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill mr-1" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <circle cx="12" cy="12" r="9"></circle>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
    <polyline points="11 12 12 12 12 16 13 16"></polyline>
 </svg> Media Info`;
    this._tabsDiv.appendChild(this._infoButton);

    this._controlsButton.addEventListener("click", () => {
      this._controlsButton.blur();
      this._controlsButton.classList.add("active");
      this._infoButton.classList.remove("active");
      this._displayPage("controls");
    });
    this._infoButton.addEventListener("click", () => {
      this._infoButton.blur();
      this._controlsButton.classList.remove("active");
      this._infoButton.classList.add("active");
      this._displayPage("info");
    });

    this._mediaInfoDiv = document.createElement("div");
    this._mediaInfoDiv.setAttribute(
      "class",
      "analysis__filter_conditions d-flex py-2 px-2 flex-column"
    );
    this._main.appendChild(this._mediaInfoDiv);

    this._controlsDiv = document.createElement("div");
    this._controlsDiv.setAttribute(
      "class",
      "analysis__filter_conditions d-flex py-2 px-2 flex-column"
    );
    this._main.appendChild(this._controlsDiv);

    this._gridDiv = document.createElement("div");
    this._gridDiv.setAttribute("class", "video__settings py-4 px-4 text-gray");
    this._controlsDiv.appendChild(this._gridDiv);

    const gridLabel = document.createElement("div");
    gridLabel.setAttribute(
      "class",
      "h3 d-flex flex-items-center text-uppercase"
    );
    gridLabel.textContent = "Video Buffer Sources";
    gridLabel.style.gridColumn = 1;
    gridLabel.style.gridRow = 1;
    this._gridDiv.appendChild(gridLabel);

    const defaultButton = document.createElement("button");
    defaultButton.setAttribute(
      "class",
      "btn btn-clear btn-charcoal col-12 btn-small"
    );
    defaultButton.textContent = "Restore Defaults";
    defaultButton.style.gridColumn = 2;
    defaultButton.style.gridRow = 1;
    this._gridDiv.appendChild(defaultButton);

    const otherGridDiv = document.createElement("div");
    otherGridDiv.setAttribute("class", "video__settings py-4 px-4 text-gray");
    this._controlsDiv.appendChild(otherGridDiv);

    const overlayHeaderDiv = document.createElement("div");
    overlayHeaderDiv.style.gridColumn = 1;
    overlayHeaderDiv.style.gridRow = 1;
    otherGridDiv.appendChild(overlayHeaderDiv);

    const overlayHeader = document.createElement("div");
    overlayHeader.textContent = "Diagnostics Overlay";
    overlayHeader.setAttribute(
      "class",
      "h3 d-flex flex-items-center text-uppercase"
    );
    overlayHeaderDiv.appendChild(overlayHeader);

    const overlaySubHeader = document.createElement("div");
    overlaySubHeader.textContent =
      "Toggle displaying video's ID, current frame, FPS, and source qualities";
    overlaySubHeader.setAttribute("class", "text-gray f2");
    overlayHeaderDiv.appendChild(overlaySubHeader);

    const overlayOption = document.createElement("bool-input");
    overlayOption.setAttribute("class", "col-12");
    overlayOption.style.gridColumn = 2;
    overlayOption.style.gridRow = 1;
    overlayOption.setAttribute("name", "");
    overlayOption.setAttribute("off-text", "Off");
    overlayOption.setAttribute("on-text", "On");
    overlayOption.reset();
    otherGridDiv.appendChild(overlayOption);

    const stretchHeaderDiv = document.createElement("div");
    stretchHeaderDiv.style.gridColumn = 1;
    stretchHeaderDiv.style.gridRow = 2;
    otherGridDiv.appendChild(stretchHeaderDiv);

    const stretchHeader = document.createElement("div");
    stretchHeader.textContent = "Stretch Video";
    stretchHeader.setAttribute(
      "class",
      "h3 d-flex flex-items-center text-uppercase"
    );
    stretchHeaderDiv.appendChild(stretchHeader);

    const stretchSubHeader = document.createElement("div");
    stretchSubHeader.textContent =
      "Toggle stretching video to fill the player window or leave it in its original dimensions";
    stretchSubHeader.setAttribute("class", "text-gray f2");
    stretchHeaderDiv.appendChild(stretchSubHeader);

    this._stretchOption = document.createElement("bool-input");
    this._stretchOption.setAttribute("class", "col-12");
    this._stretchOption.style.gridColumn = 2;
    this._stretchOption.style.gridRow = 2;
    this._stretchOption.setAttribute("name", "");
    this._stretchOption.setAttribute("off-text", "Off");
    this._stretchOption.setAttribute("on-text", "On");
    this._stretchOption.reset();
    otherGridDiv.appendChild(this._stretchOption);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Apply";
    this._footer.appendChild(apply);

    // Dispatches the event with the quality information
    apply.addEventListener("click", () => {
      this.removeAttribute("is-open");
      this.dispatchEvent(new Event("close"));
      this.dispatchEvent(
        new CustomEvent("applyVideoSources", {
          composed: true,
          detail: {
            playback: this.getSourceObject("play"),
            seek: this.getSourceObject("seek"),
            scrub: this.getSourceObject("scrub"),
          },
        })
      );

      // Set the video quality search parameters
      var searchParams = new URLSearchParams(window.location.search);
      searchParams = this.queryParams(searchParams);
      const path = document.location.pathname;
      const searchArgs = searchParams.toString();
      var newUrl = path + "?" + searchArgs;
      window.history.replaceState(null, "VideoSettings", newUrl);
    });

    // Sets all the choices to the defaults
    defaultButton.addEventListener("click", () => {
      this.applyDefaults();
    });

    // Display video diagnostics
    overlayOption.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("displayOverlays", {
          composed: true,
          detail: {
            displayDiagnostic: overlayOption.getValue(),
          },
        })
      );
    });

    // Stretch video to fill player window
    this._stretchOption.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("stretchVideo", {
          composed: true,
          detail: {
            stretch: this._stretchOption.getValue(),
          },
        })
      );
    });

    this._divOptions = {};
    this._createBuffer(
      2,
      "scrub",
      "Scrub Buffer",
      "Timeline scrubbing, downloaded playback, greater than 4x playback"
    );
    this._createBuffer(3, "seek", "Seek Quality", "Pause quality");
    this._createBuffer(
      4,
      "play",
      "On-Demand 1x-4x Playback",
      "1x-4x playback for single vidoes and grid videos"
    );

    this._controlsButton.click();
  }

  /**
   * @param {string} page "info" | "controls"
   */
  _displayPage(page) {
    if (page == "info") {
      this._mediaInfoDiv.style.display = "flex";
      this._controlsDiv.style.display = "none";
      this._footer.style.display = "none";
    } else if (page == "controls") {
      this._mediaInfoDiv.style.display = "none";
      this._controlsDiv.style.display = "flex";
      this._footer.style.display = "flex";
    }
  }

  /**
   * Helper function for _setInfoPage
   * @param {HTMLElement} parentDiv
   * @param {string} title
   * @param {Tator.Media} media
   */
  _createMediaTable(parentDiv, title, media) {
    var wrapper = document.createElement("div");
    wrapper.setAttribute("class", "py-3");
    parentDiv.appendChild(wrapper);

    var table = document.createElement("table");
    table.setAttribute("class", "video-settings-info-table text-gray f3");
    wrapper.appendChild(table);

    var thead = document.createElement("thead");
    thead.setAttribute("class", "text-white");
    table.appendChild(thead);

    var trHead = document.createElement("tr");
    thead.appendChild(trHead);

    var th = document.createElement("th");
    th.setAttribute("class", "py-2");
    th.textContent = title;
    th.colSpan = 2;
    trHead.appendChild(th);

    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    var attrs = [
      "archive_state",
      "codec",
      "fps",
      "height",
      "id",
      "name",
      "num_frames",
      "width",
    ];
    for (const attr of attrs) {
      var trData = document.createElement("tr");
      tbody.appendChild(trData);

      var td = document.createElement("td");
      td.setAttribute("class", "py-2 no-vertical-border col-4");
      td.textContent = attr;
      trData.appendChild(td);

      var val = media[attr];

      var td = document.createElement("td");
      td.setAttribute("class", "py-2 no-vertical-border col-8");
      td.textContent = val;
      trData.appendChild(td);
    }

    var table = document.createElement("table");
    table.setAttribute("class", "video-settings-info-table text-gray f3");
    wrapper.appendChild(table);

    var media_file_types = ["archival", "audio", "streaming"];
    for (const media_file_type of media_file_types) {
      if (media.media_files[media_file_type] == null) {
        continue;
      }
      if (media.media_files[media_file_type].length == 0) {
        continue;
      }

      var thead = document.createElement("thead");
      thead.setAttribute("class", "text-white");
      table.appendChild(thead);

      var trHead = document.createElement("tr");
      thead.appendChild(trHead);

      var th = document.createElement("th");
      th.setAttribute("class", "py-2");
      th.textContent = `media_files: ${media_file_type}`;
      th.colSpan = 3;
      trHead.appendChild(th);

      var tbody = document.createElement("tbody");
      table.appendChild(tbody);

      for (
        let idx = 0;
        idx < media.media_files[media_file_type].length;
        idx++
      ) {
        const file = media.media_files[media_file_type][idx];
        for (const attr of [
          "bit_rate",
          "codec",
          "codec_description",
          "codec_mime",
          "mime",
          "resolution",
          "size",
        ]) {
          if (!file.hasOwnProperty(attr)) {
            continue;
          }
          var trData = document.createElement("tr");
          tbody.appendChild(trData);

          var td = document.createElement("td");
          td.setAttribute("class", "py-2 no-vertical-border col-1");
          if (attr == "bit_rate") {
            td.textContent = `[${idx}]`;
          } else {
            td.textContent = "";
          }
          trData.appendChild(td);

          var td = document.createElement("td");
          td.setAttribute("class", "py-2 no-vertical-border col-3");
          td.textContent = attr;
          trData.appendChild(td);

          var val = file[attr];
          if (attr == "bit_rate") {
            val = `${(file[attr] / 1024).toFixed(6)} kbps`;
          } else if (attr == "size") {
            val = `${(file[attr] / 1024 / 1024).toFixed(6)} MB`;
          }

          var td = document.createElement("td");
          td.setAttribute("class", "py-2 no-vertical-border col-8");
          td.textContent = val;
          trData.appendChild(td);
        }
      }
    }
  }

  /**
   * Queries media information if needed.
   * Expected to be called once.
   *
   * @precondition this._mode must have been set
   * @precondition this._parentMedia must have been set
   */
  async _setInfoPage() {
    var parentDiv = document.createElement("div");
    parentDiv.setAttribute("class", "px-3 py-3");
    this._mediaInfoDiv.appendChild(parentDiv);

    if (this._mode == "single") {
      this._createMediaTable(parentDiv, "Video Media", this._parentMedia);
    } else if (this._mode == "multi") {
      this._createMediaTable(parentDiv, "Multiview Media", this._parentMedia);
      for (let idx = 0; idx < this._multiMedias.length; idx++) {
        this._createMediaTable(
          parentDiv,
          `Video Media ${idx}`,
          this._multiMedias[idx]
        );
      }
    }
  }

  _createBuffer(gridRow, id, title, description) {
    this._divOptions[id] = {};

    var textDiv = document.createElement("div");
    textDiv.style.gridColumn = 1;
    textDiv.style.gridRow = gridRow;
    this._gridDiv.appendChild(textDiv);
    this._divOptions[id].textDiv = textDiv;

    const header = document.createElement("div");
    header.textContent = title;
    header.setAttribute("class", "text-semibold text-white h3");
    textDiv.appendChild(header);

    const subHeader = document.createElement("div");
    subHeader.textContent = description;
    subHeader.setAttribute("class", "text-gray f2");
    textDiv.appendChild(subHeader);

    const choiceDiv = document.createElement("div");
    choiceDiv.style.gridColumn = 2;
    choiceDiv.style.gridRow = gridRow;
    this._gridDiv.appendChild(choiceDiv);
    this._divOptions[id].choiceDiv = choiceDiv;

    const choice = document.createElement("enum-input");
    choice.setAttribute("name", "Source");
    choiceDiv.appendChild(choice);
    this._divOptions[id].choice = choice;
  }

  applySettings(settings) {
    let settingsStr = "";

    settingsStr = this.createSourceString(
      settings.scrubQuality,
      settings.scrubFPS
    );
    this._divOptions["scrub"].choice.setValue(settingsStr);

    settingsStr = this.createSourceString(
      settings.seekQuality,
      settings.seekFPS
    );
    this._divOptions["seek"].choice.setValue(settingsStr);

    settingsStr = this.createSourceString(
      settings.playQuality,
      settings.playFPS
    );
    this._divOptions["play"].choice.setValue(settingsStr);
  }

  applyDefaults() {
    if (this._defaultSources == undefined) {
      return;
    }

    this.applySettings(this._defaultSources);
  }

  /**
   * Generates the source string displayed to the user based on given parameters
   * @param {integer} quality
   * @param {float} fps
   * @returns {string}
   */
  createSourceString(quality, fps) {
    return `${quality}p, ${fps.toFixed(2)} FPS`;
  }

  /**
   * Generates the object describing the selected video source
   * @param {string} sourceName - source name used in this dialog and video.js / multiview
   * @returns {object} Has .fps {Number} and .quality {Number} and .name {string} properties
   */
  getSourceObject(sourceName) {
    var str = this._divOptions[sourceName].choice.getValue();
    const quality = parseInt(str.split("p")[0]);
    const fps = parseFloat(str.split(",")[1].split("FPS")[0]);

    return {
      quality: quality,
      fps: fps,
      name: sourceName,
    };
  }

  /**
   * @precondition this._parentMedia is set with the multi Tator.Media object
   * @postcondition this._multiMedias is set as an array of Tator.Media objects
   */
  async _queryMultiMedia() {
    this._multiMedias = [];

    for (const singleId of this._parentMedia.media_files.ids) {
      var response = await fetchCredentials(
        `/rest/Media/${singleId}?presigned=28800`,
        {},
        true
      );
      var media = await response.json();
      this._multiMedias.push(media);
    }
  }

  /**
   * Currently only checks to see if the video medias referenced by the multi have the same resolutions.
   * @precondition this._multiMedias must have been set
   */
  _checkMultiMediaValidity() {
    for (const mediaA of this._multiMedias) {
      var resA = new Set();
      for (const media_file of mediaA.media_files.streaming) {
        resA.add(`${media_file.resolution[0]},${media_file.resolution[1]}`);
      }

      for (const mediaB of this._multiMedias) {
        var resB = new Set();
        for (const media_file of mediaB.media_files.streaming) {
          resB.add(`${media_file.resolution[0]},${media_file.resolution[1]}`);
        }

        var sameResolutions =
          resA.size === resB.size ||
          [...resA].every((value) => resB.has(value));
        if (!sameResolutions) {
          console.warn("Videos do not have the same resolutions!");
          break;
        }
      }
    }
  }

  /**
   * @param {string} mode - single|multi|live
   * @param {Tator.Media} media - Parent media
   */
  async mode(mode, media) {
    this._mode = mode;
    this._parentMedia = media;
    if (this._mode == "live") {
      //TODO implement this
      return;
    } else if (this._mode == "multi") {
      await this._queryMultiMedia();
      var mainVideo = this._multiMedias[0];
      this._checkMultiMediaValidity();
    } else {
      var mainVideo = this._parentMedia;
    }
    this._setInfoPage();

    let sourceList = [];
    if (
      !("streaming" in mainVideo.media_files) ||
      mainVideo.media_files["streaming"].length == 0
    ) {
      console.warn("Expected a streaming file to exist for video, found none.");
      return;
    }
    for (let mediaFile of mainVideo.media_files["streaming"]) {
      let sourceStr = this.createSourceString(
        mediaFile.resolution[0],
        mainVideo.fps
      );
      sourceList.push({ value: sourceStr });
    }

    this._divOptions["scrub"].choice.choices = sourceList;
    this._divOptions["seek"].choice.choices = sourceList;
    this._divOptions["play"].choice.choices = sourceList;

    this.applyDefaults();
  }

  /**
   * @param {object} val - source buffer info with the following properties
   *     seekQuality
   *     seekFPS
   *     scrubQuality
   *     scrubFPS
   *     playQuality
   *     playFPS
   *     allowSafeMode
   */
  set defaultSources(val) {
    this._defaultSources = val;
    this.applyDefaults();
  }

  /**
   * @param {bool} val
   *    True if the video canvas is already stretched to fill the window.
   *    False if it's locked to a specific set of max dimensions.
   */
  set stretchVideo(val) {
    this._stretchOption.setValue(val);
  }

  /**
   * Play quality options must've been set prior to using this.
   * @param {integer} quality - Resolution/quality of the play buffer. Doesn't take FPS into account
   *                            and will just pick the first matching quality.
   */
  setPlayQuality(quality) {
    var choices = this._divOptions["play"].choice.getChoices();
    for (let idx = 0; idx < choices.length; idx++) {
      const currentQuality = parseInt(choices[idx].split("p")[0]);
      if (currentQuality == quality) {
        this._divOptions["play"].choice.setValue(choices[idx]);
        return;
      }
    }
  }

  /**
   * @param {URLSearchParams} params - Existing parameters to add to. If not provided, a new
   *                                   set is created.
   * @returns URLSearchParams - Contains video related URL parameters
   */
  queryParams(params) {
    if (params == undefined) {
      params = new URLSearchParams(window.location.search);
    }

    params.delete("scrubQuality");
    params.delete("seekQuality");
    params.delete("playQuality");

    if (this._mode == "single" || this._mode == "multiview") {
      params.set(
        "scrubQuality",
        parseInt(this._divOptions["scrub"].choice.getValue().split("p")[0])
      );
      params.set(
        "seekQuality",
        parseInt(this._divOptions["seek"].choice.getValue().split("p")[0])
      );
      params.set(
        "playQuality",
        parseInt(this._divOptions["play"].choice.getValue().split("p")[0])
      );
    }
    return params;
  }
}

customElements.define("video-settings-dialog", VideoSettingsDialog);
