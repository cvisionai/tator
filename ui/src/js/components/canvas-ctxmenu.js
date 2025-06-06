import { TatorElement } from "./tator-element.js";

export class CanvasContextMenu extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "btn-clear btn-border d-flex px-2 py-2 rounded-1 f2 annotation__setting"
    );
    this._div.style.position = "absolute";
    this._div.style.width = "auto";
    this._div.style.height = "auto";
    this._div.style.opacity = 0.9;
    this._shadow.appendChild(this._div);

    this._buttons = {};
    this._numEntries = 0;
  }

  addMenuEntry(newText, clickCallback, keyboardShortcut) {
    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center py-2 text-gray hover-text-white"
    );
    if (keyboardShortcut != undefined) {
      button.textContent = `${newText}${keyboardShortcut}`;
    } else {
      button.textContent = newText;
    }
    button.style.display = "block";
    button.addEventListener("click", () => {
      this.hideMenu();
      clickCallback(newText);
    });

    this._div.appendChild(button);
    this._buttons[newText] = button;
    this._numEntries += 1;
  }

  hasEntries() {
    return this._numEntries > 0;
  }

  hideMenu() {
    this._div.style.display = "none";
  }

  disableEntry(entryText, disable, tooltipText) {
    var button = this._buttons[entryText];
    button.disabled = disable;

    button.title = "";
    if (tooltipText) {
      button.title = tooltipText;
    }
  }

  displayEntry(entryText, display) {
    var button = this._buttons[entryText];

    if (display) {
      button.style.display = "block";
    } else {
      button.style.display = "none";
    }
  }

  displayMenu(x, y) {
    this._div.style.zIndex = 5; // Needs to be above video for menu items to be selectable
    this._div.style.left = x + "px";
    this._div.style.top = y + "px";
    this._div.style.display = "block";
  }
}

customElements.define("canvas-context-menu", CanvasContextMenu);
