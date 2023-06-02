import { TatorElement } from "../tator-element.js";

export class EntityPanelNavigation extends TatorElement {
  constructor() {
    super();

    this.controls = document.createElement("div");
    this.controls.setAttribute(
      "class",
      "entity-panel-navigation flex-justify-right mx-3 px-1 py-1 d-flex col-11 flex-items-center"
    );
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

    // const div = document.createElement("div");
    // div.setAttribute("class", "more d-flex flex-column f2 py-3 px-2");
    // styleDiv.appendChild(div);

    // this._slider = document.createElement("input");
    // this._slider.setAttribute("class", "range flex-grow");
    // this._slider.setAttribute("type", "range");
    // this._slider.setAttribute("step", "1");
    // this._slider.setAttribute("min", "0");
    // this._slider.setAttribute("value", "0");
    // div.appendChild(this._slider);

    this.next = document.createElement("entity-next-button");
    this.controls.appendChild(this.next);

    this.prev.addEventListener("click", () => {
      this._emitSelection("prev");
    });

    this.next.addEventListener("click", () => {
      this._emitSelection("next");
    });

    // this._slider.addEventListener("input", () => {
    //    let newIndex = Number(this._slider.value);
    //    this._emitSelection("slider", newIndex);
    // });

    this._goToFrameButton = document.createElement("entity-frame-link-button");
    this._goToFrameButton.button.classList.add("ml-3");
    this._goToFrameButton.button.classList.add("tooltip-left");
    this._goToFrameButton.button.setAttribute("tooltip", "View In Annotator");
    this._goToFrameButton.button.setAttribute("target", "_blank");
    this.controls.appendChild(this._goToFrameButton);

    this._removeEntityButton = document.createElement("delete-button");
    this._removeEntityButton._button.classList.add("ml-3");
    this._removeEntityButton._button.classList.add("tooltip-left");
    this._removeEntityButton._button.setAttribute("tooltip", "Delete Entity");
    this._removeEntityButton._button.setAttribute("target", "_blank");
    // Uncomment to finish issue #737
    // this.controls.appendChild(this._removeEntityButton);

    this._modalNotify = document.createElement("modal-notify");
    this._shadow.appendChild(this._modalNotify);

    this._removeEntityButton.addEventListener(
      "click",
      this._removeCallback.bind(this)
    );

    this._data = null;
    this._selectedCardEl = null;
  }

  init() {
    this.hidden = false;
  }

  _emitSelection(action, value = null) {
    // console.log("updated via emit selection "+Object.keys(this._cardIndexes).length,this._cardIndexes);
    let newCardIndex = null;
    let total = Object.keys(this._cardIndexes).length;

    // what is the new index
    if (action == "next") {
      newCardIndex = this._cardIndex + 1;
    } else if (action == "prev") {
      newCardIndex = this._cardIndex - 1;
    } else if (action == "slider" && value !== null) {
      newCardIndex = value;
    }

    if (newCardIndex < 0) {
      newCardIndex = Number(total) - 1;
      // console.log(`But oops we're out of range! [START -1]  setting to end of the line, newCardIndex::${newCardIndex}`);
    } else if (newCardIndex == total) {
      newCardIndex = 0;
      // console.log(`But oops we're out of range! [END +1] setting to begginning of the line::${newCardIndex}`);
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

  getInit() {
    return this.controls.hidden;
  }

  handle({ cardElements, cardIndexes, cardObj }) {
    // Setup next/prev/slider nav
    this._data = cardElements;
    this._cardIndexes = cardIndexes;
    this._cardIndex = cardIndexes[cardObj.id];
    this._selectedCardEl = this._data[this._cardIndex];
    this._updateCurrentValues();
  }

  _updateCurrentValues() {
    // console.log("_updateCurrentValues this._cardIndexes.size" + Object.keys(this._cardIndexes).length);
    // console.log("Navigation Init at card index: " + this._cardIndex);
    let start = Number(this._cardIndex) + 1;
    this._current.textContent = start;

    // #TODO to add working slider
    // let total = Object.keys(this._cardIndexes).length;
    // this._slider.setAttribute("value", start);
    // this._slider.setAttribute("max", total);

    // Update go to frame destination
    let mediaLink = this._selectedCardEl.card.cardObj.mediaLink;
    this._goToFrameButton.button.setAttribute("href", mediaLink);
  }

  showSelectedNav() {}

  _removeCallback() {
    // Make a popup and confirm deletion.....
    // console.log("DELETE from panel....");
    // console.log(this._selectedCardEl.card);

    if (this._selectedCardEl.card) {
      return this._selectedCardEl.card.dispatchEvent(
        new Event("delete-entity")
      );
    }
  }
}

customElements.define("entity-panel-navigation", EntityPanelNavigation);
