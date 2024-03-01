import "./_extend/analytics-gallery.js";
import { AnalyticsGallery } from "./_extend/analytics-gallery.js";

export class AnnotationsGallery extends AnalyticsGallery {
  constructor() {
    super();

    this._name.textContent = "Localizations";
  }
}

customElements.define("localizations-gallery", AnnotationsGallery);
