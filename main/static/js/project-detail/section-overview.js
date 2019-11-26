class SectionOverview extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "project__overview px-4 rounded-2");
    this._shadow.appendChild(div);

    this._header = document.createElement("h3");
    this._header.setAttribute("class", "py-3 lh-condensed text-semibold css-truncate");
    this._header.textContent = "Section Overview";
    div.appendChild(this._header);

    this._stats = document.createElement("div");
    this._stats.setAttribute("class", "project__stats py-3 text-gray f2 lh-condensed");
    div.appendChild(this._stats);

    this._numVideos = document.createElement("div");
    this._numVideos.setAttribute("class", "py-2");
    this._stats.appendChild(this._numVideos);

    this._numImages = document.createElement("div");
    this._numImages.setAttribute("class", "py-2");
    this._stats.appendChild(this._numImages);

    this._analysisObjects = [];

  }

  static get observedAttributes() {
    return ["project-id"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-id":
        break;
    }
  }

  set mediaFilter(val) {
    this._mediaFilter = val;
  }

  updateForMedia(media) {
    this._header.textContent = media.name;
    const project = this.getAttribute("project-id");
    const url = "/rest/EntityMedia/" + media.id;
    fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json())
    .then(data => {
      if (typeof data.thumb_gif_url === "undefined") {
        this._updateText({'counts': {
          "num_videos": 0,
          "num_images": 1,
        }});
      } else {
        this._updateText({'counts': {
          "num_videos": 1,
          "num_images": 0,
        }});
      }
    });
  }

  updateForAllSoft() {
    this._header.textContent = "Section Overview";
    if (this._lastAllData)
    {
      this._updateText(this._lastAllData);
    }
    else
    {
      this.updateForAll();
    }
  }

  updateForAll() {
    this._header.textContent = "Section Overview";
    const project = this.getAttribute("project-id");
    const url = "/rest/MediaSections/" + project + this._mediaFilter();
    fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json())
    .then(data => {
      
      this._updateText(data);
      this._lastAllData = data;
    });
  }

  _updateText(data, skipMedia) {

    let numImages = 0;
    let numVideos = 0;
    if (Object.keys(data).length > 0) {
      const counts = data[Object.keys(data)[0]];
      if (typeof counts.num_images !== "undefined") {
        numImages = counts.num_images;
      }
      if (typeof counts.num_videos !== "undefined") {
        numVideos = counts.num_videos;
      }

      let index = 2;
      const divs = this._stats.children;
      for (const name in counts) {
        if ((name != "num_videos") && (name != "num_images")) {
          let div;
          if (index >= divs.length) {
            div = document.createElement("div");
            div.setAttribute("class", "py-2");
            this._stats.appendChild(div);
          } else {
            div = divs[index];
          }
          div.textContent = counts[name] + " " + name;
          index++;
        }
      }
    }
    let vidLabel = " Videos";
    if (numVideos === 1) {
      vidLabel = " Video";
    }
    this._numVideos.textContent = numVideos + vidLabel;

    let imgLabel = " Images";
    if (numImages === 1) {
      imgLabel = " Image";
    }
    this._numImages.textContent = numImages + imgLabel;
  }
}

customElements.define("section-overview", SectionOverview);
