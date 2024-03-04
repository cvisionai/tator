import { store } from "./store.js";
import { AnalyticsPage } from "./_extend/analytics-page.js";

/**
 * Page that displays a grid view of selected annotations
 */
export class AnalyticsLocalizations extends AnalyticsPage {
  constructor() {
    super();

    this.store = store;
    this._bulkInit = false;

    this._breadcrumbs.setAttribute("analytics-name", "Localization Gallery");

    this._settings._bulkCorrect.hidden = false;

    this._filterResults = document.createElement("localizations-gallery");
    this.main.appendChild(this._filterResults);

    // Localizations Filter
    /* Filter interface part of gallery */
    this._filterView = document.createElement("filter-interface");
    this._filterResults._filterDiv.appendChild(this._filterView);

    // Custom gallery more menu added into filter interface tools ares
    this._filterView._moreNavDiv.appendChild(this._filterResults._moreMenu);

    this._settings._bulkCorrect.addEventListener(
      "click",
      this._swapToCorrections.bind(this)
    );
  }

  _swapToCorrections(evt) {
    if (this._bulkEdit._editMode) {
      this._settings._bulkCorrect._button.classList.remove("background-purple");
      this._settings._bulkCorrect._button.setAttribute("tooltip", "Swap gallery to bulk corrections mode");
      this._bulkEdit._escapeEditMode(evt);
    } else {
      this._settings._bulkCorrect._button.classList.add("background-purple");
      this._settings._bulkCorrect._button.setAttribute("tooltip", "Swap back to localizations gallery");
      this._bulkEdit.startEditMode(evt);
    }
  }
}

customElements.define("analytics-localizations", AnalyticsLocalizations);
