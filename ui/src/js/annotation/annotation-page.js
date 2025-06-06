import { TatorPage } from "../components/tator-page.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../util/utilities.js";
import { AnnotationBrowserSettings } from "./annotation-browser-settings.js";
import { TimelineSettings } from "./timeline-settings.js";
import { playerControlManagement } from "./annotation-common.js";
import { LayoutModeController } from "./layout-mode-controller.js";

class LoadingAnimation {
  constructor(canvas, img) {
    this._canvas = canvas;
    this._context = canvas.getContext("2d", { alpha: true });
    this._statusTextArray = [
      "Preparing your media...",
      "Loading metadata...",
      "Analyzing structures...",
      "Refining details...",
      "Articulating states...",
      "Finalizing components...",
      "Establishing connections...",
      "Loading applets...",
      "Compiling resources...",
      "Resolving dependencies...",
      "Reticulating splines...",
      "Synchronizing data...",
      "Translating fields...",
      "Verifying integrity...",
      "Loading assets...",
      "Adjusting inertial dampeners...",
      "Calibrating sensor data...",
      "Powering up systems...",
      "Realigning main deflector...",
      "Calibrating for data harmonics...",
      "Running Level 3 diagnostics...",
      "Initializing systems...",
      "Negotiating handshakes...",
      "Engaging heuristics...",
      "Propagating latest updates...",
      "Partitioning workloads...",
      "Unlocking constraints...",
      "Recalculating transients...",
      "Compensating for drift...",
      "Enhancing visuals...",
      "Identifying anomalies...",
    ];

    // Download image and draw it to the canvas
    this._image = new Image();
    this._image.src = img;
    this._image.onload = () => {
      this._context.drawImage(this._image, 0, 0);
      this._ready = true;
    };
    this.start();
  }

  start() {
    // Fire off _animate on each cycle
    this._animating = true;
    requestAnimationFrame(this._animate.bind(this));
    this._animationIdx = 0;
    this._startTime = performance.now();

    this._shownAlready = new Set();
    this._chosenTextIdx = Math.floor(
      Math.random() * this._statusTextArray.length
    );
    this._shownAlready.add(this._chosenTextIdx);
    this._lastTextTime = performance.now();
    this._textChangeInterval = 1250;
  }

  stop() {
    this._animating = false;
    this._animationIdx = 0;
    this._startTime = 0;
    this._animate();
  }

