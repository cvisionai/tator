import { TatorPage } from "../../components/tator-page.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import TatorLoading from "../../../images/tator_loading.gif";
import { store } from "./store.js";

export class DashboardPortal extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", TatorLoading);
    this._shadow.appendChild(this._loading);

    //
    // Header
    //
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute(
      "class",
      "annotation__header d-flex flex-items-center flex-justify-between px-6 f3"
    );
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);

    this._breadcrumbs = document.createElement("analytics-breadcrumbs");
    div.appendChild(this._breadcrumbs);
    this._breadcrumbs.setAttribute("analytics-name", "Dashboards");

    //
    // Main section
    //
    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const title = document.createElement("div");
    title.setAttribute(
      "class",
      "main__header d-flex flex-items-center flex-justify-between py-6 px-2"
    );
    main.appendChild(title);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    title.appendChild(h1);

    const h1Text = document.createTextNode("Dashboards");
    h1.appendChild(h1Text);

    this._dashboards = document.createElement("div");
    this._dashboards.setAttribute("class", "d-flex flex-column");
    main.appendChild(this._dashboards);

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe((state) => state.project, this._init.bind(this));
  }

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    store.getState().init();
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
  }

  _init(project) {
    this._updateProject(project);
    this._breadcrumbs.setAttribute("project-name", project.name);
    this._projectId = project.id;
    this._getDashboards();
  }

  _getDashboards() {
    fetchCredentials("/rest/Applets/" + this._projectId)
      .then((response) => response.json())
      .then((dashboards) => {
        for (let dashboard of dashboards) {
          if (
            dashboard.categories == null ||
            (!dashboard.categories.includes("annotator-menu") &&
              !dashboard.categories.includes("annotator-tools") &&
              !dashboard.categories.includes("annotator-canvas"))
          ) {
            this._insertDashboardSummary(dashboard);
          }
        }
        this._loading.style.display = "none";
      });
  }

  _insertDashboardSummary(dashboard) {
    const summary = document.createElement("dashboard-summary");
    summary.info = dashboard;
    this._dashboards.appendChild(summary);
  }
}

customElements.define("dashboard-portal", DashboardPortal);
