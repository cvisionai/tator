import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../../util/utilities.js";
import { EntityCardGallery } from "../../components/entity-gallery/entity-gallery_grid.js";

export class AnnotationsCorrectionsGallery extends EntityCardGallery {
  constructor() {
    super();
    /*
     * Add tools, headings and pagination for gallery here
     *
     */
    this._main.setAttribute(
      "class",
      "enitity-gallery--main ml-1 mt-6 px-5 rounded-1"
    );

    this._customContent = true;

    // * hook to add filter interface
    this._filterDiv = document.createElement("div");
    this._filterDiv.setAttribute("class", "analysis__filter");
    this._mainTop.appendChild(this._filterDiv);

    // Bulk edit attribute selection
    // this._editPanel = document.createElement("div");
    // this._mainTop.appendChild(this._editPanel);

    // Custom width for annotations gallery
    this.colSize = 232;
    this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`;

    // Heading
    this._h3.hidden = true;
    //this._h3Text = document.createTextNode("All Annotations")
    //this._h3.appendChild( this._h3Text );

    const header = document.createElement("div");
    header.setAttribute(
      "class",
      "project__header d-flex flex-items-center px-2"
    );
    this._p.appendChild(header);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3 text-white"); //not a typo
    this._name.textContent = "Corrections";
    header.appendChild(this._name);

    this._numFiles = document.createElement("span");
    this._numFiles.setAttribute("class", "text-gray px-2");
    header.appendChild(this._numFiles);

    // Tools: Resize Slider to resize images
    this.resizeContainer = document.createElement("div");
    this.resizeContainer.setAttribute("class", "col-4");
    this._resizeCards = document.createElement("entity-card-resize");
    this._resizeCards._initGallery(this._ul, this.colSize);
    this.resizeContainer.appendChild(this._resizeCards);
    this._tools.appendChild(this.resizeContainer);

    // Tools: Show @aspect ratio
    this.aspectToolContainer = document.createElement("div");
    this.aspectToolContainer.setAttribute("class", "col-2");
    this._aspectToggle = document.createElement("entity-gallery-aspect-ratio");
    this.aspectToolContainer.appendChild(this._aspectToggle);
    this._tools.appendChild(this.aspectToolContainer);

    // Display options in more menu
    // Note: this is appended to filter nav in collections.js
    this._moreMenu = document.createElement("entity-gallery-more-menu");
    this._moreMenu.summary.setAttribute("class", "entity-gallery-tools--more"); // btn btn-clear btn-outline f2 px-1

    /**
     * CARD Label display options link for menu, and checkbox div
     */
    this._cardAttributeLabels = document.createElement("entity-gallery-labels");
    this._cardAttributeLabels.titleEntityTypeName = "localization";
    this._cardAttributeLabels._titleText = document.createTextNode(
      "Select localization labels to display."
    );
    this._mainTop.appendChild(this._cardAttributeLabels);
    this._cardAttributeLabels.menuLinkTextSpan.innerHTML =
      "Localization Labels";
    this._moreMenu._menu.appendChild(this._cardAttributeLabels.menuLink);

    // Init aspect toggle
    this._aspectToggle.init(this);
    this.panelContainer = null;

    // Property IDs are the entity IDs (which are expected to be unique)
    // Each property (ID) points to the index of the card information stored in _cardElements
    this._currentCardIndexes = {};

    // Entity cards aren't deleted. They are reused and hidden if not used.
    this._cardElements = [];

    // State of chosen labels for gallery
    this.cardLabelsChosenByType = {};
  }

  // Provide access to side panel for events
  _initPanel({ panelContainer, pageModal, cardData, modelData, bulkEdit }) {
    this.panelContainer = panelContainer;
    this.panelControls = this.panelContainer._panelTop;
    this.pageModal = pageModal;
    this.cardData = cardData;
    this.modelData = modelData;

    // this.panelControls._headingText.innerHTML = `Select Attributes`;

    this._bulkEdit = bulkEdit;

    // Listen for attribute changes
    this.panelContainer._panelTop._panel.entityData.addEventListener(
      "save",
      this.entityFormChange.bind(this)
    );
    this.panelContainer._panelTop._panel.mediaData.addEventListener(
      "save",
      this.mediaFormChange.bind(this)
    );

    this._cardAttributeLabels.init(this.modelData._project);

    // Initialize
    for (let locTypeData of this.modelData._localizationTypes) {
      //init card labels with localization entity type definitions
      this._cardAttributeLabels.add({
        typeData: locTypeData,
        checkedFirst: true,
      });

      //init panel with localization entity type definitions
      this._bulkEdit._editPanel.addLocType(locTypeData);
    }

    // this.panelControls._box.appendChild(this._bulkEdit._editPanel);
    this._mainTop.appendChild(this._bulkEdit._selectionPanel);
    this._bulkEdit._showEditPanel();
    // this._bulkEdit._showSelectionPanel();
  }

  /* Init function to show and populate gallery w/ pagination */
  show(cardList) {
    //if (cardList.total >= this.modelData.getMaxFetchCount()) {
    //   this._numFiles.textContent = `Too many results to preview. Displaying the first ${cardList.total} results.`
    //}
    //else {
    console.log("SHOW cardlist", cardList);
    if (cardList.total == 0) {
      this._numFiles.textContent = `${cardList.total} Results`;
    } else {
      this._numFiles.textContent = `Viewing ${
        cardList.paginationState.start + 1
      } to ${
        cardList.paginationState.stop > cardList.total
          ? cardList.total
          : cardList.paginationState.stop
      } of ${cardList.total} Results`;
    }

    //}

    // Only populate the pagination when the dataset has changed (and therefore the pagination
    // needs to be reinitialized)
    if (cardList.paginationState.init) {
      this._paginator.init(cardList.total, cardList.paginationState);
      this._paginator_top.init(cardList.total, cardList.paginationState);
    }

    // Hide all cards' panels and de-select
    for (let idx = 0; idx < this._cardElements.length; idx++) {
      if (!this._bulkEdit._editMode) {
        this._cardElements[idx].card._deselectedCardAndPanel();
      } else {
        this._cardElements[idx].card._li.classList.remove("is-selected");
      }
    }

    // Append the cardList
    this.makeCards(cardList.cards);
  }

  cardNotSelected(id) {
    if (id in this._currentCardIndexes) {
      var info = this._cardElements[this._currentCardIndexes[id]];
      info.card._li.classList.remove("is-selected");
    }
  }

  /**
   * Updates the specific card's thumbnail image
   * @param {integer} id
   * @param {image} image
   */
  updateCardImage(id, image) {
    if (id in this._currentCardIndexes) {
      var info = this._cardElements[this._currentCardIndexes[id]];
      info.card.setImage(image);
      // info.annotationPanel.setImage(image);
    }
  }

  /**
   * Creates the card display in the gallery portion of the page using the provided
   * localization information
   *
   * @param {object} cardInfo
   */
  makeCards(cardInfo) {
    console.log("makeCards cardInfo", cardInfo);
    this._currentCardIndexes = {}; // Clear the mapping from entity ID to card index
    var numberOfDisplayedCards = 0;

    // Loop through all of the card entries and create a new card if needed. Otherwise
    // apply the card entry to an existing card.
    for (const [index, cardObj] of cardInfo.entries()) {
      const newCard = index >= this._cardElements.length;

      /**
       * entity info for card
       */
      let entityType = cardObj.entityType;
      let entityTypeId = entityType.id;
      let card;

      /**
       * Card labels / attributes of localization or media type
       */
      const builtInChosen = this._cardAttributeLabels._getValue(-1);
      this.cardLabelsChosenByType[entityTypeId] =
        this._cardAttributeLabels._getValue(entityTypeId);
      const cardLabelsChosen = [
        ...this.cardLabelsChosenByType[entityTypeId],
        ...builtInChosen,
      ];

      this._bulkEdit._updateShownAttributes({
        typeId: entityTypeId,
        values: this.cardLabelsChosenByType[entityTypeId],
      });

      if (newCard) {
        card = document.createElement("entity-card");
        // card._li.classList.add("analysis__annotation");

        // Resize Tool needs to change style within card on change
        this._resizeCards._slideInput.addEventListener("change", (evt) => {
          let resizeValue = evt.target.value;
          let resizeValuePerc = parseFloat(resizeValue / 100);
          return (card._img.style.height = `${130 * resizeValuePerc}px`);
        });

        this._cardAttributeLabels.addEventListener("labels-update", (evt) => {
          card._updateShownAttributes(evt);
          this._bulkEdit._updateShownAttributes({
            typeId: evt.detail.typeId,
            values: evt.detail.value,
          });

          this.cardLabelsChosenByType[evt.detail.typeId] = evt.detail.value;

          let msg = `Entry labels updated`;
          Utilities.showSuccessIcon(msg);
        });

        // Open panel if a card is clicked
        card.addEventListener("card-click", (e) => {
          console.log("Heard card click....");
          // if (!this._bulkEdit._editMode) {
          this.openClosedPanel(e);
          // } else {
          // For regular clicks while edit mode is true
          this._bulkEdit._openEditMode({
            detail: {
              element: card,
              id: card.cardObj.id,
              isSelected: card._li.classList.contains("is-selected"),
            },
          });
          // }
        }); // open if panel is closed

        // Notifiy bulk edit about multi-select controls
        card.addEventListener("ctrl-select", (e) => {
          // console.log("Opening edit mode");
          this._bulkEdit._openEditMode(e);
          // this.dispatchEvent(new CustomEvent("multi-select", { detail: { clickDetail: e } }));
        });
        card.addEventListener("shift-select", (e) => {
          // this.dispatchEvent(new CustomEvent("multi-select", { detail: { clickDetail: e } }));
          // console.log("Opening edit mode");
          this._bulkEdit._openEditMode(e);
        });

        this._bulkEdit.addEventListener("multi-enabled", () => {
          card.multiEnabled = true;
        });

        this._bulkEdit.addEventListener("multi-disabled", () => {
          card.multiEnabled = false;
        });

        // Update view
        card._li.classList.toggle("aspect-true");
        this.addEventListener("view-change", () => {
          card._li.classList.toggle("aspect-true");
        });

        cardInfo = {
          card: card,
        };
        this._cardElements.push(cardInfo);

        this._ul.appendChild(card);
      } else {
        card = this._cardElements[index].card;
      }

      // Non-hidden attributes (ie order >= 0))
      let nonHiddenAttrs = [];
      let hiddenAttrs = [];
      for (let attr of entityType.attribute_types) {
        if (attr.order >= 0) {
          nonHiddenAttrs.push(attr);
        } else {
          hiddenAttrs.push(attr);
        }
      }

      // Show array by order, or alpha
      var cardLabelOptions = nonHiddenAttrs.sort((a, b) => {
        return a.order - b.order || a.name - b.name;
      });

      cardLabelOptions.push(...hiddenAttrs);

      cardObj.attributeOrder = cardLabelOptions;

      // Initialize Card
      console.log(this.modelData._memberships);
      card.init({
        idx: index,
        obj: cardObj,
        panelContainer: this.panelContainer,
        cardLabelsChosen: cardLabelsChosen,
        memberships: this.modelData._memberships,
      });

      const selectedArray = this._bulkEdit._currentMultiSelectionToId.get(
        entityType.id
      );
      if (
        typeof selectedArray !== "undefined" &&
        selectedArray.has(cardObj.id)
      ) {
        this._bulkEdit._addSelected({
          element: card,
          id: cardObj.id,
          isSelected: true,
        });
      }

      this._currentCardIndexes[cardObj.id] = index;

      card.style.display = "block";
      numberOfDisplayedCards += 1;
    }

    // Hide unused cards
    if (numberOfDisplayedCards < this._cardElements.length) {
      const len = this._cardElements.length;
      for (let idx = len - 1; idx >= numberOfDisplayedCards; idx--) {
        this._cardElements[idx].card.style.display = "none";
      }
    }

    // Replace card info so that shift select can get cards in between
    this._bulkEdit.elementList = this._cardElements;
    this._bulkEdit.elementIndexes = this._currentCardIndexes;
    this._bulkEdit.startEditMode();
  }

  updateCardData(newCardData) {
    if (newCardData.id in this._currentCardIndexes) {
      const index = this._currentCardIndexes[newCardData.id];
      const card = this._cardElements[index].card;
      this.cardData.updateLocalizationAttributes(card.cardObj).then(() => {
        //card.displayAttributes();
        card._updateAttributeValues(card.cardObj);
      });
    }
  }

  entityFormChange(e) {
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Localization",
    })
      .then((data) => {
        this.updateCardData(data);
      })
      .then(() => {
        this._bulkEdit.updateCardData(this._cardElements);
      });
  }

  mediaFormChange(e) {
    var mediaId = e.detail.id;
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Media",
    }).then(() => {
      this.cardData
        .updateMediaAttributes(mediaId)
        .then(() => {
          for (let idx = 0; idx < this._cardElements.length; idx++) {
            const card = this._cardElements[idx].card.cardObj;
            if (card.mediaId == mediaId) {
              this._cardElements[idx].annotationPanel.setMediaData(card);
            }
          }
        })
        .then(() => {
          this._bulkEdit.updateCardData(this._cardElements);
        });
    });
  }

  async formChange({ type, id, values } = {}) {
    var result = await fetchCredentials(`/rest/${type}/${id}`, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(values),
    });

    var data = await result.json();
    let msg = "";
    if (result.ok) {
      if (data.details && data.details.contains("Exception")) {
        msg = `Error: ${data.message}`;
        Utilities.warningAlert(msg);
      } else {
        msg = `${data.message}`;
        Utilities.showSuccessIcon(msg);
      }
    } else {
      if (data.message) {
        msg = `Error: ${data.message}`;
      } else {
        msg = `Error saving ${type}.`;
      }
      Utilities.warningAlert(msg, "#ff3e1d", false);
    }

    result = await fetchCredentials(`/rest/${type}/${id}`, {
      mode: "cors",
      credentials: "include",
    });
    data = await result.json();
    return data;
  }

  openClosedPanel(e) {
    // For all regular clicks while edit mode is false
    // if (!this.panelContainer.open) this.panelContainer._toggleOpen();
    e.detail.openFlag = true;
    this.panelControls.openHandler(
      e.detail,
      this._cardElements,
      this._currentCardIndexes
    );
  }

  // cardInMultiSelect(id) {
  //   if (id in this._currentCardIndexes) {
  //     var info = this._cardElements[this._currentCardIndexes[id]];
  //     info.card._multiSelectionToggle = true;
  //   }
  // }
}

customElements.define(
  "annotations-corrections-gallery",
  AnnotationsCorrectionsGallery
);
