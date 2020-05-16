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
    const url = "/rest/Media/" + media.id;
    const mediaPromise = fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    });
    const analysisUrl = "/rest/SectionAnalysis/" + project + "?media_id=" + media.id;
    const analysisPromise = fetch(analysisUrl, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    });
    Promise.all([mediaPromise, analysisPromise])
    .then(responses => Promise.all(responses.map(resp => resp.json())))
    .then(([data, analysisData]) => {
      if (typeof data.thumb_gif_url === "undefined") {
        this._updateText({'counts': {
          "num_videos": 0,
          "num_images": 1,
        }}, analysisData);
      } else {
        this._updateText({'counts': {
          "num_videos": 1,
          "num_images": 0,
        }}, analysisData);
      }
    });
  }

  updateForAllSoft() {
    this._header.textContent = "Section Overview";
    if (this._lastAllData)
    {
      this._updateText(...this._lastAllData);
    }
    else
    {
      this.updateForAll();
    }
  }

  updateForAll() {
    this._header.textContent = "Section Overview";
    const project = this.getAttribute("project-id");
    const sectionUrl = "/rest/MediaSections/" + project + this._mediaFilter();
    const sectionPromise = fetch(sectionUrl, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    });
    const analysisUrl = "/rest/SectionAnalysis/" + project + this._mediaFilter();
    const analysisPromise = fetch(analysisUrl, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    });
    Promise.all([sectionPromise, analysisPromise])
    .then(responses => Promise.all(responses.map(resp => resp.json())))
    .then(([sectionData, analysisData]) => {
      this._updateText(sectionData, analysisData);
      this._lastAllData = [sectionData, analysisData];
    })
    .catch(err => console.error("Error updating section overview: " + err));
  }

  _updateText(sectionData, analysisData) {

    let numImages = 0;
    let numVideos = 0;
    if (Object.keys(sectionData).length > 0) {
      const counts = sectionData[Object.keys(sectionData)[0]];
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
    
    for (const [index, analysis] of Object.keys(analysisData).entries()) {
      if (index == this._analysisObjects.length) {
        const div = document.createElement("div");
        div.setAttribute("class", "py-2");
        this._stats.appendChild(div);
        this._analysisObjects.push(div);
      }
      this._analysisObjects[index].textContent = analysisData[analysis] + " " + analysis;
    }

  }
}

customElements.define("section-overview", SectionOverview);
