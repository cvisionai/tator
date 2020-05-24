class AttributePanel extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "annotation__panel-group py-2 text-gray f2");
    this._shadow.appendChild(this._div);
    this._emitChanges=true;
  }

  static get observedAttributes() {
    return ["in-entity-browser"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "in-entity-browser":
        this._div.classList.add("px-4");
    }
  }

  set permission(val) {
    this._permission = val;
    for (const widget of this._div.children) {
      widget.permission = val;
    }
  }

  set dataType(val) {
    this._dataType = val;
    if (val.isTrack) {
      const div = document.createElement("div");
      div.setAttribute("class", "d-flex annotation__panel-group px-4 py-3 text-gray f2");
      this._shadow.insertBefore(div, this._div);

      this._slider = document.createElement("input");
      this._slider.setAttribute("class", "range flex-grow");
      this._slider.setAttribute("type", "range");
      this._slider.setAttribute("step", "1");
      this._slider.setAttribute("value", "0");
      div.appendChild(this._slider);

      this._slider.addEventListener("input", () => {
        if (this._emitChanges) {
          this.dispatchEvent(new CustomEvent("frameChange", {
            detail: {frame: this._frames[this._slider.value],
                     track: this._track},
            composed: true
          }));
        }
      });
    }
    const sorted = val.attribute_types.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });
    for (const column of sorted) {
      let widget;

      if (column.dtype == "bool") {
        widget = document.createElement("bool-input");
        widget.setAttribute("name", column.name);
        widget.setAttribute("on-text", "Yes");
        widget.setAttribute("off-text", "No");
      } else if (column.dtype == "enum") {
        widget = document.createElement("enum-input");
        widget.setAttribute("name", column.name);
        let choices = [];
        for (let idx = 0; idx < column.choices.length; idx++)
        {
          let choice = {'value': column.choices[idx]};
          if (column.labels)
          {
            choice.label = column.labels[idx];
          }
          choices.push(choice);
        }
        widget.choices = choices;
      } else {
        // TODO: Implement a better datetime widget
        // TODO: Implement a better geopos widget
        widget = document.createElement("text-input");
        widget.setAttribute("name", column.name);
        widget.setAttribute("type", column.dtype);
        widget.autocomplete = column.autocomplete;
      }

      // Hide attributes that are less than 0
      if (column.order < 0)
      {
        widget.style.display = "none";
      }

      if (typeof this._permission !== "undefined") {
        widget.permission = this._permission;
      }
      this._div.appendChild(widget);
      if (column.default) {
        widget.default = column.default;
      }
      widget.reset();

      widget.addEventListener("change", () => {
        if (this._emitChanges) {
          this.dispatchEvent(new Event("change"));
        }
      });
    }
  }

  getValues() {
    let values = {};
    for (const widget of this._div.children) {
      const val = widget.getValue();
      if (val === null) {
        values = null;
        break;
      } else {
        values[widget.getAttribute("name")] = val;
      }
    }
    return values;
  }

  setValues(values) {
    // Skip resetting slider if we already display this track
    if (this._track && this._track.id == values.id)
    {
      return;
    }

    this._emitChanges = false;

    // only relevant if we are dealing with objects
    // with ids
    if (this._dataType.isTrack)
    {
      this._track = values;
    }
    
    if (this._slider) {
      this._frames = [];
      for (const [start, end] of values.segments) {
        for (let i = start; i <= end; i++) {
          this._frames.push(i);
        }
      }
      this._slider.value = 0;
      this._slider.max = this._frames.length - 1;
    }
    for (const widget of this._div.children) {
      const name = widget.getAttribute("name");
      const value = values.attributes[name];
      // Only set the name if it is defined
      if (value != undefined)
      {
        widget.setValue(values.attributes[name]);
      }
    }
    this._emitChanges = true;
  }

  reset() {
    // Sets all widgets to default
    for (const widget of this._div.children) {
      widget.reset();
    }
  }
}

customElements.define("attribute-panel", AttributePanel);
