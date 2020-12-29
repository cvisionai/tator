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

    // Configuration form.
    const configForm = document.createElement("form");
    configForm.setAttribute("class", "col-8");
    configForm.style.float = "right";

    main.appendChild(configForm);

    // Left navigation
    this.settingsNav =  document.createElement("settings-nav");
    main.appendChild(this.settingsNav);

    // Project section.
    this.projectBlock = document.createElement("project-main-edit");
    configForm.appendChild(this.projectBlock);

    // Media Type section.
    this.mediaTypesBlock = document.createElement("media-type-main-edit");
    configForm.appendChild(this.mediaTypesBlock);

    // Localizations section.
    this.localizationBlock = document.createElement("localization-edit");
    configForm.appendChild(this.mediaTypesBlock);

    // Leaf Type section.
    this.leafTypesBlock = document.createElement("leaf-type-edit");
    configForm.appendChild(this.mediaTypesBlock);

    // Reference for toggling shadow content
    // @TODO abstract this to take an object of DOMs
    this.settingsNav.setProjectDom( this.projectBlock.getDom() );
    this.settingsNav.setMediaDom( this.mediaTypesBlock.getDom() );

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

    const promiseList = [
      projectPromise,
      mediaTypesPromise,
      localizationsPromise,
      leafTypesPromise
    ]

    Promise.all(promiseList)
    .then( async([pa, mta, lo, le]) => {
      const projectData = pa.json();
      const mediaTypesData = mta.json();
      const localizationData = lo.json();
      const leafTypeData = le.json();
      Promise.all( [projectData, mediaTypesData, localizationData, leafTypeData] )
        .then( ([project, mediaTypes, localization, leaf]) => {
          this._shadow.querySelector('.loading').remove();

          // Init project edit and media type sections.
          this.projectBlock._init(JSON.stringify(project));
          this.mediaTypesBlock._init( JSON.stringify(mediaTypes));
          this.settingsNav._init( JSON.stringify(mediaTypes));
          this.localizationBlock._init( JSON.stringify(localization));
          this.settingsNav._init( JSON.stringify(localization));
          this.leafTypesBlock._init( JSON.stringify(leaf));
          this.settingsNav._init( JSON.stringify(leaf));
        })
        .catch(err => {
          //this._shadow.querySelector('.loading').remove();
          console.error("Failed to retrieve data: " + err);
        })
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
