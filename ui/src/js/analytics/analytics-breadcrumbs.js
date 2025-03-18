import { TatorElement } from "../components/tator-element.js";
import { TatorPage } from "../components/tator-page.js";

export class AnalyticsBreadcrumbs extends TatorElement {
  constructor() {
    super();

    this.projectId = window.location.pathname.split("/")[1];

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "annotation__breadcrumbs d-flex flex-items-center px-2 f3 text-gray",
    );
    this._shadow.appendChild(div);

    this._projectText = document.createElement("a");
    this._projectText.setAttribute("class", "text-gray");
    div.appendChild(this._projectText);

    //const chevron1 = document.createElement("chevron-right");
    //chevron1.setAttribute("class", "px-2");
    //div.appendChild(chevron1);

    //this.analyticsText = document.createElement("a");
    //this.analyticsText.setAttribute("class", "text-gray");
    //this.analyticsText.setAttribute("href", `/${this.projectId}/analytics/`);
    //this.analyticsText.textContent = "Analytics";
    //div.appendChild(this.analyticsText);

    this.chevron2 = document.createElement("chevron-right");
    this.chevron2.setAttribute("class", "px-2");
    div.appendChild(this.chevron2);

    this._analyticsText = document.createElement("a");
    this._analyticsText.setAttribute("class", "text-gray");
    div.appendChild(this._analyticsText);

    this.chevron3 = document.createElement("chevron-right");
    this.chevron3.setAttribute("class", "px-2");
    div.appendChild(this.chevron3);

    this._subAnalyticsText = document.createElement("a");
    this._subAnalyticsText.setAttribute("class", "text-gray");
    div.appendChild(this._subAnalyticsText);

    this.chevron3.hidden = true;
    this._subAnalyticsText.hidden = true;
  }

  static get observedAttributes() {
    return [
      "project-name",
      "analytics-name",
      "analytics-name-link",
      "analytics-sub-name",
    ].concat(TatorPage.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-name":
        this._projectText.textContent = newValue;
        this._projectText.setAttribute("href", this._detailUrl());
        break;
      case "analytics-name":
        this._analyticsText.textContent = newValue;
        break;
      case "analytics-name-link":
        this._analyticsText.setAttribute("href", newValue);
        break;
      case "analytics-sub-name":
        this._subAnalyticsText.textContent = newValue;
        this.chevron3.hidden = false;
        this._subAnalyticsText.hidden = false;
        break;
    }
  }

  _detailUrl() {
    return `${window.location.origin}/${this.projectId}/project-detail`;
  }
}

customElements.define("analytics-breadcrumbs", AnalyticsBreadcrumbs);
