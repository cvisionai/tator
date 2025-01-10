import { TatorElement } from "./tator-element.js";

export class TatorPage extends TatorElement {
  constructor() {
    super();

    this._header = document.createElement("header-main");
    this._shadow.appendChild(this._header);

    this._nav = document.createElement("nav-main");
    this._shadow.appendChild(this._nav);

    const shortcuts = document.createElement("keyboard-shortcuts");
    this._shadow.appendChild(shortcuts);

    this._header.addEventListener("openNav", (evt) => {
      this._nav.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._nav.addEventListener("closed", (evt) => {
      this._nav.removeAttribute("is-open");
      shortcuts.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this._nav.addEventListener("show-shortcuts", (evt) => {
      shortcuts.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._dimmer = document.createElement("div");
    this._dimmer.setAttribute("class", "background-dimmer");
    this._shadow.appendChild(this._dimmer);

    this._announcements = document.createElement("announcement-dialog");
    this._shadow.appendChild(this._announcements);

    this._browserCheck = document.createElement("browser-recommendation");

    this._announcements.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal");
    });
  }

  connectedCallback() {
    this._browserCheck.init(this._shadow);
  }

  static get observedAttributes() {
    return ["has-open-modal"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "has-open-modal":
        if (newValue === null) {
          this._dimmer.classList.remove("has-open-modal");
        } else {
          this._dimmer.classList.add("has-open-modal");
        }
        break;
    }
  }

  _updateProject(project) {
    this._projectInfo = project;
    if (project.extended_info && project.extended_info.customerServiceHref) {
      this._nav.customerServiceHref = project.extended_info.customerServiceHref;
    }
    if (project.extended_info && project.extended_info.knowledgeHref) {
      this._nav.knowledgeHref = project.extended_info.knowledgeHref;
    }
  }

  _setUser(user) {
    this._header.setAttribute(
      "username",
      `${user.first_name} ${user.last_name}`
    );
    if (user.name == "Guest Account") {
      this._nav.disableAccountSettings();
    }
    this._header.setAttribute("email", user.email);
  }

  _setAnnouncements(announcements) {
    if (announcements.length > 0) {
      this._announcements.init(announcements);
      this._announcements.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    }
  }
}

if (!customElements.get("tator-page")) {
  customElements.define("tator-page", TatorPage);
}
