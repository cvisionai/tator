import { TatorElement } from "../components/tator-element.js";
import Spinner from "../../images/spinner-transparent.svg";
import { Utilities } from "../util/utilities.js";

export class SectionFiles extends TatorElement {
  constructor() {
    super();

    // this._main = document.createElement("ul");
    // this._main.setAttribute("class", "project__files d-flex");
    // this._shadow.appendChild(this._main);

    this._ul = document.createElement("ul");
    this._ul.setAttribute("class", "project__files d-flex");
    this._shadow.appendChild(this._ul);

    // State of chosen labels for gallery
    this.cardLabelsChosenByType = {};
    this._cardElements = [];
    this._currentCardIndexes = {};

    //
    this.multiEnabled = false;
  }

  static get observedAttributes() {
    return ["project-id", "username", "token", "section"];
  }

  set bulkEdit(val) {
    this._bulkEdit = val;
  }

  set cardAtributeLabels(val) {
    this._cardAtributeLabels = val;
  }

  set project(val) {
    this._project = val;
  }

  set mediaParams(val) {
    this._mediaParams = val;
  }

  set numMedia(val) {
    this._numMedia = val;
  }

  set startMediaIndex(val) {
    this._startMediaIndex = val;
  }

  set cardInfo(val) {
    this._makeCards(val);
  }

  set mediaIds(val) {
    this._media = val.map(id => { return { id: id } });
    this._updateNumCards();
  }

  set algorithms(val) {
    this._algorithms = val;
  }

  set mediaTypesMap(val) {
    this._mediaTypesMap = val;
  }

  _updateCard(card, media, pos_text) {
    card.setAttribute("media-id", media.id);

    if (typeof media.num_frames !== "undefined" && media.num_frames !== null && typeof media.fps !== "undefined" && media.fps !== null) {
      // Add duration to card
      let seconds = Number(media.num_frames) / Number(media.fps);
      let duration = new Date(seconds * 1000).toISOString().substr(11, 8);
      card.setAttribute("duration", duration);
    }

    card.setAttribute("thumb", Spinner);
    if (media.media_files) {
      if (media.media_files.thumbnail) {
        card.setAttribute("thumb", media.media_files.thumbnail[0].path);
      }
    }
    card.removeAttribute("thumb-gif");
    if (media.media_files) {
      if (media.media_files.thumbnail_gif) {
        card.setAttribute("thumb-gif", media.media_files.thumbnail_gif[0].path);
      }
    }
    if (media.media_files) {
      if (media.media_files.attachment) {
        card.attachments = media.media_files.attachment;
      } else {
        card.attachments = [];
      }
    }

    card.mediaParams = this._mediaParams();
    card.media = media;
    card.style.display = "block";
    // card.rename(media.name);
    card.setAttribute("name", media.name);
    card.setAttribute("project-id", this.getAttribute("project-id"));
    card.setAttribute("pos-text", pos_text)
  }

