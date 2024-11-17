import { TatorElement } from "../components/tator-element.js";

export class AppletShortcutBar extends TatorElement {
  constructor() {
    super();

    this._wrapperDiv = document.createElement("div");
    this._wrapperDiv.setAttribute("class", "d-flex");
    this._shadow.appendChild(this._wrapperDiv);
  }

  /**
   * Expected to be run once at page initialization
   *
   * @param {array} applets
   *   Array of canvas-applet-wrapper elements in the order they should be displayed
   */
  init(applets) {
    this._appletButtons = {};

    const label = document.createElement("div");
    label.setAttribute(
      "class",
      "d-flex flex-justify-center flex-items-center text-gray text-semibold f3 mr-1"
    );
    label.textContent = "Applets:";
    this._wrapperDiv.appendChild(label);

    for (const wrapper of applets) {
      const button = document.createElement("button");
      button.setAttribute(
        "class",
        "btn-clear d-flex flex-justify-center flex-items-center px-2 py-2 rounded-2 box-border f2 text-gray hover-text-white mx-1"
      );
      this._wrapperDiv.appendChild(button);
      button.innerHTML = wrapper.getIcon();
      button.setAttribute("tooltip", `Show ${wrapper.getTitle()}`);
      this._appletButtons[wrapper._applet.id] = button;

      button.addEventListener("click", () => {
        button.blur();

        // Don't switch if the button (ie the applet) is already active
        if (!button.classList.contains("btn-purple50")) {
          this.dispatchEvent(
            new CustomEvent("showApplet", {
              detail: { appletId: wrapper._applet.id },
            })
          );
        }
      });
    }
  }

  /**
   * @param {integer} appletId
   *   Unique applet ID that is currently active in the page.
   *   If set to null, no button will be active.
   */
  setActive(appletId) {
    for (const buttonId in this._appletButtons) {
      if (buttonId == appletId) {
        this._appletButtons[buttonId].classList.add("btn-purple50");
      } else {
        this._appletButtons[buttonId].classList.remove("btn-purple50");
      }
    }
  }
}

customElements.define("applet-shortcut-bar", AppletShortcutBar);
