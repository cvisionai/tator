import { TatorPage } from "../../components/tator-page.js";
import { getCookie } from "../../util/get-cookie.js";

export class RegisteredDashboard extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", "/static/images/tator_loading.gif");
    this._shadow.appendChild(this._loading);

    // Init params
    this._username = "";
    
    //
    // Header
    //
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-6 f3");
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
    this._dashboardView.setAttribute("class", "d-flex flex-grow")
    main.appendChild(this._dashboardView);

    // Listen for URL param events
    console.log(window.history.state);
    window.document.addEventListener('bookmark-update', handleEvent, false)
    function handleEvent(e) {
      let params = ""; // e.detail { paramsList: [ { name: "foo", value: "bar"} ] }
      for (let pair of e.detail.paramsList) {
        params += `${pair.name}=${pair.value}&`
      }

      window.history.pushState(e.detail.state, '', `${window.location.origin}${window.location.pathname}?${params}`);
    }



    window.addEventListener('hashchange', this.hashHandler.bind(this), false);
  }

  static get observedAttributes() {
    return["project-name", "project-id", "dashboard-id", "username"].concat(TatorPage.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-name":
        this._breadcrumbs.setAttribute("project-name", newValue);
        break;
      case "project-id":
        this._breadcrumbs.setAttribute("analytics-name-link", window.location.origin + `/${newValue}/dashboards`);
        break;
      case "username":
        this._username = newValue;
        break;
      case "dashboard-id":
        this._init(newValue);
        break;
    }
  }

  _init(dashboardId) {
    this._dashboardId = dashboardId;
    const dashboardPromise = fetch("/rest/Applet/" + dashboardId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    dashboardPromise.then((response) => {
      const dashboardData = response.json();
      dashboardData.then((dashboard) => {
        this._dashboard = dashboard;
        this._dashbordSource = `${dashboard.html_file}${window.location.search !== "" ? window.location.search+"&" : "?"}username=${this._username}`;
        this._dashboardView.src = this._dashbordSource;
        this._breadcrumbs.setAttribute("analytics-sub-name", dashboard.name);
        this._loading.style.display = "none";
      });
    });
  }

  hashHandler(e) {
      console.log('The hash has changed!');
    console.log(window.history.state);
    this._dashbordSource = `${dashboard.html_file}${window.location.search !== "" ? window.location.search+"&" : "?"}username=${this._username}`;
    this._dashboardView.src = this._dashbordSource;
   }
}

customElements.define("registered-dashboard", RegisteredDashboard);
