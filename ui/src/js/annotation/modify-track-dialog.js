import { TatorElement } from "../components/tator-element.js";

export class ModifyTrackDialog extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "annotation__panel--popup annotation__panel px-4 rounded-2"
    );
    this._shadow.appendChild(this._div);

    const header = document.createElement("div");
    header.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between py-3"
    );
    this._div.appendChild(header);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "text-white");
    header.appendChild(this._span);

    this._contentDiv = document.createElement("div");
    this._contentDiv.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between annotation__panel-group py-3"
    );
    this._div.appendChild(this._contentDiv);

    this._createFillGapsDiv();
    this._createTrimDialogDiv();
    this._createExtendDialogDiv();
    this._createMergeDialogDiv();
    this._createAddDetectionDialogDiv();
    this._resetUI();

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex flex-items-center py-4");
    this._div.appendChild(buttons);

    this._yesButton = document.createElement("button");
    this._yesButton.setAttribute("class", "btn btn-clear");
    this._yesButton.textContent = "Extend";
    buttons.appendChild(this._yesButton);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn-clear px-4 text-gray hover-text-white");
    cancel.textContent = "Cancel";
    buttons.appendChild(cancel);

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new Event("cancel"));
    });

    this._yesButton.addEventListener("click", this._yesClickHandler.bind(this));
  }

  _createFillGapsDiv() {
    const div = document.createElement("div");
    this._fillGapsQuestion = document.createElement("p");
    div.appendChild(this._fillGapsQuestion);

    this._fillGapsText = document.createElement("p");
    this._fillGapsText.setAttribute("class", "text-gray f2 py-3");
    div.appendChild(this._fillGapsText);

    this._fillGapsDiv = div;
    this._contentDiv.appendChild(div);
  }

  _createTrimDialogDiv() {
    const div = document.createElement("div");
    this._trimTextQuestion = document.createElement("p");
    div.appendChild(this._trimTextQuestion);

    this._trimText = document.createElement("p");
    this._trimText.setAttribute("class", "text-gray f2 py-3");
    div.appendChild(this._trimText);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This cannot be undone";
    div.appendChild(warning);

    this._trimDiv = div;
    this._contentDiv.appendChild(div);
  }

  _createMergeDialogDiv() {
    const div = document.createElement("div");

    var questionText = document.createElement("p");
    questionText.textContent = "Merge selected track into main track?";
    div.appendChild(questionText);

    this._mergeText = document.createElement("p");
    this._mergeText.setAttribute("class", "text-gray f2 py-3");
    div.appendChild(this._mergeText);

    const warning = document.createElement("p");
    warning.setAttribute("class", "text-semibold py-3");
    warning.textContent = "Warning: This cannot be undone";
    div.appendChild(warning);

    this._mergeDiv = div;
    this._contentDiv.appendChild(div);
  }

  _createAddDetectionDialogDiv() {
    const div = document.createElement("div");

    var questionText = document.createElement("p");
    questionText.textContent = "Add selected detection to main track?";
    div.appendChild(questionText);

    this._addDetectionText = document.createElement("p");
    this._addDetectionText.setAttribute("class", "text-gray f2 py-3");
    div.appendChild(this._addDetectionText);

    this._addDetectionDiv = div;
    this._contentDiv.appendChild(div);
  }

  _createExtendDialogDiv() {
    const div = document.createElement("div");
    this._extendMethod = document.createElement("enum-input");
    this._extendMethod.setAttribute("name", "Method");
    this._extendMethodChoices = [];
    this._extendMethodChoices.push({ value: "Duplicate" });
    this._extendMethod.choices = this._extendMethodChoices;
    div.appendChild(this._extendMethod);

    this._extendDirection = document.createElement("enum-input");
    this._extendDirection.setAttribute("name", "Direction");
    let choices = [];
    choices.push({ value: "Forward" });
    choices.push({ value: "Backward" });
    this._extendDirection.choices = choices;
    div.appendChild(this._extendDirection);

    this._extendFrames = document.createElement("text-input");
    this._extendFrames.setAttribute("name", "Num Frames");
    this._extendFrames.setAttribute("type", "int");
    div.appendChild(this._extendFrames);

    this._applyMaxFrames = document.createElement("bool-input");
    this._applyMaxFrames.setAttribute("name", "Apply Max Frames");
    this._applyMaxFrames.setAttribute("on-text", "Yes");
    this._applyMaxFrames.setAttribute("off-text", "No");
    this._applyMaxFrames.setValue(true);
    this._applyMaxFrames.addEventListener(
      "change",
      this._setMaxFrameUI.bind(this)
    );
    div.appendChild(this._applyMaxFrames);
    this._applyMaxFrames.style.display = "none";

    this._extendMaxFrames = document.createElement("text-input");
    this._extendMaxFrames.setAttribute("name", "Max Num Frames");
    this._extendMaxFrames.setAttribute("type", "int");
    this._extendMaxFrames.setValue(200);
    div.appendChild(this._extendMaxFrames);
    this._extendMaxFrames.style.display = "none";

    this._extendMethod.addEventListener("change", this._setExtendUI.bind(this));

    this._extendDiv = div;
    this._contentDiv.appendChild(div);
  }

  _setExtendUI() {
    let alg = this._extendMethod.getValue();
    if (alg == "Auto") {
      this._extendFrames.style.display = "none";
      this._applyMaxFrames.setValue(true);
      this._setMaxFrameUI(); // Sets visibility of this._extendMaxFrames
      this._applyMaxFrames.style.display = "initial";
    } else {
      this._extendFrames.style.display = "initial";
      this._applyMaxFrames.style.display = "none";
      this._extendMaxFrames.style.display = "none";
    }
  }

  _setMaxFrameUI() {
    if (this._applyMaxFrames.getValue()) {
      this._extendMaxFrames.style.display = "initial";
    } else {
      this._extendMaxFrames.style.display = "none";
    }
  }

  enableExtendAutoMethod() {
    this._extendMethod.choices = [{ value: "Auto" }];
  }

  _yesClickHandler() {
    this.dispatchEvent(new Event("yes"));

    if (this._data.interface == "mergeTrack") {
      this.dispatchEvent(
        new CustomEvent("mergeTracks", {
          composed: true,
          detail: {
            localizationType: this._data.localization.type,
            trackType: this._data.mainTrack.type,
            frame: this._data.frame,
            mainTrackId: this._data.mainTrack.id,
            mergeTrackId: this._data.track.id,
          },
        })
      );
    } else if (this._data.interface == "fillTrackGaps") {
      this.dispatchEvent(
        new CustomEvent("fillTrackGaps", {
          composed: true,
          detail: {
            project: this._data.project,
            trackId: this._data.track.id,
            trackType: this._data.track.type,
            localization: this._data.localization,
          },
        })
      );
    } else if (this._data.interface == "addDetection") {
      this.dispatchEvent(
        new CustomEvent("addDetectionToTrack", {
          composed: true,
          detail: {
            localizationType: this._data.localization.type,
            trackType: this._data.mainTrack.type,
            frame: this._data.frame,
            mainTrackId: this._data.mainTrack.id,
            detectionId: this._data.localization.id,
            selectTrack: true,
          },
        })
      );
    } else if (this._data.interface == "trim") {
      this.dispatchEvent(
        new CustomEvent("trimTrack", {
          composed: true,
          detail: {
            localizationType: this._data.localization.type,
            trackType: this._data.track.type,
            frame: this._data.frame,
            endpoint: this._data.trimEndpoint,
            trackId: this._data.track.id,
          },
        })
      );
    } else if (this._data.interface == "extend") {
      // Before proceeding forward, check the frame count and make sure it doesnt
      // exceed the video length (in either direction). If there's a problem a window
      // alert will be presented and the corresponding event is ignored.
      try {
        let alg = this._extendMethod.getValue();
        var extendFrames = 0;
        var maxFrames = 0;
        var useMaxFrames = false;
        var direction = this._extendDirection.getValue();

        if (alg === "Duplicate") {
          extendFrames = parseInt(this._extendFrames.getValue());

          if (isNaN(extendFrames)) {
            throw "Invalid number of frames requested.";
          }

          var endFrame = this._data.frame;
          if (direction == "Forward") {
            endFrame = endFrame + extendFrames;
            if (endFrame > this._data.maxFrames) {
              throw "Requested frames exceed video length.";
            }
          } else {
            endFrame = endFrame - extendFrames;
            if (endFrame < 0) {
              throw "Requested frames exceed video length.";
            }
          }
        } else if (alg == "Auto") {
          useMaxFrames = this._applyMaxFrames.getValue();
          if (useMaxFrames) {
            maxFrames = parseInt(this._extendMaxFrames.getValue());
          } else {
            maxFrames = -1;
          }
        }

        this.dispatchEvent(
          new CustomEvent("extendTrack", {
            composed: true,
            detail: {
              project: this._data.project,
              trackId: this._data.track.id,
              trackType: this._data.track.type,
              localization: this._data.localization,
              algorithm: alg,
              numFrames: extendFrames,
              useMaxFrames: useMaxFrames,
              maxFrames: maxFrames,
              direction: this._extendDirection.getValue(),
            },
          })
        );
      } catch (error) {
        window.alert(error + " Extend track command ignored.");
      }
    }
  }

  _resetUI() {
    this._span.textContent = "";
    this._fillGapsDiv.style.display = "none";
    this._extendDiv.style.display = "none";
    this._mergeDiv.style.display = "none";
    this._addDetectionDiv.style.display = "none";
    this._trimDiv.style.display = "none";
  }

  _setToFillTrackGapsUI() {
    this._span.textContent = "Fill Track Gaps";
    this._fillGapsDiv.style.display = "block";
    this._yesButton.textContent = "Fill";

    var text =
      "This will launch a visual tracker that will attempt to automatically fill in detections where there are track gaps.";
    var question = "Automatically fill gaps of detections?";
    this._fillGapsQuestion.textContent = question;
    this._fillGapsText.textContent = text;
  }

  _setToExtendUI() {
    this._span.textContent = "Extend Track";
    this._extendDiv.style.display = "block";
    this._yesButton.textContent = "Extend";
    this._setExtendUI();
  }

  _setToMergeUI() {
    this._span.textContent = "Merge Tracks";
    this._mergeDiv.style.display = "block";
    this._yesButton.textContent = "Merge";

    let text =
      "Detections from track " +
      this._data.track.id.toString() +
      " will be merged into track " +
      this._data.mainTrack.id.toString() +
      ".";
    this._mergeText.textContent = text;
  }

  _setToAddDetectionUI() {
    this._span.textContent = "Add Track Detection";
    this._addDetectionDiv.style.display = "block";
    this._yesButton.textContent = "Add";

    let text =
      "Detection " +
      this._data.localization.id.toString() +
      " will be added to track " +
      this._data.mainTrack.id.toString() +
      ".";
    this._addDetectionText.textContent = text;
  }

  _setToTrimUI() {
    this._span.textContent = "Trim Track";
    this._trimDiv.style.display = "block";
    this._yesButton.textContent = "Trim";

    var text;
    var question;
    if (this._data.trimEndpoint == "start") {
      question = "Set track's new start point?";
      text = "This will trim all previous frames from the track.";
    } else {
      question = "Set track's new end point?";
      text = "This will trim all following frames from the track.";
    }
    this._trimTextQuestion.textContent = question;
    this._trimText.textContent = text;
  }

  setUI(data) {
    this._data = data;
    const dialogType = data.interface;

    this._resetUI();
    if (dialogType == "extend") {
      this._setToExtendUI();
    } else if (dialogType == "mergeTrack") {
      this._setToMergeUI();
    } else if (dialogType == "addDetection") {
      this._setToAddDetectionUI();
    } else if (dialogType == "trim") {
      this._setToTrimUI();
    } else if (dialogType == "fillTrackGaps") {
      this._setToFillTrackGapsUI();
    }
  }

  set trackData(val) {
    this_trackData = val;
  }

  set version(val) {
    this._version = val;
  }

  set canvasPosition(val) {
    this._canvasPosition = val;
    this._updatePosition();
  }

  set dragInfo(val) {
    this._dragInfo = val;
    this._updatePosition();
  }

  set metaMode(val) {
    this._metaMode = val;
    if (val == false) {
      this._metaCache = null;
    }
  }

  set requestObj(val) {
    this._requestObj = val;
  }

  _updatePosition() {
    const dragDefined = typeof this._dragInfo !== "undefined";
    const canvasDefined = typeof this._canvasPosition !== "undefined";
    if (dragDefined && canvasDefined) {
      const boxTop = Math.min(this._dragInfo.start.y, this._dragInfo.end.y) - 2;
      const boxRight = Math.max(this._dragInfo.start.x, this._dragInfo.end.x);
      let thisTop = boxTop + this._canvasPosition.top;
      let thisLeft = boxRight + 20 + this._canvasPosition.left;
      if (thisLeft + this.clientWidth > window.innerWidth) {
        const boxLeft = Math.min(this._dragInfo.start.x, this._dragInfo.end.x);
        thisLeft = boxLeft - 20 - this.clientWidth + this._canvasPosition.left;
      }
      if (thisTop + this.clientHeight > window.innerHeight) {
        const boxBottom =
          Math.max(this._dragInfo.start.y, this._dragInfo.end.y) + 2;
        thisTop = boxBottom - this.clientHeight + this._canvasPosition.top + 16;
      }
      // Prevent being drawn off screen
      thisTop = Math.max(thisTop, 50);
      thisLeft = Math.max(thisLeft, 50);
      this.style.top = thisTop + "px";
      this.style.left = thisLeft + "px";
    }
  }
}

customElements.define("modify-track-dialog", ModifyTrackDialog);
