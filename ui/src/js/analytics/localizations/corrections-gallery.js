import "./_extend/analytics-gallery.js";
import { AnalyticsGallery } from "./_extend/analytics-gallery.js";


export class AnnotationsCorrectionsGallery extends AnalyticsGallery {
  constructor() {
    super();

    this._name.textContent = "Corrections";
  }

}

customElements.define(
  "corrections-gallery",
  AnnotationsCorrectionsGallery
);
