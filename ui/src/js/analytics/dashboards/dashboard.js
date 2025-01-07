import { TatorPage } from "../../components/tator-page.js";
import { Utilities } from "../../util/utilities.js";
import TatorLoading from "../../../images/tator_loading.gif";
import { dashboardStore } from "./dashboard-store.js";

export class RegisteredDashboard extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", TatorLoading);
    this._shadow.appendChild(this._loading);

    // Init params
    this._username = "";

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
    // Main section of the page
    //
    const main = document.createElement("main");
    main.setAttribute("class", "dashboard_main d-flex flex-column");
    this._shadow.appendChild(main);

    this._dashboardView = document.createElement("iframe");
    this._dashboardView.setAttribute("class", "d-flex flex-grow");
    main.appendChild(this._dashboardView);

    // Create store subscriptions
    dashboardStore.subscribe((state) => state.user, this._setUser.bind(this));
    dashboardStore.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    dashboardStore.subscribe(
      (state) => state.project,
      this._updateProject.bind(this)
    );
    dashboardStore.subscribe((state) => state.dashboard, this._init.bind(this));

    // Listen for URL param events
    console.log(window.history.state);
    window.document.addEventListener("bookmark-update", handleEvent, false);
    function handleEvent(e) {
      let params = ""; // e.detail { paramsList: [ { name: "foo", value: "bar"} ] }
      for (let pair of e.detail.paramsList) {
        params += `${pair.name}=${pair.value}&`;
      }

      window.history.pushState(
        e.detail.state,
        "",
        `${window.location.origin}${window.location.pathname}?${params}`
      );
    }

    window.addEventListener("hashchange", this.hashHandler.bind(this), false);
  }

  connectedCallback() {
    dashboardStore.getState().init();
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

  _setUser(user) {
    TatorPage.prototype._setUser.call(this, user);
    this._username = user.username;
  }

  _updateProject(project) {
    this._breadcrumbs.setAttribute("project-name", project.name);
    this._breadcrumbs.setAttribute(
      "analytics-name-link",
      window.location.origin + `/${project.id}/dashboards`
    );
    
    // Call parent _updateProject
    super._updateProject(project);
  }

  _init(dashboard) {
    document.title = `Tator | ${dashboard.name}`;
    this._dashboardId = dashboard.id;
    this._dashboard = dashboard;
    Utilities.setIframeSrc(this._dashboardView, dashboard);
    this._breadcrumbs.setAttribute("analytics-sub-name", dashboard.name);
    this._loading.style.display = "none";
  }

  hashHandler(e) {
    console.log("The hash has changed!");
    console.log(window.history.state);
    Utilities.setIframeSrc(this._dashboardView, dashboard);
  }
}

customElements.define("registered-dashboard", RegisteredDashboard);
