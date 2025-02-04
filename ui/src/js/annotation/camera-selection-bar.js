import { TatorElement } from "../components/tator-element.js";
export class CameraSelectionBar extends TatorElement {
  constructor() {
    super();
    this._wrapperDiv = document.createElement("div");
    this._wrapperDiv.setAttribute("class", "d-flex");
    this._shadow.appendChild(this._wrapperDiv);
  }
  /**
   * Expected to be run once at page initialization
   *
   * @param {array} mediaList
   *   Array of media objects to display in the bar
   */
  init(mediaList) {
    this._cameraButtons = {};
    this._mediaList = mediaList;
    const label = document.createElement("div");
    label.setAttribute(
      "class",
      "d-flex flex-justify-center flex-items-center text-gray text-semibold f3 mr-1"
    );
    label.textContent = "Cameras:";
    this._wrapperDiv.appendChild(label);
    // Loop over the media list, and use the index + 1 as the innerHTML to display for the button
    // When click, dispatch the showCamera event with the media object
    for (let idx = 0; idx < mediaList.length; idx++) {
      const cameraNumber = idx + 1;
      const media = mediaList[idx];
      const button = document.createElement("button");
      button.setAttribute(
        "class",
        "btn-clear d-flex flex-justify-center flex-items-center px-2 py-2 rounded-2 box-border f2 text-gray hover-text-white mx-1"
      );
      this._wrapperDiv.appendChild(button);
      button.innerHTML = `${cameraNumber}`;
      button.setAttribute("tooltip", `Show Camera ${cameraNumber}`);
      this._cameraButtons[media.id] = button;
      button.style.width = "42px";
      button.style.height = "42px";
      button.addEventListener("click", () => {
        button.blur();
        // Don't switch if the button (ie the camera) is already active
        if (!button.classList.contains("btn-purple50")) {
          this.dispatchEvent(
            new CustomEvent("showCamera", {
              detail: { mediaId: media.id },
            })
          );
        }
      });
    }
  }
  /**
   * @param {integer} mediaId
   *   Unique media ID that is currently the selected camera in the page
   */
  setActive(mediaId) {
    for (const buttonId in this._cameraButtons) {
      if (buttonId == mediaId) {
        this._cameraButtons[buttonId].classList.add("btn-purple50");
      } else {
        this._cameraButtons[buttonId].classList.remove("btn-purple50");
      }
    }
  }
  /**
   * @return {integer} Media ID of the currently active camera
   */
  getActive() {
    for (const mediaId in this._cameraButtons) {
      if (this._cameraButtons[mediaId].classList.contains("btn-purple50")) {
        return mediaId;
      }
    }
  }
}
customElements.define("camera-selection-bar", CameraSelectionBar);
