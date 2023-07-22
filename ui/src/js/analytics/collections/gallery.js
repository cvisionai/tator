import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../../util/utilities.js";
import { EntityCardSlideGallery } from "../../components/entity-gallery/entity-gallery_h-slide.js";

export class CollectionsGallery extends EntityCardSlideGallery {
  constructor() {
    super();
    /*
     * Add tools, headings and pagination for gallery here
     *
     */
    this.panelContainer = null;

    this.h2.appendChild(document.createTextNode("Collections"));

    this.sliderList = document.createElement("div");
    this.sliderList.setAttribute("class", "slider-list");
    this._sliderContainer.appendChild(this.sliderList);

    // make a smaller option for paginator
    const option = document.createElement("option");
    option.setAttribute("value", 5);
    option.selected = true;
    option.textContent = 5;
    this._paginator_top.pageSizeEl.prepend(option);

    const option1 = document.createElement("option");
    option1.setAttribute("value", 5);
    option1.selected = true;
    option1.textContent = 5;
    this._paginator.pageSizeEl.prepend(option1);

    // Filter toolbar
    // * hook to add filter interface
    this._filterDiv = document.createElement("div");
    this._filterDiv.setAttribute("class", "analysis__filter");
    this._mainTop.appendChild(this._filterDiv);

    // Tools: Resize Slider to resize images
    this.resizeContainer = document.createElement("div");
    this.resizeContainer.setAttribute("class", "col-4");
    this._resizeCards = document.createElement("entity-card-resize");
    this.colSize = 272;
    this._resizeCards._initGallery(null, this.colSize);
    this.resizeContainer.appendChild(this._resizeCards);
    this._tools.appendChild(this.resizeContainer);

    // Display options in more menu
    // Note: this is appended to filter nav in collections.js
    this._moreMenu = document.createElement("entity-gallery-more-menu");
    this._moreMenu.summary.setAttribute("class", "entity-gallery-tools--more"); // btn btn-clear btn-outline f2 px-1

    /**
     * SLIDER Label display options link for menu, and checkbox div
     */
    this._attributeLabels = document.createElement("entity-gallery-labels");
    this._attributeLabels.titleEntityTypeName = "collection";
    this._mainTop.appendChild(this._attributeLabels);
    this._attributeLabels.menuLinkTextSpan.innerHTML = "Collection Labels";
    this._moreMenu._menu.appendChild(this._attributeLabels.menuLink);

    /**
     * CARD Label display options link for menu, and checkbox div
     */
    this._cardAttributeLabels = document.createElement("entity-gallery-labels");
    this._cardAttributeLabels.titleEntityTypeName = "entry";
    this._mainTop.appendChild(this._cardAttributeLabels);
    this._cardAttributeLabels.menuLinkTextSpan.innerHTML = "Entry Labels";
    this._moreMenu._menu.appendChild(this._cardAttributeLabels.menuLink);

    /**
     * CARD Sort display options link for menu, and checkbox div
     */
    this._cardAtributeSort = document.createElement("entity-gallery-sort");
    this._mainTop.appendChild(this._cardAtributeSort);
    this._cardAtributeSort.menuLinkTextSpan.innerHTML = "Sort Entries";
    this._moreMenu._menu.appendChild(this._cardAtributeSort.menuLink);

    /* Slider information */
    this._sliderElements = [];
    this.slideCardData = document.createElement("collection-slide-card-data");
    this.cardLabelsChosenByType = {};

    // First collections per page (see analytics settings)
    // Preview card count controls total cards per collection & inner pagination hide/show
    this._previewCardCount = 16; // #todo shows previewCardCount - 1 ; so 11 for 10
  }

