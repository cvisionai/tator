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

    // // Header: This is adds the breadcrumb and successLight-spacer to the header
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
    // this.settingsNav = this._shadow.getElementById("project-settings--nav");
    this.modal = this._shadow.getElementById("project-settings--modal");
    this.itemsContainer = this._shadow.getElementById("settings-nav--item-container");

    /* For all the sidebar toggles */
    // Version
    this.versionLink = this._shadow.getElementById("SideNav--toggle-Version");
    this.versionLink.addEventListener("click", this.toggleVersions.bind(this));
    this.versionPlusLink = this._shadow.querySelector(".heading-for-Version .Nav-action");
    this.versionPlusLink.addEventListener("click", this.addNew.bind(this));
    this.sidebarVersions = this._shadow.getElementById("SideNav--Versions");
    store.subscribe(state => state.versions, this.updateVersions.bind(this));

    // // Membership
    // this.membershipsLink = this._shadow.getElementById("SideNav--toggle-Membership");
    // this.membershipsLink.addEventListener("click", this.initMemberships.bind(this));
    // store.subscribe(state => state.versions, this.updateMembershipVersions.bind(this));
    // store.subscribe(state => state.memberships, this.updateMemberships.bind(this));

    // if the new data has the ID, update the form
    // if not will need to remove the container so needs access to both...
    // Container outside of form bc used to be part of nav-to-container
    // this could possibly just be the form
    this.allContainers = new Map();
    this.versionForms = new Map();
    this.versionSidebar = new Map();


    // Used in logic for job cluster / algorithm registration and gotten from django template
    this._userIsStaff = false;

    // Create store subscriptions
    store.subscribe(state => state.project, this.setupProjectSection.bind(this));
    store.subscribe(state => state.status, this.handleStatusChange.bind(this));
    // store.subscribe(state => state.versions, this.updateVersions.bind(this));



    // Web Components for this page by name
    this.viewClassesByName = new Map();
    this.viewClassesByName.set("MediaType", "media-type-main-edit")
      .set("LocalizationType", "localization-edit")
      .set("LeafType", "leaf-type-edit")
      .set("StateType", "state-type-edit")
      .set("Membership", "membership-edit")
      .set("Version", "versions-edit")
      .set("Algorithm", "algorithm-edit")
      .set("Applet", "applet-edit");

    // Error catch all
    // window.addEventListener("error", (evt) => {
    //   //
    // });
  }

  handleStatusChange(status, prevStatus) {
    console.log("Status was changed..." + JSON.stringify(status));
    // if (status.name !== prevStatus.name) {
      if (status.name == "idle") {
        this.loading.hideSpinner();
      } else if (status.name == "error") {
        this.loading.hideSpinner();
        this.modal._error(status.msg);
      } else {
        this.loading.showSpinner(status.msg);
      }
    // }
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
        } else if (newValue == "False") {
          this._userIsStaff = false;
        }

        break;
    }
  }


  //
  async moveToCurrentHash() {
    const hash = window.location.hash;

    if (document.getElementById(hash)) {
      this.selectNavAndItem(hash);
    }
  }

  setupProjectSection(project, prevProject) {
    console.log(project);
    this.projectData = project;
    this._breadcrumbs.setAttribute("project-name", this.projectData.name);

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

  accordianShutOthers(type) {
    const currentOpen = this._shadow.querySelectorAll('.SubItems:not([hidden]');
    for (let el of currentOpen) {
      el.hidden = true;
    }
    const currentSelected = this._shadow.querySelectorAll('[selected="true"]')
    for (let el of currentSelected) {
      el.setAttribute("selected", "false");
    }
    this._shadow.querySelector(`.heading-for-${type}`).setAttribute("selected", "true");;
  }

  selectNavAndItem(hash) {
    const type = hash.split("-")[1];
    const itemDiv = this._shadow.querySelector(hash);
    console.log(itemDiv);
    let currentSelected = this._shadow.querySelectorAll('[selected="true"]')
    for (let el of currentSelected) {
      el.setAttribute("selected", "false");
    }
    const selectedHeading = this._shadow.querySelector(`a[href="${hash}"]`);
    console.log(selectedHeading);
    if (selectedHeading) selectedHeading.setAttribute("selected", "true");
    this._shadow.querySelector(`.heading-for-${type}`).setAttribute("selected", "true");

    // Hide all other item containers
    const currentSelectedItem = this._shadow.querySelector('.item-box:not([hidden])');
    this.hide(currentSelectedItem);
    this.show(itemDiv);
  }

  makeItemActive(e) {
    console.log(e.target);
    const hash = e.target.getAttribute("href");
    this.selectNavAndItem(hash);
  }

  async addNew() {
    if (this.sidebarVersions.hidden === true) {
      this.accordianShutOthers();
      this.sidebarVersions.hidden = false;
    }
    this._shadow.querySelector(`a[href="#itemDivId-StateType-New"]`).click();
  }

  toggleVersions() {
    // toggles
    if (this.sidebarVersions.hidden === true) {
      this.accordianShutOthers("Version");
      this.sidebarVersions.hidden = false;
    } else {
      this.sidebarVersions.hidden = true;
    }

    //
    if (store.getState().versions.init === false) {
      console.log("Init versions.....");
      store.getState().fetchVersions();
    }
  }

  async updateVersions(newVersions, oldVersions) {
    // console.log("updateVersions");
    // console.log(newVersions);
    // console.log(oldVersions);
    // console.log(store.getState().versions);

    // if (newVersions.init === true) {
      this.sidebarVersions.querySelector(`.placeholder-glow`).hidden = true;
    // }

    // What is in newArray but not in forms
    const newArray = Array.from(newVersions.setList);
    const currentFormKeys = Array.from(this.versionForms.keys());
    const diff = newArray.filter(x => !currentFormKeys.includes(x));
    const diffB = currentFormKeys.filter(x => !newArray.includes(x) && x !== "New");

    if (diffB.length === 1) {
      const removedId = diffB[0];

      this.versionForms.get(removedId).remove();    
      this.versionSidebar.get(removedId).remove();

      this.versionForms.delete(removedId);    
      this.versionSidebar.delete(removedId);
    }
    
    if (diff.length > 1 && this.versionForms.size === 0) {
      console.log("All new!"); // assumption, this should prob run off of diffA
      // First time initializing this section possibly, loop all
      for (let id of newVersions.setList) {
        const addData = newVersions.map.get(id);
        this.addSection({type: "Version", data: addData});       
      }
    } else {
      console.log("We're just updating existing forms");
      // No diff in ids, there is an update
      for (let [id, form] of this.versionForms) {
        if (id !== "New") {
          const updatedData = newVersions.map.get(id);
          form.setupForm(updatedData);
          if (id == 856) console.log(updatedData.name);
          const sideBarLink = this.versionSidebar.get(id);
          sideBarLink.textContent = updatedData.name;          
        } else {
          const updatedData = form._getEmptyData();
          form.setupForm(updatedData);
        }
      }
    }

    if (diff.length === 1) {
      console.log("One new!" + diff[0]);
      const id = diff[0];
      const addData = newVersions.map.get(id);
      console.log(addData);
      const hashId = `itemDivId-Version-${id}`;

      this.addSection({type: "Version", data: addData, hidden: false});
      this.selectNavAndItem(hashId);
    }

    // For all updates
    if (!this.versionForms.has("New")) {
      // make it
      this.addSection({type:"Version", data:null, isEmpty: true});
    }

    // then for each membership form (if those are init)
    // run the update versions function
    if (store.getState().memberships.init) {
      for (let m of store.getState().memberships.data) {
        const form = this.membershipForms.get(m.id);
        form._updateVersionList();
      }
    }
  }


  /**
   * This is the membership specific init that ties into other fns
   */
   async initMemberships() {
    console.log("#TODO ---- initMemberships.....")
  }

  /**
   * Creates the form and fills it with data
   * Adds item to the page, and sidebarLink
   * 
   * @param {string} type 
   * @param {object} data 
   * @param {boolean} isEmpty 
   */
  addSection({type, data, isEmpty = false, innerLinkText = "", hidden = true}) {
    console.log(data);

    // Create and init the form element
    const elementName = this.viewClassesByName.get(type);
    const form = document.createElement(elementName);
    if (data === null || isEmpty === true) data = form._getEmptyData();
    
    // Init and add data
    form.init(this.modal);
    form.setupForm(data);

    // Save reference for later
    this.versionForms.set(data.id, form);
    
    //
    const id = data.id;
    const itemDiv = document.createElement("div");
    const itemIdSelector = `itemDivId-${type}-${id}`
    itemDiv.id = itemIdSelector; //ie. #itemDivId-MediaType-72
    itemDiv.setAttribute("class", `item-box item-group-${id}`);
    itemDiv.hidden = hidden;

    // Append to container
    itemDiv.appendChild(form);
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
    subNavLink.href = `#${itemIdSelector}`;
    subNavLink.textContent = data.name;
    subNavLink.addEventListener("click", this.makeItemActive.bind(this));
    this.versionSidebar.set(id, subNavLink);
    console.log(subNavLink);

    // Add link to sidebar
    const newLink = this._shadow.querySelector(`a[href="#itemDivId-Version-New"]`)
    if (newLink) {
      newLink.before(subNavLink);
    } else {
      section.appendChild(subNavLink);
    }

    // This is for LEAF TYPE only (sub container)
    if (innerLinkText !== "") {
      let innerSelector = `#itemDivId-${type}-${obj.id}_inner`
      let innerSubNavLink = this.getSubItem(obj, type, innerSelector, innerLinkText);
      subNavLink.after(innerSubNavLink);
    }

    return itemDiv;
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

  // Hide and show to centralize where we are doing this action
  hide(el) {
    console.log("Hide el.........");
    console.log(el);
    try {
      if (el && el.nodeType == Node.ELEMENT_NODE) {
        return el.hidden = true;
      } else if (el !== null) {
        try {
          let node = this._shadow.getElementById(el);
          return node.hidden = true;
        } catch (err) {
          console.error("Error hiding element.", err)
        }

      }
    } catch (err) {
      console.error("Error hiding element.", err)
    }


  }
  show(el) {
    try {
      if (el && el.nodeType == Node.ELEMENT_NODE) {
        return el.hidden = false;
      } else if (el !== null) {
        try {
          let node = this._shadow.getElementById(el);
          return node.hidden = false;
        } catch (err) {
          console.error("Error showing element.", err)
        }
      }
    } catch (err) {
      console.error("Error showing element.", err)
    }
  }

}

customElements.define("project-settings", ProjectSettings);
