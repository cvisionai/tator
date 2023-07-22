import { TatorPage } from "../components/tator-page.js";
import { store } from "./store.js";

export class ProjectsDashboard extends TatorPage {
  constructor() {
    super();

    const template = document.getElementById("projects-dashboard").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._newProjectButton = this._shadow.getElementById("new-project-button");
    this._projects = this._shadow.getElementById("projects");
    this._newProject = this._shadow.getElementById("new-project");
    this._newProjectDialog = this._shadow.getElementById("new-project-dialog");
    this._deleteProject = this._shadow.getElementById("delete-project");
    this._modalNotify = this._shadow.getElementById("modal-notify");
    this._placeholders = this._shadow.getElementById("project-placeholders");

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe((state) => state.projects, this._updateProjects.bind(this));
    store.subscribe(
      (state) => state.organizations,
      this._updateOrganizations.bind(this)
    );

    this._removeCallback = (evt) => {
      this._deleteProject.setAttribute("project-id", evt.detail.projectId);
      this._deleteProject.setAttribute("project-name", evt.detail.projectName);
      this._deleteProject.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    this._deleteProject.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this._newProjectDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      if (this._newProjectDialog._confirm) {
        this._createProject();
      }
    });

    this._newProjectButton.addEventListener(
      "click",
      this._openNewProjectDialog.bind(this)
    );
    this._newProject.addEventListener(
      "click",
      this._openNewProjectDialog.bind(this)
    );

    this._modalNotify.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      // If closed with the close button, don't redirect.
      const doRedirect =
        evt.target.shadowRoot.activeElement.tagName != "MODAL-CLOSE";
      if (this._projectCreationRedirect && doRedirect) {
        window.location.replace(this._projectCreationRedirect);
      }
    });
  }

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    // Initialize store data
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

  _updateProjects(projects, prevProjects) {
    // Add any new projects.
    for (let project of projects) {
      if (prevProjects == null || !prevProjects.includes(project)) {
        this._insertProjectSummary(project);
      }
    }
    this._placeholders.remove();
    // Remove any projects no longer present.
    for (let project of prevProjects) {
      if (!projects.includes(project)) {
        const summary = this._shadow.getElementById(
          `project-summary-${project.id}`
        );
        this._projects.removeChild(summary);
        this.removeAttribute("has-open-modal");
        this._deleteProject.removeAttribute("is-open");
      }
    }
    this._newProjectDialog.projects = projects;
  }

  _updateOrganizations(organizations, prevOrganizations) {
    const adminOrganizations = organizations.filter(
      (org) => org.permission == "Admin"
    );
    if (adminOrganizations.length > 0) {
      this._newProjectDialog.organizations = adminOrganizations;
      this._newProjectButton.style.display = "flex";
      this._newProject.style.display = "block";
    }
  }

  _insertProjectSummary(project) {
    const summary = document.createElement("project-summary");
    summary.setAttribute("id", `project-summary-${project.id}`);
    summary.info = project;
    this._projects.insertBefore(summary, this._newProject);
    summary.addEventListener("remove", this._removeCallback);
  }

  _openNewProjectDialog() {
    this._newProjectDialog.init();
    this._newProjectDialog.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  async _createProject() {
    const projectSpec = this._newProjectDialog.getProjectSpec();
    const preset = this._newProjectDialog.getProjectPreset();
    const project = await store.getState().addProject(projectSpec, preset);
    this._insertProjectSummary(project);
    this._projectCreationRedirect = `/${project.id}/project-settings`;
    this._modalNotify.init(
      "Project created successfully!",
      "Continue to project settings or close this dialog.",
      "ok",
      "Continue to settings"
    );
    this._modalNotify.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }
}

customElements.define("projects-dashboard", ProjectsDashboard);
