import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";
import { store } from "./store.js";
import TatorSymbol from "../../images/tator-logo-symbol-only.png";

export class ProjectDisplayList extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Project";
    this.readableTypeName = "Project";
    this._hideAttributes = true;

    //
    var templateInner = document.getElementById("project-display");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("project-display--form");
    this._thumb = this._shadow.getElementById("project-thumbnail");
    this._name = this._shadow.getElementById("project-display--name");
    this._summary = this._shadow.getElementById("project-display--summary");
    this._summary.permission = "View Only";
    this._editLink = this._shadow.getElementById("project-display--edit-link");
    this._editLink.permission = "View Only";
    this._numFiles = this._shadow.getElementById("project-display--num-files");
    this._numFiles.permission = "View Only";
    this._size = this._shadow.getElementById("project-display--size");
    this._size.permission = "View Only";
    this._duration = this._shadow.getElementById("project-display--duration");
    this._duration.permission = "View Only";

    this._newProjectDialog = this._shadow.getElementById("new-project-dialog");
    this._newProjectDialog.hidden = true;
  }

  async _setupFormUnique() {
    if (this._data.id == "New") {
      // TODO
      this._newProjectDialog.hidden = false;

      // Show the modal for a new project // reuse from dashboard
      this._form.hidden = true;
    } else {
      this._newProjectDialog.hidden = true;
      this._form.hidden = false;
    }

    if (this._data.thumb) {
      this._thumb.setAttribute("src", this._data.thumb);
    } else {
      this._thumb.setAttribute("src", TatorSymbol);
    }

    //  this._name.setValue(this._data.name);
    this._name.innerHTML = this._data.name;
    this._summary.setValue(this._data.summary);

    this._editLink.setAttribute(
      "href",
      `${window.location.origin}/${this._data.id}/project-settings`
    );
    this._numFiles.setValue(this._data.num_files);
    this._duration.setValue(this._data.duration);
    this._size.setValue(this._data.size);
  }

  // Should never get called because we override _saveData
  // _getFormData() {
  // }

  //THIS IS THE OVERRIDE FOR SAVE DATA....
  async _saveData() {
    const projectSpec = this._newProjectDialog.getProjectSpec();
    const preset = this._newProjectDialog.getProjectPreset();

    try {
      const projectInfo = await store
        .getState()
        .addProject(projectSpec, preset);

      if (projectInfo.response.ok) {
        this.data = null;
        window.location.replace(
          `${window.location.origin}${window.location.pathname}#${this.typeName}-${projectInfo.data.id}`
        );
        this.modal._success(
          "Project created successfully!",
          "Continue to project settings or close this dialog.",
          "ok",
          "Continue to settings"
        );
      } else {
        this.modal._error(info.data.message);
      }
    } catch (err) {
      console.error("Error adding project.", err);
      this.modal._error("Error adding project.");
    }
  }
}

customElements.define("project-display-list", ProjectDisplayList);
