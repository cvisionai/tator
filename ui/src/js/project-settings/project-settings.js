import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { store } from "./store.js";


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
    this.typeform = this._shadow.getElementById("type-form");


    /* Update display for any change in data (#todo Project is different) */
    store.subscribe(state => state.MediaType, this.updateDisplay.bind(this));
    store.subscribe(state => state.LocalizationType, this.updateDisplay.bind(this));
    store.subscribe(state => state.LeafType, this.updateDisplay.bind(this));
    store.subscribe(state => state.StateType, this.updateDisplay.bind(this));
    store.subscribe(state => state.Membership, this.updateDisplay.bind(this));
    store.subscribe(state => state.Version, this.updateDisplay.bind(this));
    store.subscribe(state => state.Algorithm, this.updateDisplay.bind(this));
    store.subscribe(state => state.Applet, this.updateDisplay.bind(this));


    // Used in logic for job cluster / algorithm registration and gotten from django template
    this._userIsStaff = false;

    // Create store subscriptions
    store.subscribe(state => state.Project, this.setupProjectSection.bind(this));
    store.subscribe(state => state.status, this.handleStatusChange.bind(this));
  }


  /**
   * The status of our store will trigger the spinner when "pending"
   * Potentially this could global catch error handling as well...
   * @param {} status 
   * @param {*} prevStatus 
   */
  handleStatusChange(status, prevStatus) {
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
    // Project data
    this.projectId = this.getAttribute("project-id");
    await store.getState().fetchProject(this.projectId);

    for (let key of this.settingsNav.navByName.keys()) {
      const settingsNavLink = this.settingsNav.navByName.get(key).nav;
      
      settingsNavLink._headingButton.addEventListener("click", this.headingClick.bind(this));
    }

    this.hashOnLoad();

    // // this handles back button, has catch for newly set will ignore
    window.addEventListener("hashchange", this.moveToCurrentHash.bind(this));
  }


  /**
   * @param {string} val
   */
  set selectedHash(val) {

    if (val.split("-").length > 1) {
      this._selectedHash = val;
      const split = val.split("-");
      this._selectedType = split[0];
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
    this.updateForms();
    this.updateLinks();

  }

  updateForms() {
    this.typeform.selection = {
      typeName: this._selectedType,
      typeId: this._selectedObjectId,
      inner: this._innerSelection
    };
  }

  updateLinks() {
    this.settingsNav.selection = {
      typeName: this._selectedType,
      typeId: this._selectedObjectId,
      inner: this._innerSelection
    };
  }

  //
  async hashOnLoad() {
    console.log("hashOnLoad::::::::::::::::::::::::::::::::::::::::::::::::::::");
    this.selectedHash = window.location.hash;
    console.log("highlight type " + this._selectedType);
    this.settingsNav.highlightSelectedHeading(this._selectedType);
    await this.checkInitStatus(this._selectedType);
  } 

  //
  async moveToCurrentHash() {
    this.selectedHash = window.location.hash;

    if (this._selectedHash.indexOf("New") > -1) {
      console.log("moveToCurrentHash " + this._selectedType);
      this.settingsNav.highlightSelectedHeading(this._selectedType);
      await this.checkInitStatus(this._selectedType);
    } else {
      // Show selected hash regardless of why it was set
      this.showSelected(this._selectedType);      
    }

  }

  /**
   * 
   * @param {object} project 
   * @param {object} prevProject 
   */
  setupProjectSection(project, prevProject) {
    // console.log(project);
    this.projectData = project.data;
    this._breadcrumbs.setAttribute("project-name", this.projectData.name);

    this.typeform.init(this.modal, this._userIsStaff, this.userHasProjectPermission);

    // // init form with the data
    // this.projectView = this._shadow.querySelector("project-main-edit");
    // this.projectView._init({
    //   data: this.projectData,
    //   modal: this.modal,
    //   sidenav: this.settingsNav
    // });
  }


  async headingClick(evt) {
    console.log(evt);
    evt.stopPropagation();
    const heading = evt.currentTarget;
    const type = heading.getAttribute("type");
    const isOpen = this.settingsNav.navByName.get(type).nav._headingGroup.getAttribute("selected");
    console.log(`isOpen.... ${isOpen}`);

    if (isOpen == "true") {
      this.settingsNav.shut(type);
    } else {
      console.log("headingClick " + type);
      this.settingsNav.highlightSelectedHeading(type);
      this.checkInitStatus(type);
    }
  }

  async checkInitStatus(type) {
    try {
      if (type && store.getState()[type].init !== true) {
        await store.getState().fetchType(type);
        // Note: showSelected() is is called in subscription to new data
        // And needs to be after forms are init, so do not add it here
      } else {
        // Ready to show the data
        this.showSelected(type);
      }
    } catch (err) {
      console.error("Could not toggle type.", err);
    }
  }

  async updateDisplay(newType, oldType) {
    const type = newType.name;
    console.log("BEFORE: Data was updated.... this item is selected" + this._selectedObjectId);
    if (newType.init !== oldType.init) this.settingsNav.hidePlaceHolder(type);
    
    // What is in newArray but not in forms
    const newArray = Array.from(newType.setList);
    const oldArray = Array.from(oldType.setList);
    const diff = newArray.filter(x => !oldArray.includes(x));
    const diffB = oldArray.filter(x => !newArray.includes(x));

    /* We have a form id that doesn't exist in new data */
    if (diffB.length === 1) {
      // Object was deleted
      console.log(`${diffB[0]} deleted........`);
      const newHash = `#${type}-${newArray[0]}`;
      window.history.pushState(newHash);
    } else if (diff.length === 1 && diff.length !== newArray.length) {
    /* We have a form id that doesn't exist in old data */
      const id = diff[0];
      // Object was added!
      console.log(`${id} added........`);
      const newHash = `#${type}-${id}`;
      window.history.pushState(newHash);
    }

    console.log("AFTER: Data was updated.... this item is selected" + this._selectedObjectId);
    // Show selected hash regardless of why it was set
    this.showSelected(type);
  }

  showSelected(type) {
    // Refresh the current form and list of links
    this.settingsNav.setLinks(type);
    this.settingsNav.highlightSelectedHeading(type);
    if(type !== "Project") this.settingsNav.highlightSelectedObjectId({type, id: this._selectedObjectId});

    // Find and set form with new data and make sure the right one is showing
    this.typeform.setForm();
    this.typeform.showForm();
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


  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["project-id", "is-staff"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-id":
        this._init();
        break;
      case "is-staff":
        if (newValue == "True") {
          this._userIsStaff = true;
          this.typeform.isStaff = true;
        } else if (newValue == "False") {
          this._userIsStaff = false;
          this.typeform.isStaff = false;
        }
        break;
    }
  }

  userHasProjectPermission(){
    return hasPermission( this.projectData.permission, "Creator" );
  }


}

customElements.define("project-settings", ProjectSettings);
