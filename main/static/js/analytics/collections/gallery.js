class CollectionsGallery extends EntityCardSlideGallery {
   constructor() {
      super();
      /*
      * Add tools, headings and pagination for gallery here
      *
      */
      this.panelContainer = null;

      this.sliderList = document.createElement("div");
      this.sliderList.setAttribute("class", "slider-list");


      this._sliderLists = [];


      this._sliderContainer.appendChild(this.sliderList);

      this.slideCardData = document.createElement("collection-slide-card-data");

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the sliders information stored in _sliderElements
      //this._currentSliderIndexes = {};

      // Entity sliders aren't deleted. They are reused and hidden if not used.
      this._sliderElements = [];

      // First group and total cards
      this._previewCardCount = 11;
   }

   // Provide access to side panel for events
   init({
      panelContainer,
      pageModal,
      modelData,
      galleryContainer,
      analyticsSettings
   }) {
      this.panelContainer = panelContainer;
      this.panelControls = this.panelContainer._panelTop;
      this.pageModal = pageModal;
      this.modelData = modelData;
      this.galleryContainer = galleryContainer;
      this.analyticsSettings = analyticsSettings;

      this.sliderList.setAttribute("page", this.modelData._states.paginationState.page);

      // Possibly remove this so we can have navigation controls
      // this.panelContainer._panelTop._topBarArrow.hidden = true;
      // this.panelContainer._panelTop.panelNav.init();

      this.modelData.currenLabelValues = {};
      this.modelData.currenHiddenType = [];

      try {
         this.slideCardData.init(this.modelData);
      } catch (e) {
         console.log(e.description);
      }

      // Init slider, which inits inner cards
      if (this.modelData._states && this.modelData._states.states) {
         const statesInfo = this.modelData._states;
         const states = this.modelData._states.states;
         if (statesInfo.total >= this.modelData.getMaxFetchCount()) {
            this._numFiles.textContent = `Too many results to preview. Displaying the first ${this.modelData._states.total} results.`
         } else {
            const total = statesInfo.total;
            let totalText = `${total} Results`;

            if (statesInfo.paginationState && total > statesInfo.paginationState.pageSize) {
               let startText = statesInfo.paginationState.start + 1;
               totalText = `${startText} to ${statesInfo.paginationState.stop} of ${total} of Results`

               // Top settings
               this._paginator_top.hidden = false;
               this._paginator_top._pageSize = statesInfo.paginationState.pageSize;
               this._paginator_top.init(total, statesInfo.paginationState);
               this._paginator_top.addEventListener("selectPage", this._paginateGallery.bind(this));

               // Bottom settings
               this._paginator.hidden = false;
               this._paginator._pageSize = statesInfo.paginationState.pageSize;
               this._paginator.init(total, statesInfo.paginationState);
               this._paginator.addEventListener("selectPage", this._paginateGallery.bind(this));
            }

            this._numFiles.textContent = totalText;

            if (states.length > 0) {
               this._addSliders({ sliderList: this.sliderList, states });
            }
         }

         // Setup the label picker
         if (this.modelData.stateTypeData) {
            for (let typeId in this.modelData.stateTypeData) {
               //console.log(`Gallery creation of labels for typeId ${typeId}`);
               if (this.modelData.stateTypeData[typeId].total > 0) {
                  let labels = document.createElement("entity-gallery-labels");
                  let labelValues = [];
                  this.modelData.currenLabelValues[typeId] = labelValues;

                  // Provide labels and access to the sliders
                  labels.init({ typeData: this.modelData.stateTypeData[typeId], gallery: this });
                  this._attributeLabelsDiv.appendChild(labels);

                  // Label display changes
                  labels.addEventListener("labels-update", (e) => {
                     labelValues = e.detail.value;
                     this.labelsUpdate({ typeId, labelValues });
                     this.modelData.currenLabelValues[typeId] = labelValues;
                     //console.log(this.modelData.currenLabelValues[typeId]);
                  });
                  // Label sort changes

                  // Hide / Show type changes
                  //if (Object.keys(this.modelData.stateTypeData).length > 1) {
                  // #todo - this works, but is showing count for all results, not just page which is confusing....
                  labels.addEventListener("hide-type-update", (e) => {
                     this.hideThisType({ typeId, hidden: e.detail.off });

                  });
                  // } else {
                  //    labels._count.hidden = true;
                  // }
               }


            }

         }
      }
   }

   hideThisType({ typeId, hidden }) {
      if (hidden) {
         this.modelData.currenHiddenType.push(typeId);
      } else {
         console.log(this.modelData.currenHiddenType.includes(typeId));
         if (this.modelData.currenHiddenType.includes(typeId)) {
            let index = this.modelData.currenHiddenType.indexOf(typeId);
            console.log(index);
            this.modelData.currenHiddenType.splice(index, 1);
            console.log(this.modelData.currenHiddenType);
            console.log(this.modelData.currenHiddenType.includes(typeId));
         }
      }

      // find the slider, and show it's values
      for (let s of this._sliderElements) {
         if (s.getAttribute("meta") == typeId) {
            this._hiddenSlider(s, typeId, hidden);
         }
      }
   }

   _hiddenSlider(s, typeId, hidden) {
      console.log("Hide a type.... ");
      console.log(this.modelData.currenHiddenType);
      //show the Labels (which are there but hidden)
      if (hidden) {
         if (!s.helper) {
            let hiddenHTML = `<div class="hidden-type-html col-12">[ ${s.title} Hidden ]</div>`;
            s.helper = document.createElement('div');
            s.helper.innerHTML = hiddenHTML;
            s._shadow.appendChild(s.helper);
         } else {
            s.helper.hidden = false;
         }

         s.main.classList.add("hidden")

      } else {
         s.main.classList.remove("hidden");
         if (s.helper) {
            s.helper.hidden = true;
         }
      }
   }

   labelsUpdate({ typeId, labelValues }) {
      // find the slider, and show it's values
      for (let s of this._sliderElements) {
         //console.log(`Updating for ${typeId} -- this smeta is ${s.getAttribute("meta")} for slider id ${s.id}`)
         if (s.getAttribute("meta") == typeId) {
            //show the Labels (which are there but hidden)
            s.showLabels(labelValues);
         }
      }
   }

   _paginateGallery(evt) {
      //console.log(evt.detail);

      // set state
      this.modelData._states.paginationState.start = evt.detail.start;
      this.modelData._states.paginationState.stop = evt.detail.stop;
      this.modelData._states.paginationState.page = evt.detail.page;
      this.modelData._states.paginationState.pageSize = evt.detail.pgsize;
      this.modelData._states.paginationState.init = false;


      this._paginationUpdate();

      this.analyticsSettings.setAttribute("pagesize", this.modelData._states.paginationState.pageSize);
      this.analyticsSettings.setAttribute("page", this.modelData._states.paginationState.page);
      window.history.pushState({}, "", this.analyticsSettings.getURL());
   }

   async _paginationUpdate() {
      const newSliderPage = this.modelData._states.paginationState.page;

      // update paginator
      this._paginator_top.setValues(this.modelData._states.paginationState);
      this._paginator.setValues(this.modelData._states.paginationState);

      // Add new states
      // If the slider already exists, we're hiding and showing
      if (this._sliderLists[newSliderPage]) {
         for (let a in this._sliderLists) {
            console.log(this._sliderLists[a]);
            this._sliderLists[a].hidden = true;
         }
         this._sliderLists[newSliderPage].hidden = false;
      } else {
         // If we haven't made this page, we need to fetch the next page
         const newStates = await this.modelData._paginateStatesFetch();

         for (let a in this._sliderLists) {
            console.log(this._sliderLists[a]);
            this._sliderLists[a].hidden = true;
         }

         let newSliderList = document.createElement("div");
         newSliderList.setAttribute("class", "slider-list");
         newSliderList.setAttribute("page", this.modelData._states.paginationState.page);
         //this._sliderLists[this.modelData._states.paginationState.page] = newSliderList;

         this._addSliders({ sliderList: newSliderList, states: newStates });
         this._sliderContainer.appendChild(newSliderList);

         // Update new slider panel permission
         const locked = this.analyticsSettings._lock._pathLocked.style.display != "none";
         const permissionValue = locked ? "View Only" : "Can Edit";
         const panelPermissionEvt = new CustomEvent("permission-update", { detail: { permissionValue } })
         this.panelContainer.dispatchEvent(panelPermissionEvt);
      }

      let startText = this.modelData._states.paginationState.start + 1;
      this._numFiles.textContent = `${startText} to ${this.modelData._states.paginationState.stop} of ${this.modelData._states.total} of Results`;
   }

   async _addSliders({ sliderList, states }) {
      const currentSliderEls = [];
      let sliderPage = this.modelData._states.paginationState.page;
      this._sliderLists[sliderPage] = sliderList;

      // Append the sliders
      for (let state of states) {
         state.cards = [];

         const slider = document.createElement("entity-gallery-slider");
         slider.setAttribute("id", state.id);
         slider.setAttribute("meta", state.meta);
         slider.entityFormChange = this.entityFormChange.bind(this);
         slider.stateFormChange = this.stateFormChange.bind(this);
         slider.mediaFormChange = this.mediaFormChange.bind(this);
         sliderList.appendChild(slider);

         slider.init({
            panelContainer: this.panelContainer,
            pageModal: this.pageModal,
            modelData: this.modelData,
            slideCardData: this.slideCardData,
            cardType: "collections-card",
            attributes: state.attributes,
            state
         });

         slider.unshownCards = {};
         slider._fullCardsAdded = false;

         const stateName = `${state.typeData.name} ID ${state.id}`
         slider.setAttribute("title", stateName);

         this._sliderElements.push(slider);
         currentSliderEls.push(slider);

         slider.addEventListener("click", (e) => {
            if (!slider.main.classList.contains("active")) {
               slider.dispatchEvent(new Event("slider-active"));

               // This sliderEl is active, the rest are inactive
               for (let s of this._sliderElements) {
                  if (s.id !== slider.id) {
                     s.dispatchEvent(new Event("slider-inactive"));
                  }
               }

               //this.analyticsSettings.setAttribute("selectedState", state.id);
               //window.history.pushState({}, "", this.analyticsSettings.getURL());
            }
            // } else { 
            //       
            //    console.log("This is already open!")
            //    //toggle it shut
            //    const inactiveEvent = new Event("slider-inactive");
            //    slider.dispatchEvent(inactiveEvent);

            // }
         });

         // slider.loadAllTeaser.addEventListener("click", (e) => {
         //    console.log("clicked loadAll link!")

         //    if (slider.unshownCards && slider.unshownCards.length > 0 && !slider._fullCardsAdded) {
         //       let loadMoreCounter = 10;
         //       for (var i = 1; i <= loadMoreCounter; i++) {
         //          this._addNextUnshownCard(slider);
         //       }
         //    } else {
         //       console.log("All Cards are loaded.")
         //       slider._fullCardsAdded === true;
         //       slider.loadAllTeaser.remove();
         //    }
         // });

         // Current hidden status
         if (this.modelData.currenHiddenType.includes(String(state.meta))) {
            this._hiddenSlider(slider, state.meta, true);
         }

         // create the cards
         const galleryList = state.typeData.association === "Localization" ? state.localizations : state.media;
         if (galleryList) {
            const totalList = galleryList.length;
            const trackOrTracks = totalList > 1 ? "Tracks" : "Track";
            const cardCountText = document.createTextNode(`(${totalList} ${trackOrTracks})`)
            slider._count.appendChild(cardCountText);
         }


      }

      for (let i in currentSliderEls) {
         await this._addSliderCards({ slider: currentSliderEls[i], state: states[i] });
      }


   }

   async _addSliderCards({ slider, state }) {
      const association = state.typeData.association;
      const galleryList = association === "Localization" ? state.localizations : state.media;

      let counter = 0;

      if (galleryList) {
         const totalList = galleryList.length;

         // Loc association should have list of loc Ids -- If none we should show State with Name and 0 Localizations
         if (totalList > 0) {
            // Otherwise, get the localizations & make cards with slideCard
            for (let id of galleryList) {
               if ((counter + 1) < this._previewCardCount) {
                  const cardInitData = { type: state.typeData.association, id };
                  const card = await this.slideCardData.makeCardList(cardInitData);

                  if (card) {
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
               } else {
                  const cardInitData = { type: state.typeData.association, id, totalList };
                  // const card = await this.slideCardData.makeCardList(cardInitData);
                  slider.unshownCards[counter] = cardInitData;
                  console.log("Updating unshown cards")
                  console.log(slider.unshownCards[counter]);
               }

               counter++;

            }

            if (totalList <= this._previewCardCount) {
               // slider.loadAllTeaser.innerHTML = "See All";
               // if (totalList < 4) {
               slider.loadAllTeaser.remove();
               //}
            } else {
               slider.loadAllTeaser.remove();

               // setup navigation within this slider
               let topNav = document.createElement("entity-gallery-paginator");
               let bottomNav = document.createElement("entity-gallery-paginator");
               slider._cardPaginationState = {
                  page: 1,
                  start: 0,
                  stop: 10,
                  pgsize: 10
               };

               topNav.init(totalList, slider._cardPaginationState);

               bottomNav.init(totalList, slider._cardPaginationState);

               topNav.pageSizeEl.hidden = true;
               topNav.pageSizeText.hidden = true;
               topNav.goToPage.hidden = true;
               topNav.goToPageText.hidden = true;

               bottomNav.pageSizeEl.hidden = true;
               bottomNav.pageSizeText.hidden = true;
               bottomNav.goToPage.hidden = true;
               bottomNav.goToPageText.hidden = true;

               topNav.addEventListener("selectPage", (evt) => {
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
         }
      }
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

      //this.analyticsSettings.setAttribute("selectedState", stateId);

      //return sliderEl.scrollIntoView(true);
   }

   updateCardData(newCardData) {
      for (let s of this._sliderElements) {
         if (newCardData.id in s._currentCardIndexes) {
            const index = s._currentCardIndexes[newCardData.id];
            const card = s._cardElements[index].card;
            s.slideData.updateLocalizationAttributes(card.cardObj).then(() => {
               card.displayAttributes();
            });
         }
      }
   }

   entityFormChange(e) {
      this.formChange({
         id: e.detail.id,
         values: { attributes: e.detail.values },
         type: "Localization"
      }).then((data) => {
         this.updateCardData(data);
      });
   }

   stateFormChange(e) {
      this.formChange({
         id: e.detail.id,
         values: { attributes: e.detail.values },
         type: "State"
      }).then((data) => {
         //console.log(data);

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
      this.formChange({
         id: e.detail.id,
         values: { attributes: e.detail.values },
         type: "Media"
      }).then((data) => {
         //#TODO
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


}

customElements.define("collections-gallery", CollectionsGallery);
