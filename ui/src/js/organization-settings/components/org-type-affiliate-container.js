import { OrgTypeFormContainer } from "./org-type-form-container";
import { store } from "../store.js";

export class OrgTypeAffiliateContainer extends OrgTypeFormContainer {
  constructor() {
    super();

    // Side container (attr container)
    this.sideCol = this._shadow.getElementById("type-form-attr-column");
    this.sideCol.hidden = false;
    this.sideCol.classList.remove("hidden");

    // Sidebar items
    this.membershipSidebar = document.createElement(
      "affiliation-membership-sidebar"
    );
    this.sideCol.appendChild(this.membershipSidebar);
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

    // Custom buttons for certain types (#Todo should these be child elements instead?)
    store.subscribe(
      (state) => state.Project,
      this.updatedProjectData.bind(this)
    );
  }

  setUpData(data) {
    this._data = data;
    this._form.data = data;

    // Setup object info
    const userName = data?.username ? data.username : ""
    this.objectName = userName;
    this.updateAffiliateSidebar(userName);
  }

  async updatedProjectData(newProjectData) {
    const currentAffiliateId = Number(this._typeId);
    await store.getState().initType("Affiliation");
    for (let [id, affData] of newProjectData.map) {
      if (id == currentAffiliateId) {
        // If we are currently on one of those items update the view
        return this.updateAffiliateSidebar(affData.username);
      }
    }
  }

  async updateAffiliateSidebar(affUsername) {
    // Should return a list of projects memberships
    const data = await store.getState().getMembershipData(affUsername);
    this.membershipSidebar.data = data;
    this.membershipSidebar.username = affUsername;
  }
}

if (!customElements.get("org-type-affiliate-container")) {
  customElements.define(
    "org-type-affiliate-container",
    OrgTypeAffiliateContainer
  );
}
