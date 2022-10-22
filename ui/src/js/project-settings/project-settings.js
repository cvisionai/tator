import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { store } from "./store.js";
import { hasPermission} from '../util/has-permission.js';

export class ProjectSettings extends TatorPage {
  constructor() {
    super();

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Header: This is adds the breadcrumb and successLight-spacer to the header
    const user = this._header._shadow.querySelector("header-user");
    const headerTemplate = document.getElementById("project-settings--header").content;
    user.parentNode.insertBefore(headerTemplate.cloneNode(true), user);

    // Header: pieces
    this._breadcrumbs = this._header._shadow.getElementById("project-settings--breadcrumbs");

    // Page: main element
    const template = document.getElementById("project-settings").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Page: pieces
    this.main = this._shadow.getElementById("project-settings--main");
    this.settingsNav = this._shadow.getElementById("settings-nav--nav");
    this.modal = this._shadow.getElementById("project-settings--modal");
    this.itemsContainer = this._shadow.getElementById("settings-nav--item-container");

    // type forms are all children of itemsContainer
  }

  connectedCallback() {
    /* Update display for any change in data (#todo Project is different) */
    store.subscribe(state => state.Project, this.updateDisplay.bind(this));
    store.subscribe(state => state.selection, this.checkHash.bind(this));
    // store.subscribe(state => state.MediaType, this.updateDisplay.bind(this));
    // store.subscribe(state => state.LocalizationType, this.updateDisplay.bind(this));
    // store.subscribe(state => state.LeafType, this.updateDisplay.bind(this));
    // store.subscribe(state => state.StateType, this.updateDisplay.bind(this));
    // store.subscribe(state => state.Membership, this.updateDisplay.bind(this));
    // store.subscribe(state => state.Version, this.updateDisplay.bind(this));
    // store.subscribe(state => state.Algorithm, this.updateDisplay.bind(this));
    // store.subscribe(state => state.Applet, this.updateDisplay.bind(this));
    // store.subscribe(state => state.status, this.handleStatusChange.bind(this));

    // Init
    this._init();
  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["is-staff"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
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
   * @param {*} prevStatus 
   */
  handleStatusChange(status, prevStatus) {
    console.log("Status: " + status.msg);
    if (status.name == "idle") {
      this.hideDimmer();
      this.loading.hideSpinner();
    } else {
      this.showDimmer();
      this.loading.showSpinner();
    }
  }

  /* 
   * Run when project-id is set to run fetch the page content.
  */
  async _init() {
    // Project id
    this.projectId = this.getAttribute("project-id");
  
    // this is its own state so project display doesn't update here
    // this just happens once
    await store.getState().setProjectId(this.projectId);
    // this.selectedHash = `#Project-${this.projectId}`;
    
    // Set to project
    // then Figure out if something else needs to be shown
    this.hashOnLoad();

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
      this._selectedType = split[0].replace("#","");
      this._selectedObjectId = split[1];
      this._innerSelection = typeof split[2] !== "undefined";
    } else if (val === "reset") {
      this._selectedHash = null;
      this._selectedType = null;
      this._selectedObjectId = null;
      this._innerSelection = null;
    } else if (val === "") {
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
      console.warn("Hash set is invalid: " + val);
    }

    console.log("Hash setup.... "+ this._selectedHash)
    store.getState().setSelection({
      typeName: this._selectedType,
      typeId: this._selectedObjectId,
      inner: this._innerSelection
    });
  }

  //
  hashOnLoad() {
    // This sets appropriate typeForm and links values
    this.selectedHash = window.location.hash;
  } 

  //
  moveToCurrentHash() {
    this.selectedHash = window.location.hash;
  }

  checkHash(newSelect, oldSelect) {
    console.log("CHECK HASH",newSelect);
    console.log(`this._selectedObjectId !== newSelect.typeId || this._selectedType !== newSelect.typeName ${this._selectedObjectId !== newSelect.typeId || this._selectedType !== newSelect.typeName}`);
    console.log(`checkHash breakdown: curSel=${this._selectedObjectId}, newSel=${newSelect.typeId}, selType=${this._selectedType} and newType=${newSelect.typeName}`);
    if (this._selectedObjectId !== newSelect.typeId || this._selectedType !== newSelect.typeName) {
      console.log("Hash doesn't match up with selected item?");
      // window.history.pushState({}, '', `#${newSelect.typeName}-${newSelect.typeId}`)
    }
  }

  async updateDisplay(newType, oldType) {
    const type = newType.name;

    if (type === "Project" && newType.init !== oldType.init) {
      this._breadcrumbs.setAttribute("project-name", newType.data.name);
      this.setProjectPermission(newType.data.permission);
    }
  }


  /**
   * Modal for this page, and handler
   * @returns sets page attribute that changes dimmer
   */
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    this.modal._div.classList.remove("modal-wide"); // reset width
    return this.removeAttribute("has-open-modal");
  }

  setProjectPermission(permission) {;
    const value = hasPermission(permission);
    store.setState({ deletePermission: value });
  }


}

customElements.define("project-settings", ProjectSettings);