  // Provide access to side panel for events
  init({ parentPage }) {
    this._parentPage = parentPage;
    this.panelContainer = this._parentPage._panelContainer;
    this.panelControls = this.panelContainer._panelTop;
    this.pageModal = this._parentPage.modal;
    this.collectionsData = this._parentPage._collectionsData;
    this.galleryContainer = this._parentPage._galleryContainer;
    this.analyticsSettings = this._parentPage._settings;
    this.modelData = this._parentPage._modelData;

    try {
      this.slideCardData.init(this.modelData);
    } catch (e) {
      console.error(e.description);
    }

    this._paginator_top.addEventListener(
      "selectPage",
      this._paginateGallery.bind(this)
    );
    this._paginator.addEventListener(
      "selectPage",
      this._paginateGallery.bind(this)
    );

    // Setup the label picker
    var stateTypes = this.collectionsData.getStateTypes();

    // Label Values
    this._cardAttributeLabels.init(this.modelData._project);
    this.currentLabelValues = {};
    const labelValues = [];
    for (let idx = 0; idx < stateTypes.length; idx++) {
      let stateType = stateTypes[idx];
      let typeId = stateType.id;

      this.currentLabelValues[typeId] = labelValues;

      // Provide labels and access to the sliders
      let labels = this._attributeLabels.add({
        typeData: stateType,
      });

      // Slider label display changes
      this._attributeLabels.addEventListener(
        "labels-update",
        this.labelsUpdate.bind(this)
      );
    }

    // Init card attribute & card sort options using model mediatypes
    for (let locTypeData of this.modelData._localizationTypes) {
      this._cardAtributeSort.add({
        typeData: locTypeData,
      });
      this._cardAttributeLabels.add({
        typeData: locTypeData,
        checkedFirst: true,
      });
    }

    for (let mediaTypeData of this.modelData._mediaTypes) {
      this._cardAtributeSort.add({
        typeData: mediaTypeData,
      });
      this._cardAttributeLabels.add({
        typeData: mediaTypeData,
        checkedFirst: true,
      });
    }

    // form change listeners
    // Listen for attribute changes
    this.panelControls._panel.entityData.addEventListener(
      "save",
      this.entityFormChange.bind(this)
    );
    this.panelControls._panel.stateData.addEventListener(
      "save",
      this.stateFormChange.bind(this)
    );
    this.panelControls._panel.mediaData.addEventListener(
      "save",
      this.mediaFormChange.bind(this)
    );
  }

  labelsUpdate(evt) {
    let typeId = evt.detail.typeId;
    let labelValues = evt.detail.value;

    // Keep track at gallery level for pagination
    this.currentLabelValues[typeId] = labelValues;

    // find the slider, and pass labelvalues)
    for (let s of this._sliderElements) {
      if (s.getAttribute("meta") == typeId) {
        s.showLabels(labelValues);
      }
    }

    let msg = `Collection labels updated`;
    Utilities.showSuccessIcon(msg);
  }

  cardNotSelected(id) {
    // find the slider, and pass labelvalues)
    for (let s of this._sliderElements) {
      if (id in s._currentCardIndexes) {
        var info = s._cardElements[s._currentCardIndexes[id]];
        info.card._li.classList.remove("is-selected");
      }
    }
  }

  updateFilterResults(filterConditions, page, pageSize) {
    this._filterConditions = filterConditions;

    // Set the pagination state based on either defaults of this gallery
    // or by the settings. This must be done prior to collecting data
    if (isNaN(page) || isNaN(pageSize)) {
      page = 1;
      pageSize = 5;
    }
    var paginationState = {
      start: (page - 1) * pageSize,
      stop: page * pageSize,
      page: page,
      pageSize: pageSize,
      init: true,
    };
    this.collectionsData.setPaginationState(paginationState);
    this.collectionsData.updateData(this._filterConditions).then((states) => {
      var totalCount = this.collectionsData.getNumberOfResults();
      if (totalCount > 0) {
        // Top page selector
        this._paginator_top.hidden = false;
        this._paginator_top._pageSize = this.collectionsData.getPageSize();
        this._paginator_top.init(
          totalCount,
          this.collectionsData.getPaginationState()
        );

        // Bottom page selector
        this._paginator.hidden = false;
        this._paginator._pageSize = this.collectionsData.getPageSize();
        this._paginator.init(
          totalCount,
          this.collectionsData.getPaginationState()
        );
      }

      if (totalCount.total == 0) {
        this._numFiles.textContent = `${totalCount} Results`;
      } else {
        this._numFiles.textContent = `Viewing ${paginationState.start + 1} to ${
          paginationState.stop > totalCount ? totalCount : paginationState.stop
        } of ${totalCount} Results`;
      }

      this._paginationUpdate(paginationState, states);
    });
  }

  /**
   * Callback when one of the paginators have an event (e.g. page)
   * @param {object} evt
   */
  _paginateGallery(evt) {
    var paginationState = {
      start: evt.detail.start,
      stop: evt.detail.stop,
      page: evt.detail.page,
      pageSize: evt.detail.pageSize,
      init: false,
    };
    this._paginationUpdate(paginationState);
  }

