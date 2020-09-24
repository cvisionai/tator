class SectionFiles extends TatorElement {
  constructor() {
    super();

    this._main = document.createElement("ul");
    this._main.setAttribute("class", "project__files d-flex");
    this._shadow.appendChild(this._main);

    /*
    this._paginator = document.createElement("section-paginator");
    wrap.appendChild(this._paginator);
    */
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

  /*
  get numMedia() {
    return this._paginator.getAttribute("num-files");
  }
  */

  set cardInfo(val) {
    this._makeCards(val);
  }

  set mediaIds(val) {
    this._media = val.map(id => {return {id: id}});
    this._updateNumCards();
  }

  /*
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
  */

  set algorithms(val) {
    this._algorithms = val;
  }

  _updateCard(card, media) {
    if ("id" in media) {
      //card.sections = this._sections;
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
    card.style.display = "block";
    /*
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
    */
    card.setAttribute("name", media.name);
    card.setAttribute("project-id", this.getAttribute("project-id"));
  }

  _makeCards(cardInfo) {
    const hasAlgorithms = typeof this._algorithms !== "undefined";
    //const hasSections = typeof this._sections !== "undefined";
    const hasProject = this.hasAttribute("project-id");
    //const hasStart = typeof this._start !== "undefined";
    //const hasStop = typeof this._stop !== "undefined";
    if (hasAlgorithms && hasProject) {
      const children = this._main.children;
      for (const [index, media] of cardInfo.entries()) {
        const newCard = index >= children.length;
        let card;
        if (newCard) {
          card = document.createElement("media-card");
          card.permission = this._permission;
          card.algorithms = this._algorithms;
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
      if (children.length > cardInfo.length) {
        const len = children.length;
        for (let idx = len - 1; idx >= cardInfo.length; idx--) {
          children[idx].style.display = "none";
        }
      }
    }
  }
}

customElements.define("section-files", SectionFiles);
