import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class LockButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    button.appendChild(svg);

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Disable editing";
    svg.appendChild(this._title);

    const rect = document.createElementNS(svgNamespace, "rect");
    rect.setAttribute("x", "3");
    rect.setAttribute("y", "11");
    rect.setAttribute("width", "18");
    rect.setAttribute("height", "11");
    rect.setAttribute("rx", "2");
    rect.setAttribute("ry", "2");
    svg.appendChild(rect);

    this._pathUnlocked = document.createElementNS(svgNamespace, "path");
    this._pathUnlocked.setAttribute("d", "M7 11V7a5 5 0 0 1 9.9-1");
    svg.appendChild(this._pathUnlocked);

    this._pathLocked = document.createElementNS(svgNamespace, "path");
    this._pathLocked.setAttribute("d", "M7 11V7a5 5 0 0 1 10 0v4");
    this._pathLocked.style.display = "none";
    svg.appendChild(this._pathLocked);

    this._viewOnly = false;

    button.addEventListener("click", () => {
      if (!this._viewOnly) {
        if (this._pathLocked.style.display == "none") {
          this.lock();
        } else {
          this.unlock();
        }
      }
    });
  }

  lock() {
    this._pathLocked.style.display = "block";
    this._pathUnlocked.style.display = "none";
    this._title.textContent = "Enable editing";
  }

  unlock() {
    this._pathLocked.style.display = "none";
    this._pathUnlocked.style.display = "block";
    this._title.textContent = "Disable editing";
  }

  viewOnly() {
    this._viewOnly = true;
    this._pathLocked.style.display = "block";
    this._pathUnlocked.style.display = "none";
    this._title.textContent = "Insufficient Permission to Edit";
  }
}

customElements.define("lock-button", LockButton);
