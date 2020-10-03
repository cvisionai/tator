class SectionFiles extends TatorElement {
  constructor() {
    super();

    this._main = document.createElement("ul");
    this._main.setAttribute("class", "project__files d-flex");
    this._shadow.appendChild(this._main);
  }

  static get observedAttributes() {
    return ["project-id", "username", "token", "section"];
  }

  set permission(val) {
    this._permission = val;
  }

  set mediaParams(val) {
    this._mediaParams = val;
  }

  set cardInfo(val) {
    this._makeCards(val);
  }

  set mediaIds(val) {
    this._media = val.map(id => {return {id: id}});
    this._updateNumCards();
  }

  set algorithms(val) {
    this._algorithms = val;
  }

  _updateCard(card, media) {
    card.setAttribute("media-id", media.id);

    if (media.thumbnail) {
      card.setAttribute("thumb", "/media/" + media.thumbnail);
    } else {
      card.setAttribute("thumb", "/static/images/spinner-transparent.svg");
    }
    if (media.thumbnail_gif) {
      card.setAttribute("thumb-gif", "/media/" + media.thumbnail_gif);
    }else {
      card.removeAttribute("thumb-gif");
    }
    card.mediaParams = this._mediaParams();
    card.media = media;
    card.style.display = "block";
    card.setAttribute("name", media.name);
    card.setAttribute("project-id", this.getAttribute("project-id"));
  }

  _makeCards(cardInfo) {
    const hasAlgorithms = typeof this._algorithms !== "undefined";
    const hasProject = this.hasAttribute("project-id");
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
