

class GalleryBulkEdit extends TatorElement {
   constructor() {
      super();
      /**
       * Bulk edit is added to a gallery
       * When multiselect cues are heard, it changes the view
       * 1. Bar slides up - easily dismissable, clear selection cues for already selected and selectable
       * 2. Stay on the same URL but need to be abel to hide: header
       * 3. Save data as essentially a new card list? Xing out returns full list.
       * 
       * Questions: Do I use a gallery copy or it directly?
       * What is max that can be selected?
       * 
       */
      // // Mesage bar top
      this._messageBar_top = document.createElement("div");
      this._messageBar_top.setAttribute("class", "px-6 py-2 bulk-edit-bar_top text-center hidden")
      this._shadow.appendChild(this._messageBar_top);

      this._h2 = document.createElement("h2");
      this._h2.setAttribute("class", "py-2 px-2 f1 semi-bold");
      this._h2.innerHTML = `<span class="text-bold">Selection Mode:</span> <kbd>Ctrl</kbd> + <kbd>A</kbd> to select all. <kbd>Esc</kbd> to exit.`;
      this._messageBar_top.appendChild(this._h2);


      // Escape Bulk Edit
      this.xClose = document.createElement("button");
      this.xClose.setAttribute("class", "text-white bulk-edit--cancel btn-clear px-2 py-2 h2 text-white");
      this._messageBar_top.appendChild(this.xClose);
  
      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("id", "icon-x");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("height", "1em");
      svg.setAttribute("width", "1em");
      this.xClose.appendChild(svg);
  
      const title = document.createElementNS(svgNamespace, "title");
      title.textContent = "Close";
      svg.appendChild(title);
  
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z");
      svg.appendChild(path);

      //draggable
      this.startX = null;
      this.startY = null;
      this.startWidth = null;
      this.startHeight = null;

      // Message Panel
      this._bulkEditBar = document.createElement("div");
      this._bulkEditBar.setAttribute("class", "bulk-edit-bar hidden")
      this._shadow.appendChild(this._bulkEditBar);


      /**
       * Listen for actions: edit and compare to change panel
       */
      this._selectionPanel = document.createElement("entity-gallery-multi-selection-panel");
      this._selectionPanel.addEventListener("bulk-edit-click", this._showEditPanel.bind(this));
      this._selectionPanel.addEventListener("comparison-click", this._showComparisonPanel.bind(this));
      this._selectionPanel.addEventListener("clear-selection", this._clearSelection.bind(this));
      this._selectionPanel.addEventListener("select-all", this.selectAllOnPage.bind(this));
      this._bulkEditBar.appendChild(this._selectionPanel);



      // Edit panel
      this._editPanel = document.createElement("entity-gallery-multi-attribute-edit-panel");
      this._editPanel.addEventListener("select-click", this._showSelectionPanel.bind(this)); // Back
      this._editPanel.addEventListener("save-edit-click", this._saveBulkEdit.bind(this));
      this._editPanel.addEventListener("comparison-click", this._showComparisonPanel.bind(this));
      this._editPanel.hidden = true;
      this._bulkEditBar.appendChild(this._editPanel);



      // Comparison panel
      this._comparisonPanel = document.createElement("entity-gallery-attribute-comparison-panel");
      this._comparisonPanel.addEventListener("select-click", this._showSelectionPanel.bind(this)); // Back
      this._comparisonPanel.addEventListener("save-edit-click", this._saveBulkEdit.bind(this));
      this._comparisonPanel.addEventListener("comparison-click", this._showComparisonPanel.bind(this));
      this._comparisonPanel.hidden = true;
      this._bulkEditBar.appendChild(this._comparisonPanel);

      //
      this._editPanel.addEventListener("attribute-changed", (e) => {
         this._comparisonPanel.updateColumnsShown(e)
      });

      /**
       * Initially selection panel is shown
       */
      this._selectionPanel.show(true);

      // When someone starts shift select, then we connect between the two
      // If they haven't shift + selected, just single select
      this._editMode = false;
      this._shiftSelect = false;
      this._ctrlSelect = false;

      this._shiftSelectedFirst = null;
      this._shiftSelectedNext = null;

      // Listen when shift stops
      var userAgent = navigator.userAgent;
      var mobileFirefox = userAgent.indexOf("Firefox") !== -1 && userAgent.indexOf("Mobile") !== -1;
      // 'keyup' event will not be fired on Mobile Firefox, so we have to use 'input' event instead
      var keyUpEventName = mobileFirefox ? "input" : "keyup";
      document.addEventListener(keyUpEventName, this._keyUpHandler.bind(this));

      // Listen to escape or Close
      document.addEventListener("keydown", this._keyDownHandler.bind(this));
      this.xClose.addEventListener("click", this._escapeEditMode.bind(this));

      //
      this._currentMultiSelection = new Set();
      this._currentMultiSelectionToId = new Map();
      this._currentSelectionObjects = new Set();
      this._localizationTypes = new Set();
      this.setOfSelectedMetaIds = new Set();
      this._attributeList = {};
   }

