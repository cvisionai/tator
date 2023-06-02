import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class SuccessLight extends TatorElement {
  constructor() {
    super();

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "tator-success-light");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "32px");
    svg.setAttribute("width", "32px");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#54e37a");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    svg.style.display = "none";
    svg.style.marginRight = "10px";
    this._shadow.appendChild(svg);
    this._svg = svg;

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Success";
    svg.appendChild(this._title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M 12 1 C 6 1 1 6 1 12 C 1 18 6 23 12 23 C 18 23 23 18 23 12 C 23 6 18 1 12 1"
    );
    svg.appendChild(path);

    const path2 = document.createElementNS(svgNamespace, "path");
    path2.setAttribute("d", "M 17 7 L 10 16 L 6 13");
    svg.appendChild(path2);

    this._message_div = document.createElement("div");
    this._message_div.setAttribute("class", "more d-flex f2");
    this._shadow.appendChild(this._message_div);

    this._message_span = document.createElement("span");
    this._message_span.setAttribute("class", "px-4 py-4");
    this._message_div.appendChild(this._message_span);

    this.hide();
    this.fade_stage = 0; // 0, 1, 2 or 3
    window.tator_success_light = this;
  }

  fade() {
    if (this.fade_stage == 0) {
      this.fade_stage = 1;
      this.fade();
    } else if (this.fade_stage == 1) {
      this.style.opacity = "0";
      this.style.transition = "0.25s";

      var that = this;
      setTimeout(() => {
        if (that.fade_stage == 1) {
          that.fade_stage = 2;
        }
        that.fade();
      }, 250);
    } else if (this.fade_stage == 2) {
      this._message_div.style.display = null;
      this._svg.style.display = null;
      this.style.opacity = "100";
      this.style.transition = "0.25s";
      this.message(this.new_message, this.new_color);

      var that = this;
      setTimeout(() => {
        if (that.fade_stage == 2) {
          that.fade_stage = 3;
        }
        that.fade();
      }, 2000);
    } else if (this.fade_stage == 3) {
      this.style.opacity = "0";
      this.style.transition = "2.0s";

      var that = this;
      setTimeout(() => {
        if (that.fade_stage == 3) {
          that.hide();
        }
      }, 2000);
    }
  }

  fade_message(message, color) {
    this.new_message = message;
    this.new_color = color;
    this.fade_stage = 0;
    this.fade();
  }

  message(message, color) {
    if (color) {
      this._svg.setAttribute("stroke", color);
    } else {
      this._svg.setAttribute("stroke", "#85d81d");
    }
    this._message_span.textContent = message;
    this._message_div.style.display = null;
    this._title.textContent = message;
    this._svg.style.display = null;
  }

  hide() {
    this._svg.style.display = "none";
    this._message_div.style.display = "none";
  }
}

customElements.define("success-light", SuccessLight);