  _makeCards(cardInfo) {
    const hasAlgorithms = typeof this._algorithms !== "undefined";
    const hasProject = this.hasAttribute("project-id");
    if (hasAlgorithms && hasProject) {
      const children = this._ul.children;
      // const cardList = [];
      this._cardElements = [];
      this._currentCardIndexes = {};
      for (const [index, media] of cardInfo.entries()) {
        const newCard = index >= children.length;
        const cardObj = {
          id: media.id,
          entityType: this._mediaTypesMap.get(media.meta),
          media: media
        }
        let card;
        let entityType = cardObj.entityType;
        let entityTypeId = entityType.id;

        /**
        * Card labels / attributes of localization or media type
        */
        this.cardLabelsChosenByType[entityTypeId] = this._cardAtributeLabels._getValue(entityTypeId);
        // this._bulkEdit._updateShownAttributes({ typeId: entityTypeId, values: this.cardLabelsChosenByType[entityTypeId] });


        if (newCard) {
          card = document.createElement("entity-card");
          card.titleDiv.hidden = false;
          card._more.hidden = false;
          card._ext.hidden = false;
          card._title.hidden = false;
          card._id_text.hidden = true;
          card.project = this._project;
          card.algorithms = this._algorithms;
          card._li.classList.add("dark-card");

          card.addEventListener("mouseenter", () => {
            if (card.hasAttribute("media-id")) {
              this.dispatchEvent(new CustomEvent("cardMouseover", {
                detail: { media: card.media }
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

        // make reference lists / object
        // cardList.push(card);
        let cardInfo = {
          card: card
        };

        
        this._cardElements.push(cardInfo);
        this._currentCardIndexes[cardObj.id] = index;


        // Non-hidden attributes (ie order >= 0))
        let nonHiddenAttrs = [];
        let hiddenAttrs = [];
        for (let attr of entityType.attribute_types) {
          if (attr.order >= 0) {
            nonHiddenAttrs.push(attr);
          }
          else {
            hiddenAttrs.push(attr);
          }
        }

        // Show array by order, or alpha
        var cardLabelOptions = nonHiddenAttrs.sort((a, b) => {
          return a.order - b.order || a.name - b.name;
        });

        cardLabelOptions.push(...hiddenAttrs);

        cardObj.attributes = media.attributes;
        cardObj.attributeOrder = cardLabelOptions;
        // console.log("MEDIA CARD? ................ cardObj=");
        // console.log(cardObj)

        // Notifiy bulk edit about multi-select controls
        card.addEventListener("ctrl-select", (e) => {
          // console.log("Opening edit mode");
          this._bulkEdit._openEditMode(e);
        });

        // card.addEventListener("shift-select", (e) => {
        //   // console.log("Opening edit mode");
        //   this._bulkEdit._openEditMode(e);
        // });

        this._bulkEdit.addEventListener("multi-enabled", () => {
          // console.log("multi-enabled heard in section files");
          card.multiEnabled = true;
          this.multiEnabled = true;
        });
        this._bulkEdit.addEventListener("multi-disabled", () => {
          // console.log("multi-disabled heard in section files");
          card.multiEnabled = false;
          this.multiEnabled = false;
        });

        //
        this._cardAtributeLabels.addEventListener("labels-update", (evt) => {
          // console.log(evt);

          if (entityTypeId == evt.detail.typeId) {
            card._updateShownAttributes(evt);
            // this._bulkEdit._updateShownAttributes({ typeId: evt.detail.typeId, values: evt.detail.value });
  
            // this.cardLabelsChosenByType[evt.detail.typeId] = evt.detail.value;     
            // let msg = `Entry labels updated`;
            // Utilities.showSuccessIcon(msg);            
          }

        });

        const pos_text = `(${this._startMediaIndex + index + 1} of ${this._numMedia})`;
        this._updateCard(card, media, pos_text); // todo init might do most of this and is required, maybe cut it out

        if (newCard) {
          this._ul.appendChild(card);
        }
        // console.log('this.cardLabelsChosenByType[entityTypeId]')
        // console.log(this.cardLabelsChosenByType[entityTypeId]);
        // this is data used later by label chooser, and bulk edit
        card.init({
          obj: cardObj,
          idx: index,
          mediaInit: true,
          cardLabelsChosen: this.cardLabelsChosenByType[entityTypeId],
          // enableMultiselect: this.multiEnabled
        });

        // If we're still in multiselect.. check if this card should be toggled...
        if (this.multiEnabled) {
          const selectedArray = this._bulkEdit._currentMultiSelectionToId.get(entityType.id);
          if (typeof selectedArray !== "undefined" && Array.isArray(selectedArray) && selectedArray.includes(cardObj.id)) {
            this._bulkEdit._addSelected({ element: card, id: cardObj.id, isSelected: true })
          } 
        }

        //
        // console.log("Is this.multiEnabled??? "+this.multiEnabled)
        card.multiEnabled = this.multiEnabled;
      }

      
        // Replace card info so that shift select can get cards in between
        this._bulkEdit.elementList = this._cardElements;
        // this._bulkEdit.elementList = cardList;
        this._bulkEdit.elementIndexes = this._currentCardIndexes;



      if (children.length > cardInfo.length) {
        const len = children.length;
        for (let idx = len - 1; idx >= cardInfo.length; idx--) {
          children[idx].style.display = "none";
        }
      }


    }
  }
  updateCardData(newCardData) {
    if (newCardData.id in this._currentCardIndexes) {
      const index = this._currentCardIndexes[newCardData.id];
      const card = this._cardElements[index].card;
      // this.cardData.updateLocalizationAttributes(card.cardObj).then(() => {
      //   //card.displayAttributes();
      //   card._updateAttributeValues(card.cardObj)
      // });
    }
  }
}

customElements.define("section-files", SectionFiles);
