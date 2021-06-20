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
      this.sliderList.setAttribute("page", 1);

      this._sliderLists = [];
      this._sliderLists.push(this.sliderList);

      this._sliderContainer.appendChild(this.sliderList);

      this.slideCardData = document.createElement("collection-slide-card-data");

      // Property IDs are the entity IDs (which are expected to be unique)
      // Each property (ID) points to the index of the sliders information stored in _sliderElements
      //this._currentSliderIndexes = {};

      // Entity sliders aren't deleted. They are reused and hidden if not used.
      this._sliderElements = [];
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

      // Possibly remove this so we can have navigation controls
      // this.panelContainer._panelTop._topBarArrow.hidden = true;
      // this.panelContainer._panelTop.panelNav.init();

      try{
         this.slideCardData.init(this.modelData);
      } catch(e){
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
               totalText = `${statesInfo.paginationState.start} to ${statesInfo.paginationState.stop} of ${total} of Results`

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
            for (let type in this.modelData.stateTypeData) {
               let labels = document.createElement("entity-gallery-labels");

               // Provide labels and access to the sliders
               labels.init({ typeData: this.modelData.stateTypeData[type], gallery: this });
               this._attributeLabelsDiv.appendChild(labels);

               // Label display changes
               labels.addEventListener("labels-update", (e) => {
                  this.labelsUpdate({ typeId: type, labelValues: e.detail.value });
               });
               // Label sort changes

               // Hide / Show type changes
               labels.addEventListener("hide-type-update", (e) => {
                  this.hideThisType({ typeId: type, hidden: e.detail.off });
               });
            }

         }
      }
   }

   hideThisType({ typeId, hidden }) {
      // find the slider, and show it's values
      for (let s of this._sliderElements) {
         if (s.getAttribute("meta") == typeId) {
            //show the Labels (which are there but hidden)
            if (hidden) s.classList.add("hidden");
            if (!hidden) s.classList.remove("hidden");
         }
      }
   }

   labelsUpdate({ typeId, labelValues }) {
      // find the slider, and show it's values
      for (let s of this._sliderElements) {
         console.log(`Updating for ${typeId} -- this smeta is ${s.getAttribute("meta")} for slider id ${s.id}`)
         if (s.getAttribute("meta") == typeId) {
            //show the Labels (which are there but hidden)
            s.showLabels(labelValues);
         }
      }
   }

   _paginateGallery(evt) {
      console.log(evt.detail)
      const statesInfo = this.modelData._states;

      // set state
      statesInfo.paginationState.start = evt.detail.start;
      statesInfo.paginationState.stop = evt.detail.stop;
      statesInfo.paginationState.page = evt.detail.page;
      statesInfo.paginationState.pageSize = evt.detail.pgsize;
      statesInfo.paginationState.init = false;

      this._paginationUpdate(statesInfo);

      this.analyticsSettings.setAttribute("pagesize", statesInfo.paginationState.pageSize);
      this.analyticsSettings.setAttribute("page", statesInfo.paginationState.page);
      window.history.pushState({}, "", this.analyticsSettings.getURL());
   }

   async _paginationUpdate(statesInfo) {
      const newSliderIndex = statesInfo.paginationState.page - 1;
      // update paginator
      this._paginator_top.setValues(statesInfo.paginationState);
      this._paginator.setValues(statesInfo.paginationState);

      // Add new states
      if (this._sliderLists[newSliderIndex]) {
         for (let list of this._sliderLists) {
            list.hidden = true;
         }
         this._sliderLists[newSliderIndex].hidden = false;
      } else {
         const newStates = await this.modelData._paginateStatesFetch();

         for (let list of this._sliderLists) {
            list.hidden = true;
         }

         let newSliderList = document.createElement("div");
         newSliderList.setAttribute("class", "slider-list");
         newSliderList.setAttribute("page", statesInfo.paginationState.page);
         this._sliderLists.push(newSliderList);

         this._addSliders({ sliderList: newSliderList, states: newStates });
         this._sliderContainer.appendChild(newSliderList);
      }
      this._numFiles.textContent = `${statesInfo.paginationState.start} to ${statesInfo.paginationState.stop} of ${statesInfo.total} of Results`;
   }

   async _addSliders({ sliderList, states }) {
      
      // Append the sliders
      for (let state of states) {
         console.log(state);
         state.cards = [];
         let counter = 0;

         const slider = document.createElement("entity-gallery-slider");
         slider.setAttribute("id", state.id);
         slider.setAttribute("meta", state.meta);
         slider.entityFormChange = this.entityFormChange.bind(this);
         slider.stateFormChange = this.stateFormChange.bind(this);
         slider.mediaFormChange = this.mediaFormChange.bind(this);

         slider.init({
            panelContainer: this.panelContainer,
            pageModal: this.pageModal,
            modelData: this.modelData,
            slideCardData: this.slideCardData,
            cardType: "collections-card",
            attributes: state.attributes,
            state
         });

         const stateName = `${state.typeData.name} ID ${state.id}`
         slider.setAttribute("title", stateName);

         const cardCount = document.createElement("p");
         slider.appendChild(cardCount);

         this._sliderElements.push(slider);
         sliderList.appendChild(slider);

         // tell the panel about these cards
         // this.panelContainer._panelTop.panelNav.pushNavData({
         //    sliderIndex: (sliderList.length - 1),
         //    entityList: slider._cardElements
         // });

         slider.addEventListener("click", (e) => {
            if (!slider.main.classList.contains("active")) {
               // This sliderEl is active, the rest are inactive
               for (let s of this._sliderElements) {
                  s.main.classList.remove("active");
                  s.dispatchEvent(new Event("slider-inactive"));
               }

               slider.main.classList.add("active");
               slider.dispatchEvent(new Event("slider-active"));

               slider.scrollIntoView({
                  behavior: "smooth",
                  block: "end",
                  inline: "nearest"
               });

               this.analyticsSettings.setAttribute("selectedState", state.id);
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

         // create the cards
         const galleryList = state.typeData.association === "Localization" ? state.localizations : state.media;
         if(galleryList) {
            const totalList = galleryList.length;
            // Loc association should have list of loc Ids -- If none we should show State with Name and 0 Localizations
            if(totalList > 0){
               // Otherwise, get the localizations & make cards with slideCard
               for(let id of galleryList){
                  const cardInitData = { type : state.typeData.association, id }; 
                  const card = await this.slideCardData.makeCardList( cardInitData );
                  
                  if(card){
                     card[0].posText = `${counter+1} of ${totalList}`;
                     card[0].stateType = state.typeData.association;
                     card[0].stateInfo = {
                        id : state.id,
                        attributes: state.attributes,
                        entityType: state.typeData,
                        state : state
                     }
                     //states.cards.push(card);

                     let newCardEvent = new CustomEvent('new-card', {detail : { cardData : card, cardIndex : counter}} );
                     slider.dispatchEvent(newCardEvent);
                     counter++;
                  }
               }
            }

         }
         if (this.analyticsSettings.hasAttribute("selectedState")) {
            console.log("Has selected state ........ !");
            //for (let s of this._sliderElements) {
            let settingsState = Number(this.analyticsSettings.getAttribute("selectedState"));
            let sliderId = Number(slider.getAttribute("id"));
            if (settingsState == sliderId) {
               //this._makeSliderActive(slider, sliderId)
               console.log("Found the selected state slider!");
               // This sliderEl is active, the rest are inactive
               slider.main.classList.add("active");
               slider.dispatchEvent(new Event("slider-active"));
               slider.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "nearest"
               });
            }
            //}

         }

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

      this.analyticsSettings.setAttribute("selectedState", stateId);

      return sliderEl.scrollIntoView(true);
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
         console.log(data);

         // Find the right slider
         for (let s of this._sliderElements) {
            if (s.id == e.detail.id) {
               for (let c of s._cardElements) {
                  c.annotationPanel.stateData.updateValues({ newValues: data });
               }
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
