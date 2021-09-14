class VerificationBreadcrumbs extends TatorElement {
  constructor() {
    super();

    this.projectId = window.location.pathname.split("/")[1];

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__breadcrumbs d-flex flex-items-center f3");
    this._shadow.appendChild(div);

    this._projectText = document.createElement("a");
    this._projectText.setAttribute("class", "text-gray");
    div.appendChild(this._projectText);

    const chevron1 = document.createElement("chevron-right");
    chevron1.setAttribute("class", "px-2");
    div.appendChild(chevron1);

    this._verificationText = document.createElement("span");
    this._verificationText.setAttribute("class", "text-gray");
    this._verificationText.textContent = "Verification";
    div.appendChild(this._verificationText);

    this._verificationTextLink = document.createElement("a");
    this._verificationTextLink.setAttribute("class", "text-gray hidden");
    this._verificationTextLink.textContent = "Verification";
    this._verificationTextLink.setAttribute("href", `/${this.projectId}/apps/verification`);
    div.appendChild(this._verificationTextLink);

    this.chevron2 = document.createElement("chevron-right");
    this.chevron2.setAttribute("class", "px-2");
    this.chevron2.hidden = true;
    div.appendChild(this.chevron2);

    this._speciesPageName = document.createElement("span");
    this._speciesPageName.setAttribute("class", "text-gray");
    div.appendChild(this._speciesPageName);
  }

  static get observedAttributes() {
    return ["verification-name", "project-name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-name":
        this._projectText.textContent = newValue;
        this._projectText.setAttribute("href", this._detailUrl());
        break;
      case "verification-name":
        this._verificationText.classList.add("hidden");
        this._verificationTextLink.classList.remove("hidden");

        this.chevron2.hidden = false;
        this._speciesPageName.textContent = newValue;
        break;
    }
  }

  _detailUrl() {
    return `${window.location.origin}/${this.projectId}/project-detail`;
  }
}

customElements.define("verification-breadcrumbs", VerificationBreadcrumbs);
