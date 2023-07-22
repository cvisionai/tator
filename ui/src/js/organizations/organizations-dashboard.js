import { TatorPage } from "../components/tator-page.js";
import { store } from "./store.js";

export class OrganizationsDashboard extends TatorPage {
  constructor() {
    super();

    const template = document.getElementById("organizations-dashboard").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._newOrganizationButton = this._shadow.getElementById(
      "new-organization-button"
    );
    this._organizations = this._shadow.getElementById("organizations");
    this._newOrganization = this._shadow.getElementById("new-organization");
    this._newOrganizationDialog = this._shadow.getElementById(
      "new-organization-dialog"
    );
    this._deleteOrganization = this._shadow.getElementById(
      "delete-organization"
    );
    this._modalNotify = this._shadow.getElementById("modal-notify");
    this._placeholderGlow = this._shadow.getElementById("org-placeholders");

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe(
      (state) => state.organizations,
      this._updateOrganizations.bind(this)
    );

    this._removeCallback = (evt) => {
      this._deleteOrganization.setAttribute(
        "organization-id",
        evt.detail.organizationId
      );
      this._deleteOrganization.setAttribute(
        "organization-name",
        evt.detail.organizationName
      );
      this._deleteOrganization.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    this._deleteOrganization.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this._deleteOrganization.addEventListener(
      "confirmDeleteOrganization",
      (evt) => {
        for (const organization of this._organizations.children) {
          if (organization._organizationId == evt.detail.organizationId) {
            this._organizations.removeChild(organization);
            this._newOrganizationDialog.removeOrganization(
              organization._text.nodeValue
            );
            break;
          }
        }
        this.removeAttribute("has-open-modal");
        this._deleteOrganization.removeAttribute("is-open");
      }
    );

    this._newOrganizationDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      if (this._newOrganizationDialog._confirm) {
        this._createOrganization();
      }
    });

    this._newOrganizationButton.addEventListener(
      "click",
      this._openNewOrganizationDialog.bind(this)
    );
    this._newOrganization.addEventListener(
      "click",
      this._openNewOrganizationDialog.bind(this)
    );

    this._modalNotify.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      // If closed with the close button, don't redirect.
      const doRedirect =
        evt.target.shadowRoot.activeElement.tagName != "MODAL-CLOSE";
      if (this._organizationCreationRedirect && doRedirect) {
        window.location.replace(this._organizationCreationRedirect);
      }
    });
  }

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    this.init();
  }

  async init() {
    await store.getState().init();
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
  }

  _updateOrganizations(organizations, prevOrganizations) {
    // Add any new Organizations.
    for (let org of organizations) {
      if (prevOrganizations == null || !prevOrganizations.includes(org)) {
        this._insertOrganizationSummary(org);
      }
    }
    this._placeholderGlow.remove();
    if (prevOrganizations) {
      // Remove any Organizations no longer present.
      for (let org of prevOrganizations) {
        if (!organizations.includes(org)) {
          const summary = this._shadow.getElementById(
            `organization-summary-${org.id}`
          );
          this._organizations.removeChild(summary);
          this.removeAttribute("has-open-modal");
          this._deleteOrganization.removeAttribute("is-open");
        }
      }
    }

    this._newOrganizationDialog.organizations = organizations;
    const adminOrganizations = organizations.filter(
      (org) => org.permission == "Admin"
    );
    if (adminOrganizations.length > 0) {
      this._newOrganizationDialog.organizations = adminOrganizations;
      this._newOrganizationButton.style.display = "flex";
      this._newOrganization.style.display = "block";
    } else {
      this._newOrganizationButton.style.display = "none";
      this._newOrganization.style.display = "none";
    }
  }

  _insertOrganizationSummary(organization) {
    const summary = document.createElement("organization-summary");
    summary.info = organization;
    this._organizations.insertBefore(summary, this._newOrganization);
    summary.addEventListener("remove", this._removeCallback);
  }

  _openNewOrganizationDialog() {
    this._newOrganizationDialog.init();
    this._newOrganizationDialog.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  async _createOrganization() {
    // Creates organization using information in new organization dialog.
    const organizationSpec = this._newOrganizationDialog.getOrganizationSpec();
    const organization = await store
      .getState()
      .addOrganization(organizationSpec);
    this._newOrganizationId = organization.id;
    this._organizationCreationRedirect = `/${organization.id}/organization-settings`;
    this._insertOrganizationSummary(organization);
    this._modalNotify.init(
      "Organization created successfully!",
      "Continue to organization settings or close this dialog.",
      "ok",
      "Continue to settings"
    );
    this._modalNotify.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }
}

customElements.define("organizations-dashboard", OrganizationsDashboard);
