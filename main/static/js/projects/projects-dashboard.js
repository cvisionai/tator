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

    this._newProjectButton = document.createElement("a");
    this._newProjectButton.setAttribute("class", "btn");
    this._newProjectButton.textContent = "New Project";
    header.appendChild(this._newProjectButton);
    this._newProjectButton.style.display = "none"; // Hide until organizations are retrieved.

    this._projects = document.createElement("div");
    this._projects.setAttribute("class", "d-flex flex-column");
    main.appendChild(this._projects);

    this._newProject = document.createElement("new-project");
    this._projects.appendChild(this._newProject);
    this._newProject.style.display = "none"; // Hide until organizations are retrieved.

    this._newProjectDialog = document.createElement("new-project-dialog");
    this._projects.appendChild(this._newProjectDialog);

    const deleteProject = document.createElement("delete-project");
    this._projects.appendChild(deleteProject);

    this._modalNotify = document.createElement("modal-notify");
    main.appendChild(this._modalNotify);

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

    this._newProjectDialog.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
      if (this._newProjectDialog._confirm) {
        this._createProject();
      }
    });

    this._newProjectButton.addEventListener("click", this._openNewProjectDialog.bind(this));
    this._newProject.addEventListener("click", this._openNewProjectDialog.bind(this));

    this._modalNotify.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });
  }

  connectedCallback() {
    // Get projects
    fetch("/rest/Projects", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json())
    .then(projects => {
      for (let project of projects) {
        const summary = document.createElement("project-summary");
        summary.info = project;
        this._projects.insertBefore(summary, this._newProject);
        summary.addEventListener("remove", this._removeCallback);
      }
      this._newProjectDialog.projects = projects;
    })

    // Get organizations
    fetch("/rest/Organizations", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    })
    .then(response => response.json())
    .then(organizations => {
      const adminOrganizations = organizations.filter(org => org.permission == "Admin");
      if (adminOrganizations.length > 0) {
        this._newProjectDialog.organizations = adminOrganizations;
        this._newProjectButton.style.display = "flex";
        this._newProject.style.display = "block";
      }
    })
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }

  _openNewProjectDialog() {
    this._newProjectDialog.init();
    this._newProjectDialog.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  _createProject() {
    // Creates project using information in new project dialog.
    const projectSpec = this._newProjectDialog.getProjectSpec();
    const projectPromise = fetch("/rest/Projects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(projectSpec),
    })
    .then(response => response.json());

    const preset = this._newProjectDialog.getProjectPreset();
    let promise;
    switch (preset) {
      case "imageClassification":
        promise = this._configureImageClassification(projectPromise);
        break;
      case "objectDetection":
        break;
      case "multiObjectTracking":
        break;
      case "activityRecognition":
        break;
      case "none":
        break;
      default:
        console.error(`Invalid preset: ${preset}`);
    }
  }

  _configureImageClassification(projectPromise) {
    return projectPromise.then(response => {
      if (response.status == "201") {
        return fetch(`/rest/MediaType/${project.id}`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "X-CSRF-Token": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Images",
            dtype: "image",
            attribute_types: [{
              name: "Label",
              description: "Image classification label.",
              dtype: "string",
              order: 0,
            }],
          }),
        })
        .then(response => response.json());
      } else {
      }
    });
  }
}

customElements.define("projects-dashboard", ProjectsDashboard);
