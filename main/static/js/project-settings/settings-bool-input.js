class SettingsBoolInput extends HTMLElement {
  constructor() {
    super();
  }

  getFieldSet(name, forId){
    const fieldset = document.createElement("fieldset");
    //this._shadow.appendChild(fieldset);

    const div = document.createElement("div");
    div.setAttribute("class", "py-2 px-2 radio-slide-wrap d-flex flex-justify-between flex-items-center");
    fieldset.appendChild(div);

    this._legend = document.createElement("legend");
    this._legend.setAttribute("class", "f2");
    div.appendChild(this._legend);

    const controls = document.createElement("div");
    controls.setAttribute("class", "d-flex flex-items-center col-8");
    div.appendChild(controls);

    this._on = document.createElement("input");
    this._on.setAttribute("class", "sr-only");
    this._on.setAttribute("type", "radio");
    this._on.setAttribute("id", "on_"+forId);
    this._on.setAttribute("name", name);
    this._on.checked = true;
    controls.appendChild(this._on);

    this._onLabel = document.createElement("label");
    this._onLabel.setAttribute("for", "on_"+forId);
    controls.appendChild(this._onLabel);

    this._off = document.createElement("input");
    this._off.setAttribute("class", "sr-only");
    this._off.setAttribute("type", "radio");
    this._off.setAttribute("id", "off_"+forId);
    this._off.setAttribute("name", name);
    controls.appendChild(this._off);

    this._offLabel = document.createElement("label");
    this._offLabel.setAttribute("for", "off_"+forId);
    controls.appendChild(this._offLabel);

    const span = document.createElement("span");
    span.setAttribute("class", "radio-slide rounded-2");
    controls.appendChild(span);

    this._on.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
      this._onLabel.blur();
      this._offLabel.blur();
    });

    this._off.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
      this._onLabel.blur();
      this._offLabel.blur();
    });

    span.addEventListener("click", (e) => {
      e.preventDefault();

      let thisOn = e.target.parentNode.querySelector("[id^=on]");
      let thisOff = e.target.parentNode.querySelector("[id^=off]");

      //if (this._on.checked) {
      if(thisOn.checked == true){
        thisOff.click();
      } else {
        thisOn.click();
      }
    });

    return fieldset;
  }

  setLegendText(newValue){
    this._legend.textContent = newValue;
  }

  setOnLabel(newValue){
    this._onLabel.textContent = newValue;
  }

  setOffLabel(newValue){
    this._offLabel.textContent = newValue;
  }

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._on.removeAttribute("readonly");
      this._off.removeAttribute("readonly");
      this._onLabel.removeEventListener("click", this._preventDefault);
      this._offLabel.removeEventListener("click", this._preventDefault);
    } else {
      this._on.setAttribute("readonly", "");
      this._off.setAttribute("readonly", "");
      this._onLabel.addEventListener("click", this._preventDefault);
      this._offLabel.addEventListener("click", this._preventDefault);
    }
  }

  set default(val) {
    this._default = val;
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue(false);
    }
  }

  getValue() {
    return this._on.checked;
  }

  setValue(val) {
    if (val) {
      this._on.checked = true;
      this._off.checked = false;
      this._on.setAttribute("checked", "");
      this._off.removeAttribute("checked");
    } else {
      this._on.checked = false;
      this._off.checked = true;
      this._on.removeAttribute("checked");
      this._off.setAttribute("checked", "");
    }
  }

  setName(name){
    this._on.name = name;
    this._off.name = name;
  }

  _preventDefault(evt) {
    evt.preventDefault();
  }
}

customElements.define("settings-bool-input", SettingsBoolInput);
