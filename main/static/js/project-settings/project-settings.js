class ProjectSettings extends TatorPage {
  constructor() {
    super();

    this.loading = new LoadingSpinner();
    this._shadow.appendChild( this.loading.getImg());
    this.loading.showSpinner();

    // Template top.
    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    // Left navigation
    this.settingsNav =  document.createElement("settings-nav");
    main.appendChild(this.settingsNav);

    // Right side - settings container
    const configContainer = document.createElement("div");
    configContainer.setAttribute("class", "col-8");
    configContainer.style.float = "right";
    main.appendChild(configContainer);

    // Project section.
    this.projectBlock = document.createElement("project-main-edit");
    configContainer.appendChild(this.projectBlock);

    // Media Type section.
    this.mediaTypesBlock = document.createElement("media-type-main-edit");
    configContainer.appendChild(this.mediaTypesBlock);

    // Localizations section.
    this.localizationBlock = document.createElement("localization-edit");
    configContainer.appendChild(this.localizationBlock);

    // Leaf Type section.
    this.leafTypesBlock = document.createElement("leaf-type-edit");
    configContainer.appendChild(this.leafTypesBlock);

    // State Type section.
    this.stateTypesBlock = document.createElement("state-type-edit");
    configContainer.appendChild(this.stateTypesBlock);

    // Reference for toggling shadow content
    // @TODO abstract form components into nav items without access to inner items of shadow dom!
    this.settingsNav._setDomArray([
      this.projectBlock.getDom(),
      this.mediaTypesBlock.getDom(),
      this.localizationBlock.getDom(),
      this.leafTypesBlock.getDom(),
      this.stateTypesBlock.getDom()
    ]); 

    // Error catch all
    window.addEventListener("error", (evt) => {
      //if(this._shadow.querySelector('._loading').length > 0) this._shadow.removeChild(this._loading);
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

    const promiseList = [
      this.projectBlock._fetchGetPromise({"id": this.projectId} ),
      this.mediaTypesBlock._fetchGetPromise({"id": this.projectId} ),
      this.localizationBlock._fetchGetPromise({"id": this.projectId} ),
      this.leafTypesBlock._fetchGetPromise({"id": this.projectId} ),
      this.stateTypesBlock._fetchGetPromise({"id": this.projectId} )
    ];

    Promise.all(promiseList)
    .then( async([pa, mta, lo, le, st]) => {
      const projectData = pa.json();
      const mediaTypesData = mta.json();
      const localizationData = lo.json();
      const leafTypeData = le.json();
      const stateTypeData = st.json();
      Promise.all( [projectData, mediaTypesData, localizationData, leafTypeData, stateTypeData] )
        .then( ([project, mediaTypes, localization, leaf, state]) => {
          this.loading.hideSpinner();

          // Add dynamic navigation items
          this.settingsNav._addSimpleNav({
            "name" : this._getHeading(),
            "type" : "project",
            "hash" : "#projectMain",
            "selected" : true
          });
          this.settingsNav._addNav({
            "name" : this.mediaTypesBlock._getHeading(), 
            "type" : this.mediaTypesBlock.typeName, 
            "subItems" : mediaTypes });
          this.settingsNav._addNav({
            "name" : this.localizationBlock._getHeading(), 
            "type" : this.localizationBlock.typeName, 
            "subItems" : localization });
          this.settingsNav._addNav({
            "name" : this.leafTypesBlock._getHeading(), 
            "type" : this.leafTypesBlock.typeName, 
            "subItems" : leaf });
          this.settingsNav._addNav({
            "name" : this.stateTypesBlock._getHeading(), 
            "type" : this.stateTypesBlock.typeName, 
            "subItems" : state });

          // Setup data to be passed into projects
          const projectDataStr = JSON.stringify(project);
          const mediaDataStr = JSON.stringify(mediaTypes);
          const localizationDataStr = JSON.stringify(localization);
          const leafDataStr = JSON.stringify(leaf);
          const stateDataStr = JSON.stringify(state);

          // Prepare for later
          localStorage.setItem(`MediaData_${this.projectId}`, mediaDataStr); 

          // Project edit and nav (first seen on page).
          this.projectBlock._init( projectDataStr );
          // Pre-load the sections data.
          this.mediaTypesBlock._init( mediaDataStr );
          this.localizationBlock._init( localizationDataStr );
          this.leafTypesBlock._init( leafDataStr );
          this.stateTypesBlock._init( stateDataStr );

        })
        //.catch(err => {
        //  console.error("Error: "+ err);
        //  this.loading.hideSpinner();
        //});
      });
  }

  _getHeading(){
    let icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V1.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zM8 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 3z"></path></svg>';
    return `${icon} <span class="item-label">Project</span>`
  }

}

customElements.define("project-settings", ProjectSettings);
