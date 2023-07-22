import { TatorElement, svgNamespace } from "../../tator-element.js";

export class MultiSelectionPanel extends TatorElement {
  constructor() {
    super();

    // Bar under the filter for shortcuts, and links
    this._bulkEditBar = document.createElement("div");
    this._bulkEditBar.setAttribute("class", "py-2 d-flex flex-wrap");
    this._shadow.appendChild(this._bulkEditBar);

    this._shortCuts = document.createElement("div");
    this._shortCuts.setAttribute("class", "py-2 col-6");
    this._shortCuts.innerHTML = `<span class="text-gray">Shortcuts: Use <kbd>Ctrl+A</kbd> to select all on the page, and <kbd>Esc</kbd> to deselect all.</span>`;
    this._bulkEditBar.appendChild(this._shortCuts);

    this._minimizeBar = document.createElement("div");
    this._minimizeBar.setAttribute(
      "class",
      "text-center d-flex flex-wrap  flex-align-center flex-justify-right col-6"
    ); //flex-justify-between
    // this._minimizeBar.style.height = "25px";
    this._bulkEditBar.appendChild(this._minimizeBar);

    this._galleryLink = document.createElement("a");
    this._galleryLink.setAttribute("class", "f1 text-purple pb-3");
    this._galleryLink.setAttribute("href", "#");
    this._galleryLink.textContent = "View in Localizations Gallery";
    this._galleryLink.hidden = true;
    this._shadow.appendChild(this._galleryLink);

    this._galleryLink.addEventListener(
      "click",
      this._backToLocGallery.bind(this)
    );

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
    this._selectAllPage.setAttribute(
      "class",
      "text-purple py-2 clickable float-left text-left"
    );
    this._selectAllPage.innerHTML =
      "<span style='text-decoration:underline'>Select Page</span>";
    this._minimizeBar.appendChild(this._selectAllPage);

    this._clearSelection = document.createElement("a");
    this._clearSelection.setAttribute(
      "class",
      "text-gray py-2 px-6 clickable float-right text-right"
    );
    this._clearSelection.innerHTML =
      "<span style='text-decoration:underline'>Deselect All</span>";
    this._minimizeBar.appendChild(this._clearSelection);

    // Escape Bulk Edit
    this.xClose = document.createElement("a");
    this.xClose.setAttribute(
      "class",
      "hidden text-white btn-clear px-2 py-2 clickable text-underline"
    );
    this._minimizeBar.appendChild(this.xClose);

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
    path.setAttribute(
      "d",
      "M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z"
    );
    svg.appendChild(path);

    const exitText = document.createTextNode("Exit bulk edit");
    this.xClose.appendChild(exitText);
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

  _backToLocGallery(e) {
    e.preventDefault();
    const link = String(window.location.href).replace(
      "corrections",
      "localizations"
    );
    window.location = link;
  }
}
customElements.define(
  "entity-gallery-multi-selection-panel",
  MultiSelectionPanel
);
