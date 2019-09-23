class SectionFiles extends TatorElement {
  constructor() {
    super();

    const wrap = document.createElement("div");
    wrap.setAttribute("class", "files-wrap px-4 rounded-2");
    this._shadow.appendChild(wrap);

    const header = document.createElement("div");
    header.setAttribute("class", "files__header d-flex flex-justify-between f2");
    wrap.appendChild(header);

    const nav = document.createElement("div");
    nav.setAttribute("class", "files__nav d-flex");
    header.appendChild(nav);

    const actions = document.createElement("div");
    actions.setAttribute("class", "files__actions d-flex flex-items-center py-3");
    header.appendChild(actions);

    const search = document.createElement("section-search");
    actions.appendChild(search);

    this._upload = document.createElement("section-upload");
    actions.appendChild(this._upload);

    this._more = document.createElement("section-more");
    actions.appendChild(this._more);

    this._main = document.createElement("ul");
    this._main.setAttribute("class", "files__main d-flex py-3 f2");
    wrap.appendChild(this._main);

    this._paginator = document.createElement("section-paginator");
    wrap.appendChild(this._paginator);

    this._processes = [];

    this._more.addEventListener("algorithmMenu", evt => {
      this.dispatchEvent(new CustomEvent("algorithm", {
        detail: {
          mediaIds: this._media.map(media => media.id).join(),
          algorithmName: evt.detail.algorithmName
        }
      }));
    });

    this._more.addEventListener("download", evt => {
      this.dispatchEvent(new CustomEvent("download", {
        detail: {annotations: false}
      }));
    });

    this._more.addEventListener("annotations", evt => {
      this.dispatchEvent(new CustomEvent("download", {
        detail: {annotations: true}
      }));
    });

    this._loaded = 0;
  }

  static get observedAttributes() {
    return ["project-id", "username", "token", "section"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-id":
        this._upload.setAttribute("project-id", newValue);
        break;
      case "username":
        this._upload.setAttribute("username", newValue);
        break;
      case "token":
        this._upload.setAttribute("token", newValue);
        break;
      case "section":
        this._upload.setAttribute("section", newValue);
        break;
    }
  }

  set mediaFilter(val) {
    this._mediaFilter = val;
  }

  set numMedia(val) {
    this._updateNumCards(val);
  }

  set cardInfo(val) {
    this._makeCards(val);
  }

  set mediaIds(val) {
    this._media = val.map(id => {return {id: id}});
    this._updateNumCards();
  }

  set worker(val) {
    this._worker = val;
    this._paginator.addEventListener("change", evt => {
      this._start = evt.detail.start;
      this._stop = evt.detail.stop;
      this._worker.postMessage({
        command: "sectionPage",
        section: this.getAttribute("section"),
        start: evt.detail.start,
        stop: evt.detail.stop,
      });
    });
  }

  set algorithms(val) {
    this._algorithms = val;
    this._more.algorithms = val;
  }

  set sections(val) {
    this._sections = val;
  }

  addMedia(val) {
    this._media.unshift(val);
    this._updateNumCards();
  }

  addProcess(val, mediaId) {
    if (mediaId !== null) {
      val.id = mediaId;
    }
    this._processes.unshift(val);
    this._updateNumCards();
  }

  updateProgress(processId, mediaId, state, percent, msg) {
    let selector, index;
    if (mediaId === null) {
      selector = "media-card[process-id='" + processId + "']";
      const processIds = this._processes.map(elem => elem.uid);
      index = processIds.indexOf(processId);
    } else {
      selector = "media-card[media-id='" + mediaId + "']";
      const mediaIds = this._processes.map(elem => elem.id);
      index = mediaIds.indexOf(mediaId);
    }
    if (index > -1) {
      this._processes[index].state = state;
      this._processes[index].progress = percent;
      this._processes[index].message = msg;
    }
    const card = this._shadow.querySelector(selector);
    if (card !== null) {
      card.updateProgress(state, percent, msg);
    }
  }

  _updateNumCards(numMedia) {
    /*
    const processMediaIds = this._processes.map(elem => elem.id);
    const filteredMedia = this._media.filter(elem => !processMediaIds.includes(elem.id));
    this._joined = this._processes.concat(filteredMedia);
    */
    this._paginator.setAttribute("num-files", numMedia);
  }

  _updateCard(card, media) {
    if ("id" in media) {
      card.sections = this._sections;
      card.setAttribute("media-id", media.id);
      if (media.original_url) {
        card.setAttribute("media-url", media.original_url);
      } else {
        card.setAttribute("media-url", media.url);
      }
      card.setAttribute("thumb", media.thumb_url);
      if (media.hasOwnProperty("thumb_gif_url")) {
        card.setAttribute("thumb-gif", media.thumb_gif_url);
      } else {
        card.removeAttribute("thumb-gif");
      }
      card.media = media;
    } else {
      card.removeAttribute("media-id");
    }
    if ("uid" in media) {
      if (!("thumb_url" in media)) {
        card.setAttribute("thumb", "/static/images/spinner-transparent.svg");
        card.removeAttribute("thumb-gif");
      }
      card.setAttribute("process-id", media.uid);
      card.setAttribute("processing", "");
    } else {
      card.removeAttribute("processing");
    }
    let percent = null;
    let message = null;
    if ("progress" in media) {
      percent = media.progress;
    }
    if ("message" in media) {
      message = media.message;
    }
    card.updateProgress(media.state, percent, message);
    card.setAttribute("name", media.name);
    card.setAttribute("project-id", this.getAttribute("project-id"));
  }

  _makeCards(cardInfo) {
    const hasAlgorithms = typeof this._algorithms !== "undefined";
    //const hasMedia = typeof this._media !== "undefined";
    const hasSections = typeof this._sections !== "undefined";
    const hasProject = this.hasAttribute("project-id");
    const hasStart = typeof this._start !== "undefined";
    const hasStop = typeof this._stop !== "undefined";
    if (hasAlgorithms && hasSections && hasProject && hasStart && hasStop) {
      const children = this._main.children;
      for (const [index, media] of cardInfo.entries()) {
        const newCard = index >= children.length;
        let card;
        if (newCard) {
          card = document.createElement("media-card");
          card.setAttribute("class", "col-6");
          card.algorithms = this._algorithms;
          card.addEventListener("loaded", this._checkCardsLoaded.bind(this));
          card.addEventListener("mouseenter", () => {
            if (card.hasAttribute("media-id")) {
              this.dispatchEvent(new CustomEvent("cardMouseover", {
                detail: {media: card.media}
              }));
            }
          });
          card.addEventListener("mouseleave", () => {
            if (card.hasAttribute("media-id")) {
              this.dispatchEvent(new Event("cardMouseexit"));
            }
          });
        } else {
          card = children[index];
        }
        this._updateCard(card, media);
        if (newCard) {
          this._main.appendChild(card);
        }
      }
      if (children.length > this._stop - this._start) {
        const len = children.length;
        for (let idx = len - 1; idx >= this._stop; idx--) {
          this._main.removeChild(children[idx]);
        }
      }
    }
  }

  _checkCardsLoaded() {
    this._loaded += 1;
    const cards = [...this._shadow.querySelectorAll("media-card")];
    if (this._loaded >= cards.length) {
      this.dispatchEvent(new Event("sectionLoaded", {composed: true}));
    }
  }
}

customElements.define("section-files", SectionFiles);