  async _paginationUpdate(paginationState, states = null) {
    // keep pagination in sync
    this.collectionsData.setPaginationState(paginationState);
    const newSliderPage = this.collectionsData.getPage();

    // update paginator
    this._paginator_top.setValues(this.collectionsData.getPaginationState());
    this._paginator.setValues(this.collectionsData.getPaginationState());

    // remove previous page's sliders
    while (this._sliderContainer.firstChild) {
      this._sliderContainer.removeChild(this._sliderContainer.firstChild);
    }

    // empty slider element list & clear side panel
    this._sliderElements = [];
    this.panelControls.openHandler({ openFlag: false }, null, null);

    // Add new states
    if (states == null) {
      await this.collectionsData.updateData(this._filterConditions);
      states = this.collectionsData.getStates();
    }

    let newSliderList = document.createElement("div");
    newSliderList.setAttribute("class", "slider-list");
    this._addSliders({ sliderList: newSliderList, states });
    this._sliderContainer.appendChild(newSliderList);

    // Update new slider panel permission
    const locked =
      this.analyticsSettings._lock._pathLocked.style.display != "none";
    const permissionValue = locked ? "View Only" : "Can Edit";
    const panelPermissionEvt = new CustomEvent("permission-update", {
      detail: { permissionValue },
    });
    this.panelContainer.dispatchEvent(panelPermissionEvt);

    let numResults = this.collectionsData.getNumberOfResults();
    if (numResults == 0) {
      this._numFiles.textContent = `${numResults} Results`;
    } else {
      this._numFiles.textContent = ` Viewing ${paginationState.start + 1} to ${
        paginationState.stop > numResults ? numResults : paginationState.stop
      } of ${numResults} Results`;
    }

    this.analyticsSettings.setAttribute(
      "pagesize",
      this.collectionsData.getPageSize()
    );
    this.analyticsSettings.setAttribute("page", this.collectionsData.getPage());
    window.history.pushState({}, "", this.analyticsSettings.getURL());
  }

  async _addSliders({ sliderList, states }) {
    if (states !== null && states.length > 0) {
      // Append the sliders
      for (let idx = 0; idx < states.length; idx++) {
        let state = states[idx];
        state.cards = [];

        const slider = document.createElement("entity-gallery-slider");
        slider.setAttribute("id", state.id);
        slider.setAttribute("meta", state.type);
        slider._cardAttributeLabels = this._cardAttributeLabels;
        slider._cardAtributeSort = this._cardAtributeSort;
        slider._resizeCards = this._resizeCards;
        sliderList.appendChild(slider);

        // # todo some of above and below can be inferred from gallery
        // # #todo labels and sort state part of collections data
        slider.init({
          panelContainer: this.panelContainer,
          pageModal: this.pageModal,
          currentLabelValues: this.currentLabelValues,
          slideCardData: this.slideCardData,
          attributes: state.attributes,
          state,
          gallery: this,
        });

        slider.unshownCards = {};
        slider._fullCardsAdded = false;

        let sliderPage = this.collectionsData.getPage();
        let currentCount =
          (sliderPage - 1) * this.collectionsData.getPageSize() + idx + 1;

        if (typeof state.typeData !== "undefined") {
          slider.setAttribute(
            "title",
            `${state.typeData.name} ID: ${state.id}`
          );
        }
        slider.setAttribute(
          "count",
          `${currentCount} of ${this.collectionsData.getNumberOfResults()}`
        );

        this._sliderElements.push(slider);

        slider.addEventListener("click", (e) => {
          if (!slider.main.classList.contains("active")) {
            slider.dispatchEvent(new Event("slider-active"));

            // This sliderEl is active, the rest are inactive
            for (let s of this._sliderElements) {
              if (s.id !== slider.id) {
                s.dispatchEvent(new Event("slider-inactive"));
              }
            }
          }
        });

        // Slider Card Sort display changes
        this._cardAtributeSort.addEventListener(
          "sort-update",
          this._cardSortUpdate.bind(this)
        );
      }

      for (let i in this._sliderElements) {
        await this._addSliderCards({
          slider: this._sliderElements[i],
          state: states[i],
        });
      }
    } else {
      this._numFiles.textContent = `0 Results`;
      const slider = document.createElement("entity-gallery-slider");
      slider.loadAllTeaser.innerHTML = `No collections found.`;
      sliderList.appendChild(slider);
    }
  }

