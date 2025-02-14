import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { store } from "./store.js";
import { hasPermission } from "../util/has-permission.js";

export class OrganizationSettings extends TatorPage {
  constructor() {
    super();

    // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const user = this._header._shadow.querySelector("header-user");
    const headerTemplate = document.getElementById(
      "organization-settings--header"
    ).content;
    user.parentNode.insertBefore(headerTemplate.cloneNode(true), user);

    // Header: pieces
    this._breadcrumbs = this._header._shadow.getElementById(
      "organization-settings--breadcrumbs"
    );

    // Page: main element
    const template = document.getElementById("organization-settings").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Page: pieces
    this.main = this._shadow.getElementById("organization-settings--main");
    this.settingsNav = this._shadow.getElementById("organization-nav--nav");
    this.itemsContainer = this._shadow.getElementById(
      "organization-nav--item-container"
    );
    this.modal = this._shadow.getElementById("organization-settings--modal");
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  connectedCallback() {
    super.connectedCallback();
    /* Create store subscriptions */
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe(
      (state) => state.status,
      this.handleStatusChange.bind(this)
    );

    /* Update display for any change in data (#todo Organization is different) */
    store.subscribe(
      (state) => state.Organization,
      this.updateOrganization.bind(this)
    );

    //
    store.getState().init();
  }

  /* Get personlized information when we have organization-id, and fill page. */
  static get observedAttributes() {
    return ["email_enabled"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "email_enabled":
        // this._emailEnabled = newValue === "False" ? false : true;
        const value = newValue == "True" ? true : false;
        store.setState({ emailEnabled: value });
        break;
    }
  }

  /**
   * The status of our store will trigger the spinner when "pending"
   * Potentially this could global catch error handling as well...
   * @param {} status
   */
  handleStatusChange(status) {
    if (status.name == "pending") {
      this.showDimmer();
      this.loading.showSpinner();
    } else {
      if (this.hasAttribute("has-open-modal")) {
        this.hideDimmer();
        this.loading.hideSpinner();
      }
    }
  }

  /*
   * Run when organization-id is set to run fetch the page content.
   */
  async _init() {
    // Figure out if something else needs to be shown
    this.moveToCurrentHash();

    // this handles back button, and some pushes to this to trigger selection change
    window.addEventListener("hashchange", this.moveToCurrentHash.bind(this));
  }

  /**
   * @param {string} val
   */
  set selectedHash(val) {
    if (val.split("-").length > 1) {
      this._selectedHash = val;
      const split = val.split("-");
      this._selectedType = split[0].replace("#", "");
      this._selectedObjectId = split[1];
      this._innerSelection = typeof split[2] !== "undefined";
    } else if (val === "") {
      // No hash is home for organization-settings
      this._selectedHash = `#Organization-${this.organizationId}`;
      this._selectedType = "Organization";
      this._selectedObjectId = this.organizationId;
      this._innerSelection = false;
    } else {
      // Error handle
      this._selectedHash = null;
      this._selectedType = null;
      this._selectedObjectId = null;
      this._innerSelection = null;
    }

    store.getState().setSelection({
      typeName: this._selectedType,
      typeId: this._selectedObjectId,
      inner: this._innerSelection,
    });
  }

  /* Sets the selection based on a hash change, or hash on load */
  moveToCurrentHash() {
    this.selectedHash = window.location.hash;
  }

  /* Organization data required for settings page components are updated */
  updateOrganization(newType) {
    if (!this.organizationId) {
      // Organization id
      this.organizationId = newType.data.id;

      // Init
      this._init();
    }
    this._breadcrumbs.setAttribute("organization-name", `${newType.data.name}`);
  }

  userHasPermission() {
    // if(this.userHasPermission()) {
    //   this.typeFormDiv.appendChild( this.deleteOrganizationSection() );
    // }
    return hasPermission(this.data.permission, "Creator");
  }

  // Modal for this page, and handlers
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("organization-settings", OrganizationSettings);
