import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class TextCalendarButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.title = "Toggle calendar/text view";
    button.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    this._shadow.appendChild(button);

    this.current_state = "calendar";

    this._calendarSvg = document.createElementNS(svgNamespace, "svg");
    this._calendarSvg.setAttribute("viewBox", "0 0 24 24");
    this._calendarSvg.setAttribute("height", "1em");
    this._calendarSvg.setAttribute("width", "1em");
    this._calendarSvg.setAttribute("stroke", "currentColor");
    this._calendarSvg.setAttribute("stroke-width", "2");
    this._calendarSvg.setAttribute("stroke-linecap", "round");
    this._calendarSvg.setAttribute("stroke-linejoin", "round");
    this._calendarSvg.style.fill = "none";
    button.appendChild(this._calendarSvg);

    const calendarRect = document.createElementNS(svgNamespace, "rect");
    calendarRect.setAttribute("x", "3");
    calendarRect.setAttribute("y", "4");
    calendarRect.setAttribute("width", "18");
    calendarRect.setAttribute("height", "18");
    calendarRect.setAttribute("rx", "2");
    calendarRect.setAttribute("ry", "2");
    this._calendarSvg.appendChild(calendarRect);

    const calendarLine1 = document.createElementNS(svgNamespace, "line");
    calendarLine1.setAttribute("x1", "16");
    calendarLine1.setAttribute("y1", "2");
    calendarLine1.setAttribute("x2", "16");
    calendarLine1.setAttribute("y2", "6");
    this._calendarSvg.appendChild(calendarLine1);

    const calendarLine2 = document.createElementNS(svgNamespace, "line");
    calendarLine2.setAttribute("x1", "8");
    calendarLine2.setAttribute("y1", "2");
    calendarLine2.setAttribute("x2", "8");
    calendarLine2.setAttribute("y2", "6");
    this._calendarSvg.appendChild(calendarLine2);

    const calendarLine3 = document.createElementNS(svgNamespace, "line");
    calendarLine3.setAttribute("x1", "3");
    calendarLine3.setAttribute("y1", "10");
    calendarLine3.setAttribute("x2", "21");
    calendarLine3.setAttribute("y2", "10");
    this._calendarSvg.appendChild(calendarLine3);

    this._textSvg = document.createElementNS(svgNamespace, "svg");
    this._textSvg.setAttribute("viewBox", "0 0 24 24");
    this._textSvg.setAttribute("height", "1em");
    this._textSvg.setAttribute("width", "1em");
    this._textSvg.setAttribute("stroke", "currentColor");
    this._textSvg.setAttribute("stroke-width", "2");
    this._textSvg.setAttribute("stroke-linecap", "round");
    this._textSvg.setAttribute("stroke-linejoin", "round");
    this._textSvg.style.fill = "none";
    button.appendChild(this._textSvg);

    const textLine1 = document.createElementNS(svgNamespace, "line");
    textLine1.setAttribute("x1", "7");
    textLine1.setAttribute("y1", "7");
    textLine1.setAttribute("x2", "17");
    textLine1.setAttribute("y2", "7");
    this._textSvg.appendChild(textLine1);

    const textLine2 = document.createElementNS(svgNamespace, "line");
    textLine2.setAttribute("x1", "12");
    textLine2.setAttribute("y1", "8");
    textLine2.setAttribute("x2", "12");
    textLine2.setAttribute("y2", "18");
    this._textSvg.appendChild(textLine2);

    const textLine3 = document.createElementNS(svgNamespace, "rect");
    textLine3.setAttribute("x", "1");
    textLine3.setAttribute("y", "1");
    textLine3.setAttribute("width", "22");
    textLine3.setAttribute("height", "22");
    textLine3.setAttribute("rx", "2.18");
    textLine3.setAttribute("ry", "2.18");
    textLine3.setAttribute("stroke-width", "2");
    this._textSvg.appendChild(textLine3);
    this._textSvg.style.display = "none";

    button.addEventListener("click", () => {
      if (this.current_state == "text") {
        this.current_state = "calendar";
        this._calendarSvg.style.display = "block";
        this._textSvg.style.display = "none";
      } else {
        this.current_state = "text";
        this._calendarSvg.style.display = "none";
        this._textSvg.style.display = "block";
      }

      this.dispatchEvent(new Event("click"));
    });
  }
}

customElements.define("text-calendar-button", TextCalendarButton);
