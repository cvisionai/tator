import { TatorElement } from "../components/tator-element.js";

export class RateControl extends TatorElement {
  constructor() {
    super();

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.setAttribute("class", "d-flex flex-items-center rounded-1");
    this._shadow.appendChild(summary);

    const div = document.createElement("div");
    div.setAttribute("class", "px-1");
    summary.appendChild(div);

    const select = document.createElement("select");
    select.setAttribute("class", "form-select has-border select-sm1");
    div.appendChild(select);
    this._select = select;

    this._rates = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6, 8, 16, 32];
    for (const rate of this._rates)
    {
      let option = document.createElement("option");
      option.setAttribute("value", rate);
      option.textContent = `${rate}x`;
      select.append(option);
    }
    select.selectedIndex = 4; //represents 1x

    select.addEventListener("change", evt => {
      const rate = Number(evt.target.value);
      this.dispatchEvent(new CustomEvent("rateChange", {
        detail: {rate: rate},
        composed: true
      }));
    });
  }

  static get observedAttributes() {
    return ["class", "disabled"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "disabled":
        if (newValue === null) {
          this._select.removeAttribute("disabled");
        } else {
          this._select.setAttribute("disabled", "");
        }
        break;
    }
  }

  /**
   * Programmatically sets the selected rate and emits rateChange event
   * @param {Number} rate
   * @param {bool} noEvent - If true, then don't emit the ratechange event
   */
  setValue(rate, noEvent) {
    this._value = rate;
    this.setIdx(this._rates.findIndex(el => el == rate), noEvent);
  }

  setIdx(idx, noEvent)
  {
    if (idx < 0 || idx >= this._rates.length)
    {
      return;
    }
    // Change the UI element
    this._select.selectedIndex = idx;

    // Send out the rate change event
    if (noEvent) { return; }
    this.dispatchEvent(new CustomEvent("rateChange", {
      detail: {rate: this._rates[idx]},
      composed: true
    }));
  }

  getIdx()
  {
    return this._select.selectedIndex;
  }

  rateForIdx(idx)
  {
    if (idx < 0 || idx >= this._rates.length)
    {
      return null;
    }
    else
    {
      return this._rates[idx];
    }
  }
}

customElements.define("rate-control", RateControl);
