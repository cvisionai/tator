import { OrgTypeFormTemplate } from "./org-type-form-template.js";
import { store } from "../store.js";

export class OrgNewProjectDialog extends OrgTypeFormTemplate {
  constructor() {
    super();

    this._name = document.createElement("text-input");
    this._name.setAttribute("name", "Name");
    this._name.setAttribute("type", "string");
    this._shadow.appendChild(this._name);

    this._summary = document.createElement("text-input");
    this._summary.setAttribute("name", "Summary");
    this._summary.setAttribute("type", "string");
    this._shadow.appendChild(this._summary);

    this._preset = document.createElement("enum-input");
    this._preset.setAttribute("name", "Preset");
    this._preset.choices = [
      {
        value: "imageClassification",
        label: "Image classification",
      },
      {
        value: "objectDetection",
        label: "Object detection",
      },
      {
        value: "multiObjectTracking",
        label: "Multi-object tracking",
      },
      {
        value: "activityRecognition",
        label: "Activity recognition",
      },
      {
        value: "none",
        label: "None (no preset)",
      },
    ];
    this._shadow.appendChild(this._preset);

    const messages = document.createElement("div");
    messages.setAttribute(
      "class",
      "main__header d-flex flex-items-center flex-justify-center"
    );
    this._shadow.appendChild(messages);

    this._messageList = document.createElement("ul");
    this._messageList.setAttribute("class", "form-errors");
    messages.appendChild(this._messageList);

    const li = document.createElement("li");
    this._messageList.appendChild(li);

    this._nameWarning = document.createElement("h3");
    this._nameWarning.setAttribute("class", "h3 text-red");
    this._nameWarning.setAttribute("style", "text-align:center;width:400px");
    this._nameWarning.textContent = "Project with this name exists!";
    this._nameWarning.style.display = "none";
    li.appendChild(this._nameWarning);

    // this._name.addEventListener("input", this._validateName.bind(this));
  }

  connectedCallback() {
    this.init();
  }

  set organization(val) {
    this._organization = val;
  }

  set projects(projects) {
    this._existingNames = [];
    for (let [id, project] of projects)
      this._existingNames.push(project.name.toLowerCase());
  }

  async init() {
    this._name.setValue("");
    this._summary.setValue("");
    this._summary.setValue("");
    this._confirm = false;

    this.organization = store.getState().organizationId;
    await store.getState().initType("Project");
    this.projects = store.getState().Project.map;
  }

  getProjectSpec() {
    return {
      name: this._name.getValue(),
      summary: this._summary.getValue(),
      organization: this._organization,
    };
  }

  getProjectPreset() {
    return this._preset.getValue();
  }

  //   _validateName() {
  //     let valid = true;
  //     const name = this._name.getValue();
  //     this._nameWarning.style.display = "none";
  //     if (name.length == 0) {
  //       valid = false;
  //     } else {
  //       if (this._existingNames.includes(name.toLowerCase())) {
  //         valid = false;
  //         this._nameWarning.style.display = "block";
  //       }
  //     }
  //     if (valid) {
  //       this._accept.removeAttribute("disabled");
  //     } else {
  //       this._accept.setAttribute("disabled", "");
  //     }
  //   }
}

customElements.define("org-new-project-dialog", OrgNewProjectDialog);
