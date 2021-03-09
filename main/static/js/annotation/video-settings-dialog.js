class VideoSettingsDialog extends ModalDialog {
  constructor() {
    super();

    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "px-3 py-3");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "Advanced Video Settings";
    this._main.setAttribute("class", "modal__main px-3 py-4");
    //this._titleDiv.style.marginBottom = "10px";
    //this._main.remove();

    this._gridDiv = document.createElement("div");
    this._gridDiv.setAttribute("class", "video__settings py-4 text-gray");
    this._main.appendChild(this._gridDiv);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Apply";
    this._footer.appendChild(apply);

    apply.addEventListener("click", () => {
      this.removeAttribute("is-open");
      this.dispatchEvent(new Event("close"));
    });

    this._divOptions = {};
    this._createBuffer(1, "scrub", "Scrub Buffer", "Timeline scrubbing, downloaded playback, greater than 1x playback");
    this._createBuffer(2, "seek", "Seek Quality", "Pause quality");
    this._createBuffer(3, "playback", "On-Demand 1x Playback", "1x playback for single vidoes and grid videos");
    this._createBuffer(4, "focusPlayback", "Focused On-Demand 1x Playback", "1x playback for the focused video (if present)");
    this._createBuffer(5, "dockedPlayback", "Docked On-Demand 1x Playback", "1x playback for docked videos (if present)");
    this.mode = "single";
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
  }

  /**
   * @param {string} val - single|multiview
   */
  set mode(val) {
    this._mode = val;

    if (val == "single")
    {
      this._divOptions["focusPlayback"].textDiv.style.display = "none";
      this._divOptions["dockedPlayback"].textDiv.style.display = "none";
      this._divOptions["focusPlayback"].choiceDiv.style.display = "none";
      this._divOptions["dockedPlayback"].choiceDiv.style.display = "none";
    }
    else if (val == "multiview")
    {
      this._divOptions["focusPlayback"].textDiv.style.display = "block";
      this._divOptions["dockedPlayback"].textDiv.style.display = "block";
      this._divOptions["focusPlayback"].choiceDiv.style.display = "block";
      this._divOptions["dockedPlayback"].choiceDiv.style.display = "block";
    }
  }

  /**
   *
   */
  set defaultValues(val) {

  }

  /**
   * Set the options available to the user using the provided list of video formats
   *
   * @param {list} val - List of the objects with the following fields
   *                     that represent the streaming formats
   *     .quality (number) - Quality (widest dimension in pixel, e.g. 360, 720, 1080)
   *     .fps (number) - Frames per second
   */
  set bufferOptions(val) {

  }
}

customElements.define("video-settings-dialog", VideoSettingsDialog);
