class AnnotationSettings extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__settings d-flex f2");
    this._shadow.appendChild(div);

    this._lock = document.createElement("lock-button");
    div.appendChild(this._lock);

    this._capture = document.createElement("media-capture-button");
    div.appendChild(this._capture);

    this._bookmark = document.createElement("bookmark-button");
    div.appendChild(this._bookmark);

    this._link = document.createElement("media-link-button");
    div.appendChild(this._link);

    this._rate = document.createElement("rate-control");
    div.appendChild(this._rate);

    this._quality = document.createElement("quality-control");
    div.appendChild(this._quality);

    this._zoom = document.createElement("zoom-control");
    div.appendChild(this._zoom);

    this._fill_boxes = document.createElement("fill-boxes-button")
    div.appendChild(this._fill_boxes)

    this._toggle_text = document.createElement("toggle-text-button")
    div.appendChild(this._toggle_text)

    this._link.addEventListener("click", () => {
      const searchParams = new URLSearchParams(window.location.search);
      let url = window.location.origin + window.location.pathname;
      url += "?" + this._queryParams(searchParams).toString();
      const text = document.createElement("textarea");
      text.textContent = url;
      text.style.opacity = 0;
      document.body.appendChild(text);
      text.select();
      document.execCommand("copy");
      document.body.removeChild(text);
    });

    document.addEventListener("keydown", evt => {
      if (document.body.classList.contains("shortcuts-disabled")) {
        return;
      }
      else if (evt.key == 1) {
        if (!this._rate.hasAttribute("disabled")) {
          this._rate.setValue(1);
        }
      }
      else if (evt.key == 2) {
        if (!this._rate.hasAttribute("disabled")) {
          this._rate.setValue(2);
        }
      }
      else if (evt.key == 4) {
        if (!this._rate.hasAttribute("disabled")) {
          this._rate.setValue(4);
        }
      }
    });
  }


  static get observedAttributes() {
    return ["rate", "zoom"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "rate":
        if (newValue >= 1) {
          this._rate.textContent = Math.round(newValue) + "x";
        } else {
          this._rate.textContent = Number(newValue).toFixed(2) + "x";
        }
        break;
      case "zoom":
        this._zoom.setAttribute("zoom", newValue);
        break;
    }
  }

  _typeParams() {
    let params = null;
    if (this.hasAttribute("type-id")) {
      params = this.getAttribute("type-id");
    }
    return params;
  }

  _queryParams(params) {
    if (params == undefined)
    {
      params = new URLSearchParams(window.location.search)
    }
    if (this.hasAttribute("entity-id")) {
      params.set("selected_entity", this.getAttribute("entity-id"));
    }
    if (this.hasAttribute("entity-type")) {
      params.set("selected_entity_type",this.getAttribute("entity-type"));
    }
    if (this._typeParams()) {
      params.set("selected_type", this._typeParams());
    }
    if (this.hasAttribute("frame")) {
      params.set("frame", this.getAttribute("frame"));
    }
    if (this.hasAttribute("version")) {
      params.set("version", this.getAttribute("version"));
    }
    if (this._lock._pathLocked.style.display == "block") {
      params.set("lock", 1);
    } else {
      params.set("lock", 0);
    }
    if (this._fill_boxes.current_state == "fill") {
      params.set("fill_boxes", 1);
    } else {
      params.set("fill_boxes", 0);
    }
    if (this._toggle_text.current_state == "on") {
      params.set("toggle_text", 1);
    } else {
      params.set("toggle_text", 0);
    }
    return params;
  }

  set mediaInfo(val)
  {
    if (val.media_files && 'streaming' in val.media_files)
    {
      let quality_list = [];
      for (let media_file of val.media_files["streaming"])
      {
        quality_list.push(media_file.resolution[0]);
      }
      this._quality.resolutions = quality_list;
      this._quality.show();
    }
    else
    {
      this._quality.hide();
    }
  }

  set quality(val)
  {
    this._quality.quality = val;
  }

  enableQualityChange()
  {
    this._quality.removeAttribute("disabled");
  }
  disableQualityChange()
  {
    this._quality.setAttribute("disabled", "");
  }

  enableRateChange()
  {
    this._rate.removeAttribute("disabled");
  }
  disableRateChange()
  {
    this._rate.setAttribute("disabled", "");
  }
}

customElements.define("annotation-settings", AnnotationSettings);
