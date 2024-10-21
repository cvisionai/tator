import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { listResources, detailResources, store } from "./store.js";
import { hasPermission } from "../util/has-permission.js";

export class PermissionSettings extends TatorPage {
  constructor() {
    super();

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    const template = document.getElementById("permission-settings").content;
    this._shadow.appendChild(template.cloneNode(true));

    this.main = this._shadow.getElementById("permission-settings--main");
    this.settingsNav = this._shadow.getElementById("settings-nav--nav");
    this.itemsContainer = this._shadow.getElementById(
      "settings-nav--item-container"
    );
    this.modal = this._shadow.getElementById("permission-settings--modal");
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  connectedCallback() {
    store.subscribe((state) => state.user, this._setUser.bind(this));

    // Init
    this._init();
  }

  async _init() {
    await store.getState().initHeader();

    this._getUserData();

    // await store.getState().setUserData();

    // Project id
    // this.projectId = store.getState().projectId;

    // This just happens once and unlike getType, it also sets project info
    // await store.getState().setProjectData(this.projectId);

    // Figure out if something else needs to be shown
    this.moveToCurrentHash();

    // this handles back button, and some pushes to this to trigger selection change
    window.addEventListener("hashchange", this.moveToCurrentHash.bind(this));
  }

  // Get current user, user's groups, user's organizations
  async _getUserData() {
    // Current User's Organization List
    await store.getState().getOrganizationList();
    // Current User's Group List
    await store.getState().getCurrentUserGroupList();
    // All Group data
    await store.getState().setGroupData();
    // Policy data that are associated to this user, this user's groups, this user's organizations
    await store.getState().setPolicyData();

    console.log("😇 ~ _init ~ store.getState():", store.getState());
  }

  /**
   * @param {string} val
   */
  set selectedHash(val) {
    if (val === "") {
      this._selectedType = "Group";
    } else {
      const type = val.replace("#", "");
      if (Object.keys(listResources).includes(type)) {
        this._selectedType = type;
      } else {
        this._selectedType = null;
      }
    }

    // console.log("DEBUG: Hash setup.... " + this._selectedHash);
    store.getState().setSelection(this._selectedType);
  }

  /* Sets the selection based on a hash change, or hash on load */
  moveToCurrentHash() {
    this.selectedHash = window.location.hash;
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

customElements.define("permission-settings", PermissionSettings);
