class AnnotationSettings extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__settings d-flex f2");
    this._shadow.appendChild(div);

    this._capture = document.createElement("media-capture-button");
    div.appendChild(this._capture);

    this._link = document.createElement("media-link-button");
    div.appendChild(this._link);

    this._prev = document.createElement("media-prev-button");
    div.appendChild(this._prev);

    this._next = document.createElement("media-next-button");
    div.appendChild(this._next);

    this._rate = document.createElement("rate-control");
    div.appendChild(this._rate);

    this._quality = document.createElement("quality-control");
    div.appendChild(this._quality);

    this._zoom = document.createElement("zoom-control");
    div.appendChild(this._zoom);

    this._link.addEventListener("click", () => {
      const searchParams = new URLSearchParams(window.location.search);
      let url = window.location.origin + window.location.pathname;
      url += "?attribute=" + searchParams.get("attribute");
      url += this._queryParams();
      const text = document.createElement("textarea");
      text.textContent = encodeURI(url);
      text.style.opacity = 0;
      document.body.appendChild(text);
      text.select();
      document.execCommand("copy");
      document.body.removeChild(text);
    });
  }

  static get observedAttributes() {
    return ["rate", "zoom", "media-id", "project-id"];
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
      case "media-id":
        this._setupNav();
        break;
      case "project-id":
        this._setupNav();
        break;
    }
  }

  _setupNav() {
    const haveMedia = this.hasAttribute("media-id");
    const haveProject = this.hasAttribute("project-id");
    if (haveMedia && haveProject) {
      const projectId = this.getAttribute("project-id");
      const mediaId = this.getAttribute("media-id");
      const nextPromise = fetch("/rest/MediaNext/" + mediaId + window.location.search, {
        method: "GET",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        }
      });
      const prevPromise = fetch("/rest/MediaPrev/" + mediaId + window.location.search, {
        method: "GET",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        }
      });
      Promise.all([nextPromise, prevPromise])
      .then(responses => Promise.all(responses.map(resp => resp.json())))
      .then(([nextData, prevData]) => {
        const baseUrl = "/" + projectId + "/annotation/";
        const searchParams = new URLSearchParams(window.location.search);
        const media_id = parseInt(mediaId);

        // Turn disable selected_type.
        searchParams.delete("selected_type");

        // Only enable next/prev if there is a next/prev
        if (prevData.prev == -1) {
          this._prev.disabled = true;
        }
        else {
          this._prev.addEventListener("click", () => {
            let url = baseUrl + prevData.prev;
            const searchParams = new URLSearchParams(window.location.search);
            url += "?" + searchParams.toString();
            url += this._typeParams();
            window.location.href = url;
          });
        }

        if (nextData.next == -1) {
          this._next.disabled = true;
        }
        else {
          this._next.addEventListener("click", () => {
            let url = baseUrl + nextData.next;
            const searchParams = new URLSearchParams(window.location.search);
            url += "?" + searchParams.toString();
            url += this._typeParams();
            window.location.href = url;
          });
        }
      })
      .catch(err => console.log("Failed to fetch adjacent media! " + err));
    }
  }

  _typeParams() {
    let params = "";
    if (this.hasAttribute("type-id")) {
      params += "&selected_type=" + this.getAttribute("type-id");
    }
    return params;
  }

  _queryParams() {
    let params = "";
    if (this.hasAttribute("entity-id")) {
      params += "&selected_entity=" + this.getAttribute("entity-id");
    }
    if (this.hasAttribute("entity-type")) {
      params += "&selected_entity_type=" + this.getAttribute("entity-type");
    }
    params += this._typeParams();
    if (this.hasAttribute("frame")) {
      params += "&frame=" + this.getAttribute("frame");
    }
    return params;
  }

  set mediaInfo(val)
  {
    if (val.media_files)
    {
      let quality_list = [];
      for (let media_file of val.media_files["streaming"])
      {
        quality_list.push(media_file.resolution[0]);
      }
      this._quality.resolutions = quality_list;
    }
    else
    {
      this._quality.hide();
    }
  }

  set quality(val)
  {
    this._quality = val;
  }
}

customElements.define("annotation-settings", AnnotationSettings);
