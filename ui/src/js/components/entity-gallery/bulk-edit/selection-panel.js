import { TatorElement } from "../../tator-element.js";

export class MultiSelectionPanel extends TatorElement {
   constructor() {
      super();



      this._bulkEditBar = document.createElement("div");
      this._bulkEditBar.setAttribute("class", "py-2 d-flex flex-wrap")
      this._shadow.appendChild(this._bulkEditBar);

      this._shortCuts = document.createElement("div");
      this._shortCuts.setAttribute("class", "py-2 col-6")
      this._shortCuts.innerHTML = `<span class="text-gray">Shorcuts: Use <kbd>Ctrl+A</kbd> to select all localizations on the page, and <kbd>Esc</kbd> to deselect all.</span>`;
      this._bulkEditBar.appendChild(this._shortCuts)

      this._minimizeBar = document.createElement("div");
      this._minimizeBar.setAttribute("class", "text-center d-flex flex-wrap  flex-align-center flex-justify-right col-6"); //flex-justify-between
      // this._minimizeBar.style.height = "25px";
      this._bulkEditBar.appendChild(this._minimizeBar);

      // let barLeftTop = document.createElement("div");
      // barLeftTop.setAttribute("class", "pb-2 bulk-edit-bar--left col-3")
      // this._bulkEditBar.appendChild(barLeftTop);

      // this._bulkEditMiddle = document.createElement("div");
      // this._bulkEditMiddle.setAttribute("class", "pb-2 bulk-edit-bar--middle col-6 position-relative");
      // this._bulkEditBar.appendChild(this._bulkEditMiddle);

      // this.barRightTop = document.createElement("div");
      // this.barRightTop.setAttribute("class", "bulk-edit-bar--right col-3")
      // this._bulkEditBar.appendChild(this.barRightTop);

      // this._h2 = document.createElement("h2");
      // this._h2.setAttribute("class", "py-2 px-2");
      // this._h2.textContent = "Selection mode: Select to compare, and/or bulk correct.";
      // barLeftTop.appendChild(this._h2);

      // this._quickSelectAllDiv = document.createElement("div");
      // this._quickSelectAllDiv.setAttribute("class", "py-2 px-2 bulk-edit--quick-select d-flex flex-row");
      // barLeftTop.appendChild(this._quickSelectAllDiv);



      this._selectAllPage = document.createElement("a");
      this._selectAllPage.setAttribute("class", "text-purple py-2 clickable float-left text-left");
      this._selectAllPage.innerHTML = "<span style='text-decoration:underline'>Select all on page</span>";
      this._minimizeBar.appendChild(this._selectAllPage);

      this._clearSelection = document.createElement("a");
      this._clearSelection.setAttribute("class", "text-gray py-2 px-6 clickable float-right text-right");
      this._clearSelection.innerHTML = "<span style='text-decoration:underline'>Clear all selected</span>";
      this._minimizeBar.appendChild(this._clearSelection);

            // this._h2 = document.createElement("h2");
      // this._h2.setAttribute("class", "py-2 px-2 f1 semi-bold");
      // this._h2.innerHTML = `<span class="text-bold">Selection Mode:</span> <kbd>Ctrl</kbd> + <kbd>A</kbd> to select all. <kbd>Esc</kbd> to exit.`;
      // this._messageBar_top.appendChild(this._h2);



      // EVENT LISTENERS
      // this._editButton.addEventListener("click", () => {
      //    this.dispatchEvent(new Event("bulk-edit-click"));
      // });

      // this._compareButton.addEventListener("click", () => {
      //    this.dispatchEvent(new Event("comparison-click"));
      // });
      this._clearSelection.addEventListener("click", () => {
         this.dispatchEvent(new Event("clear-selection"));
      });
      this._selectAllPage.addEventListener("click", () => {
         this.dispatchEvent(new Event("select-all"));
      });
   }

   setCount(count) {
      if (count === 0 || count === "0") {
         this._editButton.disabled = true;
         this._editButton.classList.add("disabled");
      } else {
         this._editButton.disabled = false;
         this._editButton.classList.remove("disabled");
      }
      this._selectionCount.textContent = count;
   }

   show(val) {
      this.hidden = !val;
   }

   isHidden() {
      return this.hidden;
   }

}
customElements.define("entity-gallery-multi-selection-panel", MultiSelectionPanel);