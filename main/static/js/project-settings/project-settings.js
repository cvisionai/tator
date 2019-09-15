class ProjectSettings extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center py-6");
    main.appendChild(header);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    header.appendChild(h1);

    this._headerText = document.createTextNode("");
    h1.appendChild(this._headerText);

    this._progress = document.createElement("progress-summary");
    this._shadow.insertBefore(this._progress, main);
  }

  static get observedAttributes() {
    return ["project-id"].concat(TatorPage.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-id":
        // Get info about the project.
        fetch("/rest/Project/" + newValue, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        })
        .then(response => response.json())
        .then(data => {
          this._headerText.nodeValue = data.name + " Settings";
          this._collaborators.usernames = data.usernames;
        })
        .catch(err => console.log("Failed to retrieve project data: " + err));

        break;
    }
  }
}

customElements.define("project-settings", ProjectSettings);
