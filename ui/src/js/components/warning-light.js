import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class WarningLight extends TatorElement {
  constructor() {
    super();

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "tator-warning-light");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "32px");
    svg.setAttribute("width", "32px");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#d8cd1d"); // yellow from _variables.scss
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    svg.style.display = "none";
    svg.style.marginRight = "10px";
    this._shadow.appendChild(svg);
    this._svg = svg;

    this._title = document.createElementNS(svgNamespace, "title");
    this._title.textContent = "Warning";
    svg.appendChild(this._title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z");
    svg.appendChild(path);

    const line_0 = document.createElementNS(svgNamespace, "line");
    line_0.setAttribute("x1", "12");
    line_0.setAttribute("y1", "9");
    line_0.setAttribute("x2", "12");
    line_0.setAttribute("y2", "13");
    svg.appendChild(line_0);

    const line_1 = document.createElementNS(svgNamespace, "line");
    line_1.setAttribute("x1", "12");
    line_1.setAttribute("y1", "17");
    line_1.setAttribute("x2", "12.01");
    line_1.setAttribute("y2", "17");
    svg.appendChild(line_1);

    this._message_div = document.createElement("div");
    this._message_div.setAttribute("class", "more d-flex f2");
    this._shadow.appendChild(this._message_div);

    this._message_span = document.createElement("span");
    this._message_span.setAttribute("class", "px-4 py-4");
    this._message_div.appendChild(this._message_span);

    this.hide();
    this.fade_stage = 0; // 0, 1, 2 or 3

    window.tator_warning_light = this;
  }

  fade () {
    if (this.fade_stage == 0) {
      this.fade_stage = 1;
      this.fade();
    }
    else if (this.fade_stage == 1) {

      this.style.opacity = '0';
      this.style.transition = '0.25s';

      var that = this;
      setTimeout(() => {
        if (that.fade_stage == 1) {
          that.fade_stage = 2;
        }
        that.fade();
      }, 250);
    }
    else if (this.fade_stage == 2){

      this._message_div.style.display = null;
      this._svg.style.display = null;
      this.style.opacity = '100';
      this.style.transition = '0.25s';
      this.message(this.new_message, this.new_color);

      var that = this;
      setTimeout(() => {
        if (that.fade_stage == 2) {
          that.fade_stage = 3;
        }
        that.fade();
      }, 10000);
    }
    else if (this.fade_stage == 3){
      this.style.opacity = '0';
      this.style.transition = '2.0s';

      var that = this;
      setTimeout(() => {
        if (that.fade_stage == 3) {
          that.hide();
        }
      }, 2000);
    }
  }

  fade_message(message, color){
    this.new_message = message;
    this.new_color = color;
    this.fade_stage = 0;
    this.fade();
  }

  message(message, color)
  {
    if (color)
    {
      this._svg.setAttribute("stroke", color);
    }
    else
    {
      this._svg.setAttribute("stroke", "#d8cd1d"); // yellow from _variables.scss
    }
    this._message_span.textContent = message;
    this._message_div.style.display = null;
    this._title.textContent = message;
    this._svg.style.display = null;

  }

  hide()
  {
    this._svg.style.display = "none";
    this._message_div.style.display = "none";
  }
}

customElements.define("warning-light", WarningLight);
