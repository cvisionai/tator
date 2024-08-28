import { OrgTypeFormContainer } from "./org-type-form-container.js";
import { store } from "../store.js";

export class OrgTypeProjectContainer extends OrgTypeFormContainer {
  constructor() {
    super();

    // Side container (attr container)
    this.sideCol = this._shadow.getElementById("type-form-attr-column");
    this.sideCol.hidden = false;
    this.sideCol.classList.remove("hidden");

    // Sidebar
    this.projectMembershipSidebar = document.createElement(
      "project-membership-sidebar"
    );
    this.sideCol.appendChild(this.projectMembershipSidebar);

    //
    this._customButtonPrimary.innerHTML = `View/Edit Project`;
    this._customButtonPrimary.addEventListener(
      "click",
      this._linkToProject.bind(this)
    );
  }

  connectedCallback() {
    // Subscribe to selection and projectId
    store.subscribe(
      (state) => state.selection,
      this._updateFormSelection.bind(this)
    );
    store.subscribe((state) => state.projectId, this.setProjectId.bind(this));
    store.subscribe(
      (state) => state.status,
      this.handleButtonsActive.bind(this)
    );

    // Create in the inner form handles
    const formName = this.getAttribute("form");
    this._form = document.createElement(formName);
    this.typeFormDiv.appendChild(this._form);

    // Once we know what type, listen to changes
    const typeName = this._form.typeName;
    store.subscribe((state) => state[typeName], this._newData.bind(this));
    this.typeName = typeName;

    // Event listeners for container actions
    this.save.addEventListener("click", this._form._saveData.bind(this._form));
    this.resetLink.addEventListener(
      "click",
      this._form._resetForm.bind(this._form)
    );
    this.delete.addEventListener(
      "click",
      this._form._deleteType.bind(this._form)
    );

    store.subscribe(
      (state) => state["Membership"],
      this.updatedMembershipData.bind(this)
    );
  }

  setUpData(data) {
    this._data = data;
    this._form.data = data;

    this.objectName = data?.name ? data.name : "";
    this._customButtonSectionPrimary.hidden = false;
    this.sideCol.hidden = false;

    this.updateProjectSidebar();
  }

  /**
   * Subscription callback for [selection] updates
   * @param {*} newData
   */
  async _updateFormSelection(newSelection, oldSelection) {
    const affectsMe =
      this._typeName == newSelection.typeName ||
      this._typeName == oldSelection.typeName;

    if (affectsMe) {
      const newType = newSelection.typeName;
      const oldType = oldSelection.typeName;

      if (oldType === this._typeName && oldType !== newType) {
        this.hidden = true;
        return; // If container type was the old type, and not the new one hide and end
      } else {
        this.hidden = false; // Otherwise Show
      }

      // Add data
      const newId = newSelection.typeId;
      this.typeId = newId;

      if (newId !== "New") {
        const data = await store
          .getState()
          .getData(this._typeName, this._typeId);
        // console.log(`DEBUG: selection found newData for  ${this._typeName}, id: ${this._typeId}`, data);

        if (data) {
          this._form.data = data;
          this.setUpData(data);
          return;
        }
      }

      /* Clear container in any other case */
      // ie. NEW form (data is null), or no data from store
      this.resetToNew();
      this._customButtonSectionPrimary.hidden = true;
      this._saveEditSection.classList.remove("hidden");
      this.sideCol.hidden = true;
    }
  }

  updatedMembershipData(newMembershipData) {
    // Setting data, should be a list of memberships projects
    const projectId = Number(this._typeId);
    const data = newMembershipData.projectIdMembersMap.get(projectId);
    this.updateProjectSidebar(data);
  }

  async updateProjectSidebar(data = null) {
    if (this._typeId !== "New") {
      this._saveEditSection.classList.add("hidden");
      const projectId = Number(this._typeId);
      if (data == null) {
        data = await store.getState().getProjMembershipData(projectId);
      }

      this.projectMembershipSidebar.projectId = projectId;
      this.projectMembershipSidebar.data = { projectId, data };

      // Projects
      const canEditProject = store
        .getState()
        .currentUser.membershipsByProject.has(projectId)
        ? true
        : false;
      // There are either no affiliations for the project, or there is but user isn't one with control
      this._customButtonSectionPrimary.hidden = !canEditProject;
      this.delete.hidden = !canEditProject;
    }
  }

  _linkToProject() {
    window.location.href = `${window.location.origin}/${this._data.id}/project-settings`;
  }
}

if (!customElements.get("org-type-project-container")) {
  customElements.define("org-type-project-container", OrgTypeProjectContainer);
}
