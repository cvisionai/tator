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

    this._main = document.createElement("ul");
    this._main.setAttribute("class", "files__main d-flex py-3 f2");
    wrap.appendChild(this._main);

    this._paginator = document.createElement("section-paginator");
    wrap.appendChild(this._paginator);

    this._processes = [];

    this._loaded = 0;
  }

  static get observedAttributes() {
    return ["project-id", "username", "token", "section"];
  }

  set permission(val) {
    this._permission = val;
  }

  set mediaFilter(val) {
    this._mediaFilter = val;
  }

  set numMedia(val) {
    this._updateNumCards(val);
  }

  get numMedia() {
    return this._paginator.getAttribute("num-files");
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

    this._search.addEventListener("filterSection", evt => {
      this._worker.postMessage({
        command: "filterSection",
        sectionName: this.getAttribute("section"),
        query: evt.detail.query,
      });
    });
  }

  set algorithms(val) {
    this._algorithms = val;
  }

  set sections(val) {
    this._sections = val;
    const cards = [...this._shadow.querySelectorAll("media-card")];
    for (const card of cards) {
      card.sections = val;
    }
  }

  _updateNumCards(numMedia) {
    this._paginator.setAttribute("num-files", numMedia);
  }

  _updateCard(card, media) {
    if ("id" in media) {
      card.sections = this._sections;
      card.setAttribute("media-id", media.id);

      if (media.thumbnail) {
        card.setAttribute("thumb", "/media/" + media.thumbnail);
      }
      if (media.thumbnail_gif) {
        card.setAttribute("thumb-gif", "/media/" + media.thumbnail_gif);
      }else {
        card.removeAttribute("thumb-gif");
      }
      card.mediaFilter = this._mediaFilter;
      card.media = media;
    } else {
      card.removeAttribute("media-id");
    }
    const inProgress = media.state == "started" || media.state == "queued";
    if ("uid" in media && inProgress) {
      if (!("thumbnail" in media)) {
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
      if (typeof media.progress !== "undefined") {
        percent = media.progress;
      }
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
          card.permission = this._permission;
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
