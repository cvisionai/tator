import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";

export class DateTimeInput extends TatorElement {
  constructor() {
    super();

    // DATETIME INPUT
    this.label = document.createElement("label");
    this.label.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-1"
    );
    this._shadow.appendChild(this.label);
    this._disabled = false;

    const labelInner = document.createElement("span");
    labelInner.setAttribute("class", "col-4");
    this._innerLabel = labelInner;
    this.label.appendChild(labelInner);

    this._name = document.createElement("span");
    labelInner.appendChild(this._name);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control input-sm d-flex flex-grow");
    this._input.setAttribute("type", "datetime-local");
    this._input.setAttribute("step", ".1");
    this._input.style.display = "flex";
    this.label.appendChild(this._input);

    this._textInput = document.createElement("input");
    this._textInput.setAttribute(
      "class",
      "form-control input-sm d-flex flex-grow"
    );
    this._textInput.setAttribute("type", "text");
    this._textInput.style.display = "none";
    this.label.appendChild(this._textInput);

    this._toggle = document.createElement("text-calendar-button");
    this.label.appendChild(this._toggle);

    this._toggle.addEventListener("click", () => {
      if (this._toggle.current_state == "text") {
        this._input.style.display = "none";
        this._textInput.style.display = "flex";
      } else {
        this._input.style.display = "flex";
        this._textInput.style.display = "none";
      }
    });

    this._input.addEventListener("change", () => {
      this._setTextFromCalendar(); // this.getValue() utilizes the text field

      if (this.getValue() === null) {
        this._input.classList.add("has-border");
        this._input.classList.add("is-invalid");
      } else {
        this._input.classList.remove("has-border");
        this._input.classList.remove("is-invalid");
      }
      this.dispatchEvent(new Event("change"));
    });

    this._input.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    this._input.addEventListener("blur", () => {
      document.body.classList.remove("shortcuts-disabled");
    });

    this._textInput.addEventListener("change", () => {
      if (this.getValue() === null) {
        this._textInput.classList.add("has-border");
        this._textInput.classList.add("is-invalid");
      } else {
        this._textInput.classList.remove("has-border");
        this._textInput.classList.remove("is-invalid");
      }
      this.dispatchEvent(new Event("change"));
    });

    this._textInput.addEventListener("focus", () => {
      document.body.classList.add("shortcuts-disabled");
    });

