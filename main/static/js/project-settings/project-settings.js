class ProjectSettings extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", "/static/images/loading.svg");
    this._shadow.appendChild(this._loading);

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

    // Configuration form
    const configForm = document.createElement("form");
    configForm.setAttribute("class", "new-project__configs");

    this.projectBlock = document.createElement("project-main-edit");
    configForm.appendChild(this.projectBlock);

    this.mediaTypesBlock = document.createElement("media-type-main-edit");
    configForm.appendChild(this.mediaTypesBlock);

    this.settingsInputHelper = new SettingsInput("");

    const inputSubmitOrCancelDiv = document.createElement("div");
    inputSubmitOrCancelDiv.setAttribute("class", "d-flex flex-items-center flex-justify-center py-3");
    configForm.appendChild(inputSubmitOrCancelDiv)

    this.saveButton = this.settingsInputHelper.saveButton();
    inputSubmitOrCancelDiv.appendChild(this.saveButton);

    this.resetLink = this.settingsInputHelper.resetLink();
    inputSubmitOrCancelDiv.appendChild(this.resetLink);

    // Append the form to the page
    this._shadow.appendChild(configForm);

    // Form change event
    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      console.log(
        "Saved!"
      );

      let messageText = "";

      // @TODO -- save each like this, wait for both messages
      if( this.projectBlock.changed() ){
        console.log( this.projectId );
        messageText += this.projectBlock.save( this.projectId );
      }
    //  if( this.mediaTypesBlock.changed() ){
    //    messageText += this.mediaTypesBlock.save();
    //  }

      console.log(messageText);

    });

    // Form change event
    this.resetLink.addEventListener("click", (event) => {
      event.preventDefault();
      console.log(
        "Reset!"
      );
      this.projectBlock.reset();
      alert("Reset!");
    });

    window.addEventListener("error", (evt) => {
      if(this._shadow.querySelector('._loading').length > 0) this._shadow.removeChild(this._loading);
    });

  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
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

    const projectPromise = fetch("/rest/Project/" + this.projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
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
          this._shadow.removeChild(this._loading);

          this.projectBlock.setAttribute("_data", JSON.stringify(project))
          this.mediaTypesBlock.setAttribute("_data", JSON.stringify(mediaTypes));
        })
        .catch(err => {
          this._shadow.removeChild(this._loading);
          console.error("Failed to retrieve data: " + err);
        })
      });
  }


  _saveSettings(promisesArray) {

  }

}

customElements.define("project-settings", ProjectSettings);
