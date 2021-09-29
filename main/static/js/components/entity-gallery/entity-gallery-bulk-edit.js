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

      // Escape Bulk Edit
      this.xClose = document.createElement("button");
      this.xClose.setAttribute("class", "text-white bulk-edit--cancel btn-clear d-flex px-0 h2 text-gray hidden");
      this._shadow.appendChild(this.xClose);
  
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

		
		this.xClose.addEventListener("click", this._escapeEditMode.bind(this));

      // Mesage bar
      this._messageBar = document.createElement("div");
      this._messageBar.setAttribute("class", "px-6 py-2 bulk-edit-bar d-flex flex-row hidden")
      this._shadow.appendChild(this._messageBar);

      let barLeft = document.createElement("div");
      barLeft.setAttribute("class", "py-6 bulk-edit-bar--left col-9")
      this._messageBar.appendChild(barLeft);

      let barRight = document.createElement("div");
      barRight.setAttribute("class", "py-6 bulk-edit-bar--right col-3")
      this._messageBar.appendChild(barRight);


      // Left side
      this._h2 = document.createElement("h2");
      this._h2.setAttribute("class", "py-2");
      this._h2.textContent = "Selection mode: Select to compare, and/or bulk correct.";
      barLeft.appendChild(this._h2);

      this._quickSelectAllDiv = document.createElement("div");
      this._quickSelectAllDiv.setAttribute("class", "py-2 bulk-edit--quick-select");
      barLeft.appendChild(this._quickSelectAllDiv);

      this._selectAllResults = document.createElement("a");
      this._selectAllResults.setAttribute("class", "text-purple clickable");
      this._selectAllResults.textContent = "Select all filter results";
      this._quickSelectAllDiv.appendChild(this._selectAllResults);

      this._selectAllPage = document.createElement("a");
      this._selectAllPage.setAttribute("class", "text-purple clickable");
      this._selectAllPage.textContent = "Select all on page";
      this._quickSelectAllDiv.appendChild(this._selectAllPage);

      this._clearSelection = document.createElement("a");
      this._clearSelection.setAttribute("class", "text-gray py-2 clickable");
      this._clearSelection.textContent = "X Clear all selected";
      barLeft.appendChild(this._clearSelection);

      // Right = side
      this._selectionSummary = document.createElement("div");
      barRight.appendChild(this._selectionSummary);

      this._selectionCount = document.createElement("span");
      this._selectionCount.textContent = "0";
      this._selectionSummary.appendChild(this._selectionCount);

      this._selectionCountText = document.createElement("span");
      this._selectionCountText.textContent = " localizations selected.";
      this._selectionSummary.appendChild(this._selectionCountText);

      this._compareFirstCheckbox = document.createElement("bool-input");
      this._compareFirstCheckbox.setAttribute("Name", "Compare? ")
      this._compareFirstCheckbox.setAttribute("on-text", "Yes");
      this._compareFirstCheckbox.setAttribute("off-text", "No");
      this._compareFirstCheckbox.setValue(false);
      this._compareFirstCheckbox.default = false;
      this._compareFirstCheckbox.addEventListener("change", this._compareFirst.bind(this));
      barRight.appendChild(this._compareFirstCheckbox);

      this._editButton = document.createElement("button");
      this._editButton.setAttribute("class", "btn btn-clear py-2")
      this._editButton.textContent = "Bulk Edit";
      barRight.appendChild(this._editButton);


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

      // Listen to escape
      document.addEventListener("keydown", this._keyDownHandler.bind(this));

      //
      this._currentMultiSelection = new Set();
   }

   set elementList(val) {
      this._element = val;
   }

   set elementIndexes(val) {
      this._elementIndexes = val;
   }

   init(page) {
      this._page = page;

      // todo- generalize this
      this._page._filterResults.addEventListener("multi-select", this._openEditMode.bind(this))
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
   }

   shiftSelect(element) {
      if (!this._editMode) this.startEditMode();

      // clicked element
      // first shift click is start, and if click isn't broken
      if (this._shiftSelectedFirst == null) {
         console.log('Saving shift click first el')
         this._shiftSelectedFirst = element;
         this._currentMultiSelection.add(element);
      } else {
         console.log('Saving shift click secon el')
         this._shiftSelectedSecond = element;
         this._currentMultiSelection.add(element);

         // firstIndex - secondIndex
         let firstIndex = this._elementIndexes[this._shiftSelectedFirst.cardObj.id];
         let secondIndex = this._elementIndexes[element.cardObj.id];
         let inBetween = secondIndex - firstIndex;
         console.log(inBetween);

         if (Math.sign(inBetween) == -1) {
            let startIndex = secondIndex  - 1;
            for (let i = startIndex; startIndex < firstIndex; i--){
               this._currentMultiSelection.add(element);
               //element.click()
            }

         } else if (Math.sign(inBetween) == 1) {
            let startIndex = firstIndex + 1;
            for (let i = startIndex; startIndex < secondIndex; i++){
               this._currentMultiSelection.add(element);
               //element.click()
            }
         }
         console.log("Current selection:::::::");
         console.log(this._currentMultiSelection);
      }

      // go through cards starting at first index - last and select them
   }

   ctrlSelect(element) {
      if (!this._editMode) this.startEditMode();
   }

   // shiftDeSelect(element) {

   // }

   // ctrlDeSelect(element) {

   // }

   _compareFirst(e) {
      console.log(`Compare the attributes first? ${e.target.value}`);
   }

   startEditMode() {
      console.log("Edit mode started");
      this._editMode = true;
      
      // show edit drawer and tools
      this.xClose.classList.remove("hidden");
      this._messageBar.classList.remove("hidden");

      // hide extraneous info
      this._page._header.classList.add("hidden");
      this._page.aside.classList.add("slide-close");
      this._page.aside.classList.add("hidden");
      this._page.main.classList.remove("col-9"); 
      this._page.main.classList.add("col-12");

      // this._filterView
   }


   cardClick(cardObj) {
      //find element   
   }

   _openEditMode(e) {
      if(!this._editMode){
         this.startEditMode();
      }

      let clickType = e.detail.clickDetail.type;
      console.log(`click type: ${clickType}`)

      // if
      if (clickType == "shift-select") {
         //this.shiftSelect(e.detail.card);
      }

      if (clickType == "ctrl-select") {
         this.ctrlSelect(e.detail.card);
      }

      if (clickType == "card-select") {
         this.cardClick(e.detail.cardObj);
      }

      console.log(this._currentMultiSelection);
   }

   _clearSelection() {
      this._currentMultiSelection.clear();
      // for (let el of this.elementList) {
      //    el._li.classList.remove("is-selected");
      // }
   }

   resetElements() {
      this.elementList = [];
      this.elementIndexes = [];
   }

   _escapeEditMode(e) {
      console.log("Edit mode closed");
      console.log(e);
      this._editMode = false;

      this.dispatchEvent(new Event("end-edit-mode"));

      //
      this.xClose.classList.add("hidden");
      this._messageBar.classList.add("hidden");

      //
      this._page._header.classList.remove("hidden");
      this._page.aside.classList.remove("hidden");
   }
}
customElements.define("entity-gallery-bulk-edit", GalleryBulkEdit);