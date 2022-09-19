import { TatorPage } from "../components/tator-page.js";
import { getCookie } from "../util/get-cookie.js";
import { store } from "./store.js";

export class ProjectsDashboard extends TatorPage {
  constructor() {
    super();

    const template = document.getElementById("projects-dashboard").content;
    this._shadow.appendChild(template);

    this._newProjectButton = this._shadow.getElementById("new-project-button");
    this._projects = this._shadow.getElementById("projects");
    this._newProject = this._shadow.getElementById("new-project");
    this._newProjectDialog = this._shadow.getElementById("new-project-dialog");
    const deleteProject = this._shadow.getElementById("delete-project");
    this._modalNotify = this._shadow.getElementById("modal-notify");

    // Create store subscriptions
    store.subscribe(state => state.projects, this._updateProjects.bind(this));
    store.subscribe(state => state.organizations, this._updateOrganizations.bind(this));

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
          this._newProjectDialog.removeProject(project._text.nodeValue);
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
      // If closed with the close button, don't redirect.
      const doRedirect = evt.target.shadowRoot.activeElement.tagName != "MODAL-CLOSE";
      if (this._projectCreationRedirect && doRedirect) {
        window.location.replace(this._projectCreationRedirect);
      }
    });
  }

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    // Initialize store data
    store.getState().fetchProjects();
    store.getState().fetchOrganizations();
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }

  _updateProjects(projects, prevProjects) {
    for (let project of projects) {
      if (prevProjects == null || !prevProjects.includes(project)) {
        this._insertProjectSummary(project);
      }
    }
    this._newProjectDialog.projects = projects;
  }

  _updateOrganizations(organizations, prevOrganizations) {
    const adminOrganizations = organizations.filter(org => org.permission == "Admin");
    if (adminOrganizations.length > 0) {
      this._newProjectDialog.organizations = adminOrganizations;
      this._newProjectButton.style.display = "flex";
      this._newProject.style.display = "block";
    }
  }

  _insertProjectSummary(project) {
    const summary = document.createElement("project-summary");
    summary.info = project;
    this._projects.insertBefore(summary, this._newProject);
    summary.addEventListener("remove", this._removeCallback);
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
    .then(response => response.json())
    .then(project => {
      this._newProjectId = project.id;
      return fetch(`/rest/Project/${project.id}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });
    })
    .then(response => response.json())
    .then(project => {
      this._projectCreationRedirect = `/${project.id}/project-settings`;
      this._insertProjectSummary(project);
      return Promise.resolve(project);
    });

    const preset = this._newProjectDialog.getProjectPreset();
    let promise;
    switch (preset) {
      case "imageClassification":
        promise = this._configureImageClassification(projectPromise);
        break;
      case "objectDetection":
        promise = this._configureObjectDetection(projectPromise);
        break;
      case "multiObjectTracking":
        promise = this._configureMultiObjectTracking(projectPromise);
        break;
      case "activityRecognition":
        promise = this._configureActivityRecognition(projectPromise);
        break;
      case "none":
        break;
      default:
        console.error(`Invalid preset: ${preset}`);
    }
    promise.then(() => {
      this._modalNotify.init("Project created successfully!",
                             "Continue to project settings or close this dialog.",
                             "ok",
                             "Continue to settings");
      this._modalNotify.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    })
    /*.catch(err => {
      this._projectCreationRedirect = null;
      this._modalNotify.init("Project creation failed!",
                             err.message,
                             "error",
                             "Close");
      this._modalNotify.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });*/
  }

  _configureImageClassification(projectPromise) {
    return projectPromise.then(project => {
      return fetch(`/rest/MediaTypes/${project.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
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
    });
  }

  _configureObjectDetection(projectPromise) {
    return projectPromise.then(project => {
      const imagePromise = fetch(`/rest/MediaTypes/${project.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Images",
          dtype: "image",
          attribute_types: [],
        }),
      });
      const videoPromise = fetch(`/rest/MediaTypes/${project.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Videos",
          dtype: "video",
          attribute_types: [],
        }),
      });
      return Promise.all([imagePromise, videoPromise]);
    })
    .then(responses => Promise.all(responses.map(resp => resp.json())))
    .then(([imageResponse, videoResponse]) => {
      return fetch(`/rest/LocalizationTypes/${this._newProjectId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Boxes",
          dtype: "box",
          media_types: [imageResponse.id, videoResponse.id],
          attribute_types: [{
            name: "Label",
            description: "Object detection label.",
            dtype: "string",
            order: 0,
          }],
        }),
      });
    });
  }

  _configureMultiObjectTracking(projectPromise) {
    return projectPromise.then(project => {
      return fetch(`/rest/MediaTypes/${project.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Videos",
          dtype: "video",
          attribute_types: [],
        }),
      })
    })
    .then(response => response.json())
    .then(videoResponse => {
      const trackPromise = fetch(`/rest/StateTypes/${this._newProjectId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Tracks",
          association: "Localization",
          interpolation: "none",
          media_types: [videoResponse.id],
          attribute_types: [{
            name: "Label",
            description: "Track label.",
            dtype: "string",
            order: 0,
          }],
        }),
      });
      const boxPromise = fetch(`/rest/LocalizationTypes/${this._newProjectId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Boxes",
          dtype: "box",
          media_types: [videoResponse.id],
          attribute_types: [],
        }),
      });
      return Promise.all([trackPromise, boxPromise]);
    });
  }

  _configureActivityRecognition(projectPromise) {
    return projectPromise.then(project => {
      return fetch(`/rest/MediaTypes/${project.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Videos",
          dtype: "video",
          attribute_types: [],
        }),
      })
    })
    .then(response => response.json())
    .then(videoResponse => {
      return fetch(`/rest/StateTypes/${this._newProjectId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Activities",
          association: "Frame",
          interpolation: "latest",
          media_types: [videoResponse.id],
          attribute_types: [{
            name: "Something in view",
            description: "Whether something is happening in the video.",
            dtype: "bool",
            order: 0,
          }],
        }),
      });
    });
  }
}

customElements.define("projects-dashboard", ProjectsDashboard);
