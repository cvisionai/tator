class ProjectsDashboard extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-items-center flex-justify-between py-6");
    main.appendChild(header);
    
    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    header.appendChild(h1);

    const h1Text = document.createTextNode("Projects");
    h1.appendChild(h1Text);

    const newProject = document.createElement("a");
    newProject.setAttribute("class", "btn");
    newProject.setAttribute("href", "/new-project/custom");
    newProject.textContent = "New Project";
    header.appendChild(newProject);

    this._projects = document.createElement("div");
    this._projects.setAttribute("class", "d-flex flex-column");
    main.appendChild(this._projects);

    this._newProject = document.createElement("new-project");
    this._projects.appendChild(this._newProject);

    // Disable new projects until new project workflow is implemented
    newProject.style.display = "none";
    this._newProject.style.display = "none";

    const deleteProject = document.createElement("delete-project");
    this._projects.appendChild(deleteProject);

    this._progress = document.createElement("progress-summary");
    this._shadow.insertBefore(this._progress, main);

    const cancelJob = document.createElement("cancel-confirm");
    this._shadow.appendChild(cancelJob);

    this._removeCallback = evt => {
      deleteProject.setAttribute("project-id", evt.detail.projectId);
      deleteProject.setAttribute("project-name", evt.detail.projectName);
      deleteProject.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    deleteProject.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    deleteProject.addEventListener("confirmDeleteProject", evt => {
      for (const project of this._projects.children) {
        if (project._projectId == evt.detail.projectId) {
          this._projects.removeChild(project);
          break;
        }
      }
      this.removeAttribute("has-open-modal");
      deleteProject.removeAttribute("is-open");
    });

    this._progress.addEventListener("groupCancel", evt => {
      cancelJob.gid = evt.detail.gid;
      cancelJob.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    cancelJob.addEventListener("confirmGroupCancel", () => {
      this.removeAttribute("has-open-modal");
      cancelJob.removeAttribute("is-open");
    });

    cancelJob.addEventListener("close", () => {
      this.removeAttribute("has-open-modal");
    });

    window.addEventListener("load", () => {
      window.dispatchEvent(new Event("readyForWebsocket"));
    });
  }

  connectedCallback() {
    const url = window.location.origin + "/rest/Projects";
    fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'X-CSRF-Token': getCookie("csrftoken"),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
    .then(response => response.json())
    .then(projects => {
      for (let project of projects) {
        const summary = document.createElement('project-summary');
        summary.info = project;
        this._projects.insertBefore(summary, this._newProject);
        summary.addEventListener("remove", this._removeCallback);
      }
    })
    .catch(error => console.log(error));
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }
}

customElements.define("projects-dashboard", ProjectsDashboard);
