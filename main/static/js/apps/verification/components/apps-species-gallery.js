class AppsSpeciesGallery extends EntityCardSlideGallery {
   constructor() {
      super();

      this.panelContainer = null;

      this._titleText = document.createTextNode("Verify Species");
      this.h2.appendChild(this._titleText);

      this._locImage = document.createElement("entity-panel-localization");
      this._main.appendChild(this._locImage);

      this.sliderList = document.createElement("div");
      this.sliderList.setAttribute("class", "slider-list");
      this._sliderContainer.appendChild(this.sliderList);

      // Filter toolbar
      // * hook to add filter interface
      this._filterDiv = document.createElement("div");
      this._filterDiv.setAttribute("class", "analysis__filter");
      this._mainTop.appendChild(this._filterDiv);

      this._save = document.createElement("button");
      this._save.setAttribute("class", "btn f1");
      this._save.textContent = "Update ID Status";
      this._tools.appendChild(this._save);
      this._save.addEventListener("click", this._updateIdStatus.bind(this));

      // Tools: Resize Slider to resize images
      this.resizeContainer = document.createElement("div");
      this.resizeContainer.setAttribute("class", "col-4")
      this._resizeCards = document.createElement('entity-card-resize');
      this.colSize = 272;
      this._resizeCards._initGallery(null, this.colSize);
      this.resizeContainer.appendChild(this._resizeCards);

      //  this._tools.appendChild(this.resizeContainer);

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
      this._cardAtributeLabels = document.createElement("entity-gallery-labels");
      this._cardAtributeLabels.titleEntityTypeName = "entry";
      this._mainTop.appendChild(this._cardAtributeLabels);
      this._cardAtributeLabels.menuLinkTextSpan.innerHTML = "Entry Labels";
      this._moreMenu._menu.appendChild(this._cardAtributeLabels.menuLink);

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

      // First collections per page
      // Preview card count controls total cards per collection & inner pagination hide/show
      this._previewCardCount = 16; // #todo shows previewCardCount - 1 ; so 11 for 10
   }

   /**
    * @precondition Expected to run after the modelData has been initialized
    */
   init({
      parentPage,
      pageType,
      verifyType
   }) {
      this._pageType = pageType;
      this._verifyType = verifyType;
      this._parentPage = parentPage;
      this.panelContainer = this._parentPage._panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = this._parentPage.modal;
      this.collectionsData = this._parentPage._collectionsData;
      this.galleryContainer = this._parentPage._galleryContainer;
      this.modelData = this._parentPage._modelData;

      if (this._pageType == "verify" && this._verifyType == "ai") {
         this._titleText.textContent = "Verify Species | AI"
      }
      else if (this._pageType == "verify" && this._verifyType == "reviewer") {
         this._titleText.textContent = "Verify Species | Reviewer"
      }
      else if (this._pageType == "resolve") {
         this._titleText.textContent = "Verify Species | Resolve Discrepancy"
      }
      else if (this._pageType == "view") {
         this._titleText.textContent = "Verify Species | View ID"
      }
      else {
         window.alert(`Invalid verifyType (${verifyType}) and pageType (${pageType})`)
         return window.location.href =`/${this._parentPage.projectId}/apps/verification`;
      }

      try {
         this.slideCardData.init(this.modelData);
      } catch (e) {
         console.error(e.description);
      }

      // Get the state information for the labeling.
      // Also specific to this, we only care about the Submission type and the Verification type.
      var stateTypes = this.collectionsData.getStateTypes();

      this.currentLabelValues = {};
      var labelValues = [];
      for (let idx = 0; idx < stateTypes.length; idx++) {
         let stateType = stateTypes[idx];
         let typeId = stateType.id;

         // #TODO Clear this out
         if (stateType.name == "Verification") {
            this.verificationType = stateType;
            labelValues = ["Record%20Category", "IDNUM"];
         }
         else if (stateType.name == "Submission") {
            this.submissionType = stateType;
            labelValues = ["Trip%20ID", "Haul", "Subject", "NESPP4", "Species", "IDNUM"];
         }
         else {
            labelValues = [];
         }
         labelValues = [];

         this.currentLabelValues[typeId] = labelValues;

         // Slider label display changes
         this._attributeLabels.addEventListener("labels-update", this.labelsUpdate.bind(this));
      }

      // Init card attribute & card sort options using model mediatypes
      for (let locTypeData of this.modelData._localizationTypes) {
         this._cardAtributeSort.add({
            typeData: locTypeData
         });
         this._cardAtributeLabels.add({
            typeData: locTypeData,
            checkedFirst: true
         });
      }

      for (let mediaTypeData of this.modelData._mediaTypes) {
         this._cardAtributeSort.add({
            typeData: mediaTypeData
         });
         this._cardAtributeLabels.add({
            typeData: mediaTypeData,
            checkedFirst: true
         });
      }

      // form change listeners
      // Listen for attribute changes
      this.panelControls._panel.entityData.addEventListener("save", this.entityFormChange.bind(this));
      this.panelControls._panel.stateData.addEventListener("save", this.stateFormChange.bind(this));
      this.panelControls._panel.mediaData.addEventListener("save", this.mediaFormChange.bind(this));
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

   updateFilterResults(idnum) {

      // Create the filter conditions based on the IDNUM and the appropriate data
      this._filterConditions = [];
      var newFilter;
      newFilter = new FilterConditionData("Verification", "IDNUM", "==", idnum, "Collection");
      this._filterConditions.push(newFilter);

      var paginationState = {
         start: 0,
         stop: 5,
         page: 1,
         pageSize: 5,
         init: true
      }
      this.collectionsData.setPaginationState(paginationState);
      this.collectionsData.updateData(this._filterConditions).then((states) => {
         this._paginationUpdate(paginationState, states);
      });
   }

   async _paginationUpdate(paginationState, states = null) {
      // keep pagination in sync
      this.collectionsData.setPaginationState(paginationState);

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
      if (this._pageType !== "view") {
         const permissionValue = "Can Edit";
         const panelPermissionEvt = new CustomEvent("permission-update", { detail: { permissionValue } })
         this.panelContainer.dispatchEvent(panelPermissionEvt);
      } else {
         const permissionValue = "Read Only";
         const panelPermissionEvt = new CustomEvent("permission-update", { detail: { permissionValue } })
         this.panelContainer.dispatchEvent(panelPermissionEvt);
      }

   }

   async _addSliders({ sliderList, states }) {
      var savedStates = [];
      if (states !== null && states.length > 0) {
         // Append the sliders
         for (let idx = 0; idx < states.length; idx++) {
            let state = states[idx];

            if (this._pageType == "verify" && this._verifyType == "ai") {
               if (state.meta != this.verificationType.id) {
                  continue;
               }
               else {
                  if (state.attributes["Record Category"] != "AI") {
                     continue;
                  }
               }
            }
            else if (this._pageType == "verify" && this._verifyType == "reviewer") {
               if (state.meta != this.verificationType.id) {
                  continue;
               }
               else {
                  if (state.attributes["Record Category"] != "Reviewer") {
                     continue;
                  }
               }
            }

            savedStates.push(state);
            state.cards = [];

            const slider = document.createElement("entity-gallery-slider");
            slider.setAttribute("id", state.id);
            slider.setAttribute("meta", state.meta);
            slider._cardAtributeLabels = this._cardAtributeLabels;
            slider._cardAtributeSort = this._cardAtributeSort;
            slider._resizeCards = this._resizeCards;
            sliderList.appendChild(slider);

            if (this._pageType == "resolve" || this._pageType == "view") {
               if (state.meta == this.verificationType.id) {
                  if (state.attributes["Record Category"] == "AI") {
                     slider._attributes.enableHiddenAttributes = true;
                  }
               }
            }

            // # todo some of above and below can be inferred from gallery
            // # #todo labels and sort state part of collections data
            slider.init({
               panelContainer: this.panelContainer,
               pageModal: this.pageModal,
               currentLabelValues: this.currentLabelValues,
               slideCardData: this.slideCardData,
               attributes: state.attributes,
               state,
               gallery: this
            });

            slider._resizeCards.setGalleryTo(142, slider._ul);

            slider.unshownCards = {};
            slider._fullCardsAdded = false;

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


            if (this._pageType == "resolve" || this._pageType == "view") {
               if (state.meta != this.verificationType.id) {
                  slider.setToTextMode();
                  slider.setNoClick();
                  slider.setAttribute("title", `${state.typeData.name} Record | IDNUM: ${state.attributes["IDNUM"]}`);
               }
               else {
                  slider.setAttribute("title", `${state.typeData.name} Record | ${state.attributes["Record Category"]} | IDNUM: ${state.attributes["IDNUM"]}`);
                  if (state.attributes["Record Category"] != "Final") {
                     slider.setToTextMode();
                     slider.setNoClick();
                  }
               }
            }
            else {
               slider.setAttribute("title", `${state.typeData.name} Record | ${state.attributes["Record Category"]} | IDNUM: ${state.attributes["IDNUM"]}`);
            }
         }

         for (let i in this._sliderElements) {
            await this._addSliderCards({ slider: this._sliderElements[i], state: savedStates[i] });
            let slider = this._sliderElements[i];

            // Hide all card labels
            for (const cardElem of slider._cardElements) {
               cardElem.card._styledDiv.hidden = true;
            }

            // Open first card and show panel
            if (slider && slider._cardElements[0] && slider._cardElements[0].card) {
               slider._cardElements[0].card.click();
               this._parentPage.aside.hidden = false;
            } 
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
            slider.loadAllTeaser.innerHTML = `Loading ${totalList} ${association} ${totalList > 1 ? 'entries' : 'entry'}...`
            // Loc association should have list of loc Ids -- If none we should show State with Name and 0 Localizations
            if (totalList > 0) {
               // Get the localizations & make cards with slideCard
               let cardsTmp = [];

               for (let id of galleryList) {
                  if ((counter + 1) < this._previewCardCount) {
                     const cardInitData = { type: state.typeData.association, id };
                     const card = await this.slideCardData.makeCardList(cardInitData);
                     card.counter = counter;

                     if (card) {
                        cardsTmp.push(card);
                     }
                  } else {
                     const cardInitData = { type: state.typeData.association, id, totalList };
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
               var sortProperty = this._cardAtributeSort._selectionValues[entityTypeData.id];
               var sortOrder = this._cardAtributeSort._sortOrderValues[entityTypeData.id];

               let order = sortOrder.getValue()
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
                  this._dispatchCardData({ slider, card, counter: card.counter, totalList, state })
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
            slider.loadAllTeaser.innerHTML = "Collection is empty."
            console.warn("Cannot iterate collection list.", state);
         }
      } else {
         slider.loadAllTeaser.innerHTML = "Error loading collection."
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
         state: state
      }

      //states.cards.push(card);
      const detail = { detail: { cardData: card, cardIndex: counter } };
      // if ((counter + 1) < this._previewCardCount) {
      let newCardEvent = new CustomEvent('new-card', detail);
      slider.dispatchEvent(newCardEvent);
      // } else {
      //    slider.unshownCards.push(detail);
      // }
   }

   _setupSliderPgn({ slider, totalList }) {
      // setup navigation within this slider
      let topNav = document.createElement("entity-gallery-paginator");
      let bottomNav = document.createElement("entity-gallery-paginator");

      // #todo
      slider._cardPaginationState = {
         page: 1,
         start: 0,
         stop: (this._previewCardCount - 1),
         pgsize: (this._previewCardCount - 1)
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
            pageSize: evt.detail.pageSize
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
            pageSize: evt.detail.pageSize
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
      let newCardEvent = new CustomEvent('new-card',);
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
   }

   entityFormChange(e) {
      this.formChange({
         id: e.detail.id,
         values: { attributes: e.detail.values },
         type: "Localization"
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
         type: "State"
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
         type: "Media"
      }).then((data) => {
         for (let s of this._sliderElements) {
            if (s.state.typeData.association == "Media") {
               s.updateCardData(data);
            }
         }
      });
   }

   async formChange({ type, id, values } = {}) {
      var result = await fetch(`/rest/${type}/${id}`, {
         method: "PATCH",
         mode: "cors",
         credentials: "include",
         headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
         },
         body: JSON.stringify(values)
      });

      var data = await result.json();
      let msg = "";
      if (result.ok) {
         if (data.details && data.details.contains("Exception")) {
            msg = `Error: ${data.message}`
            Utilities.warningAlert(msg);
         } else {
            msg = `${data.message}`
            Utilities.showSuccessIcon(msg);
         }

      } else {
         if (data.message) {
            msg = `Error: ${data.message}`
         } else {
            msg = `Error saving ${type}.`
         }
         Utilities.warningAlert(msg, "#ff3e1d", false);
      }

      result = await fetch(`/rest/${type}/${id}`, {
         method: "GET",
         mode: "cors",
         credentials: "include",
         headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
         },
      });
      data = await result.json();
      return data;
   }

   _updateIdStatus() {
      // If in the verify page, whether or not it's the AI or the human reviewer, look to
      // see if those two states have the same species.
      // - If the reviewer is set to "Not Set", the submission's Status == "Not Verified"
      // - If the reviewer agrees with the AI, the submission's Status == "Verified"
      // - If the reviewer does not agree with the AI, the submission's Status == "Needs Resolution"
      //
      // If in the resolve page, if the final reviewer has it set to "Not Set" AND the
      // two reviewers don't agree, the submission's Status == "Needs Resolution"
      // Otherwise, the submission's Status == "Verified"

      this.collectionsData.updateData(this._filterConditions).then(() => {
         var stateList = this.collectionsData.getStates();
         var states = {
            submission: null,
            reviewer: null,
            ai: null,
            final: null
         };
         for (const state of stateList) {
            if (state.meta == this.submissionType.id) {
               states.submission = state;
            }
            else if (state.meta == this.verificationType.id) {
               if (state.attributes["Record Category"] == "AI") {
                  states.ai = state;
               }
               else if (state.attributes["Record Category"] == "Reviewer") {
                  states.reviewer = state;
               }
               else if (state.attributes["Record Category"] == "Final") {
                  states.final = state;
               }
            }
         }
         var submission = states.submission;
         var reviewer_species = states.reviewer.attributes["Species"]
         var ai_species = states.ai.attributes["Species"]
         var final_species = states.final.attributes["Species"]
         var submission_status = ""

         if (this._pageType == "verify") {
            if (reviewer_species == "Not Set") {
               submission_status = "Not Set";
            }
            else {
               if (ai_species == reviewer_species) {
                  submission_status = "Verified";
               }
               else {
                  submission_status = "Needs Resolution";
               }
            }
         }
         else if (this._pageType == "resolve") {
            if (final_species == "NOT SET") {
               if (ai_species == reviewer_species) {
                  submission_status = "Verified";
               }
               else {
                  submission_status = "Needs Resolution";
               }
            }
            else {
               submission_status = "Verified";
            }
         }

         var patchValues = {
            attributes: {"Status": submission_status}
         };
         fetch(`/rest/State/${submission.id}`, {
            method: "PATCH",
            mode: "cors",
            credentials: "include",
            headers: {
               "X-CSRFToken": getCookie("csrftoken"),
               "Accept": "application/json",
               "Content-Type": "application/json"
            },
            body: JSON.stringify(patchValues)
         }).then(() => {
            Utilities.showSuccessIcon(`Updated Submission Status (IDNUM: ${submission.attributes["IDNUM"]})`);
         });

      });
   }
}

customElements.define("apps-species-gallery", AppsSpeciesGallery);
