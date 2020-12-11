class ProjectSettings extends TatorPage {
  constructor() {
    super();

    /* Construct template setup for Settings Page - Main Body with Heading*/
    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
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

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
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

  /* Run when project-id is set to run fetch the page content. */
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
        const settingsInputHelper = new SettingsInput("");

        this.after(settingsInputHelper.inputSubmitOrCancel());

        const mediaTypesBlock = document.createElement("media-type-main-edit");
        mediaTypesBlock.init(mediaTypes, this);


        const projectBlock = document.createElement("project-main-edit");
        projectBlock.init(project, this);



      })
      /* @TODO  ------- ERROR CATCH */

    });
  }



}

customElements.define("project-settings", ProjectSettings);
