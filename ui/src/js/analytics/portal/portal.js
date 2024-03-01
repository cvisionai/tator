import { TatorPage } from "../../components/tator-page.js";
import { SvgDefinition } from "../../components/svg-definitions/all-svg.js";
import { store } from "./store.js";

export class AnalyticsPortal extends TatorPage {
  constructor() {
    super();

    this.projectId = window.location.pathname.split("/")[1];

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
    this._breadcrumbs.setAttribute("analytics-name", "Portal");
    div.appendChild(this._breadcrumbs);


    this.main = document.createElement("main");
    this.main.setAttribute("class", "layout-max d-flex flex-justify-center");
    this._shadow.appendChild(this.main);

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe((state) => state.project, this._updateProject.bind(this));

    // Annotations
    const localizationsBox = this._getDashboardBox({
      name: "Localizations",
      href: `/${this.projectId}/analytics/localizations`,
      iconName: "grid-icon",
    });
    this.main.appendChild(localizationsBox);

    // Corrections
    const correctionsBox = this._getDashboardBox({
      name: "Corrections",
      href: `/${this.projectId}/analytics/corrections`,
      iconName: "pencil-icon",
    });
    this.main.appendChild(correctionsBox);

    // Dashboards
    const dashboardsBox = this._getDashboardBox({
      name: "Dashboards",
      href: `/${this.projectId}/dashboards`,
      iconName: "monitor",
    });
    this.main.appendChild(dashboardsBox);

    // Files
    const filesBox = this._getDashboardBox({
      name: "Files",
      href: `/${this.projectId}/analytics/files`,
      iconName: "file",
    });
    this.main.appendChild(filesBox);
  }

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    // Initialize store data
    store.getState().init();
  }

  _updateProject(project) {
    this._breadcrumbs.setAttribute("project-name", project.name);
  }

  _getDashboardBox({ name, href, iconName, disabled } = {}) {
    const height = "2em";
    const width = "2em";

    const iconDiv = document.createElement("div");
    iconDiv.setAttribute("class", "pb-3 d-block color-white");

    if (iconName == "track-icon") {
      const dashboardIcon = document.createElement("track-icon");
      dashboardIcon.svg.setAttribute("height", height);
      dashboardIcon.svg.setAttribute("width", width);
      dashboardIcon.svg.setAttribute("stroke", "white");
      iconDiv.appendChild(dashboardIcon);
    } else if (iconName == "monitor") {
      const dashboardIcon = document.createElement("div");
      dashboardIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
      iconDiv.appendChild(dashboardIcon);
    } else if (iconName == "file") {
      const dashboardIcon = document.createElement("div");
      dashboardIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
      iconDiv.appendChild(dashboardIcon);
    } else {
      const dashboardIcon = new SvgDefinition({ iconName, height, width });
      iconDiv.appendChild(dashboardIcon);
    }

    const dashboardText = document.createElement("p");
    dashboardText.setAttribute(
      "class",
      "h3 analysis__dashboard-text text-normal text-gray"
    );
    dashboardText.textContent = name;

    return this._newRoundedBox(iconDiv, dashboardText, href, disabled);
  }

  _newRoundedBox(iconDiv, dashboardText, href, disabled) {
    var roundedBox = document.createElement("a");
    roundedBox.setAttribute(
      "class",
      "analysis__dashboard-box d-flex flex-items-center rounded-2"
    );
    roundedBox.setAttribute("href", href);

    const content = document.createElement("div");
    content.setAttribute("class", "flex-items-center text-center");
    content.style.width = "100%";
    roundedBox.appendChild(content);

    content.appendChild(iconDiv);
    content.appendChild(dashboardText);

    return roundedBox;
  }
}

customElements.define("analytics-portal", AnalyticsPortal);
