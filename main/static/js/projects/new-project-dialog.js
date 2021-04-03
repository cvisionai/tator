class NewProjectDialog extends ModalDialog {
  constructor() {
    super();

    this._title.nodeValue = "Create new project";

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
    this._main.appendChild(this._preset);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-purple");
    this._accept.setAttribute("disable", "");
    this._accept.textContent = "Save";
    this._footer.appendChild(this._accept);

    // Indicates whether name was saved.
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
}

customElements.define("new-project-dialog", NewProjectDialog);
