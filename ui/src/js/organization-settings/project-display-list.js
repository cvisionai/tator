import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

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
    this._editLink = this._shadow.getElementById("project-display--edit-link");
   this._numFiles = this._shadow.getElementById("project-display--num-files");
   this._size = this._shadow.getElementById("project-display--size");
   this._duration = this._shadow.getElementById("project-display--duration");
   this._usernames = this._shadow.getElementById("project-display--usernames");
   this._newProjectDialog = this._shadow.getElementById("new-project-dialog");
    console.log(this._newProjectDialog);
   this._newProjectDialog.addEventListener("close", evt => {
      if (this._newProjectDialog._confirm) {
         this._createProject();
      }
   });

    this.modal.addEventListener("close", evt => {
      // this.removeAttribute("has-open-modal", "");
      // If closed with the close button, don't redirect.
      const doRedirect = evt.target.shadowRoot.activeElement.tagName != "MODAL-CLOSE";
      if (this._projectCreationRedirect && doRedirect) {
        window.location.replace(this._projectCreationRedirect);
      }
    });
  }

  async _setupFormUnique() {
   if (this._data.id == "New") {
      // TODO
      this._openNewProjectDialog();
      // Show the modal for a new project // reuse from dashboard
      return this._form.hidden = true;
   } else {
      this._form.hidden = false;
   }
     
   // this will all be ready only information about the project
   // this is where "clone project action will live"
   console.log("Project data ", this._data);
   
   this._thumb.setAttribute("src", this._data.thumb);
   this._name.setValue(this._data.name);
   this._summary.setValue(this._data.summary);

   this._editLink.setAttribute("href", `${window.location.origin}/${this._data.id}/project-settings`);
   this._numFiles.setValue(this._data.num_files);
   this._duration.setValue(this._data.duration);
   this._size.setValue(this._data.size);
   const usernames = this._data.usernames.join("\n");
   this._usernames.setValue(usernames);
  }

  // save and formdata
  _getFormData() {
    let formData = {};
    const isNew = true; // schema doesn't accept nulls

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editHost.changed() || isNew) {
      formData.host = this._editHost.getValue();
    }

    if (this._editPort.changed() || isNew) {
      formData.port = this._editPort.getValue();
    }

    if (this._editToken.changed() || isNew) {
      formData.token = this._editToken.getValue();
    }

    if (this._editCert.changed() || isNew) {
      formData.cert = this._editCert.getValue();
    }

    return formData;
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
   this._projectCreationRedirect = `/${project.id}/project-settings`;
   this.modal._success("Project created successfully!",
                           "Continue to project settings or close this dialog.",
                           "ok",
                           "Continue to settings");
 }
}

customElements.define("project-display-list", ProjectDisplayList);
