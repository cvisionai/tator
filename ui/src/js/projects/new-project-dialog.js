import { ModalDialog } from "../components/modal-dialog.js";

export class NewProjectDialog extends ModalDialog {
  constructor() {
    super(); 

    this._title.nodeValue = "Create new project";
    this._main.style.marginBottom = "0";
    this._main.style.paddingBottom = "0";

    this._name = document.createElement("text-input");
    this._name.setAttribute("name", "Name");
    this._name.setAttribute("type", "string");
    this._main.appendChild(this._name);

    this._summary = document.createElement("text-input");
    this._summary.setAttribute("name", "Summary");
    this._summary.setAttribute("type", "string");
    this._main.appendChild(this._summary);

    this._organization = document.createElement("enum-input");
    this._organization.setAttribute("name", "Organization");
    this._main.appendChild(this._organization);

    this._preset = document.createElement("enum-input");
    this._preset.setAttribute("name", "Preset");
    this._preset.choices = [{
      value: "imageClassification",
      label: "Image classification",
    }, {
      value: "objectDetection",
      label: "Object detection",
    }, {
      value: "multiObjectTracking",
      label: "Multi-object tracking",
    }, {
      value: "activityRecognition",
      label: "Activity recognition",
    }, {
      value: "none",
      label: "None (no preset)",
    }];
    this._main.appendChild(this._preset);

    const messages = document.createElement("div");
    messages.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center");
    this._main.appendChild(messages);

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

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-purple");
    this._accept.setAttribute("disabled", "");
    this._accept.textContent = "Create project";
    this._footer.appendChild(this._accept);

    // Indicates whether project was created.
    this._confirm = false;
    
    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);

    this._accept.addEventListener("click", evt => {
      this._confirm = true;
      this._closeCallback();
    });

    this._name.addEventListener("input", this._validateName.bind(this));
  }

  set organizations(organizations) {
    let choices = [];
    for (const organization of organizations) {
      choices.push({
        label: organization.name,
        value: organization.id,
      });
    }
    this._organization.choices = choices;
  }

  set projects(projects) {
    this._existingNames = projects.map(project => project.name.toLowerCase());
  }

  static get observedAttributes() {
    return ModalDialog.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "is-open":
        break;
    }
  }

  init() {
    this._name.setValue("");
    this._summary.setValue("");
    this._summary.setValue("");
    this._confirm = false;
  }

  removeProject(projectName) {
    // Removes project from existing names.
    const index = this._existingNames.indexOf(projectName.toLowerCase());
    if (index > -1) {
      this._existingNames.splice(index, 1);
    }
  }

  getProjectSpec() {
    return {
      name: this._name.getValue(),
      summary: this._summary.getValue(),
      organization: Number(this._organization.getValue()),
    };
  }

  getProjectPreset() {
    return this._preset.getValue();
  }

  _validateName() {
    let valid = true;
    const name = this._name.getValue();
    this._nameWarning.style.display = "none";
    if (name.length == 0) {
      valid = false;
    } else {
      if (this._existingNames.includes(name.toLowerCase())) {
        valid = false;
        this._nameWarning.style.display = "block";
      }
    }
    if (valid) {
      this._accept.removeAttribute("disabled");
    } else {
      this._accept.setAttribute("disabled", "");
    }
  }
}

customElements.define("new-project-dialog", NewProjectDialog);
