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


    // Web Components for this page by name
    this.viewClassesByName = new Map();
    this.viewClassesByName.set("MediaType", {
      element: "media-type-main-edit",
      forms: new Map(),
      sidebar: new Map()
    })
      .set("LocalizationType", {
        element: "localization-edit",
        forms: new Map(),
        sidebar: new Map()
      })
      .set("LeafType", {
        element: "leaf-type-edit",
        forms: new Map(),
        sidebar: new Map()
      })
      .set("StateType", {
        element: "state-type-edit",
        forms: new Map(),
        sidebar: new Map()
      })
      .set("Membership", {
        element: "membership-edit",
        forms: new Map(),
        sidebar: new Map()
      })
      .set("Version", {
        element: "versions-edit",
        forms: new Map(),
        sidebar: new Map()
      })
      .set("Algorithm", {
        element: "algorithm-edit",
        forms: new Map(),
        sidebar: new Map()
      })
      .set("Applet", {
        element: "applet-edit",
        forms: new Map(),
        sidebar: new Map()
      });

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

    // Wait until we have project
    this._shadow.querySelectorAll('button[id^="SideNav--toggle-"]').forEach(el => {
      console.log(el);
      el.addEventListener("click", this.toggle.bind(this))
    });

    if (window.location.hash) {
      this.moveToCurrentHash();
    }

    // // this handles back button, has catch for newly set will ignore
    window.addEventListener("hashchange", this.moveToCurrentHash.bind(this));
  }


  /**
   * @param {string} val
   */
  set selectedHash(val) {
    console.log(`new hash ${val}`);
    if (!this._selectedHash || (this._selectedHash && val !== this._selectedHash)) {
      this._selectedHash = val;
      console.log(this._selectedHash);

      if (val.split("-").length === 3) {
        // We have a valid hash 🤘
        const type = val.split("-")[1];

        store.getState().initType(type)

        // Set type and obeject using hash
        this.selectedType = type;
        this.selectedObject = val.split("-")[2];
        this.showSelectedItemDiv();
      } else {
        // Error handle
        console.warn("Hash set is invalid: " + val);
      }
    } else if (val == "reset") {
      this._selectedHash = val;
      this._selectedType = val;
      this._selectedObject = val;
    }

  }

  /**
   * @param {string} val
   */
  set selectedType(val) {
    console.log(`We are setting the type to the same thing?.... ${typeof this._selectedType !== "undefined" && val === this._selectedType}`);
    if (typeof this._selectedType === "undefined" ||
      (typeof this._selectedType !== "undefined" && val !== this._selectedType)) {
      // if type has changed or first set
      this._selectedType = val;

      // Change section highlight, and open nav
      this.handleSelectedNav('SideNav-heading[selected="true"]', false);
      this.handleSelectedNav(`.heading-for-${val}`, true);
      this.handleSectionVisible();
    }

    // This allows user to toggle shut if desired without changing seletion
    // #todo with click handler elsewhere
  }

  /**
   * @param {string} val
   */
  set selectedObjectId(val) {
    if (typeof this._selectedObjectId == "undefined" || (typeof this._selectedObjectId !== "undefined" && val !== this._selectedObjectId)) {
      // if type has  changed
      this._selectedObjectId = val;

      // Change object highlight, and show itemDiv
      this.handleSelectedNav('.SideNav-subItem[selected="true"]', false);
      this.handleSelectedNav(`.SideNav-subItem[href="${this._selectedHash}"]`, true);
    }
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
    this.selectedHash = hash;
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

    // init form with the data
    this.projectView = this._shadow.getElementById("current-project-form");
    this.projectView._init({
      data: this.projectData,
      modal: this.modal,
      sidenav: this.settingsNav
    });
  }


  /**
   * Uses the selected hash to determine which item should be live
   */
  showSelectedItemDiv() {
    const selectedItemDiv = this.itemsContainer.querySelector('.item-box:not([hidden])');
    if (selectedItemDiv) selectedItemDiv.hidden = true;

    const newSelection = this.itemsContainer.querySelector(this._selectedHash)
    if (newSelection) {
      newSelection.hidden = false;
    } else {
      console.warn("Couldn't find the new selected hash: " + this._selectedHash);
    }
  }

  /**
   * Removes or adds the selected attribute on a heading / object link
   * @param {string} selector 
   */
  handleSelectedNav(selector, value) {
    let currentSelected = this.settingsNav.querySelector(selector);
    if (currentSelected) {
      if (value) currentSelected.setAttribute("selected", "true");
      if (!value) currentSelected.removeAttribute("selected");
    }
  }

  /**
   * Finds the section and opens or closes it
   * @param {string} type (OPTIONAL)
   * if supplied it will close visible and open type section
   */
  handleSectionVisible() {
    console.log("handleSectionVisible");
    if (this._selectedType !== null) {
      // Open section
      const toOpen = this.settingsNav.querySelector(`.subitems-${this._selectedType}`);

      if (toOpen && toOpen.hidden === false) {
        // We selected this type, but it is already open (toggle shut)
        toOpen.hidden = true;
      } else {
        // Shut other open items first
        const toShut = this._shadow.querySelector('.SubItems:not([hidden])');
        if (toShut) return toShut.hidden = true;

        // Show the section
        if (toOpen) toOpen.hidden = false;
      }
    }
  }

  // async addNewVersion() {
  //   const newHash = `#itemDivId-Version-New`;
  //   const newSelection = this.itemsContainer.querySelector(newHash)
  //   if (!newSelection) {
  //     await this.toggle(null, type);
  //   }
  //   this.selectedHash = newHash;
  // }

  async toggle(evt = null, type = null) {
    type = (evt !== null) ? String(evt.currentTarget.getAttribute("id")).replace("SideNav--toggle-", "") : type;
    console.log("TOGGLE.........................");
    if (type !== null) {
      if (typeof this._selectedType !== "undefined" && type === this._selectedType) {
        // toggles
        this.handleSectionVisible();
      } else {
        // toggles and set        
        await store.getState().initType(type);
        this.selectedType = type;
      }
    } else {
      console.error("Could not toggle type.");
    }

  }

  async updateDisplay(newType, oldType) {
    const type = newType.name;
    const info = this.viewClassesByName.get(type);;
    const forms = info.forms;
    const sidebar = info.sidebar;

    // When we first update, remove placeholder
    if (newType.init !== oldType.init) {
      this.settingsNav.querySelector(`.subitems-${type} placeholder-glow`).hidden = true;
    }

    // What is in newArray but not in forms
    const newArray = Array.from(newType.setList);
    const currentFormKeys = Array.from(forms.keys());
    const diff = newArray.filter(x => !currentFormKeys.includes(x));
    const diffB = currentFormKeys.filter(x => !newArray.includes(x) && x !== "New");

    if (diffB.length === 1) {
      const removedId = diffB[0];

      // Remove the link and form from page
      forms.get(removedId).remove();
      sidebar.get(removedId).remove();

      // Remove the link and form from reference
      forms.delete(removedId);
      sidebar.delete(removedId);

      // Select first item in section (don't let page go blank)
      if (sidebar.size !== 0) {
        const [firstObject] = sidebar;
        // console.log(firstObject);
        firstObject[1].click();
      }
    }

    if (diff.length > 1 && forms.size === 0) {
      console.log("All new!"); // assumption, this should prob run off of diffA
      // First time initializing this section possibly, loop all
      for (let id of newType.setList) {
        const addData = newType.map.get(id);
        this.addSection({ type, data: addData });
      }
    } else {
      console.log("We're just updating existing forms");
      // No diff in ids, there is an update
      for (let [id, form] of forms) {
        if (id !== "New") {
          const updatedData = newType.map.get(id);
          form.setupForm(updatedData);
          const sideBarLink = sidebar.get(id);
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
      const addData = newType.map.get(id);

      // Add new section
      console.log("// Add new section");
      this.addSection({ type, data: addData });

      // Highlight the new object
      console.log("// Highlight the new object");
      const newHash = `#itemDivId-${type}-${id}`;
      this.selectedHash = newHash;
    }

    // For all updates
    if (!forms.has("New")) {
      // make it
      this.addSection({ type, data: null, isEmpty: true });
    }

    // TODO this will be a different function
    // then for each membership form (if those are init)
    // run the update versions function
    // if (type == "Version" && store.getState().Membership.init) {
    //   for (let m of store.getState().Membership.data) {
    //     const form = this.membershipForms.get(m.id);
    //     form._updateVersionList();
    //   }
    // }

    if (this._shadow.querySelector(this._selectedHash) && this._shadow.querySelector(this._selectedHash).hidden == true) {
      const saveHash = `${this._selectedHash}`;
      this.selectedHash = "reset";
      this.selectedHash = saveHash;
    }

  }

  /**
   * Creates the form and fills it with data
   * Adds item to the page, and sidebarLink
   * 
   * @param {string} type 
   * @param {object} data 
   * @param {boolean} isEmpty 
   */
  addSection({ type, data, isEmpty = false, innerLinkText = "" }) {
    // console.log(data);

    // Create and init the form element
    const info = this.viewClassesByName.get(type);
    const elementName = info.element;
    const form = document.createElement(elementName);
    if (data === null || isEmpty === true) data = form._getEmptyData();

    // Init and add data
    form.init(this.modal);
    form.setupForm(data);

    // Save reference for later
    info.forms.set(data.id, form);


    //
    const id = data.id;
    const itemIdSelector = `itemDivId-${type}-${id}`;
    const hidden = this._selectedObjectId !== id;

    //
    const itemDiv = document.createElement("div");
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
      this.itemsContainer.appendChild(itemInnerDiv);
    }

    // Add the sidebar link to toggle this div open
    const section = this._shadow.querySelector(`.subitems-${type}`);
    const subNavLink = document.createElement("a");
    subNavLink.setAttribute("class", `SideNav-subItem ${(id == "New") ? "text-italic" : ""}`);
    subNavLink.href = `#${itemIdSelector}`;
    subNavLink.textContent = data.name;
    if (!hidden) subNavLink.setAttribute("selected", "true");
    subNavLink.addEventListener("click", () => {
      this.selectedHash = `#${itemIdSelector}`;
    });
    info.sidebar.set(id, subNavLink);

    // Add link to sidebar
    const newLink = this._shadow.querySelector(`a.SideNav-subItem[href="#itemDivId-${type}-New"]`)
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

}

customElements.define("project-settings", ProjectSettings);
