import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class FrameTimeButton extends TatorElement {
  constructor() {
    super();

    this._frameIconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;
    this._timeIconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 f3 text-gray hover-text-white"
    );
    this._shadow.appendChild(button);

    this._svgDiv = document.createElement("div");
    this._svgDiv.id = "frame-time-button";
    this._svgDiv.setAttribute("class", "d-flex");
    this._svgDiv.style.margin = "auto";
    this._svgDiv.innerHTML = this._frameIconHTML;
    button.appendChild(this._svgDiv);

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Toggle frame/time display";
    this._svgDiv.appendChild(this._title);

    this._currentMode = "frame";
    button.addEventListener("click", () => {
      if (this._currentMode == "frame") {
        this._currentMode = "time";
        this._svgDiv.innerHTML = this._timeIconHTML;
        this.dispatchEvent(new Event("time"));
      } else {
        this._currentMode = "frame";
        this._svgDiv.innerHTML = this._frameIconHTML;
        this.dispatchEvent(new Event("frame"));
      }
      button.blur();
    });
  }
}

customElements.define("frame-time-button", FrameTimeButton);
