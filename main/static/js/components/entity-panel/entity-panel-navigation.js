class EntityPanelNavigation extends TatorElement {
   constructor() {
      super();

      this.controls = document.createElement("div");
      this.controls.setAttribute("class", "entity-panel-navigation col-12 d-flex flex-items-center");
      this.controls.hidden = true; // hide until init
      this._shadow.appendChild(this.controls);

      this.prev = document.createElement("entity-prev-button");
      this.controls.appendChild(this.prev);

      // this.nextButton = document.createElement("entity-next-button");
      // div.appendChild(this.nextButton);

      const details = document.createElement("details");
      details.setAttribute("class", "position-relative");
      this.controls.appendChild(details);

      const summary = document.createElement("summary");
      summary.setAttribute("class", "d-flex flex-items-center px-1");
      summary.style.cursor = "pointer";
      details.appendChild(summary);

      this._current = document.createElement("span");
      this._current.setAttribute("class", "px-1 text-gray");
      this._current.textContent = "1";
      summary.appendChild(this._current);

      const styleDiv = document.createElement("div");
      styleDiv.setAttribute("class", "files__main files-wrap");
      details.appendChild(styleDiv);

      const div = document.createElement("div");
      div.setAttribute("class", "more d-flex flex-column f2 py-3 px-2");
      styleDiv.appendChild(div);

      this._slider = document.createElement("input");
      this._slider.setAttribute("class", "range flex-grow");
      this._slider.setAttribute("type", "range");
      this._slider.setAttribute("step", "1");
      this._slider.setAttribute("min", "0");
      this._slider.setAttribute("value", "0");
      div.appendChild(this._slider);

      this.next = document.createElement("entity-next-button");
      this.controls.appendChild(this.next);

      this.prev.addEventListener("click", () => {
         this._emitSelection("prev");
      });

      this.next.addEventListener("click", () => {
         this._emitSelection("next");
      });

      this._slider.addEventListener("input", () => {
         let newIndex = Number(this._slider.value);
         this._emitSelection("slider", newIndex);
      });

      this._data = null;
      this._selectedCardEl = null;
   }

   init() {
      this.hidden = false; 
   }

   _emitSelection(action, value = null) {
      let newCardIndex = null;
      let total = this._data.length;

      // what is the new index
      if (action == "next") {
         newCardIndex = this._cardIndex + 1;
      } else if (action == "prev") {
         newCardIndex = this._cardIndex - 1;
      } else if (action == "slider" && value !== null) {
         newCardIndex = value;
      }

      console.log(`newCardIndex ${newCardIndex} and current index is this._cardIndex ${this._cardIndex} (displayed should be +1)`);

      if (newCardIndex < 0) {
         console.log(`But oops we're out of range! [START -1]  setting to end of the line`);
         newCardIndex = Number(total) - 1;
      } else if (newCardIndex == total) {
         console.log(`But oops we're out of range! [END +1] setting to begginning of the line`);
         newCardIndex = 0;
      }

      // Select the el, and update the nav
      if (this._selectedCardEl !== null && newCardIndex !== null) {
         this._cardIndex = newCardIndex;

         let newCard = this._data[this._cardIndex];
         this._selectedCardEl = newCard;

         // faking a click also unselects prev card
         newCard.card.click();

         this._updateCurrentValues();
      }

   }

   getInit(){
      return this.controls.hidden;
   }

   handle({ cardElements, cardIndexes, cardObj }) {
      this._data = cardElements;

      this._cardIndex = cardIndexes[cardObj.id];
      this._selectedCardEl = this._data[this._cardIndex];

      this._updateCurrentValues();
   }

   _updateCurrentValues() {
      let cardIndex = this._cardIndex;
      let start = Number(cardIndex) + 1;
      let total = this._data.length;

      console.log("Navigation Init at card index: " + cardIndex);

      this._current.textContent = start;
      this._slider.setAttribute("value", start);
      this._slider.setAttribute("max", total);
   }

   showSelectedNav(){

   }
}



customElements.define("entity-panel-navigation", EntityPanelNavigation);