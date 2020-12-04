class ProjectEditName extends TatorElement {
  constructor() {
    super();
  }

  init(val, t){
    console.log("/////////INIT PROJECT MAIN SETTTINGS OUTPUT//////////////////");
    console.log(val);

  }
}

customElements.define("project-edit-name", ProjectEditName);

///////////




class ProjectEditMediaTypes extends TatorElement {
  constructor() {
    super();
  }

  init(val, t){
    console.log("###### INIT MEDIA TYPES OUTPUT ##############################");
    console.log(val);
  
  }
}

customElements.define("project-edit-media-types", ProjectEditMediaTypes);


///////////

class ProjectSettings extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    main.id = "mainId";
    this._shadow.appendChild(main);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center py-6");
    main.appendChild(header);

    // Project Settings h1.
    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    header.appendChild(h1);

    this._headerText = document.createTextNode("");
    this._headerText.nodeValue = `Set rules and configurations.`;
    h1.appendChild(this._headerText);
  }

  /** UNDER DEVELOPMENT **/
  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
  }

  _init() {
    console.log("running init");
    const projectId = this.getAttribute("project-id");
    console.log(projectId);
    // Project ID used by init promises.


    // Get info about the project.
    const projectPromise = fetch("/rest/Project/" + projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    // Get media type list.
    const mediaTypesPromise = fetch("/rest/MediaTypes/" + projectId, {
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
    .then( ([projectResponse, mediaTypesResponse]) => {
      const projectData = projectResponse.json();
      const mediaTypesData = mediaTypesResponse.json();

      Promise.all( [projectData, mediaTypesData] )
      .then( ([project, mediaTypes]) => {
        console.log(project);
        // Edit block for project name and description.
        const projectEditBlock = document.createElement("project-edit-name");
        projectEditBlock.init(project, this);

        console.log(mediaTypes, this);
        // Edit block for mediaTypes
        // Loops over returned object creatinf and appending media Type
        const mediaTypesBlock = document.createElement("project-edit-media-types");
        mediaTypesBlock.init(mediaTypes);
      })
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "username":
        break;
      case "project-id":
        this._init();
        break;
      case "token":
        break;
    }
  }

}

customElements.define("project-settings", ProjectSettings);
