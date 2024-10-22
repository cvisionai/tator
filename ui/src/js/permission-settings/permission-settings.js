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

    this._groupTableView = this._shadow.getElementById("group-tabel-view");
    this._policyTableView = this._shadow.getElementById("policy-tabel-view");
    this._groupSingleView = this._shadow.getElementById("group-single-view");
    this._policyCalculatorView = this._shadow.getElementById(
      "policy-calculator-view"
    );
    this._views = {
      GroupAll: this._groupTableView,
      PolicyAll: this._policyTableView,
      GroupSingle: this._groupSingleView,
      PolicySingle: this._policyCalculatorView,
    };

    this.modal = this._shadow.getElementById("permission-settings--modal");
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  connectedCallback() {
    store.subscribe((state) => state.user, this._setUser.bind(this));

    store.subscribe(
      (state) => state.selectedType,
      this._updateSelectedType.bind(this)
    );

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
    // await store.getState().setPolicyData();

    console.log("😇 ~ _init ~ store.getState():", store.getState());
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
    } else if (val === "") {
      // No hash is home for permission-settings, which is group table
      this._selectedHash = `#Group`;
      this._selectedType = "Group";
      this._selectedObjectId = "All";
    } else {
      // Error handle
      this._selectedHash = null;
      this._selectedType = null;
      this._selectedObjectId = null;
    }

    // console.log("DEBUG: Hash setup.... " + this._selectedHash);
    store.getState().setSelectedType({
      typeName: this._selectedType,
      typeId: this._selectedObjectId,
    });
  }

  /* Sets the selection based on a hash change, or hash on load */
  moveToCurrentHash() {
    this.selectedHash = window.location.hash;
  }

  _updateSelectedType(newSelectedType, oldSelectedType) {
    const oldKey = `${oldSelectedType.typeName}${
      oldSelectedType.typeId === "All" ? "All" : "Single"
    }`;

    const newKey = `${newSelectedType.typeName}${
      newSelectedType.typeId === "All" ? "All" : "Single"
    }`;

    this._views[oldKey].hidden = true;
    this._views[newKey].hidden = false;
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
