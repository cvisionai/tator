import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class OrgTypeFormContainer extends TatorElement {
  constructor() {
    super();

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const template = document.getElementById("type-form-container").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Main parts of page
    this.editH1 = this._shadow.getElementById("type-form--edit-h1");
    this.newH1 = this._shadow.getElementById("type-form--new-h1");
    this.typeNameSet = this._shadow.querySelectorAll(".type-form-typeName");
    this.objectNameDisplay = this._shadow.getElementById("type-form-objectName");
    this.idDisplay = this._shadow.getElementById("type-form-id");
    this.save = this._shadow.getElementById("type-form-save");
    this.resetLink = this._shadow.getElementById("type-form-reset");
    this.deleteDiv = this._shadow.getElementById("type-form-delete-div");
    this.delete = this._shadow.getElementById("type-form-delete");
    this.typeFormDiv = this._shadow.getElementById("type-form-div");
    this._addLeaves = this._shadow.getElementById("type-form--add-edit-leaves");
    this._addLeavesLink = this._shadow.getElementById("type-form--add-edit-leaves_link");
    this._leavesFormHeading = this._shadow.getElementById("type-form--leaves-active");

    // Buttons below form
    this._saveEditSection = this._shadow.getElementById("type-form--save-reset-section");
    this._customButtonSection = this._shadow.getElementById("type-form--custom-button-section");
    this._customButton = this._shadow.getElementById("type-form--custom-button");
    this._customButtonSectionPrimary = this._shadow.getElementById("type-form--custom-button-section-primary");
    this._customButtonPrimary = this._shadow.getElementById("type-form--custom-button-primary");

    // Side container (attr container)
    this.sideCol = this._shadow.getElementById("type-form-attr-column");
    this.membershipSidebar = document.createElement("affiliation-membership-sidebar");
    this.membershipSidebar.hidden = true;
    this.sideCol.appendChild(this.membershipSidebar);
    this.projectMembershipSidebar = document.createElement("project-membership-sidebar");
    this.projectMembershipSidebar.hidden = true;
    this.sideCol.appendChild(this.projectMembershipSidebar);

    // this is outside the template and references by all parts of page to sync the dimmer
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    // Subscribe to selection and projectId
    store.subscribe((state) => state.selection, this._updateFormSelection.bind(this));
    store.subscribe(state => state.projectId, this.setProjectId.bind(this));
    store.subscribe(state => state.status, this.handleButtonsActive.bind(this));

    // Create in the inner form handles
    const formName = this.getAttribute("form");
    this._form = document.createElement(formName);
    this.typeFormDiv.appendChild(this._form);

    // Once we know what type, listen to changes
    store.subscribe(state => state[this._form.typeName], this._newData.bind(this));

    const canDeleteProject = store.getState().deletePermission;
    const typeName = this._form.typeName;
    this.typeName = typeName;

    if (typeName === "Project") {
      this._saveEditSection.classList.add("hidden");
      this._customButtonPrimary.innerHTML = `View/Edit Project`;
      this._customButtonPrimary.addEventListener("click", this._linkToProject.bind(this));
      this.checkCurrentUser();

      this._customButton.hidden = false;
      this._customButton.innerHTML = `Clone Project`;
      this._customButton.addEventListener("click", this._cloneProjectDialog.bind(this));
    } else if (typeName == "Invitation") {
      this._customButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill feather feather-send"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      &nbsp; Reset & Resend Invitation`;
      this._customButton.addEventListener("click", this._resetInvitation.bind(this));

      this._customButtonPrimary.innerHTML = `View/Edit Affiliation`;
      this._customButtonPrimary.addEventListener("click", this._linkToAffiliation.bind(this));
    }

    // Event listeners for container actions
    this.save.addEventListener("click", this._form._saveData.bind(this._form));
    this.resetLink.addEventListener("click", this._form._resetForm.bind(this._form));
    this.delete.addEventListener("click", this._form._deleteType.bind(this._form));
  }

  async checkCurrentUser() {
    await store.getState().getCurrentUser();
  }

  handleButtonsActive(newStatus) {
    if (newStatus.name == "idle") {
      this.save.removeAttribute("disabled");
      this.resetLink.removeAttribute("disabled");
      this.delete.removeAttribute("disabled");
    } else {
      this.save.setAttribute("disabled", "true");
      this.resetLink.setAttribute("disabled", "true");
      this.delete.setAttribute("disabled", "true");
    }
  }

  setProjectId(newId, oldId) {
    this.projectId = newId;
  }

  /**
  * @param {string} val
  */
  set typeName(val) {
    this._typeName = val;
    for (let span of this.typeNameSet) {
      span.textContent = val;
    }
  }

  /**
   * @param {int} val
   */
  set typeId(val) {
    this._typeId = val;
    this.idDisplay.textContent = val;
    this.deleteDiv.hidden = (val == "New");
    this._saveEditSection.hidden = !(val == "New");

    if (val == "New") {
      this.sideCol.hidden = true;
      this.projectMembershipSidebar.hidden = true;
      this.membershipSidebar.hidden = true;      
    }

  }

  /**
   * @param {int} val
  */
  set objectName(val) {
    this._objectName = val;
    if (this._typeId === "New") {
      this.editH1.hidden = true;
      this.newH1.hidden = false;
    } else {
      this.editH1.hidden = false;
      this.newH1.hidden = true;
      this.objectNameDisplay.innerHTML = val;
    }
  }

  setUpData(data) {
    this._data = data;
    this._form.data = data;
    let objectName = "";

    // Reset to hidden by default
    this.sideCol.hidden = true;
    this.projectMembershipSidebar.hidden = true;
    this.membershipSidebar.hidden = true;
    

    console.log("this._typeName data.id" + this._typeName + data.id);

    // Setup object info
    switch (this._typeName) {
      case "Invitation":
        objectName = data.email;
        this._setupButtonsInvite(this._form._data.status);
        break;
      case "Affiliation":
        objectName = data.username;
        this._getAffiliateMembershipSidebar(data.username);
        break;
      case "Project":
        this._getProjMembershipSidebar(data.id);

      // default and fall-through for Project objectName
      default:
        objectName = data.name;
    }
    this.objectName = objectName
  }

  /**
   * 
   */
  async _setupButtonsInvite(status) {
    console.log("_setupButtonsInvite status "+status)
    const showReset = ["Expired", "Pending"];
    const showCustomButton = (showReset.includes(status) || status == "Accepted");
    const inviteEmail = this._data.email;

    if (showCustomButton) {
      if (showReset.includes(status)) {
        this._customButtonSection.hidden = false;
        this._customButtonSectionPrimary.hidden = true;
      } else if (status == "Accepted") {
        const result = await store.getState().initType("Affiliation");
        const affiliation = store.getState().Affiliation.emailMap.has(inviteEmail) ? store.getState().Affiliation.emailMap.get(inviteEmail) : null;
        console.log("Email "+inviteEmail, affiliation);
        if (affiliation) {
          this._customButtonSectionPrimary.hidden = false;
        } else {
          this._customButtonSectionPrimary.hidden = true;
        }
        
        this._customButtonSection.hidden = true;
      }
      this._saveEditSection.classList.add("hidden"); // Btn requires class change, not just hidden flag 
    } else {
      this._saveEditSection.classList.remove("hidden");
      this._customButtonSection.hidden = true;
      this._customButtonSectionPrimary.hidden = true;
    }
  }

  /**
   * Subscription callback for [type] updates
   * @param {*} newData 
   */
  _newData(newData) {
    // console.log("newData", newData);
    // Nothing new or deleted
    if (this._typeName == store.getState().selection.typeName && this._typeId !== "New") {
      if (newData.setList.has(Number(this._typeId))) {
        // Refresh the view for typeId we're looking at within update
        const data = newData.map.get(Number(this._typeId))
        this.setUpData(data);
      } else {
        // We have new data, but even tho Our typeName is selected the typeId isn't shown...
        // Just select something and let the subscribers take it from there....
        const selectType = (newData.setList[0]) ? newData.setList[0] : "New";
        window.history.pushState({}, "", `#${this._typeName}-${selectType}`)
        store.setState({ selection: { ...store.getState().selection, typeId: selectType } });
      }
    }
  }

  /**
   * Subscription callback for [selection] updates
   * @param {*} newData 
   */
  async _updateFormSelection(newSelection, oldSelection) {
    const affectsMe = (this._typeName == newSelection.typeName || this._typeName == oldSelection.typeName);

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
        const data = await store.getState().getData(this._typeName, this._typeId);
        // console.log(`DEBUG: selection found newData for  ${this._typeName}, id: ${this._typeId}`, data);

        if (data) {
          this.setUpData(data);
          this._form.data = data;
          return;
        }
      }

      /* Clear container in any other case */
      // ie. NEW form (data is null), or no data from store
      this.resetToNew();
    }
  }

  // Removes the attribute main form, and hides the container
  removeAttributeSection() {
    if (this.attributeSection) this.attributeSection.remove();
    this._attributeContainer.hidden = true;
  }

  /**
   * Adds an attribute section to pages based on form data
   */
  _getAttributeSection() {
    // Clears
    this.removeAttributeSection();

    // Setup
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection.setAttribute("data-from-id", `${this._typeId}`)
    this.attributeSection._init(this._typeName, this._form._data.id, this._form._data.name, this.projectId, this._form._data.attribute_types, this.modal);

    // Append and show
    this._attributeContainer.appendChild(this.attributeSection);
    this._attributeContainer.hidden = false;
  }

  //
  resetToNew() {
    this._form.data = null;
    this.objectName = "";
    // this.removeAttributeSection();
  }

  async _resetInvitation() {
    const info = await store.getState().resetInvitation(this._data);
    if (info.response?.ok) {
      this.modal._complete(`New invitation link sent! Details: <br/> ${info.data.message}`);
    } else {
      this.modal._error(info);
    }
  }

  async _cloneProjectDialog() {
    this.modal._complete("TODO clone dialog");
  }

  _linkToAffiliation() {
    //
    const inviteEmail = this._data.email;
    const affiliation = store.getState().Affiliation.emailMap.has(inviteEmail) ? store.getState().Affiliation.emailMap.get(inviteEmail) : null;
    
    if (affiliation) {
      const affId = affiliation.id;
      window.location.href = `${window.location.origin}${window.location.pathname}#Affiliation-${affId}`;      
    }

  }

  _linkToProject() {
    window.location.href = `${window.location.origin}/${this._data.id}/project-settings`;
  }

  async _getAffiliateMembershipSidebar(affUsername) {
    // Should return a list of projects memberships
    const data = await store.getState().getMembershipData(affUsername);
    console.log("Got data for affUsername " + affUsername, data);
    this.membershipSidebar.data = data;
    this.membershipSidebar.username = affUsername;

    // Show the things
    this.sideCol.hidden = false;
    this.membershipSidebar.hidden = false;
  }

  async _getProjMembershipSidebar(projectId) {
    // Setting data, should be a list of memberships projects
    const data = await store.getState().getProjMembershipData(projectId);
    console.log("Got data for projectId " + projectId, data);
    this.projectMembershipSidebar.data = data;

    // Projects
    this._customButtonSection.hidden = true;
    let canDeleteProject = false;
    if (data) {
      for (let membership of data) {
        // if any membership in my user, check against their permssions
        if (membership.user_id == store.getState().currentUser.data.id && membership.permission == "Full Control") {
          canDeleteProject = true;
          this._customButtonSection.hidden = false;
        }
      }
    }
    
    // Show the things
    this.sideCol.hidden = false;
    this.projectMembershipSidebar.hidden = false;

    // There are either no affiliations for the project, or there is but user isn't one with control
    this.delete.hidden = !canDeleteProject;
  }
}



if (!customElements.get("org-type-form-container")) {
  customElements.define("org-type-form-container", OrgTypeFormContainer);
}
