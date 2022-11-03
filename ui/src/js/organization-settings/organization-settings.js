import { TatorPage } from "../components/tator-page.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { OrganizationData } from "./organization-data.js";
import { OrganizationMainEdit } from "./organization-main-edit.js";
import { store } from "./store.js";

export class OrganizationSettings extends TatorPage {
  constructor() {
    super();

    // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild( this.loading.getImg());
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
    this.settingsNav =  document.createElement("settings-nav-no-template");
    this.main.appendChild( this.settingsNav );

    // Web Components for this page
    this.settingsViewClasses = [  "affiliation-edit",
                                  "invitation-edit",
                                  "bucket-edit",
                                  "job-cluster-edit",
                               ];
    
    // Modal parent - to pass to page components
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild( this.modal );
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // Create store subscriptions
    store.subscribe(state => state.user, this._setUser.bind(this));
    store.subscribe(state => state.announcements, this._setAnnouncements.bind(this));
    store.subscribe(state => state.organization, this._init.bind(this));

    // Error catch all
    window.addEventListener("error", (evt) => {
      //
    });

  }

  connectedCallback() {
    store.getState().init();
  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["email_enabled"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "email_enabled":
        this._emailEnabled = newValue === "False" ? false : true;
        break;
    }
  }

  /* 
   * Run when organization-id is set to run fetch the page content. 
   */
  _init(organization) {
    // Organization data
    this._breadcrumbs._projectText.textContent = "Organizations";
    this._breadcrumbs._projectText.setAttribute("href", `/organizations`);
    this._breadcrumbs._settingsText.textContent = `Organization ${organization.id} settings`;
    this.organizationId = organization.id;
    this.organizationData = new OrganizationData(this.organizationId);
    this.organizationEdit = new OrganizationMainEdit();
    const organizationPromise = this.organizationData.getOrganization();

    organizationPromise
    .then(data => {
      const formView = this.organizationEdit;

      this.loading.hideSpinner();
      this.makeContainer({
        objData: data, 
        classBase: formView,
        hidden : false
      });

      // Fill it with contents
      this.settingsNav.fillContainer({
        type : formView.typeName,
        id : data.id,
        itemContents : formView
      });

      // init form with the data
      formView._init({ 
        data: data, 
        modal : this.modal, 
        sidenav: this.settingsNav,
        orgData: this.organizationData
      });

      // Add nav to that container
      this.settingsNav._addSimpleNav({
        name : formView._getHeading(),
        type : formView.typeName ,
        id : data.id,
        selected : true
      });
       
      for (let i in this.settingsViewClasses) {
        // Add a navigation section
        // let data =  dataArray[i] ;
        let tc = this.settingsViewClasses[i];
        let typeClassView = document.createElement(tc);

        // Data for a subitem that is an empty row
        // an empty row in each TYPE
        let emptyData = typeClassView._getEmptyData();
        emptyData.name = "+ Add new";
        emptyData.organization = this.organizationId;

        // Add empty form container for + New
        this.makeContainer({
          objData: emptyData, 
          classBase: typeClassView
        });

        // Add navs
        const headingEl = this.settingsNav._addNav({
          name : typeClassView._getHeading(),
          type : typeClassView.typeName, 
          subItems : [ emptyData ]
        });

        // Add add new containers
        typeClassView.init(this.organizationData);

        this.settingsNav.fillContainer({
          type : typeClassView.typeName,
          id : emptyData.id,
          itemContents : typeClassView
        });

        // init the form with the data
        typeClassView._init({ 
          data : emptyData, 
          modal : this.modal, 
          sidenav: this.settingsNav,
          orgData: this.organizationData
        });

        headingEl.addEventListener("click", () => {
          // provide the class
          this._sectionInit({ viewClass : tc })
        }, { once: true }); // just run this once
      }
    });
  }

  /* Run when organization-id is set to run fetch the page content. */
  _sectionInit( {viewClass} ) {
    const formView = document.createElement( viewClass );
    console.log(viewClass);

    formView._fetchGetPromise({"id": this.organizationId} )
    .then( (data) => {
      return data.json();
    }).then( (objData) => {
      this.loading.hideSpinner();

      // Add item containers for Types
      this.makeContainers({
        objData, 
        classBase: formView
      });

      // Add navs
      this.settingsNav._addNav({
        type : formView.typeName, 
        subItems : objData,
        subItemsOnly : true
      });

      // Add contents for each Entity
      for(let g of objData){
        let form = document.createElement(viewClass);
        this.settingsNav.fillContainer({
          type : form.typeName,
          id : g.id,
          itemContents : form
        });

        // init form with the data
        form._init({ 
          data : g, 
          modal : this.modal, 
          sidenav: this.settingsNav,
          orgData: this.organizationData
        });

        if (viewClass == "invitation-edit") {
          console.log("Email enabled is: "+this._emailEnabled)
          form.emailEnabled = this._emailEnabled;
        }

      }
          
    });
  }

  makeContainer({objData = {}, classBase, hidden = true}){
    // Adds item panels for each view
    this.settingsNav.addItemContainer({
      type : classBase.typeName,
      id : objData.id,
      hidden
    });
  }
  
  makeContainers({objData = {}, classBase, hidden = true}){
     for(let data of objData){
      this.makeContainer({objData : data, classBase, hidden});
    }
  }

  // Modal for this page, and handlers
  showDimmer(){
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer(){
    return this.removeAttribute("has-open-modal");
  }

}

customElements.define("organization-settings", OrganizationSettings);
