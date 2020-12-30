class ProjectSettings extends TatorPage {
  constructor() {
    super();

    this._shadow.appendChild(this.getLoading());

    // Template top.
    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center py-6");
    main.appendChild(header);

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
    // @TODO abstract this to take an object of DOMs? or Explicit ok
    this.settingsNav.setProjectDom( this.projectBlock.getDom() );
    this.settingsNav.setMediaDom( this.mediaTypesBlock.getDom() );
    this.settingsNav.setLocalizationDom( this.mediaTypesBlock.getDom() );
    this.settingsNav.setLeafDom( this.mediaTypesBlock.getDom() );
    this.settingsNav.setStateDom( this.mediaTypesBlock.getDom() );

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

    const projectPromise = this.projectBlock._fetchGetPromise({"id": this.projectId} );
    const mediaTypesPromise = this.mediaTypesBlock._fetchGetPromise({"id": this.projectId} );
    const localizationsPromise = this.localizationBlock._fetchGetPromise({"id": this.projectId} );
    const leafTypesPromise = this.leafTypesBlock._fetchGetPromise({"id": this.projectId} );
    const stateTypesPromise = this.stateTypesBlock._fetchGetPromise({"id": this.projectId} );

    const promiseList = [
      projectPromise,
      mediaTypesPromise,
      localizationsPromise,
      leafTypesPromise,
      stateTypesPromise
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
          this._shadow.querySelector('.loading').remove();

          const projectDataStr = JSON.stringify(project);
          const mediaDataStr = JSON.stringify(mediaTypes);
          const localizationDataStr = JSON.stringify(localization);
          const leafDataStr = JSON.stringify(leaf);
          const stateDataStr = JSON.stringify(state);

          // Project edit and nav (first seen on page).
          this.projectBlock._init( projectDataStr );
          this.settingsNav._init( {
            //"project" : projectDataStr, // static init in settings-nav
            "media" : mediaDataStr,
            "localization" :  localizationDataStr,
            "leaf" : leafDataStr,
            "state" : stateDataStr
          });

          // Pre-load the sections data.
          this.mediaTypesBlock._init( mediaDataStr );
          this.localizationBlock._init( localizationDataStr );
          this.leafTypesBlock._init( leafDataStr );
          this.stateTypesBlock._init( stateDataStr );

        })
        // TMP commented out to see the file and line number of error
        //.catch(err => {
          //this._shadow.querySelector('.loading').remove();
        //  console.error("File "+ err.fileName + " Line "+ err.lineNumber +"\n" + err);
        //})
      });
  }

  getLoading(){
    let loadingImg = document.createElement("img");
    loadingImg.setAttribute("class", "loading");
    loadingImg.setAttribute("src", "/static/images/loading.svg");

    return loadingImg;
  }

}

customElements.define("project-settings", ProjectSettings);