   set elementList(val) {
      this._elements = val;
   }

   set elementIndexes(val) {
      this._elementIndexes = val;
   }

   init(page) {
      this._page = page;

      // todo- generalize this
      this._page._filterResults.addEventListener("multi-select", this._openEditMode.bind(this))
      this.boxHelper = new SettingsBox( this._page.modal );
   }

   _keyUpHandler(e) {
      if (e.key == "Control") {
         this._ctrlSelect = false;
      }
      if (e.key == "Shift") {
         this._shiftSelect = false;
      }
   }

   _keyDownHandler(e) {
      if (e.key == "Escape") {
         console.log(`Escape!`)
         this._escapeEditMode();
      }

      if (e.key == "a") {
         if (e.ctrlKey) {
            console.log("CTRL+A");
            this.selectAllOnPage();
         }
      }
   }

   shiftSelect({element, id, isSelected}) {
      if (!this._editMode) this.startEditMode();

      // clicked element
      // first shift click is start, and if click isn't broken
      if (this._shiftSelectedFirst == null) {
         console.log('Saving shift click first el')
         this._shiftSelectedFirst = element;
      } else {
         console.log('Saving shift click secon el')
         this._shiftSelectedSecond = element;

         // firstIndex - secondIndex
         let firstIndex = this._elementIndexes[this._shiftSelectedFirst.cardObj.id];
         let secondIndex = this._elementIndexes[id];
         let inBetween = secondIndex - firstIndex;
         console.log(`inBetween secondIndex ${secondIndex} - firstIndex ${firstIndex} = ${inBetween} .... Math.sign(inBetween) = ${Math.sign(inBetween)}`);

         if (Math.sign(inBetween) == -1) {
            let startIndex = secondIndex  - 1;
            for (let i = startIndex; startIndex < firstIndex; i--){
               if (!element._li.classList.contains("is-selected")) {
                  this._addSelected({ element:element.card, id: element.card.cardObj.id, isSelected: element.card._li.classList.contains("is-selected") });
               }
            }
         } else if (Math.sign(inBetween) == 1) {
            let startIndex = firstIndex + 1;
            for (let i = startIndex; startIndex < secondIndex; i++){
               if (!element._li.classList.contains("is-selected")) {
                  this._addSelected({ element:element.card, id: element.card.cardObj.id, isSelected: element.card._li.classList.contains("is-selected") });
               }
            }
         }
      }
   }

   selectAllOnPage() {
      if (!this._editMode) this.startEditMode();
      for (let el of this._elements) {
         let id = el.card.cardObj.id;
         if (!this._currentMultiSelection.has(id)) {
            if (el.card._li.classList.contains("is-selected")) {
               this._removeSelected({ element:el.card, id, isSelected: el.card._li.classList.contains("is-selected") });
            } else {
               this._addSelected({ element:el.card, id, isSelected: el.card._li.classList.contains("is-selected") });
            }
         }
      }
   }

   _addSelected({ element, id, isSelected }) {
      if (!this._editMode) this.startEditMode();

      element._li.classList.add("is-selected");
      element._multiSelectionToggle = true

      this._currentMultiSelection.add(id);
      this._currentSelectionObjects.add(element.cardObj);
      this.setOfSelectedMetaIds.add(element.cardObj.entityType.id);
      this._updatePanelCount(this._currentMultiSelection.size);
      
      let list = typeof this._currentMultiSelectionToId.get(element.cardObj.entityType.id) !== "undefined" ? this._currentMultiSelectionToId.get(element.cardObj.entityType.id) : new Set();
      list.add(id);

      this._currentMultiSelectionToId.set(element.cardObj.entityType.id, list);
   }

