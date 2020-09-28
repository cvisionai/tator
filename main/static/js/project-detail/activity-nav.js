class ActivityNav extends TatorElement {
  constructor() {
    super();

    this._nav = document.createElement("div");
    this._nav.setAttribute("class", "nav nav-right");
    this._shadow.appendChild(this._nav);

    const closeDiv = document.createElement("div");
    closeDiv.setAttribute("class", "d-flex flex-justify-between");
    this._nav.appendChild(closeDiv);

    const dummyDiv = document.createElement("div");
    closeDiv.appendChild(dummyDiv);

    const closeButton = document.createElement("nav-close");
    closeDiv.appendChild(closeButton);

    const headerDiv = document.createElement("div");
    headerDiv.setAttribute("class", "py-3 d-flex flex-justify-between flex-items-center");
    this._nav.appendChild(headerDiv);

    const header = document.createElement("h3");
    header.setAttribute("class", "text-semibold");
    headerDiv.appendChild(header);

    const reload = document.createElement("reload-button");
    headerDiv.appendChild(reload);

    const panel = document.createElement("div");
    panel.setAttribute("class", "analysis__panel-group py-3 text-gray f2");
    this._nav.appendChild(panel);
  }

  init(project) {
    this._project = project;
  }

  open() {
    this._nav.setAttribute(":
  }

  close() {
  }

  reload() {
    fetch(`/rest/Jobs/${this._project}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json())
    .then(jobs => {
    });
  }
}

customElements.define("activity-nav", ActivityNav);

