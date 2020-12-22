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
    const mediaTypesPromise = fetch("/rest/MediaTypes/" + this.projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    Promise.all([
      projectPromise,
      mediaTypesPromise
    ])
    .then( async([pa, mta]) => {
      const projectData = pa.json();
      const mediaTypesData = mta.json();
      Promise.all( [projectData, mediaTypesData] )
        .then( ([project, mediaTypes]) => {
          this._shadow.querySelector('.loading').remove();

          // Init project edit and media type sections.
          this.projectBlock.setAttribute("_data", JSON.stringify(project));
          this.mediaTypesBlock.setAttribute("_data", JSON.stringify(mediaTypes));
          this.settingsNav.setAttribute("_data", JSON.stringify(mediaTypes));

        })
        .catch(err => {
          this._shadow.querySelector('.loading').remove();
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