   _removeSelected({ element, id, isSelected }) {
      console.log("remove selected");
      if (isSelected) {
         element._li.classList.remove("is-selected");
      }
      // if (element._multiSelectionToggle) {
      //    element._multiSelectionToggle = false;
      // }
      this._currentMultiSelection.delete(id);
      this._currentSelectionObjects.delete(element.cardObj);
      this.setOfSelectedMetaIds.delete(element.cardObj.entityType.id);
      this._updatePanelCount(this._currentMultiSelection.size);


      if (typeof this._currentMultiSelectionToId.get(element.cardObj.entityType.id) !== "undefined") {
         let list = this._currentMultiSelectionToId.get(element.cardObj.entityType.id);
         list.delete(id);
      }
   }

   _updatePanelCount(count) {
      // this._comparisonPanel._selectionCount.textContent = count;
      this._editPanel._selectionCount.textContent = count;
      this._selectionPanel._selectionCount.textContent = count;

      // check on the table data too....
      this._comparisonPanel._refreshTable(this._currentSelectionObjects);
   }



   _openEditMode(e) {
      let clickType = typeof e.detail.clickDetail == "undefined" ? e.type : e.detail.clickDetail.type;

      if (e.detail.isSelected) {
         this._removeSelected(e.detail);
      } else {
         this._addSelected(e.detail);
      }     

      if (clickType == "shift-select") {
         this.shiftSelect(e.detail);
      }

      this._updatePanelCount(this._currentMultiSelection.size);
   }

   _clearSelection() {
      console.log("CLEARING SELECTION!");
      this._currentMultiSelection.clear();
      this._currentSelectionObjects.clear();
      for (let el of this._elements) {
         el.card._li.classList.remove("is-selected");
         el.card._multiSelectionToggle = false;
      }
      this._updatePanelCount(0);
   }

   resetElements() {
      this.elementList = [];
      this.elementIndexes = [];
   }

   startEditMode() {
      console.log("Edit mode started");
      this._editMode = true;

      for (let el of this._elements) {
         if (el.card._li.classList.contains("is-selected") && !this._currentMultiSelection.has(el.card.cardObj.id)) {
            console.log("Bulk select sees this was already selected... _addSelected: "+ el.card.cardObj.id)
            this._addSelected({element: el.card, id: el.card.cardObj.id, isSelected: el.card._li.classList.contains("is-selected")})
         }
      }
      
      // show edit drawer and tools
      this._messageBar_top.classList.remove("hidden");
      this._bulkEditBar.classList.remove("hidden");
      // this._messageBar_top.classList.remove("hidden");

      // hide page elements
      this._page._header.classList.add("hidden");
      this._page.aside.classList.add("slide-close");
      this._page.aside.classList.add("hidden");
      this._page.main.classList.remove("col-9"); 
      this._page.main.classList.add("col-12");
      // this._page.main.style.marginTop = "-100px";
      this._page.main.style.paddingBottom = "300px";
      this._page._filterView.classList.add("hidden");
      this._page._filterResults._ul.classList.add("multi-select-mode");

      this.dispatchEvent(new Event("multi-enabled"));
   }

   _escapeEditMode(e) {
      console.log("Edit mode closed");
      console.log(e);
      this._editMode = false;

      // hide edit drawer and tools
      this._messageBar_top.classList.add("hidden");
      this._bulkEditBar.classList.add("hidden");
      // this._messageBar_top.classList.add("hidden");

      // revert page elements
      this._page._header.classList.remove("hidden");
      this._page.aside.classList.remove("hidden");
      this._page._filterView.classList.remove("hidden");
      this._page.main.style.marginTop = "0";
      this._page._filterResults._ul.classList.remove("multi-select-mode");

      this._clearSelection();
      // this.resetElements();
      this.dispatchEvent(new Event("multi-disabled"));
   }

