import { TatorElement } from "../tator-element.js";
import { Utilities } from "../../util/utilities.js";
import { svgNamespace } from "../tator-element.js";

export class EntityGallerySlider extends TatorElement {
  constructor() {
    super();

    this.main = document.createElement("div");
    this.main.setAttribute("class", "entity-gallery-slider mb-4 clickable");
    this._shadow.appendChild(this.main);

    this.topDiv = document.createElement("div");
    this.topDiv.setAttribute(
      "class",
      "d-flex flex-row flex-items-center col-12"
    );
    this.main.appendChild(this.topDiv);

    /**
     * Placeholder for label data to be added on init
     */
    this._labels = document.createElement("div");
    this._labels.setAttribute(
      "class",
      "entity-gallery-slider--labels flex-wrap col-10 d-flex d-row f2 text-normal text-gray py-2"
    );
    this.topDiv.appendChild(this._labels);

    /**
     * Placeholder for slider title
     */
    this._title = document.createElement("div");
    this._title.setAttribute("class", "entity-gallery-slider--title text-gray");
    this._labels.appendChild(this._title);

    this._displayLabels = document.createElement("div");
    this._displayLabels.setAttribute(
      "class",
      "entity-gallery-slider--labels flex-wrap col-12 d-flex d-row f2 text-normal text-gray py-2"
    );
    this.main.appendChild(this._displayLabels);

    /**
     * Minimize button
     */
    this._minimizeDiv = document.createElement("div");
    this._minimizeDiv.setAttribute("class", "d-flex chevron-trigger-90");
    this._minimizeDiv.style.marginLeft = "10px";
    this._labels.appendChild(this._minimizeDiv);
    this._minimizeDiv.appendChild(this._chevron());

    /**
     * Placeholder for tools
     */
    this._tools = document.createElement("div");
    this._tools.setAttribute("class", "entity-gallery__tools");
    this.main.appendChild(this._tools);

    // Card label display #todo
    this._cardLabelOptions = [];

    // Tools container
    this.sliderContainer = document.createElement("div");
    this._tools.appendChild(this.sliderContainer);

    // Loading text
    this.loadAllTeaser = document.createElement("span");
    this.loadAllTeaser.setAttribute(
      "class",
      "entity-gallery-slider--load-more text-gray py-2"
    ); //
    this.loadAllTeaser.appendChild(document.createTextNode("..."));
    this.sliderContainer.appendChild(this.loadAllTeaser);

    // Property IDs are the entity IDs (which are expected to be unique)
    // Each property (ID) points to the index of the card information stored in _cardElements
    this._currentCardIndexes = {};

    // Entity cards aren't deleted. They are reused and hidden if not used.
    this._cardElements = [];

    this._topNav = document.createElement("div");
    this._topNav.setAttribute(
      "class",
      "entity-gallery-slider__nav py-2 d-flex flex-justify-center"
    );
    this.main.appendChild(this._topNav);

    // Div to contain slider cards styling
    this.styleDiv = document.createElement("div");
    this.styleDiv.setAttribute("class", "entity-gallery-slider__ul-container");
    this.main.appendChild(this.styleDiv);

    this._bottomNav = document.createElement("div");
    this._bottomNav.setAttribute(
      "class",
      "entity-gallery-slider__nav py-2 d-flex flex-justify-center"
    );
    this.main.appendChild(this._bottomNav);

    // card columns inside slider #todo finish styling
    this.colSize = 272;
    this._ul = document.createElement("ul");
    this._ul.setAttribute("class", "entity-gallery-slider__ul py-1");
    this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`;
    this.styleDiv.appendChild(this._ul);

    this.numberOfDisplayedCards = 0;
    this.attributeLabelEls = [];
    this._preloadedImages = [];
    this.labelInit = false;

    this._attrWrapper = document.createElement("div");
    this._attributes = document.createElement("attribute-panel");
    this._attributes.permission = "View Only"; // start as view only - controlled by lock
    this._attrWrapper.appendChild(this._attributes);
    this.main.appendChild(this._attrWrapper);
    this._attrWrapper.hidden = true;

    this._mode = "normal";

    this._minimizeDiv.addEventListener("click", (evt) => {
      // Hide everything but the displayed labels
      this.styleDiv.hidden = !this.styleDiv.hidden;
      this.sliderContainer.hidden = !this.sliderContainer.hidden;
      if (this._mode != "normal") {
        this._attrWrapper.hidden = !this._attrWrapper.hidden;
      }
      this._toggleChevron(evt);
    });
  }

  _chevron() {
    const chevron = document.createElementNS(svgNamespace, "svg");
    chevron.setAttribute("class", "chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("height", "1em");
    chevron.setAttribute("width", "1em");

    const chevronPath = document.createElementNS(svgNamespace, "path");
    chevronPath.setAttribute(
      "d",
      "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z"
    );

    chevron.appendChild(chevronPath);

    return chevron;
  }

  _toggleChevron(evt) {
    var el = evt.target;
    return el.classList.toggle("chevron-trigger-90");
  }

  /**
   * Initialize slider with access to outer components and data
   */
  init({
    panelContainer,
    pageModal,
    currentLabelValues,
    slideCardData,
    attributes,
    state,
    gallery,
  }) {
    this.panelContainer = panelContainer;
    this.panelControls = this.panelContainer._panelTop;
    this.pageModal = pageModal;
    this.slideCardData = slideCardData;
    this.state = state;
    this.currentLabelValues = currentLabelValues;
    this._sliderAttributeValues = attributes;
    this.gallery = gallery;

    // Check that we have typedata, or fallback
    if (typeof this.state.typeData !== "undefined") {
      this.association = this.state.typeData.association;
    } else {
      console.warn("State missing typedata.", this.state);
      return false;
    }

    this._attributes._idWidget.hidden = true;
    this._attributes.attributeColumns = 2;
    this._attributes.dataType = state.typeData;
    this._attributes.setValues(state);

    // Slider active listener
    this.addEventListener("slider-active", () => {
      this.main.classList.add("active");
      this.styleDiv.classList.add("open");
      this._ul.classList.add("open");

      // Go to selected card
      for (let idx = 0; idx < this._cardElements.length; idx++) {
        // console.log(this._cardElements[idx]);
        let listEl = this._cardElements[idx].card._li;
        if (listEl.classList.contains("is-selected")) {
          return false;
        }
      }

      // Open first card if no selected card found
      if (this._cardElements[0] && this._cardElements[0].card) {
        return this._cardElements[0].card.click();
      }
    });

    // Slider inactive listener
    this.addEventListener("slider-inactive", (e) => {
      this.main.classList.remove("active");
      this.styleDiv.classList.remove("open");
      this._ul.classList.remove("open");
    });

    // New card listener
    this.addEventListener("new-card", (e) => {
      this._addCard(e.detail.cardIndex, e.detail.cardData[0]);
    });

    // New image listener
    this.slideCardData.addEventListener(
      "setSlideCardImage",
      this.updateCardImage.bind(this)
    );

    /**
     * Slider labels / attributes of slider type
     * #todo componentize (remove state refs)
     */
    let definedAttributes = [];
    if (this.state.typeData && this.state.typeData.attribute_types) {
      const tmpDefinedAttributes = [...this.state.typeData.attribute_types];
      definedAttributes = tmpDefinedAttributes.sort((a, b) => {
        return a.order - b.order || a.name - b.name;
      });
    }

    if (
      typeof definedAttributes !== "undefined" &&
      definedAttributes.length > 0
    ) {
      // Display Labels as defined attribute order
      for (let a1 of definedAttributes) {
        let foundValue = false;
        for (let attr in this._sliderAttributeValues) {
          if (a1.name == attr) {
            this._displayAttributes({ attr });
            foundValue = true;
            break;
          }
        }
        if (!foundValue) {
          // if there is no value, still add a placeholder in this order
          this._displayAttributes({ attr: a1.name, value: false });
        }
      }
    } else {
      // Display attributes values in returned order
      for (let attr in this._sliderAttributeValues) {
        // console.log(attr);
        // Add to display w/ value
        this._displayAttributes({ attr });
      }
    }
  }
  /**
   *
   *  param0
   */

  /**
   * Dispay SLIDER Attributes
   * - @attr {json} Takes an attribute and creates a name: value pair for display
   * - Uses references saved at higher level to determine to hide/show
   */
  _displayAttributes({ attr, value = true }) {
    let attributeLabel = document.createElement("div");
    attributeLabel.setAttribute("id", encodeURI(attr));

    let seperator = document.createElement("span");
    seperator.setAttribute("class", "px-2");
    attributeLabel.appendChild(seperator);

    let sep = document.createTextNode("-");
    seperator.appendChild(sep);

    let text = "";
    if (!value) {
      text = document.createTextNode(`${attr}: `);
    } else {
      text = document.createTextNode(
        `${attr}: ${this._sliderAttributeValues[attr]}`
      );
    }
    attributeLabel.appendChild(text);

    this._displayLabels.appendChild(attributeLabel);
    this.attributeLabelEls.push(attributeLabel);

    // Apply preference to newly created Label
    // Or default to hidden
    const currentLabels = this.currentLabelValues[this.state.type];
    if (currentLabels && !currentLabels.includes(encodeURI(attr))) {
      attributeLabel.setAttribute("class", "hidden");
    }
  }

  static get observedAttributes() {
    return ["title", "count"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "title":
        this._title.textContent = newValue;
        break;
    }
  }

  /**
   * Updates the specific card's thumbnail image
   * @param {integer} id
   * @param {image} image
   */
  // # todo optimize this - I see it being called multiple times?
  updateCardImage(e) {
    // We need to check if this slider has the card we heard about...
    const id = e.detail.id;
    if (typeof this._currentCardIndexes[id] !== "undefined") {
      var index = this._currentCardIndexes[id];
      var info = this._cardElements[index];
      info.card.setImage(e.detail.image);
    } else {
      // If the card hasn't been added yet -- save it here (we'll check for it when new cards are added)
      // console.log("Saving image for card ID " + id)
      this._preloadedImages[id] = e.detail.image;
    }
  }

  openClosedPanel(e) {
    if (this._notSelectable) {
      return;
    }

    // console.log(e.target)
    if (!this.panelContainer.open) this.panelContainer._toggleOpen();
    this.panelControls.openHandler(
      e.detail,
      this._cardElements,
      this._currentCardIndexes
    );
  }

  cardNotSelected(id) {
    if (id in this._currentCardIndexes) {
      var info = this._cardElements[this._currentCardIndexes[id]];
      info.card._li.classList.remove("is-selected");
    }
  }

  _addCard(index, cardObj) {
    let newCard = false;
    let location = this._currentCardIndexes[cardObj.id];

    if (typeof location == "undefined") {
      newCard = true;
    }

    /**
     * Card labels / attributes of localization or media type
     */
    this.entityType =
      this.association == "Localization"
        ? cardObj.entityType
        : cardObj.mediaInfo.entityType;
    this.entityTypeId = this.entityType.id;
    // this._cardAttributeLabels.add({
    //    typeData: this.entityType,
    //    checkedFirst: true
    // });

    this.gallery.cardLabelsChosenByType[this.entityTypeId] =
      this._cardAttributeLabels._getValue(this.entityTypeId);

    this._cardLabelOptions = this.entityType.attribute_types;
    this._cardLabelOptions.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    let card;
    if (newCard) {
      //console.log("New card...");
      // create a new card
      card = document.createElement("entity-card");
      card._li.setAttribute(
        "class",
        "analysis__collection entity-slider-card entity-card aspect-true rounded-2"
      );

      // Resize Tool needs to change style within card on change
      // card.style.width = "272px";
      this._resizeCards._slideInput.addEventListener("change", (evt) => {
        let resizeValue = evt.target.value;
        let resizeValuePerc = parseFloat(resizeValue / 100);
        //card.style.width = "auto";
        card._img.style.height = `${130 * resizeValuePerc}px`;
        this._resizeCards._rangeHandler(resizeValue, this._ul);
      });

      this._cardAttributeLabels.addEventListener("labels-update", (evt) => {
        card._updateShownAttributes(evt);
        this.gallery.cardLabelsChosenByType[this.entityTypeId] =
          evt.detail.value;
        let msg = `Entry labels updated`;
        Utilities.showSuccessIcon(msg);
      });

      // Listen for all clicks on the document
      document.addEventListener(
        "click",
        function (evt) {
          if (
            evt.target.tagName == "BODY" &&
            card._li.classList.contains("is-selected")
          ) {
            card._li.click();
          }
        },
        false
      );

      // Open panel if a card is clicked
      card.addEventListener("card-click", this.openClosedPanel.bind(this)); // open if panel is closed

      // // Update view
      // card._li.classList.toggle("aspect-true");
      // this.addEventListener("view-change", () => {
      //    card._li.classList.toggle("aspect-true");
      // });

      let cardInfo = {
        card: card,
      };

      /*
         if (cardObj.image) {
            annotationPanel.localizationType = false;
            //annotationPanel.setImage(cardObj.image);
            if (cardObj.thumbnail) {
               card.setImageStatic(cardObj.thumbnail);
            } else {
               card.setImageStatic(cardObj.image);
            }
         }*/

      this._ul.appendChild(card);
      this._cardElements.push(cardInfo);

      if (this._preloadedImages[cardObj.id]) {
        const image = this._preloadedImages[cardObj.id];
        if (this._cardElements[index]) {
          this._cardElements[index].card.setImage(image);
        }
      }

      cardObj.attributeOrder = this._cardLabelOptions;
      this._currentCardIndexes[cardObj.id] = index;

      // Initialize Card
      card.init({
        obj: cardObj,
        panelContainer: this.panelContainer,
        cardLabelsChosen: this.gallery.cardLabelsChosenByType[this.entityTypeId]
          ? this.gallery.cardLabelsChosenByType[this.entityTypeId]
          : [],
      });
    } else {
      card = this._cardElements[index].card;
    }

    if (this._mode == "normal") {
      card.style.display = "block";
    } else if (this._mode == "text-only") {
      card.style.display = "none";
    }
    this.numberOfDisplayedCards += 1;
  }

  showLabels(selectedLabels) {
    for (let el of this.attributeLabelEls) {
      let decoded = decodeURI(el.id);
      if (selectedLabels.includes(decoded)) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    }
  }

  _updateLabelValues({ newValues }) {
    for (let el of this.attributeLabelEls) {
      //const [key, value] of Object.entries(object1)
      for (const [key, value] of Object.entries(newValues.attributes)) {
        if (encodeURI(key) == el.id) {
          el.innerHTML = `<span class="px-2">|</span> ${key}: ${value}`;
        }
      }
    }
  }

  async _handleCardPagination(evt) {
    const start = evt.detail.start;
    const stop = evt.detail.stop;

    // Hide all the cards, and figure out which ones we need to show
    for (let el of this._cardElements) {
      el.card.style.display = "none";
    }

    //if (evt.detail.start >= this._cardElements.length) {
    for (let i = start; i < stop; i++) {
      let initData = this.unshownCards[i]; //type, id, totalList

      if (typeof initData == "undefined") {
        this._cardElements[i].card.style.display = "block";
      } else {
        delete this.unshownCards[i];

        // start is further than we have gotten cards
        const card = await this.slideCardData.makeCardList(initData);

        if (card) {
          card[0].posText = `${i + 1} of ${initData.totalList}`;
          card[0].stateType = this.state.typeData.association;
          card[0].stateInfo = {
            id: this.state.id,
            attributes: this.state.attributes,
            entityType: this.state.typeData,
            state: this.state,
          };
          //states.cards.push(card);
          const detail = { detail: { cardData: card, cardIndex: i } };
          // if ((counter + 1) < this._previewCardCount) {
          let newCardEvent = new CustomEvent("new-card", detail);
          this.dispatchEvent(newCardEvent);
        }
      }
    }
  }

  updateCardData(newCardData) {
    try {
      const index = this._currentCardIndexes[newCardData.id];
      let card = null;

      if (typeof index !== "undefined" && index !== null) {
        card = this._cardElements[index].card;
        card._updateAttributeValues(newCardData);

        // Then... Check if we need to resort
        let sortProperty =
          this._cardAtributeSort._selectionValues[this.entityTypeId].getValue();
        let comparedVals =
          card.cardObj.attributes[sortProperty] ===
          newCardData.attributes[sortProperty];

        if (!comparedVals) {
          card.cardObj = newCardData;
          // #todo _sortCards should accept typeId, then fn check and property off current settings
          let sortOrder =
            this._cardAtributeSort._sortOrderValues[
              this.entityTypeId
            ].getValue();

          let cards = this._cardAtributeSort._sortCards({
            cards: this._cardElements,
            slider: this,
            fnCheck: this._cardAtributeSort.getFnCheck(sortOrder),
            property: sortProperty,
          });
          this.updateCardOrder(cards);
        } else {
          card.cardObj = newCardData;
        }
      }
    } catch (e) {
      console.error("Cards not updated due to error: " + e);
    }
  }

  updateCardOrder(cards) {
    let total = cards.length;
    for (let [idx, obj] of Object.entries(cards)) {
      let pos = Number(idx) + 1;
      obj.card.posText = `${pos} of ${total}`;
      obj.counter = idx;

      // Get index of one and the other
      let id = obj.card.cardObj.id;
      //console.log(`Adding id ${id} at idx ${idx}`);
      this._currentCardIndexes[id] = Number(idx);

      // Place them in those indexes in card array
      this._cardElements[idx] = obj;

      // Add back in order and make sure visibility stays...
      obj.card.classList.add("hidden");
      obj.card.classList.add("reorder-progress");
      this._ul.appendChild(obj.card);
    }

    setTimeout(() => {
      for (let [idx, obj] of Object.entries(cards)) {
        obj.card.style.visibility = "visible";
        obj.card.classList.add("slide-in");
        obj.card.classList.remove("hidden");
      }
    }, 300);
    setTimeout(() => {
      for (let [idx, obj] of Object.entries(cards)) {
        obj.card.classList.remove("reorder-progress");
        obj.card._li.classList.remove("slide-in");
      }
    }, 500);
  }

  setToTextMode() {
    this._mode = "text-only";
    this._attrWrapper.hidden = false;

    // Hide all the cards
    for (let el of this._cardElements) {
      el.card.style.display = "none";
    }

    // Display the attributes
  }

  setNoClick() {
    this._notSelectable = true;
  }
}

customElements.define("entity-gallery-slider", EntityGallerySlider);
