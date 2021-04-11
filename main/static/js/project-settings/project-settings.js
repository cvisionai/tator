class ProjectSettings extends TatorPage {
  constructor() {
    super();

    // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild( this.loading.getImg());
    this.loading.showSpinner();

    // main element
    this.main = document.createElement("main");
    this.main.setAttribute("class", "position-relative");
    this._shadow.appendChild(this.main);

    // Navigation panels main for item settings.
    this.settingsNav =  document.createElement("settings-nav");
    this.main.appendChild( this.settingsNav );

    // Web Components for this page
    this.settingsViewClasses = [
      "project-main-edit",
      "media-type-main-edit",
      "localization-edit",
      "leaf-type-edit",
      "state-type-edit",
      "membership-edit",
    ];

    // Modal parent - to pass to page components
    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild( this.modal );
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // Error catch all
    window.addEventListener("error", (evt) => {
      //
    });

  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["project-id"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-id":
        this._init();
        break;
    }
  }

  /* Run when project-id is set to run fetch the page content. */
  _init() {
    this.projectId = this.getAttribute("project-id");
    this.projectView = new ProjectMainEdit();
    this.typesData = new ProjectTypesData(this.projectId);
    let typePromises = this.typesData._getAllTypePromises();
    this.membershipData = new MembershipData(this.projectId);
    let membershipPromise = this.membershipData._getMembershipPromise();

    const promiseList = [
      this.projectView._fetchGetPromise({"id": this.projectId} ),
      ...typePromises,
      membershipPromise,
    ];

    Promise.all(promiseList)
    .then( async([pa, mta, lo, le, st, mem]) => {
      const projectData = pa.json();
      const mediaTypesData = mta.json();
      const localizationData = lo.json();
      const leafTypeData = le.json();
      const stateTypeData = st.json();
      const membershipData = mem.json();
      Promise.all( [
        projectData, 
        mediaTypesData, 
        localizationData, 
        leafTypeData, 
        stateTypeData,
        membershipData,
      ] ).then( (dataArray) => {
          this.loading.hideSpinner();
          
          for(let i in this.settingsViewClasses){
            // Add a navigation section
            let objData =  dataArray[i] ;
            let tc = this.settingsViewClasses[i];
            let formView = document.createElement(tc);

            // Pass in data interface to memberships.
            if (formView.typeName == "Membership") {
              formView.init(this.membershipData);
            }

            if(formView.typeName == "Project"){
              // Add project container and nav (set to selected)
              this.makeContainer({
                objData, 
                "classBase": formView,
                "hidden" : false
              });

              // Fill it with contents
              this.settingsNav.fillContainer({
                "type" : formView.typeName,
                "id" : objData.id,
                "itemContents" : formView
              });

              // init form with the data
              formView._init({ 
                "data": objData, 
                "modal" : this.modal, 
                "sidenav" : this.settingsNav
              });

              // Add nav to that container
              this.settingsNav._addSimpleNav({
                "name" : formView._getHeading(objData.id),
                "type" : formView.typeName ,
                "id" : objData.id,
                "selected" : true
              });

            } else {
              // Make media new list before we add an empty row
              if(formView.typeName == "MediaType"){
                const mediaList = new DataMediaList( this.projectId );
                mediaList._setProjectMediaList(objData, true);
              }

              // an empty row in each TYPE
              let emptyData = formView._getEmptyData();
              emptyData.name = "+ Add new";
              emptyData.project = this.projectId;
              objData.push( emptyData );

              // Add item containers for Types
              this.makeContainers({
                objData, 
                "classBase": formView
              });

              // Add navs
              this.settingsNav._addNav({
                "name" : formView._getHeading(),
                "type" : formView.typeName, 
                "subItems" : objData 
              });

              // Add contents for each Entity
              for(let g of objData){
                let form = document.createElement(tc);
                if (form.typeName == "Membership") {
                  form.init(this.membershipData);
                }
                this.settingsNav.fillContainer({
                  "type" : form.typeName,
                  "id" : g.id,
                  "itemContents" : form
                });

                // init form with the data
                form._init({ 
                  "data": g, 
                  "modal" : this.modal, 
                  "sidenav" : this.settingsNav
                });
              }
            }
          }    

        })
        //.catch(err => {
        //  console.error("Error: "+ err);
        //  this.loading.hideSpinner();
        //});
      });
  }

  makeContainer({objData = {}, classBase, hidden = true}){
    // Adds item panels for each view
    this.settingsNav.addItemContainer({
      "type" : classBase.typeName,
      "id" : objData.id,
      hidden
    });
  }
  
  makeContainers({objData = {}, classBase, hidden = true}){
     for(let data of objData){
      this.makeContainer({"objData" : data, classBase, hidden});
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

customElements.define("project-settings", ProjectSettings);