  async _addSliderCards({ slider, state }) {
    if (typeof state.typeData !== "undefined") {
      const association = state.typeData.association;
      let galleryList = null;
      let counter = 0;

      if (association === "Localization") {
        galleryList = state.localizations;
      } else if (association === "Media") {
        galleryList = state.media;
      }

      if (galleryList !== null && galleryList.length > 0) {
        const totalList = galleryList.length;
        slider.loadAllTeaser.innerHTML = `Loading ${totalList} ${association} ${
          totalList > 1 ? "entries" : "entry"
        }...`;
        // Loc association should have list of loc Ids -- If none we should show State with Name and 0 Localizations
        if (totalList > 0) {
          // Get the localizations & make cards with slideCard
          let cardsTmp = [];

          for (let id of galleryList) {
            if (counter + 1 < this._previewCardCount) {
              const cardInitData = { type: state.typeData.association, id };
              const card = await this.slideCardData.makeCardList(cardInitData);
              card.counter = counter;

              if (card) {
                cardsTmp.push(card);
              }
            } else {
              const cardInitData = {
                type: state.typeData.association,
                id,
                totalList,
              };
              // const card = await this.slideCardData.makeCardList(cardInitData);
              slider.unshownCards[counter] = cardInitData;
            }

            counter++;
          }

          // This will dupe check if it already exists for this type, or add
          let entityTypeData = cardsTmp[0][0].entityType;
          // this._cardAtributeSort.add({
          //    typeData: entityTypeData
          // });

          //Check if we want these sorted, sort before adding new cards
          var sortProperty =
            this._cardAtributeSort._selectionValues[entityTypeData.id];
          var sortOrder =
            this._cardAtributeSort._sortOrderValues[entityTypeData.id];

          let order = sortOrder.getValue();
          let fnCheck = this._cardAtributeSort.getFnCheck(order);
          let prop = sortProperty.getValue();
          if (!(order == "true" && prop == "ID")) {
            cardsTmp.sort((a, b) => {
              let aVal = a[0].attributes !== null ? a[0].attributes[prop] : "";
              let bVal = b[0].attributes !== null ? b[0].attributes[prop] : "";

              return fnCheck(aVal, bVal);
            });

            for (let [idx, obj] of Object.entries(cardsTmp)) {
              // update counter used for card placement
              obj.counter = Number(idx);
            }
          }

          for (let card of cardsTmp) {
            this._dispatchCardData({
              slider,
              card,
              counter: card.counter,
              totalList,
              state,
            });
          }

          if (totalList <= this._previewCardCount) {
            // slider.loadAllTeaser.innerHTML = "See All";
            // if (totalList < 4) {
            slider.loadAllTeaser.remove();
            //}
          } else {
            slider.loadAllTeaser.remove();
            this._setupSliderPgn({ slider, totalList });
          }
        }
      } else {
        slider.loadAllTeaser.innerHTML = "Collection is empty.";
        console.warn("Cannot iterate collection list.", state);
      }
    } else {
      slider.loadAllTeaser.innerHTML = "Error loading collection.";
      console.error("Missing typeData.", state);
    }
  }

  _dispatchCardData({ slider, card, counter, totalList, state }) {
    card[0].posText = `${counter + 1} of ${totalList}`;
    card[0].stateType = state.typeData.association;
    card[0].stateInfo = {
      id: state.id,
      attributes: state.attributes,
      entityType: state.typeData,
      state: state,
    };

    //states.cards.push(card);
    const detail = { detail: { cardData: card, cardIndex: counter } };
    // if ((counter + 1) < this._previewCardCount) {
    let newCardEvent = new CustomEvent("new-card", detail);
    slider.dispatchEvent(newCardEvent);
    // } else {
    //    slider.unshownCards.push(detail);
    // }
  }

