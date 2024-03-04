import { store } from "./store.js";
import { AnalyticsPage } from "./_extend/analytics-page.js";

/**
 * Page that displays a grid view of selected annotations
 */
export class AnalyticsLocalizationsCorrections extends AnalyticsPage {
  constructor() {
    super();

    this.store = store;
    this._bulkInit = true;
    this._bulkEdit._editMode = true;

    this._breadcrumbs.setAttribute("analytics-name", "Corrections");
    this._settings._localizationsView.hidden = false;
    this._settings._bulkCorrect.classList.add("hidden");

    this._filterResults = document.createElement("corrections-gallery");
    this.main.appendChild(this._filterResults);

    // Localizations Filter
    /* Filter interface part of gallery */
    this._filterView = document.createElement("filter-interface");
    this._filterResults._filterDiv.appendChild(this._filterView);

    // Custom gallery more menu added into filter interface tools ares
    this._filterView._moreNavDiv.appendChild(this._filterResults._moreMenu);
  }
}

customElements.define(
  "analytics-localizations-corrections",
  AnalyticsLocalizationsCorrections
);