    this._textInput.addEventListener("blur", () => {
      document.body.classList.remove("shortcuts-disabled");
    });
  }

  static get observedAttributes() {
    return ["name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.textContent = newValue;
        break;
    }
  }

  // Permission for datetime only
  set permission(val) {
    if (hasPermission(val, "Can Edit") && !this._disabled) {
      this._input.removeAttribute("readonly");
      this._textInput.removeAttribute("readonly");
      this._input.classList.remove("disabled");
      this._textInput.classList.remove("disabled");
    } else {
      this._input.setAttribute("readonly", "");
      this._textInput.setAttribute("readonly", "");
      this._input.classList.add("disabled");
      this._textInput.classList.add("disabled");
    }
  }

  set default(val) {
    // Value should be the deafult ISO string
    this._default = val;
  }

  set disabled(val) {
    this._disabled = val;
    if (!val) {
      this._input.removeAttribute("readonly");
      this._textInput.removeAttribute("readonly");
      this._input.classList.remove("disabled");
      this._textInput.classList.remove("disabled");
    } else {
      this._input.setAttribute("readonly", "");
      this._textInput.setAttribute("readonly", "");
      this._input.classList.add("disabled");
      this._textInput.classList.add("disabled");
    }
  }

  /**
   * @param {string} val - Style string associated with the attribute type
   */
  setStyle(val) {
    if (typeof val != "string") {
      console.warn(`Provided style is not a string`);
      return;
    }

    var styleTokens = val.split(" ");
    for (const token of styleTokens) {
      if (token.includes("label-css-add-")) {
        var classAdd = token.split("label-css-add-")[1];
        this._name.classList.add(classAdd);
      } else if (token.includes("label-css-rem")) {
        var classRem = token.split("label-css-rem-")[1];
        this._name.classList.remove(classRem);
      } else if (token.includes("field-css-add")) {
        var classAdd = token.split("field-css-add-")[1];
        this._input.classList.add(classAdd);
        this._textInput.classList.remove(classRem);
      } else if (token.includes("field-css-rem")) {
        var classRem = token.split("field-css-rem-")[1];
        this._input.classList.remove(classRem);
        this._textInput.classList.remove(classRem);
      } else if (token.includes("css-add-")) {
        var classAdd = token.split("css-add-")[1];
        this.label.classList.add(classAdd);
      } else if (token.includes("css-rem-")) {
        var classRem = token.split("css-rem-")[1];
        this.label.classList.add(classRem);
      } else if (["start_utc", "end_utc"].includes(token)) {
        this._setCurrentButton = document.createElement("button");
        this._setCurrentButton.setAttribute("class", "btn btn-sm");
        this._setCurrentButton.setAttribute("type", "button");
        this._setCurrentButton.title = "Set to current time in video";
        this._setCurrentButton.setAttribute(
          "class",
          "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
        );
        this._clockSvg = document.createElementNS(svgNamespace, "svg");
        this._clockSvg.setAttribute("viewBox", "0 0 24 24");
        this._clockSvg.setAttribute("height", "1em");
        this._clockSvg.setAttribute("width", "1em");
        this._clockSvg.setAttribute("stroke", "currentColor");
        this._clockSvg.setAttribute("stroke-width", "2");
        this._clockSvg.setAttribute("stroke-linecap", "round");
        this._clockSvg.setAttribute("stroke-linejoin", "round");
        this._clockSvg.style.fill = "none";
        const circle = document.createElementNS(svgNamespace, "circle");
        circle.setAttribute("cx", "12");
        circle.setAttribute("cy", "12");
        circle.setAttribute("r", "10");
        this._clockSvg.appendChild(circle);
        const line = document.createElementNS(svgNamespace, "polyline");
        line.setAttribute("points", "12 6 12 12 16 14");
        this._clockSvg.appendChild(line);
        this._setCurrentButton.appendChild(this._clockSvg);

        this.label.appendChild(this._setCurrentButton);
        this._setCurrentButton.addEventListener("click", () => {
          const page = document.getElementsByTagName("annotation-page");
          if (page.length > 0) {
            const player = page[0]._player;
            const videoTime = new Date(player._utcLabel.textContent);
            this.setValue(videoTime.toISOString());
            this.dispatchEvent(new Event("change"));
          }
        });
      }
    }
  }

  changed() {
    // #todo datetime cuts off miliseconds to 3 points, may need to account for this looking like a change here?
    return this.getValue() !== this._default;
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue("");
    }
  }

  getValue() {
    let val = new Date(this._textInput.value);
    if (isNaN(val.getTime())) {
      val = null;
    } else {
      val = val.toISOString();
    }
    return val;
  }

  _setTextFromCalendar() {
    let val = this._input.value;
    if (val === null || val === "" || isNaN(new Date(val).getTime())) {
      val = null;
    } else {
      let utcString = val + "Z";
      let date = new Date(utcString);
      val = date.toISOString();
    }

    this._textInput.value = val;
  }

  setValue(val) {
    // assume any incoming value (not null, or "") is in ISO format
    // datetime-local requires this format: YYYY-MM-DDThh:mm:ss.ms
    // the text-field will utilize the ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    // Even though it says local, let's assume UTC
    if (val === null || val === "" || isNaN(new Date(val).getTime())) {
      val = null;
    } else {
      let date = new Date(val);
      let minuteWithOffset = date.getMinutes() + date.getTimezoneOffset();
      date.setMinutes(minuteWithOffset);

      let year = date.getFullYear();
      let month = (Number(date.getMonth()) + 1).toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
        timeZone: "UTC",
      });
      let day = date.getDate().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
        timeZone: "UTC",
      });
      let hours = date.getHours().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
        timeZone: "UTC",
      });
      let minutes = date.getMinutes().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
        timeZone: "UTC",
      });
      let seconds = date.getSeconds().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
        timeZone: "UTC",
      });
      let milliseconds = date.getMilliseconds().toLocaleString("en-US", {
        minimumIntegerDigits: 3,
        useGrouping: false,
        timeZone: "UTC",
      });

      let dateToString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      val = dateToString;
    }

    if (val != null) {
      this._input.value = val;
      this._textInput.value = val + "Z";
    } else {
      this._input.value = null;
      this._textInput.value = null;
    }
  }
}

customElements.define("datetime-input", DateTimeInput);
