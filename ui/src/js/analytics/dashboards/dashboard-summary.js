import { TatorElement } from "../../components/tator-element.js";

export class DashboardSummary extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "projects d-flex flex-items-center rounded-2");
    this._shadow.appendChild(div);

    this._link = document.createElement("a");
    this._link.setAttribute(
      "class",
      "projects__link d-flex flex-items-center text-white px-2"
    );
    div.appendChild(this._link);

    //this._img = document.createElement("img");
    //this._img.setAttribute("class", "projects__image px-2 rounded-1");
    //this._link.appendChild(this._img);

    this._iconWrapper = document.createElement("div");
    this._iconWrapper.setAttribute(
      "class",
      "d-flex dashboard_summary-icon rounded-2"
    );
    this._link.appendChild(this._iconWrapper);

    this._icon = document.createElement("div");
    this._icon.style.margin = "auto";
    this._icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';
    this._iconWrapper.appendChild(this._icon);

    const text = document.createElement("div");
    text.setAttribute("class", "projects__text px-3 py-2");
    this._link.appendChild(text);

    const h2 = document.createElement("h2");
    h2.setAttribute("class", "text-semibold py-2");
    text.appendChild(h2);

    this._text = document.createTextNode("");
    h2.appendChild(this._text);

    this._description = document.createElement("span");
    this._description.setAttribute("class", "text-gray f2");
    text.appendChild(this._description);
  }

  set info(dashboardObj) {
    this._text.nodeValue = dashboardObj.name;

    const url =
      window.location.origin +
      "/" +
      dashboardObj.project +
      "/dashboards/" +
      dashboardObj.id;
    this._link.setAttribute("href", url);
    this._description.textContent = dashboardObj.description;
  }
}

customElements.define("dashboard-summary", DashboardSummary);
