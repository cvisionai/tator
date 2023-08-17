import { OrgTypeFormContainer } from "./org-type-form-container";
import { store } from "../store.js";

export class OrgTypeInvitationContainer extends OrgTypeFormContainer {
  constructor() {
    super();

    this._customButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill feather feather-send"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        &nbsp; Reset & Resend Invitation`;
    this._customButton.addEventListener(
      "click",
      this._resetInvitation.bind(this)
    );

    this._customButtonPrimary.innerHTML = `View/Edit Affiliation`;
    this._customButtonPrimary.addEventListener(
      "click",
      this._linkToAffiliation.bind(this)
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

    this.initTypeForm();
  }

  initTypeForm() {
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
  }

  setUpData(data) {
    this._data = data;
    this._form.data = data;
    let objectName = "";

    // Setup object info

    this.objectName = data && data.email ? data.email : "";
    const status = this._form?._data?.status ? this._form._data.status : null;
    this._setupButtonsInvite(status);
  }

  async _resetInvitation() {
    const info = await store.getState().resetInvitation(this._data);
    if (info.response?.ok) {
      this.modal._complete(
        `New invitation link sent! Details: <br/> ${info.data.message}`
      );
    } else {
      this.modal._error(info);
    }
  }

  /**
   *
   */
  async _setupButtonsInvite(status) {
    const showReset = ["Expired", "Pending"];
    const showCustomButton = showReset.includes(status) || status == "Accepted";

    if (showCustomButton) {
      if (showReset.includes(status)) {
        this._customButtonSection.hidden = false;
        this._customButtonSectionPrimary.hidden = true;
      } else if (status == "Accepted") {
        const result = await store.getState().initType("Affiliation");
        const inviteEmail = this._data?.email ? this._data.email : "";
        const affiliation = store
          .getState()
          .Affiliation.emailMap.has(inviteEmail)
          ? store.getState().Affiliation.emailMap.get(inviteEmail)
          : null;

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

  // async _cloneProjectDialog() {
  //   this.modal._complete("TODO clone dialog");
  // }

  _linkToAffiliation() {
    //
    const inviteEmail = this._data.email;
    const affiliation = store.getState().Affiliation.emailMap.has(inviteEmail)
      ? store.getState().Affiliation.emailMap.get(inviteEmail)
      : null;

    if (affiliation) {
      const affId = affiliation.id;
      window.location.href = `${window.location.origin}${window.location.pathname}#Affiliation-${affId}`;
    }
  }
}

if (!customElements.get("org-type-invitation-container")) {
  customElements.define(
    "org-type-invitation-container",
    OrgTypeInvitationContainer
  );
}
