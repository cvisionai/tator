import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { ProjectMainEdit } from "./type-forms/project-main-edit.js";
import { ProjectTypesData } from "./data/data-project-types.js";
import { DataMediaList } from "./data/data-media-list.js";
import { DataVersionList } from "./data/data-version-list.js";
import { DataJobClusters } from "./data/data-clusters.js";
import { MembershipData } from "./data/data-memberships.js";
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
    this.breadcrumbs = headerTemplate.getElementById("project-settings--breadcrumbs");

    // Page: main element
    const template = document.getElementById("project-settings").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Page: pieces
    this.main = this._shadow.getElementById("project-settings--main");
    // this.settingsNav = this._shadow.getElementById("project-settings--nav");
    this.modal = this._shadow.getElementById("project-settings--modal");
    this.itemsContainer = this._shadow.getElementById("settings-nav--item-container");
    
    /* For all the sidebar toggles */
    // Version
    this.versionLink = this._shadow.getElementById("SideNav--toggle-Version");
    this.versionLink.addEventListener("click", this.openVersions.bind(this));
    this.versionPlusLink = this._shadow.querySelector(".heading-for-Version .Nav-action");
    this.versionPlusLink.addEventListener("click", this.addNew.bind(this));
    this.sidebarVersions = this._shadow.getElementById("SideNav--Versions");
    store.subscribe(state => state.versions, this.updateVersions.bind(this));

    // Membership
    this.membershipsLink = this._shadow.getElementById("SideNav--toggle-Membership");
    this.membershipsLink.addEventListener("click", this.initMemberships.bind(this));
    store.subscribe(state => state.versions, this.updateMembershipVersions.bind(this));
    store.subscribe(state => state.memberships, this.updateMemberships.bind(this));
   
    // if the new data has the ID, update the form
    // if not will need to remove the container so needs access to both...
    // Container outside of form bc used to be part of nav-to-container
    // this could possibly just be the form
    this.allContainers = new Map();
    this.versionForms = new Map();
    

    // Used in logic for job cluster / algorithm registration and gotten from django template
    this._userIsStaff = false;

    // Create store subscriptions
    store.subscribe(state => state.project, this.setupProjectSection.bind(this));
    store.subscribe(state => state.status, this.handleStatusChange.bind(this));
    // store.subscribe(state => state.versions, this.updateVersions.bind(this));

    // Error catch all
    window.addEventListener("error", (evt) => {
      //
    });
  }

  handleStatusChange(status, prevStatus) {
    console.log("Status was changed..." + JSON.stringify(status));
    if (status.name !== prevStatus.name) {
      if (status.name == "idle") {
        this.loading.hideSpinner();
      } else {
        this.loading.showSpinner(status.msg);
      }
    }

  }

  /* 
   * Run when project-id is set to run fetch the page content. 
  */
  async _init() {
    // Project data
    this.projectId = this.getAttribute("project-id");
    await store.getState().fetchProject(this.projectId);

    // //initialize these before??
    // await store.getState().fetchVersions();
    // await store.getState().fetchMediaTypes();
    // await store.getState().fetchJobClusters();
    
    if (window.location.hash) {
      this.moveToCurrentHash();
    }

    // // this handles back button, has catch for newly set will ignore
    window.addEventListener("hashchange", this.moveToCurrentHash.bind(this));
  }


  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["project-id","is-staff"].concat(TatorPage.observedAttributes);
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
        } else if (newValue == "False") {
          this._userIsStaff = false;
        }
        
        break;
    }
  }


  //
  async moveToCurrentHash() {
    const hash = window.location.hash;
    const toType = hash.split("-")[1];
    console.log(`Hash to ${toType}: ${hash}`);

    
  }

  setupProjectSection(project, prevProject) {
    console.log(project);
    this.projectData = project;
    this.breadcrumbs.setAttribute("project-name", this.projectData.name);

    //Get container and rename it to work with nav events...
    const container = this._shadow.getElementById("current-project-itemDiv");
    container.setAttribute("id", `itemDivId-Project-${this.projectData.id}`);

    // init form with the data
    this.projectView = this._shadow.getElementById("current-project-form");
    this.projectView._init({
      data: this.projectData,
      modal: this.modal,
      sidenav: this.settingsNav
    });
  }

  openAndInit() {
    // toggle open
    // spinner dependent on store.getState().versions.initialized
    // init the section
  }

  accordianShut() {
    let currentSelected = this._shadow.querySelector('.item-box:not([hidden])');
    this.hide(currentSelected);
  }

  makeItemActive(e) {
    // Navbar link active status
    let currentSelected = this._shadow.querySelectorAll('[selected="true"]')
    for(let el of currentSelected){
      el.setAttribute("selected", "false");
    }

    const target = e.target;
    target.setAttribute("selected", "true");
    this._shadow.querySelector(`.heading-for-${type}`).setAttribute("selected", "true");

    // Item container
    const itemIdSelector = target.getAttribute("href");
    const item = this._shadow.querySelector(itemIdSelector);
    if (item) {
      // Hide all other item containers
      let currentSelected = this._shadow.querySelector('.item-box:not([hidden])');
      this.hide(currentSelected);
      window.history.pushState({}, '', itemIdSelector);
      return this.show(item);
    }
  }

  async addNew() {
    await this.openVersions();
    this._shadow.querySelector(`a[href="#itemDivId-StateType-New"]`).click();
  }

  async openVersions(e) {
    if (this.sidebarVersions.hidden === true) {
      this.accordianShut();
      this.sidebarVersions.hidden = false;   
    }

    if (store.getState().versions.initialized === false) {
      console.log("Init versions.....");
      const versions = await store.getState().fetchVersions();

      // Setup form and add it to sidebar and page for each version
      for (let data of versions) {
        //clone a typeform, and insert the versions-edit form element
        const form = document.createElement("versions-edit");
        form.init();
        form.setupForm(data);
        this.versionForms.set(data.id, form);

        const itemDiv = this.addItemContainer({
           id: data.id, itemContents: form, type: "Version", hidden: true
        });
        this.versionContainers.set("Version_"+data.id, itemDiv);
      }

      // Do the same thing for the bottom new form
      const newForm = document.createElement("versions-edit");
      newForm.init();
      newForm.setupForm(newForm.emptyData());
      this.versionForms.set("New", form);

      const newDiv = this.addItemContainer({
        id: "New", itemContents: newForm, type: "Version", hidden: true
      });
      this.versionContainers.set("Version_New", newDiv);    
    }
  }

  updateVersions() {

  }

  async initMemberships() {
    console.log("Init versions.....");

    if (store.getState().versions.initialized === false) {
      await store.getState().fetchVersions();
    }

    this.updateMemberships();
  }

  updateMembershipVersions() {

  }

  updateMemberships() {

  }

  addItemContainer({ id = -1, itemContents = "", type = "", hidden = true, innerLinkText = ""}){
    const itemDiv = document.createElement("div");
    const itemIdSelector = `itemDivId-${type}-${id}`
    itemDiv.id = itemIdSelector; //ie. #itemDivId-MediaType-72
    itemDiv.setAttribute("class", `item-box item-group-${id}`);
    itemDiv.hidden = hidden;

    // Append to container
    if (itemContents != "") itemDiv.appendChild(itemContents);
    this.itemsContainer.appendChild(itemDiv);

    // This is for LEAF TYPE only (sub container)
    if (innerLinkText !== "") {
      let itemInnerDiv = document.createElement("div");
      itemInnerDiv.id = `${itemIdSelector}_inner`; //ie. #itemDivId-MediaType-72_inner
      itemInnerDiv.setAttribute("class", `item-box item-group-${id}_inner`);
      itemInnerDiv.hidden = true; //always hide on creation
      this.itemsContainer.appendChild(itemInnerDiv);
    }

    // Add the sidebar link to toggle this div open
    const section = this._shadow.querySelector(`.subitems-${type}`);
    const subNavLink = document.createElement("a");
    subNavLink.setAttribute("class", `SideNav-subItem ${(id == "New") ? "text-italic" : ""}`);
    subNavLink.href = itemIdSelector;
    section.appendChild(subNavLink);

    subNavLink.addEventListener("click", this.makeItemActive.bind(this));

    // This is for LEAF TYPE only (sub container)
    if (innerLinkText !== "") {
      let innerSelector = `#itemDivId-${type}-${obj.id}_inner`
      let innerSubNavLink = this.getSubItem(obj, type, innerSelector, innerLinkText);
      subNavLink.after(innerSubNavLink);
    }

    section.querySelector(`img`).hidden = true; // hide loading

    return itemDiv;
  }
  
  // Modal for this page, and handlers
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    this.modal._div.classList.remove("modal-wide"); // reset width
    return this.removeAttribute("has-open-modal");
  }

  // Hide and show to centralize where we are doing this action
  hide(el) {
    try {
      if(el.nodeType == Node.ELEMENT_NODE){
        return el.hidden = true;
      } else {
        let node = this._shadow.getElementById(el);
        return node.hidden = true;
      }
    } catch (err) {
      console.error("Error hiding element.")
    }

    
  }
  show(el){
    if(el.nodeType == Node.ELEMENT_NODE){
      return el.hidden = false;
    } else {
      let node = this._shadow.getElementById(el);
      return node.hidden = false;
    }
  }

}

customElements.define("project-settings", ProjectSettings);