   _showSelectionPanel(val = true) {
      if (val) {
         this._comparisonPanel.show(false);
         this._editPanel.show(false);      
      }

      this._selectionPanel.show(val);
   }
   _showEditPanel(val = true) {
      if (val) {
         this._comparisonPanel.show(false);
         this._selectionPanel.show(false);
      }
      this._editPanel.hideShowTypes(this.setOfSelectedMetaIds);
      this._editPanel.show(val);
   }
   _showComparisonPanel(val = true) {
      if (val) {
         this._editPanel.show(false);
         this._selectionPanel.show(false);
      }

      this._editPanel.hideShowTypes(this.setOfSelectedMetaIds);
      let shownAttributes = this._editPanel.shownAttrNames();
      this._editPanel.toggleAttribute("hide");
      this._comparisonPanel.init({ columns: shownAttributes });
      
      if (typeof this._currentSelectionObjects !== "undefined" || this._currentSelectionObjects !== null) this._comparisonPanel._refreshTable(this._currentSelectionObjects);
      this._comparisonPanel.show(val);
   }
   _saveBulkEdit() {
      this._saveConfirmation();
   }
   _showMiniComparison(val = true) {
      this._editPanel.showComparison(val);
   }
   _saveConfirmation() {
      let button = document.createElement("button");
      button.setAttribute("class", "btn f1 text-semibold");
      let confirmText = document.createTextNode("Yes")
      button.appendChild(confirmText);
      

      let text = `<h2 class="py-2 h3">Edit ${this._currentMultiSelection.size} Localizations?</h2>`;

      const editFormValues = this._editPanel.getValue();

      let inputValueArray = this._editPanel.getValue();
      let formData = [];
      for (let r of inputValueArray) {
         if(r.typeId !== "" && typeof this._currentMultiSelectionToId.get(Number(r.typeId)) !== "undefined" && this._currentMultiSelectionToId.get(Number(r.typeId)).size > 0){
            if (inputValueArray.length > 1) {
               text += `<p class="py-2 text-bold text-gray">Updates to ${this._currentMultiSelectionToId.get(Number(r.typeId)).size} Localizations with Type ID: ${r.typeId}</p>`
            }
            
            if (r.values !== {}) {
               for (let [name, value] of  Object.entries(r.values)) {
                  text += `<p class="py-2 px-2 text-gray">- Updating attribute '${name}'' to value: ${value}</p>`
               }
               let formDataForType = {
                  attributes: r.values,
                  ids: Array.from(this._currentMultiSelectionToId.get(Number(r.typeId)))
               }
               formData.push(formDataForType)
            } else {
               return text += `<p class="text-red py-2 px-2">- No valid values to update for Type ID ${r.typeId}</p>`
            }
            
            if (r.rejected !== {}) {
               for (let rej of Object.entries(r.rejected)) {
                  text += `<p class="text-red py-2 px-2">- Will not update attribute '${rej}' - value is invalid, or null.</p>`
               }
            }
         }
      }

      if (formData.length == 0) {
         return this.boxHelper._modalError("Error with update.");
      }

      let buttonContinue = document.createElement("button");
      buttonContinue.setAttribute("class", "btn f1 text-semibold");
      let confirmTextContinue = document.createTextNode("Select More")
      buttonContinue.appendChild(confirmTextContinue);

      let buttonExit = document.createElement("button");
      buttonExit.setAttribute("class", "btn  btn-charcoal btn-clear f1 text-semibold");
      let confirmTextExit = document.createTextNode("Exit Select Mode")
      buttonExit.appendChild(confirmTextExit);

  
      button.addEventListener("click", (e) => {
         e.preventDefault();
         this.boxHelper.modal._closeCallback();
         this._page.showDimmer();
         this._page.loading.showSpinner();
         let promise = Promise.resolve();
         let text = "";
         
         for (let jsonData of formData) {
            console.log(jsonData);
            promise = promise.then( () => this._patchLocalizations(jsonData)).then(resp => resp.json()).then((data) => {
               text += `${data.message} <br/><br/>`
            })
         }

         return promise.then(() => {
            this._clearSelection();
            this._page.loading.hideSpinner();
            this._page.hideDimmer();
            this.boxHelper._modalSuccessConfirm({
               mainText: text,
               buttonContinue,
               buttonExit
               });
         }).catch(err => {
            this._page.loading.hideSpinner();
            this._page.hideDimmer();
            return this.boxHelper._modalError("Error with update: "+err);
         });
         
      });

      buttonContinue.addEventListener("click", (e) => {
         this.boxHelper.modal._closeCallback();
         this._showSelectionPanel();
      });

      buttonExit.addEventListener("click", (e) => {
         this.boxHelper.modal._closeCallback();
         this._escapeEditMode();
      });

      let editPanelValues = this._editPanel.getValue();
      console.log(editPanelValues);
  
      console.log(this.boxHelper.modal);
      this.boxHelper._modalConfirm({
        "titleText" : `Confirm`,
        "mainText" : text,
        "buttonSave" : button,
        "scroll" : false    
      });
   }

   _patchLocalizations(formData) {
      return fetch(`/rest/Localizations/${this._page.projectId}`, {
         method: "PATCH",
         mode: "cors",
         credentials: "include",
         body: JSON.stringify(formData),
         headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
         }
       });
   }

   _updateShownAttributes({typeId, values}) {
      console.log(values)
      this._editPanel.setSelectionBoxValue({ typeId, values });
      this._comparisonPanel.newColumns({ typeId, values });
   }
   
}
customElements.define("entity-gallery-bulk-edit", GalleryBulkEdit);