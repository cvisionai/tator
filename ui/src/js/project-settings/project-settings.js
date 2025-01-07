import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { store } from "./store.js";
import { hasPermission } from "../util/has-permission.js";

export class ProjectSettings extends TatorPage {
  constructor() {
    super();

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const user = this._header._shadow.querySelector("header-user");
    const headerTemplate = document.getElementById(
      "project-settings--header"
    ).content;
    user.parentNode.insertBefore(headerTemplate.cloneNode(true), user);

    // Header: pieces
    this._breadcrumbs = this._header._shadow.getElementById(
      "project-settings--breadcrumbs"
    );

    // Page: main element
    const template = document.getElementById("project-settings").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Page: pieces
    this.main = this._shadow.getElementById("project-settings--main");
    this.settingsNav = this._shadow.getElementById("settings-nav--nav");
    this.itemsContainer = this._shadow.getElementById(
      "settings-nav--item-container"
    );
    this.modal = this._shadow.getElementById("project-settings--modal");
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  connectedCallback() {
    /* Update display for any change in data (#todo Project is different) */
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe((state) => state.Project, this.updateProject.bind(this));
    store.subscribe(
      (state) => state.status,
      this.handleStatusChange.bind(this)
    );

    // Init
    this._init();
  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["is-staff"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "is-staff":
        const value = newValue == "True" ? true : false;
        store.setState({ isStaff: value });
        break;
    }
  }

  /**
   * The status of our store will trigger the spinner when "pending"
   * Potentially this could global catch error handling as well...
   * @param {} status
   */
  handleStatusChange(status) {
    // Debug output, potentially useful as lightbox or all modal handles
    // console.log(`DEBUG: Status updated to "${status.name}" ${(status.msg !== "") ? " with message: "+status.msg : ""}`);
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
   * Run when project-id is set to run fetch the page content.
   */
  async _init() {
    store.getState().initHeader();

    // Project id
    this.projectId = store.getState().projectId;

    // This just happens once and unlike getType, it also sets project info
    await store.getState().setProjectData(this.projectId);

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
      // No hash is home for project-settings
      this._selectedHash = `#Project-${this.projectId}`;
      this._selectedType = "Project";
      this._selectedObjectId = this.projectId;
      this._innerSelection = false;
    } else {
      // Error handle
      this._selectedHash = null;
      this._selectedType = null;
      this._selectedObjectId = null;
      this._innerSelection = null;
    }

    // console.log("DEBUG: Hash setup.... " + this._selectedHash);
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

  /* Project data required for settings page components are updated */
  updateProject(newType) {
    this._breadcrumbs.setAttribute("project-name", newType.data.name);
    this.setProjectPermission(newType.data.permission);
    this._updateProject(newType.data); // call parent object method
  }

  /**
   * Callback for permission to be set from Project Data
   * Child components listen for this state update
   * @param {String} permission
   */
  setProjectPermission(permission) {
    const value = hasPermission(permission);
    store.setState({ deletePermission: value });
  }

  /**
   * Modal for this page, and handler
   * @returns sets page attribute that changes dimmer
   */
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("project-settings", ProjectSettings);
