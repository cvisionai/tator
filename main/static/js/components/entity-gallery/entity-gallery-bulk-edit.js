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
      // this._messageBar_top = document.createElement("div");
      // this._messageBar_top.setAttribute("class", "px-6 py-2 bulk-edit-bar_top d-flex flex-row hidden")
      // this._shadow.appendChild(this._messageBar_top);



      // Escape Bulk Edit
      this.xClose = document.createElement("button");
      this.xClose.setAttribute("class", "text-white bulk-edit--cancel btn-clear px-2 py-2 h2 text-gray hidden");
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

      

      

		

      // Mesage bar
      this._messageBar = document.createElement("div");
      this._messageBar.setAttribute("class", "px-6 py-2 bulk-edit-bar d-flex flex-wrap hidden")
      this._shadow.appendChild(this._messageBar);

      let barLeftTop = document.createElement("div");
      barLeftTop.setAttribute("class", "py-2 bulk-edit-bar--left col-6")
      this._messageBar.appendChild(barLeftTop);

      let barRightTop = document.createElement("div");
      barRightTop.setAttribute("class", "py-2 bulk-edit-bar--right col-6 d-flex flex-row flex-items-center flex-justify-right")
      this._messageBar.appendChild(barRightTop);

      let barLeft = document.createElement("div");
      barLeft.setAttribute("class", "py-2 bulk-edit-bar--left col-6")
      this._messageBar.appendChild(barLeft);

      let barRight = document.createElement("div");
      barRight.setAttribute("class", "py-2 bulk-edit-bar--right col-6")
      this._messageBar.appendChild(barRight);


      this._h2 = document.createElement("h2");
      this._h2.setAttribute("class", "py-2 px-2");
      this._h2.textContent = "Selection mode: Select to compare, and/or bulk correct.";
      barLeftTop.appendChild(this._h2);

      this._quickSelectAllDiv = document.createElement("div");
      this._quickSelectAllDiv.setAttribute("class", "py-2 px-2 bulk-edit--quick-select");
      barLeftTop.appendChild(this._quickSelectAllDiv);

      // this._selectAllResults = document.createElement("a");
      // this._selectAllResults.setAttribute("class", "text-purple clickable");
      // this._selectAllResults.textContent = "Select all filter results";
      // this._quickSelectAllDiv.appendChild(this._selectAllResults);

      this._selectAllPage = document.createElement("a");
      this._selectAllPage.setAttribute("class", "text-purple clickable");
      this._selectAllPage.textContent = "Select all on page";
      this._quickSelectAllDiv.appendChild(this._selectAllPage);

      this._clearSelection = document.createElement("a");
      this._clearSelection.setAttribute("class", "text-gray py-2 px-2 clickable");
      this._clearSelection.textContent = "X Clear all selected";
      barLeftTop.appendChild(this._clearSelection);

      // Right = side
      this._selectionSummary = document.createElement("div");
      this._selectionSummary.setAttribute("class", "py-2 px-2 bulk-edit--quick-select")
      barRightTop.appendChild(this._selectionSummary);

      this._selectionCount = document.createElement("span");
      this._selectionCount.textContent = "0";
      this._selectionSummary.appendChild(this._selectionCount);

      this._selectionCountText = document.createElement("span");
      this._selectionCountText.textContent = " localizations selected.";
      this._selectionSummary.appendChild(this._selectionCountText);

      this._compareButton = document.createElement("button");
      this._compareButton.setAttribute("class", "btn btn-clear btn-outline py-2 px-2 col-12")
      this._compareButton.textContent = "Compare";
      barLeft.appendChild(this._compareButton);

      this._editButton = document.createElement("button");
      this._editButton.setAttribute("class", "btn btn-clear py-2 px-2  col-12")
      this._editButton.textContent = "Edit";
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

      // Listen to escape or Close
      document.addEventListener("keydown", this._keyDownHandler.bind(this));
      this.xClose.addEventListener("click", this._escapeEditMode.bind(this));

      //
      this._currentMultiSelection = new Set();
      this._localizationTypes = new Set();
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

      console.log(e.key);
      console.log(e.code);
      if (e.key == "a") {
         if (e.ctrlKey) {
            console.log("CTRL+A");
            this.selectAllOnPage();
         }
      }
   }

   shiftSelect(element) {
      if (!this._editMode) this.startEditMode();

      // clicked element
      // first shift click is start, and if click isn't broken
      if (this._shiftSelectedFirst == null) {
         console.log('Saving shift click first el')
         this._shiftSelectedFirst = element;
         this._currentMultiSelection.add(element.cardObj.id);
      } else {
         console.log('Saving shift click secon el')
         this._shiftSelectedSecond = element;
         this._currentMultiSelection.add(element.cardObj.id);

         // firstIndex - secondIndex
         let firstIndex = this._elementIndexes[this._shiftSelectedFirst.cardObj.id];
         let secondIndex = this._elementIndexes[element.cardObj.id];
         let inBetween = secondIndex - firstIndex;
         console.log(inBetween);

         if (Math.sign(inBetween) == -1) {
            let startIndex = secondIndex  - 1;
            for (let i = startIndex; startIndex < firstIndex; i--){
               this._currentMultiSelection.add(element.cardObj.id);
               //element.click()
            }

         } else if (Math.sign(inBetween) == 1) {
            let startIndex = firstIndex + 1;
            for (let i = startIndex; startIndex < secondIndex; i++){
               this._currentMultiSelection.add(element.cardObj.id);
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
      this._currentMultiSelection.add(element.cardObj.id);
   }

   //
   getAttributesForLocType(id) {
      
   }

   // shiftDeSelect(element) {

   // }

   // ctrlDeSelect(element) {

   // }

   _compareFirst(e) {
      console.log(`Compare the attributes first? ${e.target.value}`);
   }

   selectAllOnPage() {
      for (let el of this.elementList) {
         let id = el.cardObj.id;
         if (this._currentMultiSelection.has(id)) {
            el._li.classList.add("is-selected");
            el._multiSelectionToggle = true;
            
            this._currentMultiSelection.add(id);           
         }

      }
   }


   cardClick(cardObj) {
      if (!this._editMode) this.startEditMode();
      this._currentMultiSelection.add(cardObj.id);   
   }

   _openEditMode(e) {
      console.log(e);

      if(!this._editMode){
         this.startEditMode();
      }

      let clickType = typeof e.detail.clickDetail == "undefined" ? e.type : e.detail.clickDetail.type;
      console.log(`click type: ${clickType}`)

      // if
      if (clickType == "shift-select") {
         //this.shiftSelect(e.detail.card);
      }

      if (clickType == "ctrl-select") {
         this.ctrlSelect(e.detail.card);
      }

      if (clickType == "card-click") {
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

   startEditMode() {
      console.log("Edit mode started");
      this._editMode = true;
      
      // show edit drawer and tools
      this.xClose.classList.remove("hidden");
      this._messageBar.classList.remove("hidden");
      // this._messageBar_top.classList.remove("hidden");

      // hide page elements
      this._page._header.classList.add("hidden");
      this._page.aside.classList.add("slide-close");
      this._page.aside.classList.add("hidden");
      this._page.main.classList.remove("col-9"); 
      this._page.main.classList.add("col-12");
      this._page.main.style.marginTop = "-100px";
      this._page._filterView.classList.add("hidden");
      // this._page._filterResults._paginator.editMode(true);
      // this._page._filterResults._paginator_top.editMode(true);
   }

   _escapeEditMode(e) {
      console.log("Edit mode closed");
      console.log(e);
      this._editMode = false;

      this.dispatchEvent(new Event("end-edit-mode"));

      // hide edit drawer and tools
      this.xClose.classList.add("hidden");
      this._messageBar.classList.add("hidden");
      // this._messageBar_top.classList.add("hidden");

      // revert page elements
      this._page._header.classList.remove("hidden");
      this._page.aside.classList.remove("hidden");
      this._page._filterView.classList.remove("hidden");
      this._page.main.style.marginTop = "0";
      // this._page._filterResults._paginator.editMode(false);
      // this._page._filterResults._paginator_top.editMode(false);
   }
}
customElements.define("entity-gallery-bulk-edit", GalleryBulkEdit);