  _animate() {
    if (!this._ready) {
      requestAnimationFrame(this._animate.bind(this));
      return;
    }

    if (this._canvas.style.display == "none") {
      this._animating = false;
      return;
    }

    // Clear canvas
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Strobe the image in brightness osscilate between 0.5 and 1
    this._animationIdx = this._animationIdx + 1;
    this._context.globalAlpha =
      0.5 + 0.5 * Math.abs(Math.sin((this._animationIdx * 2 * Math.PI) / 180));
    this._context.drawImage(this._image, 0, 0, 461, 475);
    this._context.globalAlpha = 1;

    // Draw a bar at the bottom of the image that fills up in 'expected time'
    const expected = 5000;
    const gradiant = this._context.createLinearGradient(0, 475, 461, 475);
    gradiant.addColorStop(0, "#151b28"); // from variables.scss
    gradiant.addColorStop(1, "#262e3d"); // from variables.scss
    this._context.fillStyle = gradiant;
    const now = performance.now();
    const elapsed = now - this._startTime;
    const percent = Math.min(1, elapsed / expected);
    this._context.fillRect(0, 490, 461 * percent, 40);

    if (now - this._lastTextTime > this._textChangeInterval) {
      for (let i = 0; i < 5; i++) {
        this._chosenTextIdx = Math.floor(
          Math.random() * this._statusTextArray.length
        );
        if (!this._shownAlready.has(this._chosenTextIdx)) break;
      }
      this._shownAlready.add(this._chosenTextIdx);
      this._lastTextTime = performance.now();
    }
    this._context.font = "bold 20px Helvetica, Arial, sans-serif";
    // Calculate where to put text in loading bar to vertically center it
    const textY = 490 + 40 / 2 + 6;

    // Draw the status text
    this._context.fillStyle = "#ffffff"; // from variables.scss

    this._context.textAlign = "center";
    this._context.fillText(
      this._statusTextArray[this._chosenTextIdx],
      this._canvas.width / 2,
      textY
    );

    // Request next animation frame
    if (this._animating) requestAnimationFrame(this._animate.bind(this));
  }
}
export class AnnotationPage extends TatorPage {
  constructor() {
    super();

    this._loading = document.createElement("canvas");
    this._loading.setAttribute("width", "461");
    this._loading.setAttribute("height", "525");
    this._loading.setAttribute("class", "loading");
    this._loadingAnimation = new LoadingAnimation(
      this._loading,
      `${STATIC_PATH}/ui/src/images/tator-logo-symbol-only.webp`
    );
    this._loading.style.zIndex = 102;
    this._shadow.appendChild(this._loading);
    this._versionLookup = {};

    document.body.setAttribute("class", "no-padding-bottom");

    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute(
      "class",
      "annotation__header d-flex flex-items-center flex-justify-between px-2 f3"
    );
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);
    this._headerDiv.style.zIndex = 3;

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);

    this._prev = document.createElement("media-prev-button");
    div.appendChild(this._prev);

    this._next = document.createElement("media-next-button");
    div.appendChild(this._next);

    this._hidePrevPreview = true;
    this._hideNextPreview = true;
    this._prevPreviewTimeout = null;
    this._nextPreviewTimeout = null;

    this._breadcrumbs = document.createElement("annotation-breadcrumbs");
    div.appendChild(this._breadcrumbs);

    const settingsDiv = document.createElement("div");
    settingsDiv.setAttribute("class", "d-flex");
    header.appendChild(settingsDiv);

    this._lightSpacer = document.createElement("span");
    this._lightSpacer.style.width = "32px";
    settingsDiv.appendChild(this._lightSpacer);

    this._success = document.createElement("success-light");
    this._lightSpacer.appendChild(this._success);
    this._success.style.zIndex = 3;

    this._warning = document.createElement("warning-light");
    this._lightSpacer.appendChild(this._warning);
    this._warning.style.zIndex = 3;

    this._versionButton = document.createElement("version-button");
    settingsDiv.appendChild(this._versionButton);

    this._settings = document.createElement("annotation-settings");
    settingsDiv.appendChild(this._settings);

    this._cameraSelectionBar = document.createElement("camera-selection-bar");
    this._cameraSelectionBar.setAttribute("class", "mx-3");
    this._cameraSelectionBar.style.display = "none";
    settingsDiv.appendChild(this._cameraSelectionBar);
    this._cameraSelectionBar.addEventListener("showCamera", (evt) => {
      this._cameraSelectionBar.setActive(evt.detail.mediaId);
      this.showCanvasApplet(this._currentCanvasApplet._applet.id);
    });

    this._appletShortcutBar = document.createElement("applet-shortcut-bar");
    this._appletShortcutBar.style.display = "none";
    settingsDiv.appendChild(this._appletShortcutBar);

    this._appletShortcutBar.addEventListener("showApplet", (evt) => {
      this.showCanvasApplet(evt.detail.appletId);
    });

    this._canvasAppletHeader = document.createElement("annotation-header");
    this._canvasAppletHeader.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between f3"
    );
    this._canvasAppletHeader.style.display = "none";
    this._shadow.appendChild(this._canvasAppletHeader);

    this._canvasAppletPageWrapper = document.createElement("div");
    this._shadow.appendChild(this._canvasAppletPageWrapper);

    this._outerMain = document.createElement("main");
    this._outerMain.setAttribute("class", "d-flex");
    this._shadow.appendChild(this._outerMain);

    this._main = document.createElement("main");
    this._main.setAttribute("class", "d-flex");
    this._outerMain.appendChild(this._main);

    this._canvasAppletHeader.addEventListener("close", () => {
      this.exitCanvasApplet();
    });

    this._canvasAppletMenu = document.createElement("div");
    this._canvasAppletMenu.setAttribute(
      "class",
      "annotation-canvas-overlay-menu d-flex flex-row flex-items-center flex-justify-between rounded-2 box-border"
    );
    this._canvasAppletMenu.style.display = "none";
    this._main.appendChild(this._canvasAppletMenu);

    var menuDiv = document.createElement("div");
    menuDiv.setAttribute("class", "h3 px-2 py-3 mb-2");
    menuDiv.textContent = "Applets";
    this._canvasAppletMenu.appendChild(menuDiv);

    this._canvasAppletMenuLoading = document.createElement("div");
    this._canvasAppletMenuLoading.setAttribute(
      "class",
      "text-gray f3 pb-3 pl-2 pr-6"
    );
    this._canvasAppletMenuLoading.textContent = "Initializing applets...";
    this._canvasAppletMenu.appendChild(this._canvasAppletMenuLoading);

    this._versionDialog = document.createElement("version-dialog");
    this._main.appendChild(this._versionDialog);

    this._bookmarkDialog = document.createElement("name-dialog");
    this._main.appendChild(this._bookmarkDialog);

    this._sidebar = document.createElement("annotation-sidebar");
    this._main.appendChild(this._sidebar);

    this._undo = document.createElement("undo-buffer");

    this._data = document.createElement("annotation-data");

    this._browser = document.createElement("annotation-browser");
    this._browser.undoBuffer = this._undo;
    this._browser.annotationData = this._data;
    this._main.appendChild(this._browser);

    this._progressDialog = document.createElement("progress-dialog");
    this._main.appendChild(this._progressDialog);

    this._progressDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      this._progressDialog.removeAttribute("is-open", "");
    });

    window.addEventListener("error", (evt) => {
      this._loading.style.display = "none";
      //window.alert(evt.message);
      Utilities.warningAlert("System error detected", "#ff3e1d", true);
    });

    this._settings._bookmark.addEventListener("click", () => {
      this._bookmarkDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._videoSettingsDialog = document.createElement("video-settings-dialog");
    this._main.appendChild(this._videoSettingsDialog);

    this._browserSettingsDialog = document.createElement(
      "annotation-browser-settings-dialog"
    );
    this._main.appendChild(this._browserSettingsDialog);

    this._timelineSettingsDialog = document.createElement(
      "timeline-settings-dialog"
    );
    this._main.appendChild(this._timelineSettingsDialog);

    this._progressDialog.addEventListener("jobsDone", (evt) => {
      evt.detail.job.callback(evt.detail.status);
    });
  }

  connectedCallback() {
    this.setAttribute("has-layout-shift", "");
    TatorPage.prototype.connectedCallback.call(this);

    this._projectId = window.location.pathname.split("/")[1];
    this._mediaId = window.location.pathname.split("/")[3];
    console.log("Project ID: " + this._projectId);
    console.log("Media ID: " + this._mediaId);

    // Create store subscriptions
    const promises = [
      fetchCredentials(`/rest/Project/${this._projectId}`, {}, true).then(
        (response) => response.json()
      ),
      fetchCredentials("/rest/Announcements", {}, true).then((response) =>
        response.json()
      ),
      fetchCredentials("/rest/User/GetCurrent", {}, true).then((response) =>
        response.json()
      ),
    ];
    Promise.all(promises).then(([project, announcements, user]) => {
      this._setUser(user);
      this._setAnnouncements(announcements);
      this._updateProject(project);
      this._updateMedia(this._mediaId);

      // Set permission based on project
      this._permission = project.permission;
      if (this._permission === "View Only") this._settings._lock.viewOnly();
      this.enableEditing(true);
    });
  }

  /**
   * Returned promise resolves when job monitoring is done
   */
  showAlgoRunningDialog(uid, msg, callback) {
    this._progressDialog.monitorJob(uid, msg, callback);
    this._progressDialog.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
    //return promise;
  }

  static get observedAttributes() {
    return ["project-name", "project-id", "media-id"].concat(
      TatorPage.observedAttributes
    );
  }

  _updateProject(project) {
    this.setAttribute("project-name", project.name);
    this.setAttribute("project-id", project.id);

    // Call the parent's update project as well
    super._updateProject(project);
  }

  _updateMedia(mediaId) {
    this.setAttribute("media-id", mediaId);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "project-name":
        this._breadcrumbs.setAttribute("project-name", newValue);
        break;
      case "project-id":
        this._undo.setAttribute("project-id", newValue);
        this._updateLastVisitedBookmark(newValue);
        break;
      case "media-id":
        const searchParams = new URLSearchParams(window.location.search);
        fetchCredentials(`/rest/Media/${newValue}?presigned=28800`, {}, true)
          .then((response) => response.json())
          .then((data) => {
            this._mediaInfo = data;
            this._archive_state = data.archive_state;
            if (this._archive_state == "archived") {
              this._loading.style.display = "none";
              window.alert(
                "Media has been archived and cannot be viewed in the annotator."
              );
              Utilities.warningAlert(
                "Media has been archived.",
                "#ff3e1d",
                true
              );
              return;
            } else if (this._archive_state == "to_live") {
              this._loading.style.display = "none";
              window.alert(
                "Archived media is not live yet and cannot be viewed in the annotator."
              );
              Utilities.warningAlert(
                "Media has been archived.",
                "#ff3e1d",
                true
              );
              return;
            } else if (
              data.media_files == null ||
              (data.media_files &&
                !("streaming" in data.media_files) &&
                !("layout" in data.media_files) &&
                !("image" in data.media_files) &&
                !("concat" in data.media_files) &&
                !("live" in data.media_files))
            ) {
              this._loading.style.display = "none";
              Utilities.sendNotification(`Unplayable file ${data.id}`);
              window.alert(
                "Video can not be played. Please contact the system administrator."
              );
              return;
            } else if (data.media_files && "streaming" in data.media_files) {
              data.media_files.streaming.sort((a, b) => {
                return b.resolution[0] - a.resolution[0];
              });
            }

            // Update Title Bar to show media information
            // Usability guidance from mozilla specifies order should go fine -> coarser
            // e.g. filename | tool name | org name
            // We have tator before tool name, but having file name first is probably helpful enough.
            document.title = `${data.name} | ${document.title}`;
            this._breadcrumbs.setAttribute("media-name", data.name);
            this._browser.mediaInfo = data;
            this._undo.mediaInfo = data;
            this._currentFrame = 0;

            fetchCredentials("/rest/MediaType/" + data.type, {}, true)
              .then((response) => response.json())
              .then((type_data) => {
                this._mediaType = type_data;
                this._browser.mediaType = type_data;
                this._undo.mediaType = type_data;
                let player;
                this._multiMediaIds = [];
                this._cameraCanvasMap = {}; // Map of media id to its corresponding canvas
                this._numberOfMedia = 1;
                this._mediaDataCount = 0;
                if (type_data.dtype == "video") {
                  player = document.createElement("annotation-player");
                  this._player = player;
                  this._player.parent = this;
                  this._player.mediaType = type_data;
                  this._videoSettingsDialog.mode("single", data);
                  player.mediaInfo = data;
                  this._main.insertBefore(player, this._browser);
                  this._setupInitHandlers(player);
                  this._getMetadataTypes(player, player._video._canvas);
                  this._browser.canvas = player._video;
                  this._settings._capture.addEventListener(
                    "captureFrame",
                    (e) => {
                      player._video.captureFrame(e.detail.localizations);
                    }
                  );
                  this._videoSettingsDialog.addEventListener("apply", (evt) => {
                    player.apply;
                  });
                } else if (type_data.dtype == "image") {
                  player = document.createElement("annotation-image");
                  this._player = player;
                  this._player.parent = this;
                  this._player.mediaType = type_data;
                  player.mediaInfo = data;
                  this._main.insertBefore(player, this._browser);
                  this._setupInitHandlers(player);
                  this._getMetadataTypes(player, player._image._canvas);
                  this._browser.canvas = player._image;
                  this._settings._capture.addEventListener(
                    "captureFrame",
                    (e) => {
                      player._image.captureFrame(e.detail.localizations);
                    }
                  );
                } else if (type_data.dtype == "multi") {
                  player = document.createElement("annotation-multi");
                  this._player = player;
                  this._player.parent = this;
                  this._player.mediaType = type_data;
                  player.addDomParent({
                    object: this._headerDiv,
                    alignTo: this._browser,
                  });

                  // Note: The player itself will set the metadatatypes and canvas info with this
                  player.mediaInfo = data;
                  var mediaIdCount = 0;
                  for (const index of data.media_files.ids.keys()) {
                    this._multiMediaIds.push(data.media_files.ids[index]);
                    mediaIdCount += 1;
                  }
                  this._numberOfMedia = mediaIdCount;
                  this._main.insertBefore(player, this._browser);
                  this._setupInitHandlers(player);
                  this._player.addEventListener("primaryVideoLoaded", (evt) => {
                    /* #TODO Figure out a capture frame capability for multiview
                  this._settings._capture.addEventListener(
                    'captureFrame',
                    (e) =>
                      {
                        player._video.captureFrame(e.detail.localizations);
                      });
                  */
                    this._settings._capture.setAttribute("disabled", "");

                    var primeMediaData = evt.detail.media;
                    this._videoSettingsDialog.mode("multi", data);
                    this._settings.mediaInfo = primeMediaData;
                    var playbackQuality = data.media_files.quality;
                    if (playbackQuality == undefined) {
                      playbackQuality = 360; // Default to something sensible
                    }
                    if (searchParams.has("playQuality")) {
                      playbackQuality = Number(searchParams.get("playQuality"));
                    }
                    this._settings.quality = playbackQuality;
                    this._player.setAvailableQualities(primeMediaData);
                  });
                } else if (type_data.dtype == "live") {
                  player = document.createElement("annotation-live");
                  this._player = player;
                  this._player.mediaType = type_data;
                  player.addDomParent({
                    object: this._headerDiv,
                    alignTo: this._browser,
                  });
                  this._setupInitHandlers(player);
                  player.mediaInfo = data;
                  this._main.insertBefore(player, this._browser);

                  for (let live of player._videos) {
                    this._getMetadataTypes(player, live._canvas);
                  }
                  //this._browser.canvas = player._video;
                  this._videoSettingsDialog.mode("live", data);
                  this._settings._capture.addEventListener(
                    "captureFrame",
                    (e) => {
                      player._video.captureFrame(e.detail.localizations);
                    }
                  );
                  this._videoSettingsDialog.addEventListener("apply", (evt) => {
                    player.apply;
                  });
                } else {
                  window.alert(`Unknown media type ${type_data.dtype}`);
                }
                player.addEventListener("playing", () => {
                  this._sidebar.videoIsPlaying = true;
                  playerControlManagement(player, true);
                });
                player.addEventListener("paused", () => {
                  this._sidebar.videoIsPlaying = false;
                  playerControlManagement(player, false);
                });
                this.layoutModeController = new LayoutModeController(
                  player,
                  this._sidebar,
                  this._browser,
                  this._header
                );
              });
            const project = this._mediaInfo.project;
            const mediaListPromise = fetchCredentials(
              `/rest/Medias/${project}${window.location.search}`,
              {},
              true
            );

            // Start with the buttons disabled
            this._prev.disabled = true;
            this._next.disabled = true;
            this._next._shadow.children[0].cursor = "progress";
            this._prev._shadow.children[0].cursor = "progress";
            Promise.all([mediaListPromise])
              .then((responses) =>
                Promise.all(responses.map((resp) => resp.json()))
              )
              .then(([listData]) => {
                const baseUrl = `/${data.project}/annotation/`;
                const searchParams = this._settings._queryParams();
                const media_id = parseInt(newValue);

                let this_idx = -1;
                for (let idx = 0; idx < listData.length; idx++) {
                  if (listData[idx].id == media_id) {
                    this_idx = idx;
                  }
                }

                let prevData = { prev: -1 },
                  nextData = { next: -1 };

                if (this_idx >= 1) {
                  prevData = { prev: listData[this_idx - 1].id };
                }
                if (this_idx >= 0 && this_idx < listData.length - 1) {
                  nextData = { next: listData[this_idx + 1].id };
                }

                this.nextData = nextData;
                this.prevData = prevData;
                const count = listData.length;
                this._breadcrumbs.setPosition(this_idx + 1, count);

                // Turn disable selected_type.
                searchParams.delete("selected_type");

                // Only enable next/prev if there is a next/prev
                if (prevData.prev == -1) {
                  this._prev.disabled = true;
                } else {
                  this._prev.disabled = false;
                  this._prev._shadow.children[0].cursor = null;
                  this._prev.addEventListener("click", (evt) => {
                    let url = baseUrl + prevData.prev;
                    var searchParams = this._settings._queryParams();
                    searchParams.delete("selected_type");
                    searchParams.delete("selected_entity");
                    searchParams.delete("frame");
                    const typeParams = this._settings._typeParams();
                    if (typeParams) {
                      searchParams.append("selected_type", typeParams);
                    }
                    searchParams =
                      this._videoSettingsDialog.queryParams(searchParams);
                    url += "?" + searchParams.toString();
                    // If the control key is pressed jump to a new tab.
                    if (evt.ctrlKey) {
                      let a = document.createElement("a");
                      a.target = "_blank";
                      a.href = url;
                      a.click();
                    } else {
                      window.location.href = url;
                    }
                  });
                  this._prev.addEventListener(
                    "mouseenter",
                    this.showPrevPreview.bind(this)
                  );
                  this._prev.addEventListener(
                    "mouseout",
                    this.removeNextPrevPreview.bind(this)
                  );
                }

                if (nextData.next == -1) {
                  this._next.disabled = true;
                } else {
                  this._next.disabled = false;
                  this._next._shadow.children[0].cursor = null;
                  this._next.addEventListener("click", (evt) => {
                    let url = baseUrl + nextData.next;
                    var searchParams = this._settings._queryParams();
                    searchParams.delete("selected_type");
                    searchParams.delete("selected_entity");
                    searchParams.delete("frame");
                    const typeParams = this._settings._typeParams();
                    if (typeParams) {
                      searchParams.append("selected_type", typeParams);
                    }
                    searchParams =
                      this._videoSettingsDialog.queryParams(searchParams);
                    url += "?" + searchParams.toString();
                    // If the control key is pressed jump to a new tab.
                    if (evt.ctrlKey) {
                      let a = document.createElement("a");
                      a.target = "_blank";
                      a.href = url;
                      a.click();
                    } else {
                      window.location.href = url;
                    }
                  });
                  this._next.addEventListener(
                    "mouseenter",
                    this.showNextPreview.bind(this)
                  );
                  this._next.addEventListener(
                    "mouseout",
                    this.removeNextPrevPreview.bind(this)
                  );
                }
              })
              .catch((err) =>
                console.error("Failed to fetch adjacent media! " + err)
              );
          });
        break;
    }
  }

  showPrevPreview(e) {
    if (this.prevData.prev == -1) return;

    if (this._prevPreviewTimeout != null) return;

    this._hidePrevPreview = false;

    this._prevPreviewTimeout = setTimeout(() => {
      this._prevPreviewTimeout = null;
      if (!this._hidePrevPreview) {
        this._next.preview.hide();
        this._prev.preview.info = this.prevData.prev;
      }
    }, 500);
  }

  showNextPreview(e) {
    if (this.nextData.next == -1) return;

    if (this._nextPreviewTimeout != null) return;

    this._hideNextPreview = false;

    this._nextPreviewTimeout = setTimeout(() => {
      this._nextPreviewTimeout = null;
      if (!this._hideNextPreview) {
        this._prev.preview.hide();
        this._next.preview.info = this.nextData.next;
      }
    }, 500);
  }

  removeNextPrevPreview(e) {
    this._hidePrevPreview = true;
    this._hideNextPreview = true;
    this._next.preview.hide();
    this._prev.preview.hide();
  }

  _setupInitHandlers(canvas) {
    this._canvas = canvas;

    this._canvas.addEventListener("styleChange", (evt) => {
      if ("cursor" in evt.detail) {
        this._canvas.style.cursor = evt.detail.cursor;
      }
    });

    const _handleQueryParams = () => {
      // TODO: This is bad and should be moved.
      // Its structured to happen after the canvas is initialized, but
      // some of the parameters impact how to initialize the canvas.
      if (this._dataInitialized && this._canvasInitialized) {
        const searchParams = new URLSearchParams(window.location.search);
        const haveEntity = searchParams.has("selected_entity");
        const haveType = searchParams.has("selected_type");
        const haveFrame = searchParams.has("frame");
        const haveVersion = searchParams.has("version");
        const haveLock = searchParams.has("lock");
        const haveFillBoxes = searchParams.has("fill_boxes");
        const haveToggleText = searchParams.has("toggle_text");
        const haveTimelineDisplayMode = searchParams.has("timeline-display");
        if (haveEntity && haveType) {
          const typeId = searchParams.get("selected_type");
          const entityId = searchParams.get("selected_entity");
          this._settings.setAttribute("type-id", typeId);
          this._settings.setAttribute("entity-id", entityId);
          // We are initialized now so go ahead and select it
          this._browser.selectEntityOnUpdate(entityId, typeId, true);
        } else if (haveType) {
          const typeId = Number(searchParams.get("selected_type"));
          this._settings.setAttribute("type-id", typeId);
          for (const dtype of ["state", "box", "line", "dot"]) {
            let modifiedTypeId = dtype + "_" + typeId;
            if (this._data._dataByType.has(modifiedTypeId)) {
              this._browser._openForTypeId(modifiedTypeId);
            }
          }
        }
        if (haveVersion) {
          let version_id = searchParams.get("version");
          let evt = { detail: { version: this._versionLookup[version_id] } };
          this._versionDialog._handleSelect(evt, { muteEvent: true });
        }
        if (haveLock) {
          const lock = Number(searchParams.get("lock"));
          if (lock) {
            this._settings._lock.lock();
          }
        }
        if (haveFillBoxes) {
          const fill_boxes = Number(searchParams.get("fill_boxes"));
          if (fill_boxes) {
            this._settings._fill_boxes.fill();
          } else {
            this._settings._fill_boxes.unfill();
          }
          canvas.toggleBoxFills(
            this._settings._fill_boxes.get_fill_boxes_status()
          );
        }
        if (haveToggleText) {
          const toggle_text = Number(searchParams.get("toggle_text"));
          if (toggle_text) {
            this._settings._toggle_text.toggle = true;
          } else {
            this._settings._toggle_text.toggle = false;
          }
          canvas.toggleTextOverlays(
            this._settings._toggle_text.get_toggle_status()
          );
        }
        if (haveTimelineDisplayMode) {
          this._player.setTimelineDisplayMode(
            searchParams.get("timeline-display")
          );
        }
      }
    };

    const _removeLoading = async (force) => {
      if ((this._dataInitialized && this._canvasInitialized) || force) {
        try {
          // Fade out the background over 300ms
          const animation_time = 300;
          this._loadingAnimation.stop();

          // Dispatch a resize event so it happens during the fade out
          window.commandedResizePromise = new Promise((resolve) => {
            window.commandedResize = resolve;
          });
          window.dispatchEvent(new Event("resize"));

          // wait for 5 seconds maximum to do the resize
          let fallback = new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });
          await Promise.any([window.commandedResizePromise, fallback]);

          // Don't start fading out til after the resize is done
          const start_time = performance.now();
          let p = new Promise((resolve, reject) => {
            let animate = () => {
              let now = performance.now();
              let elapsed = now - start_time;
              if (elapsed >= animation_time) {
                resolve();
                return;
              }
              this._dimmer.style.opacity = 1 - elapsed / animation_time;
              this._loading.style.opacity = Math.max(
                0,
                1 - elapsed / (animation_time * 0.33)
              );
              requestAnimationFrame(animate);
            };
            animate();
          });
          await p;
          window.commandedResize = null;
          window.commandedResizePromise = null;

          this._loading.style.display = "none";
          this._dimmer.style.opacity = null;
          this.removeAttribute("has-layout-shift");

          if (this._archive_state == "to_archive") {
            Utilities.warningAlert(
              "Warning: This media has been marked for archival!",
              "#ff3e1d",
              false
            );
          }
        } catch (exception) {
          console.error(exception);
        }
      }
    };

    this._data.addEventListener("initialized", () => {
      this._dataInitialized = true;
      _handleQueryParams();
      _removeLoading();
    });

    let maskEdits = (evt) => {
      this.enableEditing(!evt.detail.enabled);
      //console.info("Setting edit mask to " + evt.detail.enabled);
    };
    // Disable edits via the player + annotation browser
    // only during a network operation
    canvas.addEventListener("temporarilyMaskEdits", maskEdits);
    this._undo.addEventListener("temporarilyMaskEdits", maskEdits);

    canvas.addEventListener("displayLoading", () => {
      // #TODO Revisit. has-open-modal is too aggressive
      //this.setAttribute("has-open-modal", "");
    });
    canvas.addEventListener("hideLoading", () => {
      // #TODO Revisit. has-open-modal is too aggressive
      //this.removeAttribute("has-open-modal");
    });

    canvas.addEventListener("playing", () => {
      this._player.disableQualityChange();
    });
    canvas.addEventListener("paused", () => {
      this._player.enableQualityChange();
    });

    canvas.addEventListener("canvasReady", () => {
      this._canvasInitialized = true;

      this._mediaMap = {};
      if (this._mediaType.dtype == "multi") {
        let mediaList = this._player.getCameraMediaList();
        for (let media of mediaList) {
          this._mediaMap[media.id] = media;
          this._cameraCanvasMap[media.id] = this._player.getCameraCanvas(
            media.id
          );
        }
        this._cameraSelectionBar.init(mediaList);
        this._cameraSelectionBar.setActive(mediaList[0].id);
      } else if (this._mediaType.dtype == "image") {
        this._mediaMap[this._mediaInfo.id] = this._mediaInfo;
        this._cameraCanvasMap[this._mediaInfo.id] = this._canvas._image;
        this._cameraSelectionBar.init([this._mediaInfo]);
        this._cameraSelectionBar.setActive(this._mediaInfo.id);
      } else if (this._mediaType.dtype == "video") {
        this._mediaMap[this._mediaInfo.id] = this._mediaInfo;
        this._cameraCanvasMap[this._mediaInfo.id] = this._canvas._video;
        this._cameraSelectionBar.init([this._mediaInfo]);
        this._cameraSelectionBar.setActive(this._mediaInfo.id);
      }

      _handleQueryParams();
      _removeLoading();
    });

    canvas.addEventListener("videoInitError", () => {
      _removeLoading(true);
    });

    canvas.addEventListener("defaultVideoSettings", (evt) => {
      this._videoSettingsDialog.defaultSources = evt.detail;
    });

    this._settings._lock.addEventListener("click", (evt) => {
      evt.preventDefault();
      // Do nothing if user has insufficient permission
      if (!this._settings._lock._viewOnly) this.enableEditing(true);
    });

    this._settings._fill_boxes.addEventListener("click", (evt) => {
      canvas.toggleBoxFills(this._settings._fill_boxes.get_fill_boxes_status());
      canvas.refresh();
    });

    this._settings._toggle_text.addEventListener("click", (evt) => {
      canvas.toggleTextOverlays(
        this._settings._toggle_text.get_toggle_status()
      );
      canvas.refresh();
    });

    canvas.addEventListener("toggleTextOverlay", (evt) => {
      this._settings._toggle_text.toggle =
        !this._settings._toggle_text.get_toggle_status();
      canvas.toggleTextOverlays(
        this._settings._toggle_text.get_toggle_status()
      );
      canvas.refresh();
    });

    if (this._player._rateControl) {
      this._player._rateControl.addEventListener("rateChange", (evt) => {
        if ("setRate" in canvas) {
          canvas.setRate(evt.detail.rate);
        }
      });
    }

    if (this._player._qualityControl) {
      this._player._qualityControl.addEventListener("qualityChange", (evt) => {
        if ("setQuality" in canvas) {
          canvas.setQuality(evt.detail.quality);
        }

        var videoSettings = canvas.getVideoSettings();
        this._videoSettingsDialog.applySettings(videoSettings);
      });
    }

    canvas.addEventListener("zoomChange", (evt) => {
      this._settings.setAttribute("zoom", evt.detail.zoom);
    });

    this._settings.addEventListener("zoomPlus", () => {
      if ("zoomPlus" in canvas) {
        canvas.zoomPlus();
      }
    });

    this._settings.addEventListener("zoomMinus", () => {
      if ("zoomMinus" in canvas) {
        canvas.zoomMinus();
      }
    });

    this._versionDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._versionDialog.addEventListener("versionSelect", (evt) => {
      this.setAttribute("has-open-modal", "");
      this._loading.style.display = "block";
      this._data
        .setVersion(evt.detail.version, evt.detail.viewables)
        .then(() => {
          this._settings.setAttribute("version", evt.detail.version.id);
          this._canvas.refresh();
          this._updateURL();
          this._loading.style.display = "none";
          this.removeAttribute("has-open-modal", "");
        });
      this._browser.version = evt.detail.version;
      this._versionButton.text = evt.detail.version.name;
      this._version = evt.detail.version;
      this._canvasAppletHeader.version = this._version;
      for (const key in this._saves) {
        this._saves[key].version = this._version;
      }
      this.enableEditing();
    });

    this._versionButton.addEventListener("click", () => {
      this._versionDialog.setAttribute("is-open", "");
      this._versionDialog.showSelectedVersion();
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._bookmarkDialog.addEventListener("close", (evt) => {
      if (this._bookmarkDialog._confirm) {
        const searchParams = new URLSearchParams(window.location.search);
        let uri = window.location.pathname;
        uri += "?" + this._settings._queryParams(searchParams).toString();
        const name = this._bookmarkDialog._input.value;
        fetchCredentials("/rest/Bookmarks/" + this.getAttribute("project-id"), {
          method: "POST",
          body: JSON.stringify({
            name: name,
            uri: uri,
          }),
        });
      }
      this.removeAttribute("has-open-modal", "");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._videoSettingsDialog.addEventListener("close", () => {
      this.removeAttribute("has-open-modal", "");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._videoSettingsDialog.addEventListener("applyVideoSources", (evt) => {
      for (let sourceName in evt.detail) {
        let source = evt.detail[sourceName];
        if (source) {
          canvas.setQuality(source.quality, source.name);

          if (source.name == "play") {
            this._player.quality = source.quality;
          }
        }
      }
    });

    this._videoSettingsDialog.addEventListener("displayOverlays", (evt) => {
      canvas.displayVideoDiagnosticOverlay(evt.detail.displayDiagnostic);
    });

    this._videoSettingsDialog.addEventListener("stretchVideo", (evt) => {
      canvas.stretch = evt.detail.stretch;
    });

    this._videoSettingsDialog.addEventListener("allowSafeMode", (evt) => {
      canvas.allowSafeMode(evt.detail.allowSafeMode);
    });

    this._browserSettingsDialog.addEventListener("close", () => {
      this.removeAttribute("has-open-modal", "");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._timelineSettingsDialog.addEventListener("close", () => {
      this.removeAttribute("has-open-modal", "");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._timelineSettingsDialog.addEventListener("settingsChanged", () => {
      canvas.updateTimeline();
    });

    this._player.addEventListener("setTimelineDisplayMode", (evt) => {
      this._settings.setAttribute("timeline-display", evt.detail.mode);
      this._updateURL();
    });

    this._player.addEventListener("setPlayQuality", (evt) => {
      this._videoSettingsDialog.setPlayQuality(evt.detail.quality);
    });

    this._player.addEventListener("openVideoSettings", () => {
      var videoSettings = canvas.getVideoSettings();
      this._videoSettingsDialog.applySettings(videoSettings);
      this._videoSettingsDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._player.addEventListener("openTimelineSettings", () => {
      this._timelineSettingsDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._browser.addEventListener("openBrowserSettings", () => {
      this._browserSettingsDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });
  }

  _getMetadataTypes(
    canvas,
    canvasElement,
    block_signals,
    subelement_id,
    update
  ) {
    const projectId = Number(this.getAttribute("project-id"));
    let mediaId = Number(this.getAttribute("media-id"));
    if (subelement_id) {
      mediaId = subelement_id;
    }
    const query = "?media_id=" + mediaId;
    const favoritePromise = fetchCredentials(
      "/rest/Favorites/" + projectId,
      {},
      true
    );
    const versionPromise = fetchCredentials(
      "/rest/Versions/" + projectId + "?media_id=" + mediaId,
      {},
      true
    );
    const membershipPromise = fetchCredentials(
      `/rest/Memberships/${projectId}`,
      {},
      true
    );
    const userPromise = fetchCredentials(`/rest/User/GetCurrent`, {}, true);
    const getMetadataType = (endpoint) => {
      const url = "/rest/" + endpoint + "/" + projectId + query;
      return fetchCredentials(url, {}, true);
    };
    Promise.all([
      getMetadataType("LocalizationTypes"),
      getMetadataType("StateTypes"),
      versionPromise,
      favoritePromise,
      membershipPromise,
      userPromise,
    ]).then(
      ([
        localizationResponse,
        stateResponse,
        versionResponse,
        favoriteResponse,
        membershipResponse,
        userResponse,
      ]) => {
        const localizationData = localizationResponse.json();
        const stateData = stateResponse.json();
        const versionData = versionResponse.json();
        const favoriteData = favoriteResponse.json();
        const membershipData = membershipResponse.json();
        const userData = userResponse.json();
        Promise.all([
          localizationData,
          stateData,
          versionData,
          favoriteData,
          membershipData,
          userData,
        ]).then(
          ([
            localizationTypes,
            stateTypes,
            versions,
            favorites,
            memberships,
            user,
          ]) => {
            // Only display positive version numbers.
            versions = versions.filter((version) => version.number >= 0);

            for (const version of versions) {
              this._versionLookup[version.id] = version;
            }

            // If there is a default version pick that one, otherwise use the first one.
            this._version = null;
            this.setAttribute("user-id", user.id);
            let default_version = versions[0].id;
            for (const membership of memberships) {
              if (membership.user == this.getAttribute("user-id")) {
                if (membership.default_version) {
                  default_version = membership.default_version;
                }
              }
            }

            // Lastly if we have a version param in the URL, we need to set it now to
            // get the right stuff loaded on initialization.
            // Find the index of the default version.
            let selected_version = default_version;
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.has("version")) {
              selected_version = searchParams.get("version");
            }
            for (const version of versions) {
              if (version.id == selected_version) {
                this._version = version;
              }
            }
            this._canvasAppletHeader.version = this._version;

            // Initialize version dialog.
            this._versionDialog.init(versions, this._version.id);
            if (versions.length == 0) {
              this._versionButton.style.display = "none";
            } else {
              this._versionButton.text = this._version.name;
            }

            var dataTypes = localizationTypes.concat(stateTypes);

            // Replace the data type IDs so they are guaranteed to be unique.
            for (let [idx, dataType] of dataTypes.entries()) {
              dataType.id = dataType.dtype + "_" + dataType.id;
            }
            for (let [idx, dataType] of dataTypes.entries()) {
              let isLocalization = false;
              let isTrack = false;
              let isTLState = false;
              if ("dtype" in dataType) {
                isLocalization = ["box", "line", "dot", "poly"].includes(
                  dataType.dtype
                );
              }
              if ("association" in dataType) {
                isTrack = dataType.association == "Localization";
              }
              if ("interpolation" in dataType) {
                isTLState = dataType.interpolation == "latest";
              }
              dataType.isLocalization = isLocalization;
              dataType.isTrack = isTrack;
              dataType.isTLState = isTLState;

              if (dataType.isTrack) {
                // Determine the localization type that should be drawn.
                let localizationTypeId = null;
                if (dataType.default_localization) {
                  localizationTypeId = dataType.default_localization;
                } else {
                  // If default localization type is not set, go by priority box > line > dot.
                  const byType = dataTypes.reduce((sec, obj) => {
                    if (obj.visible && obj.drawable) {
                      (sec[obj.dtype] = sec[obj.dtype] || []).push(obj);
                    }
                    return sec;
                  }, {});
                  if (typeof byType.box !== "undefined") {
                    localizationTypeId = byType.box[0].id;
                  } else if (typeof byType.line !== "undefined") {
                    localizationTypeId = byType.line[0].id;
                  } else if (typeof byType.dot !== "undefined") {
                    localizationTypeId = byType.dot[0].id;
                  }
                }
                if (localizationTypeId === null) {
                  throw "Could not find a localization type to use for track creation!";
                }
                dataType.localizationType = dataTypes.filter(
                  (type) =>
                    type.id == localizationTypeId ||
                    Number(type.id.split("_")[1]) == localizationTypeId
                )[0];
              }
            }
            // Only allow non-track state updates if primary video index
            let allowNonTrackStateUpdates = !block_signals;
            if (this._player.mediaType.dtype == "multi") {
              allowNonTrackStateUpdates =
                this._multiMediaIds[canvas._primaryVideoIndex] == mediaId;
            }
            this._data.init(
              dataTypes,
              this._version,
              projectId,
              mediaId,
              update,
              allowNonTrackStateUpdates,
              versions,
              memberships
            );
            this._data.addEventListener("mediaUpdate", (evt) => {
              this._browser.mediaInfo = evt.detail.media;
              this._browser.mediaType = this._mediaType; // Required to update the browser UI
            });
            this._data.addEventListener("freshData", (evt) => {
              this._browser.updateData(evt);

              if (this._newEntityId) {
                for (const elem of evt.detail.data) {
                  if (elem.id == this._newEntityId) {
                    this._newEntity = elem;
                    this._browser.selectEntity(elem);

                    if (this._player.selectTimelineData) {
                      this._player.selectTimelineData(elem);
                    }

                    // If the page is in canvas applet mode, let the applet know
                    // there is a fresh batch of data, it might've invoked it.
                    if (this._currentCanvasApplet != null) {
                      this._currentCanvasApplet.newData(
                        this._newEntity,
                        evt.detail.typeObj
                      );
                    }

                    this._newEntityId = null;
                    this._newEntity = null;
                    break;
                  }
                }
              }
              if (evt.detail.finalized) {
                evt.detail.finalized();
              }
            });
            this._mediaDataCount += 1;

            // Pull the data / iniitliaze the app if we are using the multi-view player and
            // if all of the media has already registered their data types
            if (
              this._mediaDataCount == this._numberOfMedia &&
              this._player.mediaType.dtype == "multi"
            ) {
              this._data.initialUpdate();
            }

            canvas.undoBuffer = this._undo;
            canvas.annotationData = this._data;
            const byType = localizationTypes.reduce((sec, obj) => {
              if (obj.visible && obj.drawable) {
                (sec[obj.dtype] = sec[obj.dtype] || []).push(obj);
              }
              return sec;
            }, {});
            const trackTypes = stateTypes.filter(
              (type) => type.association == "Localization" && type.visible
            );

            if (block_signals == true) {
              return;
            }

            // For states specifically, if we are using the multi-view, we will
            // create the state across all media
            var stateMediaIds;
            if (this._player.mediaType.dtype == "multi") {
              stateMediaIds = this._multiMediaIds;
            }

            this._timelineSettings = new TimelineSettings(projectId, dataTypes);
            canvas.timelineSettings = this._timelineSettings;
            this._timelineSettingsDialog.init(this._timelineSettings);

            this._browserSettings = new AnnotationBrowserSettings(
              projectId,
              dataTypes,
              this._mediaType
            );
            this._browserSettingsDialog.init(
              this._browserSettings,
              dataTypes,
              this._mediaType
            );
            this._browser.init(
              dataTypes,
              this._version,
              stateMediaIds,
              this._player.mediaType.dtype != "image",
              this._browserSettings
            );

            this._sidebar.localizationTypes = byType;
            this._sidebar.trackTypes = trackTypes;

            this._sidebar.addEventListener("canvasApplet", (evt) => {
              if (this._canvasAppletMenu.style.display == "none") {
                this.showCanvasAppletMenu();
              } else {
                this.hideCanvasAppletMenu();
              }
            });
            this._sidebar.addEventListener("default", (evt) => {
              this.clearMetaCaches();
              canvas.defaultMode();
            });
            this._sidebar.addEventListener("newMeta", (evt) => {
              this.clearMetaCaches();
              canvas.newMetadataItem(evt.detail.typeId, evt.detail.metaMode);
            });
            this._sidebar.addEventListener("zoomIn", (evt) => {
              canvas.zoomIn();
            });
            this._sidebar.addEventListener("zoomOut", (evt) => {
              canvas.zoomOut();
            });
            this._sidebar.addEventListener("pan", (evt) => {
              canvas.pan();
            });
            canvas.addEventListener("drawComplete", (evt) => {
              if (evt.detail.metaMode == false) {
                this._sidebar.selectDefault();
              }
              this._browser.blur();
            });
            canvas.addEventListener("frameChange", (evt) => {
              this._browser.frameChange(evt.detail.frame);
              this._settings.setAttribute("frame", evt.detail.frame);
              this._currentFrame = evt.detail.frame;
              this.updateCanvasAppletWithFrameChange();
              // TODO: tempting to call '_updateURL' here but may be a performance bottleneck
            });
            canvas.addEventListener("select", (evt) => {
              const newSelection = `${evt.detail.type}_${evt.detail.id}`;
              if (this._selectedEntity == newSelection) {
                // Canvas event is only informational, no need to update this page!
                return;
              }
              this._selectedEntity = newSelection;
              this._browser.selectEntity(evt.detail);
              canvas.selectTimelineData(evt.detail);
              this._settings.setAttribute("entity-id", evt.detail.elemental_id);
              this._settings.setAttribute("entity-type", evt.detail.type);
              this._settings.setAttribute("type-id", evt.detail.type);

              //Update the URL
              this._updateURL();
            });

            canvas.addEventListener("unselect", () => {
              this._selectedEntity = null;
              this._settings.removeAttribute("entity-id");
              this._settings.removeAttribute("entity-type");
              this._settings.removeAttribute("type-id");

              //Update the URL
              this._updateURL();
            });

            canvas.addEventListener("delete", () => {
              this._browser.deleteSelectedEntity();
            });

            this._undo.addEventListener("update", (evt) => {
              // Force selecting this new entity in the browser if a new object was created
              // when the data is retrieved (ie freshData event)
              if (evt.detail.method == "POST" || evt.detail.method == "PATCH") {
                this._newEntityId = evt.detail.id;
                this._newEntity = null; // Updates in "freshData"
              } else {
                this._newEntityId = null;
                this._newEntity = null;
              }

              if (evt.detail.method == "DELETE") {
                this._browser.closeAll(); // close all open entity browsers in the annotation browser
              }

              this._data.updateTypeLocal(
                evt.detail.method,
                evt.detail.id,
                evt.detail.body,
                evt.detail.dataType
              );
            });
            this._browser.addEventListener("select", (evt) => {
              const newSelection = `${evt.detail.data.type}_${evt.detail.data.id}`;
              if (
                this._selectedEntity == newSelection &&
                evt.detail.data.frame == this._currentFrame
              ) {
                // The entity is already selected and we're at the entity's frame.
                // Don't need to do proceed.
                return;
              }
              this._selectedEntity = newSelection; // TODO: Move this to annotation-controller someday
              if (evt.detail.byUser) {
                // Remove attribute here, will be reset by canvas, if appropriate.
                this._settings.removeAttribute("entity-id");
                this._settings.removeAttribute("entity-type");
                this._settings.removeAttribute("type-id");

                if (evt.detail.dataType.isLocalization) {
                  canvas.selectLocalization(
                    evt.detail.data,
                    true, // skip animation as the user already is aware of the selection
                    false,
                    !evt.detail.goToEntityFrame
                  );
                } else if (evt.detail.dataType.isTrack) {
                  // select track takes care of frame jump
                  canvas.selectTrack(
                    evt.detail.data,
                    evt.detail.data.frame,
                    !evt.detail.goToEntityFrame
                  );
                } else if ("frame" in evt.detail.data) {
                  if (evt.detail.goToEntityFrame) {
                    canvas.goToFrame(parseInt(evt.detail.data.frame));
                    this._browser.selectEntity(evt.detail.data);
                  }
                }

                if (this._player.selectTimelineData) {
                  this._player.selectTimelineData(evt.detail.data);
                }

                if (this._player.mediaType.dtype == "multi") {
                  if (evt.detail.goToEntityFrame) {
                    this._player.goToFrame(evt.detail.data.frame);
                  }
                }
              }
              this._settings.setAttribute(
                "entity-id",
                evt.detail.data.elemental_id
              );
              this._settings.setAttribute("entity-type", evt.detail.data.type);
              this._settings.setAttribute("type-id", evt.detail.data.type);
              this._updateURL();
            });
            this._browser.addEventListener("capture", (evt) => {
              if ("_video" in canvas) {
                canvas._video.makeDownloadableLocalization(evt.detail.data);
              } else {
                canvas._image.makeDownloadableLocalization(evt.detail.data);
              }
            });
            this._browser.addEventListener("open", (evt) => {
              this._settings.setAttribute("type-id", evt.detail.typeId);
            });
            this._browser.addEventListener("close", (evt) => {
              this._settings.removeAttribute("type-id");
              this._selectedEntity = null;

              // The canvas can either be the annotation player or image. The player is the only
              // annotation that has the concepts of tracks, so the following check is performed.
              if (typeof canvas.deselectTrack === "function") {
                canvas.deselectTrack();
              }
              canvas.selectNone();
            });
            this._browser.addEventListener("trackSliderInput", (evt) => {
              evt.target.value = evt.detail.frame;
              canvas.handleSliderInput(evt);
            });
            this._browser.addEventListener("trackSliderChange", (evt) => {
              canvas.handleSliderChange(evt);
            });
            this._browser.addEventListener("frameChange", (evt) => {
              this._currentFrame = evt.detail.frame;
              if ("track" in evt.detail) {
                canvas.selectTrack(evt.detail.track, evt.detail.frame);
              } else {
                canvas.goToFrame(evt.detail.frame);
              }
            });
            this._browser.addEventListener("patchMeta", (evt) => {
              this.clearMetaCaches();
              canvas.newMetadataItem(evt.detail.typeId, false, evt.detail.obj);
            });
            this._saves = {};

            for (const dataType of ["poly", "box", "line", "dot"]) {
              const save = document.createElement("save-dialog");
              const dataTypes = localizationTypes.filter(
                (type) =>
                  type.dtype == dataType && type.visible && type.drawable
              );
              if (dataTypes.length > 0) {
                let defaultType = null;
                switch (dataType) {
                  case "box":
                    if (this._player.mediaType.default_box) {
                      const filtered = dataTypes.filter(
                        (type) => type.id == this._player.mediaType.default_box
                      );
                      if (filtered.length > 0) {
                        defaultType = filtered[0];
                      }
                    }
                    break;
                  case "line":
                    if (this._player.mediaType.default_line) {
                      const filtered = dataTypes.filter(
                        (type) => type.id == this._player.mediaType.default_line
                      );
                      if (filtered.length > 0) {
                        defaultType = filtered[0];
                      }
                    }
                    break;
                  case "dot":
                    if (this._player.mediaType.default_dot) {
                      const filtered = dataTypes.filter(
                        (type) => type.id == this._player.mediaType.default_dot
                      );
                      if (filtered.length > 0) {
                        defaultType = filtered[0];
                      }
                    }
                    break;
                }
                if (defaultType === null) {
                  defaultType = dataTypes[0];
                }
                save.init(
                  projectId,
                  mediaId,
                  dataTypes,
                  defaultType,
                  this._undo,
                  this._version,
                  favorites
                );
                this._settings.setAttribute("version", this._version.id);
                this._outerMain.appendChild(save);
                this._saves[dataType] = save;
                save.style.display = "none";

                save.addEventListener("cancel", () => {
                  this._closeModal(save);
                  canvas.refresh();
                });

                save.addEventListener("save", () => {
                  this._closeModal(save);
                });
              }
            }

            for (const dataType of stateTypes) {
              const save = document.createElement("save-dialog");
              save.init(
                projectId,
                mediaId,
                [dataType],
                dataType,
                this._undo,
                this._version,
                favorites
              );
              this._settings.setAttribute("version", this._version.id);
              this._outerMain.appendChild(save);
              this._saves[dataType.id] = save;
              save.style.display = "none";

              // For states specifically, if we are using the multi-view, we will
              // create the state across all media
              if (this._player.mediaType.dtype == "multi") {
                save.stateMediaIds = this._multiMediaIds;
              }

              save.addEventListener("cancel", () => {
                this._closeModal(save);
                canvas.refresh();
              });

              save.addEventListener("save", () => {
                this._closeModal(save);
              });
            }

            // Event listener to dynamically update save-dialog frame attribute
            canvas.addEventListener("frameChange", (evt) => {
              this._currentFrame = evt.detail.frame;
              for (let [type, saveDialog] of Object.entries(this._saves)) {
                if (type !== "modifyTrack") {
                  saveDialog.updateFrame(this._currentFrame);
                }
              }
              this.updateCanvasAppletWithFrameChange();
            });

            canvas.addEventListener("create", (evt) => {
              const metaMode = evt.detail.metaMode;
              const objDescription = evt.detail.objDescription;
              const dragInfo = evt.detail.dragInfo;
              const requestObj = evt.detail.requestObj;
              const canvasPosition =
                evt.detail.canvasElement.getBoundingClientRect();

              // Get the save dialog for this type. It gets created
              // with a metamode flag that changes based on mode. If
              // it has been created once in a given meta mode, reuse
              // the attributes from previous runs.
              // (Fixes Pulse #324572460)
              var save = this._getSave(objDescription);
              // Because we can be annotating multiple media_ids, set the dialog save
              // to the id the draw event came from
              save._mediaId = evt.detail.mediaId;
              if (metaMode && save.metaMode) {
                save.saveObject(requestObj, save.metaCache);
              } else {
                this._openModal(
                  objDescription,
                  dragInfo,
                  canvasPosition,
                  requestObj,
                  metaMode
                );
              }
            });

            // Mode change from annotation controller
            canvas.addEventListener("modeChange", (evt) => {
              this._sidebar.modeChange(evt.detail.newMode, evt.detail.metaMode);
            });

            this._setupContextMenuDialogs(
              canvas,
              canvasElement,
              stateTypes,
              favorites
            );

            canvas.addEventListener("maximize", () => {
              this._videoSettingsDialog.stretchVideo = true;
              canvas.stretch = true;
              document.documentElement.requestFullscreen();
            });

            canvas.addEventListener("minimize", () => {
              this._videoSettingsDialog.stretchVideo = false;
              canvas.stretch = false;
              document.exitFullscreen();
            });
          }
        );
      }
    );
  }

  /**
   *
   * @param {AnnotationCanvas} canvas
   *    Annotation canvas object class to add the context menu and toolbar applets to
   * @param {HTMLElement} canvasElement
   *    <canvas> element containing the frame image(s)
   *    Used for size information
   * @param {array} favorites
   *    List of Tator.Favorites associated with the user
   */
  _setupAnnotatorApplets(canvas, canvasElement, favorites) {
    this._appletMap = {};
    this._canvasAppletWrappers = {};
    this._canvasApplets = [];

    // Setup the menu applet dialog that will be loaded whenever the user right click menu selects
    // a registered applet
    this._menuAppletDialog = document.createElement("menu-applet-dialog");
    this._menuAppletDialog.setDataInterface(this._data);
    this._main.appendChild(this._menuAppletDialog);

    this._menuAppletDialog.addEventListener("close", () => {
      this.removeAttribute("has-open-modal", "");
      document.body.classList.remove("shortcuts-disabled");
      document.activeElement.blur();
    });

    this._menuAppletDialog.addEventListener("displayLoadingScreen", () => {
      this._loading.style.display = "block";
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._menuAppletDialog.addEventListener("hideLoadingScreen", () => {
      this._loading.style.display = "none";
      this.removeAttribute("has-open-modal");
      document.body.classList.remove("shortcuts-disabled");
    });

    const projectId = Number(this.getAttribute("project-id"));
    fetchCredentials("/rest/Applets/" + projectId, {}, true)
      .then((response) => response.json())
      .then((applets) => {
        for (let applet of applets) {
          if (applet.categories == null) {
            continue;
          }

          if (
            applet.categories.includes("image-only") &&
            this._player.mediaType.dtype != "image"
          ) {
            continue;
          }

          if (
            applet.categories.includes("video-only") &&
            this._player.mediaType.dtype != "video"
          ) {
            continue;
          }

          if (
            applet.categories.includes("multi-only") &&
            this._player.mediaType.dtype != "multi"
          ) {
            continue;
          }

          // Init for annotator menu applets
          if (applet.categories.includes("annotator-menu")) {
            // Add the applet to the dialog
            this._menuAppletDialog.saveApplet(applet);
            canvas.addAppletToMenu(applet.name, applet.categories);
          } else if (applet.categories.includes("annotator-canvas")) {
            // Add canvas applet
            this._canvasApplets.push(applet);
          }
          // Init for annotator tools applets
          if (applet.categories.includes("annotator-tools")) {
            // This puts the tools html into a panel next to the sidebar
            const toolAppletPanel =
              document.createElement("tools-applet-panel");
            toolAppletPanel.saveApplet(applet, this, canvas, canvasElement);
          }

          if (
            applet.categories.includes("annotator-save-tools") &&
            this._saves &&
            Object.entries(this._saves).length > 0
          ) {
            for (let [type, saveDialog] of Object.entries(this._saves)) {
              if (type !== "modifyTrack") {
                const toolAppletSavePanel = document.createElement(
                  "tools-applet-save-panel"
                );
                toolAppletSavePanel.saveApplet(
                  applet,
                  this,
                  canvas,
                  saveDialog,
                  type
                );
              }
            }
          }

          this._appletMap[applet.name] = applet;
        }

        //
        // Setup the canvas applets
        //
        if (
          this._canvasApplets.length == 0 ||
          this._player.mediaType.dtype == "live"
        ) {
          this._sidebar.disableCanvasApplet();
        }

        var canvasAppletInitPromises = [];
        for (const applet of this._canvasApplets) {
          // Create the canvas applet
          const appletInterface = document.createElement(
            "canvas-applet-wrapper"
          );
          appletInterface.style.display = "none";
          appletInterface.style.height = "100vh";
          canvasAppletInitPromises.push(
            appletInterface.init(applet, this._data, favorites, this._undo)
          );
          this._canvasAppletPageWrapper.appendChild(appletInterface);
          this._canvasAppletWrappers[applet.id] = appletInterface;
          appletInterface.addEventListener("overrideCanvas", (evt) => {
            this.overrideCanvas(evt.detail.bitmap);
          });

          appletInterface.addEventListener("clearOverrideCanvas", () => {
            this.clearOverrideCanvas();
          });
        }
        Promise.all(canvasAppletInitPromises).then(() => {
          this._canvasAppletMenuLoading.style.display = "none";

          // Sort the applets by their title now that the elements have been loaded
          this._canvasApplets.sort((a, b) => {
            var aTitle = this._canvasAppletWrappers[a.id].getTitle();
            var bTitle = this._canvasAppletWrappers[b.id].getTitle();
            return aTitle.localeCompare(bTitle);
          });

          // Initialize the header bar
          var sortedWrappers = [];
          for (const applet of this._canvasApplets) {
            sortedWrappers.push(this._canvasAppletWrappers[applet.id]);
          }
          this._appletShortcutBar.init(sortedWrappers);

          // Initialize the menu
          for (const applet of this._canvasApplets) {
            const appletId = applet.id;
            const appletInterface = this._canvasAppletWrappers[appletId];

            // Add the applet to the toolbar menu option
            const div = document.createElement("div");
            div.style.width = "400px";
            div.setAttribute(
              "class",
              "annotation-canvas-overlay-menu-option text-gray d-flex flex-grow px-2 py-2 flex-items-center text-left"
            );
            div.innerHTML = `
              <div class="d-flex py-3 px-3 box-border rounded-2">
                ${appletInterface.getIcon()}
              </div>
              <div class="d-flex flex-column ml-3 col-9">
              <div class="text-semibold text-uppercase f2">${appletInterface.getTitle()}</div>
              <div class="text-dark-gray f3 py-2">${appletInterface.getDescription()}</div>
              </div>
            `;
            this._canvasAppletMenu.appendChild(div);

            div.addEventListener("click", () => {
              this.showCanvasApplet(appletId);
            });
          }
        });
      });
  }

  _setupContextMenuDialogs(canvas, canvasElement, stateTypes, favorites) {
    this._setupAnnotatorApplets(canvas, canvasElement, favorites);

    // This is a bit of a hack, but the modals will share the same
    // methods used by the save localization dialogs since the
    // appearance to the user is the same.
    const menu = document.createElement("modify-track-dialog");
    this._main.appendChild(menu);
    this._saves["modifyTrack"] = menu;

    // Look at the registered algorithms for this project. Set the modify track dialog
    // options appropriately.
    this._extend_track_algo_name = "tator_extend_track";
    this._fill_track_gaps_algo_name = "tator_fill_track_gaps";
    const projectId = Number(this.getAttribute("project-id"));
    const algUrl = "/rest/Algorithms/" + projectId;
    const algorithmPromise = fetchCredentials(algUrl, {}, true)
      .then((response) => {
        return response.json();
      })
      .then((result) => {
        var registeredAnnotatorAlgos = [];
        for (const alg of result) {
          if (
            alg.categories.includes("annotator-view") &&
            !alg.categories.includes("hidden")
          ) {
            registeredAnnotatorAlgos.push(alg.name);
            if (alg.name == this._extend_track_algo_name) {
              menu.enableExtendAutoMethod();
            } else if (alg.name == this._fill_track_gaps_algo_name) {
              if (typeof canvas.enableFillTrackGapsOption !== "undefined") {
                canvas.enableFillTrackGapsOption();
              }
            } else {
              // Use the generic right click menu option
              canvas.addAlgoLaunchOption(alg.name);
            }
          }
        }
        console.log(
          "Registered annotator algorithms: " + registeredAnnotatorAlgos
        );
      });

    menu.addEventListener("fillTrackGaps", (evt) => {
      let body = {
        algorithm_name: this._fill_track_gaps_algo_name,
        extra_params: [{ name: "track", value: evt.detail.trackId }],
      };

      if ("media" in evt.detail.localization) {
        body["media_ids"] = [evt.detail.localization.media];
      } else {
        body["media_ids"] = [evt.detail.localization.media_id];
      }

      fetchCredentials("/rest/Jobs/" + evt.detail.project, {
        method: "POST",
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (response.status != 201) {
            window.alert(
              "Error launching automatic track gaps fill algorithm!"
            );
          }
          return response.json();
        })
        .then((data) => {
          console.log(data);
          this.showAlgoRunningDialog(
            data.id,
            `Filling gaps in track ${evt.detail.trackId} with visual tracker. Status will be provided in the annotator when complete.`,
            (jobSuccessful) => {
              if (jobSuccessful) {
                this._data.updateType(
                  this._data._dataTypes[evt.detail.localization.type]
                );
                this._data.updateType(
                  this._data._dataTypes[evt.detail.trackType]
                );
                Utilities.showSuccessIcon(
                  `Filled gaps in track ${evt.detail.trackId}`
                );
              } else {
                Utilities.warningAlert(
                  `Error filling gaps in track ${evt.detail.trackId}`,
                  "#ff3e1d",
                  false
                );
              }
            }
          );
        });
    });

    menu.addEventListener("extendTrack", (evt) => {
      if (evt.detail.algorithm == "Duplicate") {
        // Create the new localization objets
        var localizationList = [];
        const baseLocalization = evt.detail.localization;
        for (let offset = 1; offset <= evt.detail.numFrames; offset++) {
          var newLocalization = {
            media_id: baseLocalization.media,
            type: Number(baseLocalization.type.split("_")[1]),
            x: baseLocalization.x,
            y: baseLocalization.y,
            u: baseLocalization.u,
            v: baseLocalization.v,
            width: baseLocalization.width,
            height: baseLocalization.height,
            version: baseLocalization.version,
          };

          if (typeof baseLocalization.media === "undefined") {
            newLocalization.media_id = baseLocalization.media_id;
          }

          (newLocalization = { ...newLocalization }),
            (newLocalization.attributes = { ...baseLocalization.attributes });

          if (evt.detail.direction == "Forward") {
            newLocalization.frame = evt.detail.localization.frame + offset;
          } else {
            newLocalization.frame = evt.detail.localization.frame - offset;
          }
          localizationList.push(newLocalization);
        }

        // Make the request
        const promise = fetchCredentials(
          "/rest/Localizations/" + evt.detail.project,
          {
            method: "POST",
            body: JSON.stringify(localizationList),
          },
          true
        )
          .then((response) => {
            return response.json();
          })
          .then((newLocIds) => {
            try {
              if (newLocIds.id.length < 1) {
                throw "Problem creating localizations";
              }

              const trackPromise = fetchCredentials(
                "/rest/State/" + evt.detail.trackId,
                {
                  method: "PATCH",
                  body: JSON.stringify({
                    localization_ids_add: newLocIds.id,
                  }),
                },
                true
              ).then((response) => response.json());

              return trackPromise;
            } catch (error) {
              window.alert(
                "Error with track extension during localization creation process."
              );
              return;
            }
          })
          .then(() => {
            this._data.updateType(
              this._data._dataTypes[evt.detail.localization.type]
            );
            this._data.updateType(this._data._dataTypes[evt.detail.trackType]);
            Utilities.showSuccessIcon(`Extended track ${evt.detail.trackId}`);
            var track = this.getDataElement(
              evt.detail.trackId,
              evt.detail.trackType
            );
            this._browser.selectEntity(track);
            canvas.selectTrackUsingId(
              evt.detail.trackId,
              evt.detail.trackType,
              evt.detail.localization.frame
            );
          });
      } else if (evt.detail.algorithm == "Auto") {
        let body = {
          algorithm_name: this._extend_track_algo_name,
          extra_params: [
            { name: "track", value: evt.detail.trackId },
            { name: "extend_direction", value: evt.detail.direction },
            { name: "extend_detection_id", value: evt.detail.localization.id },
            { name: "extend_max_frames", value: evt.detail.maxFrames },
          ],
        };

        if ("media" in evt.detail.localization) {
          body["media_ids"] = [evt.detail.localization.media];
        } else {
          body["media_ids"] = [evt.detail.localization.media_id];
        }

        fetchCredentials("/rest/Jobs/" + evt.detail.project, {
          method: "POST",
          body: JSON.stringify(body),
        })
          .then((response) => {
            if (response.status != 201) {
              window.alert(
                "Error launching automatic track extension algorithm!"
              );
            }
            return response.json();
          })
          .then((data) => {
            console.log(data);
            this.showAlgoRunningDialog(
              data.id,
              `Extending track ${evt.detail.trackId} with visual tracker. Status will be provided in the annotator when complete.`,
              (jobSuccessful) => {
                if (jobSuccessful) {
                  this._data.updateType(
                    this._data._dataTypes[evt.detail.localization.type]
                  );
                  this._data.updateType(
                    this._data._dataTypes[evt.detail.trackType]
                  );
                  Utilities.showSuccessIcon(
                    `Extended track ${evt.detail.trackId}`
                  );
                } else {
                  Utilities.warningAlert(
                    `Error extending track ${evt.detail.trackId}`,
                    "#ff3e1d",
                    false
                  );
                }
              }
            );
          });
      } else {
        window.alert(
          "Unrecognized track extension algorithm. No track extension performed."
        );
      }
    });

    menu.addEventListener("trimTrack", (evt) => {
      const promise = fetchCredentials(
        "/rest/TrimStateEnd/" + evt.detail.trackId,
        {
          method: "PATCH",
          body: JSON.stringify({
            frame: evt.detail.frame,
            endpoint: evt.detail.endpoint,
          }),
        },
        true
      )
        .then((response) => response.json())
        .then(() => {
          this._data.updateType(
            this._data._dataTypes[evt.detail.localizationType]
          );
          this._data.updateType(this._data._dataTypes[evt.detail.trackType]);
          Utilities.showSuccessIcon(`Trimmed track ${evt.detail.trackId}`);
          var track = this.getDataElement(
            evt.detail.trackId,
            evt.detail.trackType
          );
          this._browser.selectEntity(track);
          canvas.selectTrackUsingId(
            evt.detail.trackId,
            evt.detail.trackType,
            evt.detail.frame
          );
        });
    });

    this._addDetectionToTrack = (evt) => {
      const promise = fetchCredentials(
        "/rest/State/" + evt.detail.mainTrackId,
        {
          method: "PATCH",
          body: JSON.stringify({
            localization_ids_add: [evt.detail.detectionId],
          }),
        },
        true
      )
        .then((response) => response.json())
        .then(() => {
          this._data.updateType(
            this._data._dataTypes[evt.detail.localizationType]
          );
          this._data.updateType(this._data._dataTypes[evt.detail.trackType]);
          Utilities.showSuccessIcon(
            `Added detection to track ${evt.detail.mainTrackId}`
          );
          var track = this.getDataElement(
            evt.detail.mainTrackId,
            evt.detail.trackType
          );
          this._browser.selectEntity(track);
          canvas.selectTrackUsingId(
            evt.detail.mainTrackId,
            evt.detail.trackType,
            evt.detail.frame
          );
        });
    };

    for (const save of Object.values(this._saves)) {
      save.addEventListener(
        "addDetectionToTrack",
        this._addDetectionToTrack.bind(this)
      );
    }

    menu.addEventListener("mergeTracks", (evt) => {
      const promise = fetchCredentials(
        "/rest/MergeStates/" + evt.detail.mainTrackId,
        {
          method: "PATCH",
          body: JSON.stringify({
            merge_state_id: evt.detail.mergeTrackId,
          }),
        },
        true
      )
        .then((response) => response.json())
        .then(() => {
          this._data.updateType(
            this._data._dataTypes[evt.detail.localizationType]
          );
          this._data.updateType(this._data._dataTypes[evt.detail.trackType]);
          Utilities.showSuccessIcon(
            `Merged track into ${evt.detail.mainTrackId}`
          );
          var track = this.getDataElement(
            evt.detail.mainTrackId,
            evt.detail.trackType
          );
          this._browser.selectEntity(track);
          canvas.selectTrackUsingId(
            evt.detail.mainTrackId,
            evt.detail.trackType,
            evt.detail.frame
          );
        });
    });

    menu.addEventListener("yes", () => {
      this._closeModal(menu);
    });

    menu.addEventListener("cancel", () => {
      this._closeModal(menu);
      canvas.refresh();
    });

    canvas.addEventListener("launchMenuApplet", (evt) => {
      var data = {
        applet: this._appletMap[evt.detail.appletName],
        frame: evt.detail.frame,
        version: evt.detail.version,
        media: evt.detail.media,
        projectId: evt.detail.projectId,
        selectedTrack: evt.detail.selectedTrack,
        selectedLocalization: evt.detail.selectedLocalization,
        data: this._data,
        undo: this._undo,
      };

      if (this._player.mediaType.dtype == "multi") {
        data.multiState = canvas._multiLayoutState;
        data.primaryMedia =
          canvas._videos[canvas._primaryVideoIndex]._mediaInfo;
        data.multiMedia = canvas._mediaInfo;
      }

      this._menuAppletDialog.setApplet(evt.detail.appletName, data);
    });

    // Handle replacing the URL when the canvas emits a signal
    canvas.addEventListener("updateURL", (evt) => {
      this._updateURL();
    });

    this._menuAppletDialog.addEventListener("appletReady", () => {
      this._menuAppletDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    canvas.addEventListener("launchAlgorithm", (evt) => {
      const algoName = evt.detail.algoName;
      let body = {
        algorithm_name: algoName,
        extra_params: [
          { name: "version", value: this._version.id },
          { name: "frame", value: evt.detail.frame },
        ],
      };

      body["media_ids"] = [evt.detail.mediaId];

      fetchCredentials("/rest/Jobs/" + evt.detail.projectId, {
        method: "POST",
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (response.status != 201) {
            window.alert(`Error launching ${algoName}!`);
          }
          return response.json();
        })
        .then((data) => {
          console.log(data);
          this.showAlgoRunningDialog(
            data.id,
            `Launched ${algoName}. Status will be provided in the annotator when complete.`,
            (jobSuccessful) => {
              if (jobSuccessful) {
                canvas.updateAllLocalizations();
                Utilities.showSuccessIcon(
                  `Successfully ran algorithm workflow: ${algoName}`
                );
              } else {
                Utilities.warningAlert(
                  `Error with algorithm workflow: ${algoName}`,
                  "#ff3e1d",
                  false
                );
              }
            }
          );
        });
    });

    canvas.addEventListener("modifyTrack", (evt) => {
      const metaMode = evt.detail.metaMode;
      const objDescription = evt.detail.objDescription;
      const dragInfo = evt.detail.dragInfo;
      const requestObj = evt.detail.requestObj;
      const canvasPosition = canvasElement.getBoundingClientRect();

      const dialog = this._getSave(objDescription);
      dialog.setUI(objDescription);

      this._openModal(
        objDescription,
        dragInfo,
        canvasPosition,
        requestObj,
        metaMode
      );
    });

    if (typeof canvas.addCreateTrackType !== "undefined") {
      for (const dataType of stateTypes) {
        canvas.addCreateTrackType(dataType);
      }
    }
  }

  _closeModal(save) {
    if (save.classList.contains("is-open")) {
      save.style.display = "none";
      save.classList.remove("is-open");
      this.removeAttribute("has-open-modal");
      document.body.classList.remove("shortcuts-disabled");

      if (this._mediaType.dtype == "multi") {
        for (const video of this._player._videos) {
          video.style.zIndex = "unset";
        }
      }
    }
  }

  _openModal(objDescription, dragInfo, canvasPosition, requestObj, metaMode) {
    const save = this._getSave(objDescription);
    save.canvasPosition = canvasPosition;
    save.dragInfo = dragInfo;
    save.requestObj = requestObj;
    save.metaMode = metaMode;
    save.classList.add("is-open");
    save.dispatchEvent(new Event("open"));
    save.style.display = "block";
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");

    if (this._mediaType.dtype == "multi") {
      for (const video of this._player._videos) {
        video.style.zIndex = 2;
      }
    }
  }

  _updateURL() {
    if (!this._dataInitialized || !this._canvasInitialized) {
      return;
    }

    let existingSearchParams = new URLSearchParams(window.location.search);
    if (this._canvas._rate) {
      // annotation-player or annotation-image
      existingSearchParams.set("playbackRate", this._canvas._rate);
    }
    var newSearchParams = this._settings._queryParams(existingSearchParams);
    const path = document.location.pathname;
    const searchArgs = newSearchParams.toString();
    var newUrl = path + "?" + searchArgs;
    if (this._annotationPageHistoryState) {
      window.history.replaceState(this._annotationPageHistoryState, "", newUrl);
    } else {
      this._annotationPageHistoryState = { state: 1 };
      window.history.pushState(this._annotationPageHistoryState, "", newUrl);
    }
  }
  _getSave(objDescription) {
    let save;
    if (["poly", "box", "line", "dot"].includes(objDescription.dtype)) {
      save = this._saves[objDescription.dtype];
    } else {
      save = this._saves[objDescription.id];
    }
    return save;
  }

  clearMetaCaches() {
    Object.values(this._saves).forEach((save) => {
      save.metaMode = false;
    });
  }

  /// Turn on or off ability to edit annotations
  async enableEditing(mask) {
    let enable;

    // Check if user has permission before state of button
    if (this._permission == "View Only") {
      enable = false;
      this._settings._lock.viewOnly();
    } else {
      enable = this._settings._lock._pathLocked.style.display == "none";
    }

    // Check input.
    if (typeof mask !== "undefined") {
      enable &= mask;
    }

    let permission;
    if (enable) {
      // Set privileges to user's level.
      permission = this._permission;
    } else {
      // Turn off editing.
      permission = "View Only";
    }
    while (
      typeof this._player == "undefined" ||
      typeof this._browser == "undefined" ||
      typeof this._sidebar == "undefined"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this._player.permission = permission;
    this._browser.permission = permission;
    this._sidebar.permission = permission;
  }

  _updateLastVisitedBookmark(projectId) {
    const uri = `${window.location.pathname}${window.location.search}`;
    const name = "Last visited";
    // Get the last visited, if it exists.
    fetchCredentials(`/rest/Bookmarks/${projectId}?name=${name}`, {}, true)
      .then((response) => response.json())
      .then((data) => {
        if (data.length == 0) {
          fetchCredentials(`/rest/Bookmarks/${projectId}`, {
            method: "POST",
            body: JSON.stringify({ name: name, uri: uri }),
          });
        } else {
          const id = data[0].id;
          fetchCredentials(
            `/rest/Bookmark/${id}`,
            {
              method: "PATCH",
              body: JSON.stringify({ name: name, uri: uri }),
            },
            true
          );
        }
      });
  }

  getDataElement(elemId, elemTypeId) {
    var elemList = this._data._dataByType.get(elemTypeId);
    for (const elem of elemList) {
      if (elem.id == elemId) {
        return elem;
      }
    }
    return;
  }

  /**
   * Display the canvas applet menu toolbar next to the toolbar button
   */
  showCanvasAppletMenu() {
    this._sidebar._canvasApplet._button.classList.add("purple-box-border");

    let pos = this._sidebar._canvasApplet.getBoundingClientRect();
    let padding = 20 + this._canvasApplets.length * 60;
    this._canvasAppletMenu.style.top = `${pos.top - padding}px`;
    this._canvasAppletMenu.style.left = `${pos.right + 18}px`;
    this._canvasAppletMenu.style.display = "block";
  }

  /**
   * Hide the canvas applet menu
   */
  hideCanvasAppletMenu() {
    this._canvasAppletMenu.style.display = "none";
    this._sidebar._canvasApplet._button.classList.remove("purple-box-border");
  }

  /**
   * Force update the canvas applet init with the new frame.
   * If a canvas applet is not currently open, then do nothing.
   */
  updateCanvasAppletWithFrameChange() {
    if (this._currentCanvasApplet == null) {
      return;
    }
    if (
      this._currentCanvasApplet._lastFrameUpdate != this._currentFrame &&
      !this._updatingCanvasAppletWithFrameChange
    ) {
      this._updatingCanvasAppletWithFrameChange = true;
      this.showCanvasApplet(this._currentCanvasApplet._applet.id);
    }
  }

  /**
   * Bring up the canvas applet to the forefront and hide the main annotation parts.
   * Pass along information about the current state to the applet.
   * @param {int} appletId
   *    Applet to display
   */
  showCanvasApplet(appletId) {
    function displayCanvasAppletWrapper() {
      this._currentCanvasApplet.style.display = "flex";
      this._currentCanvasApplet.show(appletData);

      this._canvasAppletHeader.style.display = "flex";
      this._canvasAppletHeader.setAttribute(
        "title",
        this._currentCanvasApplet.getTitle()
      );

      // Hide the main annotation page and the appropriate header components
      this._versionButton.style.display = "none";
      this._settings.style.display = "none";
      this._main.style.display = "none";

      // Display the applet shortcuts
      this._appletShortcutBar.setActive(appletId);
      this._appletShortcutBar.style.display = "flex";
      // Display the camera selection if in multiview
      if (this._player.mediaType.dtype == "multi") {
        this._cameraSelectionBar.style.display = "flex";
      }

      this._updatingCanvasAppletWithFrameChange = false;
    }

    this.hideCanvasAppletMenu();

    if (this._currentCanvasApplet != null) {
      if (!this._currentCanvasApplet.allowedToClose()) {
        return;
      }

      this._currentCanvasApplet.style.display = "none";
      this._currentCanvasApplet.close();
      this._canvasAppletHeader.style.display = "none";
      this._currentCanvasApplet = null;
    }

    const selectedCameraMediaId = this._cameraSelectionBar.getActive();
    const currentCanvas = this._cameraCanvasMap[selectedCameraMediaId];
    const selectedMedia = this._mediaMap[selectedCameraMediaId];
    this._canvasAppletHeader.frame = this._currentFrame;
    var appletData = {
      frame: this._currentFrame,
      selectedTrack: this._canvas._activeTrack,
      selectedLocalization: this._canvas.activeLocalization,
      media: selectedMedia,
    };

    this._currentCanvasApplet = this._canvasAppletWrappers[appletId];

    if (
      this._currentCanvasApplet._lastFrameUpdate != this._currentFrame ||
      this._currentCanvasApplet._lastMediaId != selectedCameraMediaId
    ) {
      currentCanvas.getPNGdata(false).then(async (blob) => {
        await this._currentCanvasApplet.updateAnnotator(this._player);
        await this._currentCanvasApplet.updateMedia(selectedMedia);
        await this._currentCanvasApplet.updateAnnotationCanvas(currentCanvas);
        this._currentCanvasApplet.updateFrame(this._currentFrame, blob);
        displayCanvasAppletWrapper.bind(this)();
      });
    } else {
      displayCanvasAppletWrapper.bind(this)();
    }
  }

  /**
   * Request to close up the visible canvas applet and show the main annotator
   * If the applet isn't allowed to close yet, then do nothing.
   * If it is allowed, set the applet display to none and bring the annotation page back to usual.
   */
  exitCanvasApplet() {
    if (!this._currentCanvasApplet.allowedToClose()) {
      return;
    }

    this._currentCanvasApplet.style.display = "none";
    this._currentCanvasApplet.close();
    this._canvasAppletHeader.style.display = "none";
    this._currentCanvasApplet = null;

    // Show the main page and the appropriate header components
    this._versionButton.style.display = "block";
    this._settings.style.display = "block";
    this._main.style.display = "flex";

    // Hide shortcuts
    this._appletShortcutBar.style.display = "none";
    this._cameraSelectionBar.style.display = "none";

    // Required resize to reset the elements correctly
    window.dispatchEvent(new Event("resize"));
  }

  /**
   * @param {ImageBitmap} imageBitmap
   *   ImageBitmap to override the canvas with
   */
  overrideCanvas(imageBitmap) {
    this._canvas.overrideCanvas(this._currentFrame, imageBitmap);

    Utilities.showSuccessIcon("Canvas overridden with new image!");

    for (const applet of this._canvasApplets) {
      this._canvasAppletWrappers[applet.id].forceUpdateFrameOnLoad();
    }
  }

  clearOverrideCanvas() {
    this._canvas.clearOverrideCanvas();

    Utilities.showSuccessIcon("Canvas override cleared!");

    for (const applet of this._canvasApplets) {
      this._canvasAppletWrappers[applet.id].forceUpdateFrameOnLoad();
    }
  }
}

customElements.define("annotation-page", AnnotationPage);
