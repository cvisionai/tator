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

  set memberships(val) {
    this._memberships = val;
  }

  set cardAtributeLabels(val) {
    this._cardAttributeLabels = val;
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
    this._media = val.map((id) => {
      return { id: id };
    });
    this._updateNumCards();
  }

  set algorithms(val) {
    this._algorithms = val;
  }

  set mediaTypesMap(val) {
    this._mediaTypesMap = val;
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
          entityType: this._mediaTypesMap.get(media.type),
          media: media,
        };
        let card;
        let entityType = cardObj.entityType;
        let entityTypeId = entityType.id;

        /**
         * Card labels / attributes of localization or media type
         * - Sticky choices from localStorage or Preferences set these
         * - But, can be overridden during a session
         * - This always goes off of the selection in entity-gallery-labels
         */
        const builtInChosen = this._cardAttributeLabels._getValue(-1);
        this.cardLabelsChosenByType[entityTypeId] =
          this._cardAttributeLabels._getValue(entityTypeId);
        // this._bulkEdit._updateShownAttributes({ typeId: entityTypeId, values: this.cardLabelsChosenByType[entityTypeId] });
        const cardLabelsChosen = [
          ...this.cardLabelsChosenByType[entityTypeId],
          ...builtInChosen,
        ];

        if (newCard) {
          card = document.createElement("entity-card");

          // Only do these once
          card._li.classList.add("dark-card");
          card.titleDiv.hidden = false;
          card._more.hidden = false;
          card._ext.hidden = false;
          card._title.hidden = false;
          card._id_text.hidden = true;

          // All cards share project & algos, never needs to update
          card.project = this._project;
          card.algorithms = this._algorithms;

          /* All cards share these listeners */
          // Dispatches from card with the media-id in detail
          card.addEventListener("cardMouseover", (e) => {
            this.dispatchEvent(new CustomEvent("cardMouseover", e.detail));
          });
          card.addEventListener("cardMouseexit", (e) => {
            this.dispatchEvent(new Event("cardMouseexit"));
          });

          // Notifiy bulk edit about multi-select controls
          card.addEventListener("ctrl-select", (e) => {
            this._bulkEdit._openEditMode(e);
          });

          // Update labels
          this._cardAttributeLabels.addEventListener("labels-update", (evt) =>
            this.updateShown(evt, card)
          );

          // When bulk edit changes tell the card
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
        } else {
          // When reusing a card
          card = children[index];
        }

        // Setup attributes, and order for label options
        cardObj.attributes = media.attributes;
        cardObj.attributeOrder = this.getCardLabelOptions(
          entityType.attribute_types
        ); //cardLabelOptions;

        // Set in this order:mediaParams utilized to make a URL in set media()
        card.mediaParams = this._mediaParams();
        card.media = media;
        card.posText = `(${this._startMediaIndex + index + 1} of ${
          this._numMedia
        })`;
        card.multiEnabled = this.multiEnabled;
        // console.log("this.multiEnabled "+this.multiEnabled)

        // If we're still in multiselect.. check if this card should be toggled...
        if (this.multiEnabled) {
          const selectedSet = this._bulkEdit._currentMultiSelectionToId.get(
            entityType.id
          );
          // console.log(selectedSet);

          if (
            typeof selectedSet !== "undefined" &&
            selectedSet.has(cardObj.id)
          ) {
            this._bulkEdit._addSelected({
              element: card,
              id: cardObj.id,
              isSelected: true,
            });
          }
        }

        // this is data used later by label chooser, and bulk edit
        card.init({
          obj: cardObj,
          idx: index,
          mediaInit: true,
          cardLabelsChosen,
          enableMultiselect: this.multiEnabled,
          memberships: this._memberships,
        });

        // make reference lists / object
        // cardList.push(card);
        this._cardElements.push({ card });
        this._currentCardIndexes[cardObj.id] = index;

        // This should happen last
        card.style.display = "block";
        if (newCard) this._ul.appendChild(card);
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

  _addToBulkEditSelected(entityType, card, cardObj) {}

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

  updateShown(evt, card) {
    if (
      card.cardObj.entityType.id == evt.detail.typeId ||
      evt.detail.typeId == -1
    ) {
      card._updateShownAttributes(evt);
    }
  }

  getCardLabelOptions(attributeTypes) {
    // Setup every time card is updated
    // Non-hidden attributes (ie order >= 0))
    let nonHiddenAttrs = [];
    let hiddenAttrs = [];
    for (let attr of attributeTypes) {
      if (attr.order >= 0) {
        nonHiddenAttrs.push(attr);
      } else {
        hiddenAttrs.push(attr);
      }
    }

    // Show nonhidden by order, then alpha
    nonHiddenAttrs = nonHiddenAttrs.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    // hidden by alpha
    hiddenAttrs = hiddenAttrs.sort((a, b) => {
      return a.name - b.name;
    });

    return [...nonHiddenAttrs, ...hiddenAttrs];
  }
}

customElements.define("section-files", SectionFiles);
