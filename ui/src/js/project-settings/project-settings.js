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

    // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());
    this.loading.showSpinner();

    // header
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-2 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);
    
    this._breadcrumbs = document.createElement("settings-breadcrumbs");
    div.appendChild(this._breadcrumbs);

    const settingsDiv = document.createElement("div");
    settingsDiv.setAttribute("class", "d-flex");
    header.appendChild(settingsDiv);

    this._lightSpacer = document.createElement("span");
    this._lightSpacer.style.width = "32px";
    settingsDiv.appendChild(this._lightSpacer);

    this._success = document.createElement("success-light");
    this._lightSpacer.appendChild(this._success);

    // main element
    this.main = document.createElement("main");
    this.main.setAttribute("class", "position-relative");
    this._shadow.appendChild(this.main);

    // Navigation panels main for item settings.
    this.settingsNav = document.createElement("settings-nav");
    this.main.appendChild(this.settingsNav);

    // Web Components for this page
    this.settingsViewClasses = [
      "media-type-main-edit",
      "localization-edit",
      "leaf-type-edit",
      "state-type-edit",
      "membership-edit",
      "versions-edit",
      "algorithm-edit",
      "applet-edit",
    ];

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


    this._userIsStaff = false;

    // Modal parent - to pass to page components
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // Error catch all
    window.addEventListener("error", (evt) => {
      //
    });
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

  /* 
   * Run when project-id is set to run fetch the page content. 
  */
  async _init() {
    // Project data
    this.projectId = this.getAttribute("project-id");
    store.setState({ projectId: this.projectId });
    const objData = await store.getState().fetchProject();

    this.setupProjectSection(objData);
    this.loading.hideSpinner();

    // Data Handlers for Media and Version initialized below
    this._dataMediaList = new DataMediaList(this.projectId);
    this._dataMediaList._clear();
    // this._dataVersionList = new DataVersionList(this.projectId);
    // this._dataVersionList._clear();
    this._dataJobClusterList = new DataJobClusters(objData.organization);
    this._dataJobClusterList._clear();
    
    await this.setupTypeSections();
    
    if (window.location.hash) {
      this.moveToCurrentHash();
    }

    // this handles back button, has catch for newly set will ignore
    window.addEventListener("hashchange", this.moveToCurrentHash.bind(this));
      
  }

  //
  async moveToCurrentHash() {
    let target = this.settingsNav._shadow.querySelector(`a[href="${window.location.hash}"]`);

    if (target && target.getAttribute("selected") == true) {
      return false;
    } else {
      const hash = window.location.hash;
      const toType = hash.split("-")[1];
      console.log(`Hash to ${toType}: ${hash}`);
  
      if (toType != "Project") {
        const headingEl = this.settingsNav._shadow.querySelector(`.toggle-subitems-${toType}`);

        if (headingEl && headingEl.hasAttribute("initialized") && headingEl.getAttribute("initialized") == "true") {
          headingEl.click();
          target = this.settingsNav._shadow.querySelector(`a[href="${window.location.hash}"]`);
          return target && target.click();
        } else if(headingEl){
          headingEl.click();
  
          headingEl.addEventListener("initialized", () => {
            target = this.settingsNav._shadow.querySelector(`a[href="${window.location.hash}"]`);
            return target && target.click();
          }) 
        } else {
          //this hash isn't useful get away from that
          window.history.pushState({}, '', window.location.pathname);
          target = this.settingsNav._shadow.querySelector(`a[title="Project"]`);
          return target && target.click();
        }       
      } else {
        target = this.settingsNav._shadow.querySelector(`a[href="${window.location.hash}"]`);
        return target && target.click();
      }
    }

  }

  setupProjectSection(objData) {
    this.projectView = new ProjectMainEdit();
    const formView = this.projectView;    
    this.projectName = objData.name;
    this._breadcrumbs.setAttribute("project-name", this.projectName);

    // Make and fill a container on page
    this.makeContainer({
      objData,
      classBase: formView,
      hidden: false
    });    
    this.settingsNav.fillContainer({
      type: formView.typeName,
      id: objData.id,
      itemContents: formView
    });

    // init form with the data
    formView._init({
      data: objData,
      modal: this.modal,
      sidenav: this.settingsNav
    });

    // Add nav for container
    this.settingsNav._addSimpleNav({
      name: formView._getHeading(),
      type: formView.typeName,
      id: objData.id,
      // selected: true
    });
  }

  async setupTypeSections() {
    for (let i in this.settingsViewClasses) {
      // Add a navigation section
      let tc = this.settingsViewClasses[i];
      let typeClassView = document.createElement(tc);

      // Init membership view before adding to container
      if (typeClassView.typeName == "Membership") {
        this.membershipData = new MembershipData(this.projectId);
        typeClassView.init(this.membershipData);
      }


      // Add empty form container for + New
      const emptyData = {
        ...typeClassView._getEmptyData(),
        name: "+ Add new",
        project: this.projectId
      };
      this.makeContainer({
        objData: emptyData,
        classBase: typeClassView
      });

      // Get heading and fill container
      const headingEl = this.settingsNav._addNav({
        name: typeClassView._getHeading(),
        type: typeClassView.typeName,
        subItems: [emptyData]
      });

      this.settingsNav.fillContainer({
        type: typeClassView.typeName,
        id: emptyData.id,
        itemContents: typeClassView
      });

      // List to relevant data handlers to show the correct list options
      const usesMediaList = ["StateType", "LocalizationType"];
      if (usesMediaList.includes(typeClassView.typeName)) {
        this._dataMediaList.el.addEventListener("change", (e) => {
          // console.log(e.detail);
          typeClassView.updateMediaList(e.detail);
        });
      } else if (typeClassView.typeName == "Version" || typeClassView.typeName == "Membership") {
        await store.getState().fetchVersions();
        store.subscribe(state => state.versions, typeClassView.updateVersionList);
      }

      // Make media new list before we add an empty row
      if (typeClassView.typeName == "MediaType") {
        this._dataMediaList._setProjectMediaList("", true);
      }

      // Make versions new list before we add an empty row
      // if (typeClassView.typeName == "Version" || typeClassView.typeName == "Membership") {
      //   this._dataVersionList._setVersionList("", true);
      // }

      // Make Algorithm job cluster new list before we add an empty row
      if (typeClassView.typeName == "Algorithm") {
        this._dataJobClusterList._setList("", true);
      }

      // init the form with the data
      typeClassView._init({
        data: emptyData,
        modal: this.modal,
        sidenav: this.settingsNav,
        // versionListHandler: this._dataVersionList,
        mediaListHandler: this._dataMediaList,
        clusterListHandler: this._dataJobClusterList,
        isStaff: this._userIsStaff,
        projectName: this.projectName
      });

      headingEl.addEventListener("click", () => {
        // provide the class
        this._sectionInit({ viewClass: tc }).then(() => {
          headingEl.setAttribute("initialized", "true");
          headingEl.dispatchEvent(new Event("initialized"));
        });
      }, { once: true }); // just run this once
    }
  }

  /* Gets the section list when it is expanded. */
  async _sectionInit({ viewClass }) {
    //This is to get name from formView, not used on page
    const formView = document.createElement(viewClass);
    let objData = store.getState().getType(formView.typeName);
    

    // then we have not fetched this type before, or it is empty? recheck
    // todo should initial value be null?
    if (objData.length === 0) {
      objData = await store.getState().fetchType(formView.typeName);
    }
    console.log(objData);
    this.loading.hideSpinner();

    // Pass in data interface to memberships.
    if (formView.typeName == "Membership") {
      this.membershipData = new MembershipData(this.projectId);
    }

    // Make media new list before we add an empty row
    if (formView.typeName == "MediaType") {
      this._dataMediaList._setProjectMediaList(objData, true);
    }

    // // Make versions new list before we add an empty row
    // if (formView.typeName == "Version" || formView.typeName == "Membership") {
    //   // Versions number sort
    //   if (typeof objData[0] !== "undefined" && typeof objData[0].number !== "undefined") {
    //     objData = objData.sort((a, b) => a.number > b.number);
    //   }
    //   // const versionsList = new DataVersionList( this.projectId );
    //   this._dataVersionList._setVersionList(objData, true);
    // }

    // Make Algorithm job cluster new list before we add an empty row
    if (formView.typeName == "Algorithm") {
      this._dataJobClusterList._setList("", true);
    }

    // Add item containers for Types
    // Makes 2 containers for each object data, and as defined by "innerLinkText"
    let innerLinkText = "";
    if (formView.typeName == "LeafType") {
      // Only used for Leaf which has an inner container section
      const leafIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="20" height="20" viewBox="0 0 32 25" data-tags="site map,tree,map"><g transform="scale(0.03125 0.03125)"><path d="M767.104 862.88h-95.68c-17.6 0-31.904-14.24-31.904-31.872v-63.808c0-17.568 14.304-31.872 31.904-31.872h63.776v-159.488h-223.264v159.488h31.872c17.632 0 31.904 14.304 31.904 31.872v63.808c0 17.632-14.272 31.872-31.904 31.872h-95.68c-17.6 0-31.872-14.24-31.872-31.872v-63.808c0-17.568 14.272-31.872 31.872-31.872h31.936v-159.488h-223.296v159.488h63.776c17.632 0 31.904 14.304 31.904 31.872v63.808c0 17.632-14.272 31.872-31.904 31.872h-95.648c-17.632 0-31.904-14.24-31.904-31.872v-63.808c0-17.568 14.272-31.872 31.904-31.872v-159.488-31.872h255.168v-127.584h-95.68c-17.632 0-31.904-14.272-31.904-31.904l0-159.488c0-17.6 14.272-31.904 31.904-31.904h223.264c17.632 0 31.872 14.272 31.872 31.904v159.456c0 17.6-14.24 31.904-31.872 31.904h-95.68v127.584h255.168v31.872 159.488c17.6 0 31.904 14.304 31.904 31.872v63.808c-0.032 17.664-14.368 31.904-31.936 31.904zM224.896 767.2v63.808h95.648v-63.808h-95.648zM607.616 384.48v-159.488h-223.264v159.456h223.264zM448.128 767.2v63.808h95.68v-63.808h-95.68zM767.104 767.2h-95.68v63.808h95.68v-63.808z"/></g></svg>`;
      innerLinkText = leafIcon + " Add/Edit Leaves";
    }

    // Makes all the containers & navs at once
    this.makeContainers({
      objData,
      classBase: formView,
      innerLinkText 
    });
    this.settingsNav._addNav({
      type: formView.typeName,
      subItems: objData,
      subItemsOnly: true,
      innerLinkText
    });

    // Add contents for each Entity in a loop;
    for (let g of objData) {
      let form = document.createElement(viewClass);

      if (form.typeName == "Membership") {
        form.init(this.membershipData);
      }

      this.settingsNav.fillContainer({
        type: form.typeName,
        id: g.id,
        itemContents: form
      });

      // List to relevant data handlers to show the correct list options
      const usesMediaList = ["StateType", "LocalizationType"];
      if (usesMediaList.includes(form.typeName)) {
        this._dataMediaList.el.addEventListener("change", (e) => {
          // console.log(e.detail);
          form.updateMediaList(e.detail);
        });
      } else if (form.typeName == "Version" || form.typeName == "Membership") {
        // this._dataVersionList.el.addEventListener("change", (e) => {
        //   // console.log(e.detail);
        //   form.updateVersionList(e.detail);
        // });
        store.subscribe(state => state.versions, formView.updateVersionList);
      }

      // init form with the data
      form._init({
        data: g,
        modal: this.modal,
        sidenav: this.settingsNav,
        // versionListHandler: this._dataVersionList,
        mediaListHandler: this._dataMediaList,
        clusterListHandler: this._dataJobClusterList,
        isStaff: this._userIsStaff,
        projectName: this.projectName
      });

      // after the form is init
      if (form.typeName == "LeafType" && form.leafSection == null) {
        this.settingsNav.fillContainer({
          type: form.typeName,
          id: g.id,
          itemContents: form._getLeafSection(),
          innerNav: true
        });
      }
    }
  }

  makeContainer({ objData = {}, classBase, hidden = true, innerLinkText = "" }) {
    // Adds item panels for each view
    this.settingsNav.addItemContainer({
      type: classBase.typeName,
      id: objData.id,
      innerLinkText,
      hidden
    });
  }

  makeContainers({ objData = {}, classBase, hidden = true, innerLinkText = "" }) {
    for (let data of objData) {
      this.makeContainer({ objData: data, classBase, hidden, innerLinkText });
    }
  }

  // Modal for this page, and handlers
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    this.modal._div.classList.remove("modal-wide"); // reset width
    return this.removeAttribute("has-open-modal");
  }

}

customElements.define("project-settings", ProjectSettings);