  _setupSliderPgn({ slider, totalList }) {
    // setup navigation within this slider
    let topNav = document.createElement("entity-gallery-paginator");
    let bottomNav = document.createElement("entity-gallery-paginator");
    topNav.setupElements();
    bottomNav.setupElements();

    // #todo
    slider._cardPaginationState = {
      page: 1,
      start: 0,
      stop: this._previewCardCount - 1,
      pageSize: this._previewCardCount - 1,
    };

    topNav.init(totalList, slider._cardPaginationState);
    bottomNav.init(totalList, slider._cardPaginationState);

    // Init Values for nav
    topNav.pageSizeEl.hidden = true;
    topNav.pageSizeText.hidden = true;
    topNav.goToPage.hidden = true;
    topNav.goToPageText.hidden = true;

    bottomNav.pageSizeEl.hidden = true;
    bottomNav.pageSizeText.hidden = true;
    bottomNav.goToPage.hidden = true;
    bottomNav.goToPageText.hidden = true;

    // # todo need to stop last event before this one
    slider._cancelLoading = false;
    topNav.addEventListener("selectPage", (evt) => {
      evt.stopPropagation();
      slider._handleCardPagination(evt);
      let paginationState = {
        page: evt.detail.page,
        start: evt.detail.start,
        stop: evt.detail.stop,
        pageSize: evt.detail.pageSize,
      };
      topNav.setValues(paginationState);
      bottomNav.setValues(paginationState);
    });
    bottomNav.addEventListener("selectPage", (evt) => {
      evt.stopPropagation();
      slider._handleCardPagination(evt);
      let paginationState = {
        page: evt.detail.page,
        start: evt.detail.start,
        stop: evt.detail.stop,
        pageSize: evt.detail.pageSize,
      };
      topNav.setValues(paginationState);
      bottomNav.setValues(paginationState);
    });

    slider._topNav.appendChild(topNav);
    slider._bottomNav.appendChild(bottomNav);
  }

  async _addNextUnshownCard(slider) {
    let cardInitData = slider.unshownCards.shift();
    let card = await this.slideCardData.makeCardList(cardInitData);

    const detail = { detail: { cardData: card, cardIndex: counter } };
    let newCardEvent = new CustomEvent("new-card");
    slider.dispatchEvent(newCardEvent);

    //If this is the last card, update flags, and remove link
    if (slider.unshownCards.length === 0) {
      slider._fullCardsAdded === true;
      slider.loadAllTeaser.remove();
      return false;
    }
  }

  _makeSliderActive(sliderEl, stateId) {
    // This sliderEl is active, the rest are inactive
    sliderEl.main.classList.add("active");
    sliderEl.dispatchEvent(new Event("slider-active"));

    for (let s of this._sliderElements) {
      s.main.classList.remove("active");
      s.dispatchEvent(new Event("slider-inactive"));
    }

    //this.analyticsSettings.setAttribute("selectedState", stateId);

    //return sliderEl.scrollIntoView(true);
  }

  entityFormChange(e) {
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Localization",
    }).then((data) => {
      for (let s of this._sliderElements) {
        if (s.state.typeData.association == "Localization") {
          s.updateCardData(data);
        }
      }
    });
  }

  stateFormChange(e) {
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "State",
    }).then((data) => {
      // Find the right slider
      for (let s of this._sliderElements) {
        if (s.id == e.detail.id) {
          // update the panels for the other cards
          for (let c of s._cardElements) {
            c.annotationPanel.stateData.updateValues({ newValues: data });
          }
          // update the label for the slider
          s._updateLabelValues({ newValues: data });
        }
      }
    });
  }

  mediaFormChange(e) {
    var mediaId = e.detail.id;
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Media",
    }).then((data) => {
      for (let s of this._sliderElements) {
        if (s.state.typeData.association == "Media") {
          s.updateCardData(data);
        }
      }
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

  _cardSortUpdate(evt) {
    this._parentPage.showDimmer();
    this._parentPage.loading.showSpinner();

    let property = evt.detail.sortProperty;
    let sortType = evt.detail.sortType;
    //console.log(`Sorting ${property} in Asc? ${sortType}`);

    try {
      for (let s of this._sliderElements) {
        // go through all cards, and sort them..
        let fnCheck = sortType
          ? this._cardAtributeSort.ascCheck
          : this._cardAtributeSort.dscCheck;

        // #todo handle pagination
        let cards = this._cardAtributeSort._sortCards({
          cards: s._cardElements,
          slider: s,
          fnCheck,
          property,
        });

        // #todo look into reuse of slider.makeCards
        s.updateCardOrder(cards);
      }
      this._parentPage.loading.hideSpinner();
      this._parentPage.hideDimmer();

      let msg = `Entry sort complete`;
      Utilities.showSuccessIcon(msg);
    } catch (e) {
      this._parentPage.loading.hideSpinner();
      this._parentPage.hideDimmer();

      let msg = `Entry sort error`;
      console.error(e);
      Utilities.warningAlert(msg, "#ff3e1d", false);
    }
  }
}

customElements.define("collections-gallery", CollectionsGallery);
