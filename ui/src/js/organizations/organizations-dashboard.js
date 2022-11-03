import { TatorPage } from "../components/tator-page.js";
import { getCookie } from "../util/get-cookie.js";
import { store } from "./store.js";

export class OrganizationsDashboard extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-items-center flex-justify-between py-6");
    main.appendChild(header);
    
    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    header.appendChild(h1);

    const h1Text = document.createTextNode("Organizations");
    h1.appendChild(h1Text);

    this._newOrganizationButton = document.createElement("a");
    this._newOrganizationButton.setAttribute("class", "btn");
    this._newOrganizationButton.textContent = "New Organization";
    header.appendChild(this._newOrganizationButton);
    this._newOrganizationButton.style.display = "none"; // Hide until organizations are retrieved.

    this._organizations = document.createElement("div");
    this._organizations.setAttribute("class", "d-flex flex-column");
    main.appendChild(this._organizations);

    this._newOrganization = document.createElement("new-organization");
    this._organizations.appendChild(this._newOrganization);
    this._newOrganization.style.display = "none"; // Hide until organizations are retrieved.

    this._newOrganizationDialog = document.createElement("new-organization-dialog");
    this._organizations.appendChild(this._newOrganizationDialog);

    const deleteOrganization = document.createElement("delete-organization");
    this._organizations.appendChild(deleteOrganization);

    this._modalNotify = document.createElement("modal-notify");
    main.appendChild(this._modalNotify);

    // Create store subscriptions
    store.subscribe(state => state.user, this._setUser.bind(this));
    store.subscribe(state => state.announcements, this._setAnnouncements.bind(this));

    this._removeCallback = evt => {
      deleteOrganization.setAttribute("organization-id", evt.detail.organizationId);
      deleteOrganization.setAttribute("organization-name", evt.detail.organizationName);
      deleteOrganization.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    deleteOrganization.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    deleteOrganization.addEventListener("confirmDeleteOrganization", evt => {
      for (const organization of this._organizations.children) {
        if (organization._organizationId == evt.detail.organizationId) {
          this._organizations.removeChild(organization);
          this._newOrganizationDialog.removeOrganization(organization._text.nodeValue);
          break;
        }
      }
      this.removeAttribute("has-open-modal");
      deleteOrganization.removeAttribute("is-open");
    });

    this._newOrganizationDialog.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
      if (this._newOrganizationDialog._confirm) {
        this._createOrganization();
      }
    });

    this._newOrganizationButton.addEventListener("click", this._openNewOrganizationDialog.bind(this));
    this._newOrganization.addEventListener("click", this._openNewOrganizationDialog.bind(this));

    this._modalNotify.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
      // If closed with the close button, don't redirect.
      const doRedirect = evt.target.shadowRoot.activeElement.tagName != "MODAL-CLOSE";
      if (this._organizationCreationRedirect && doRedirect) {
        window.location.replace(this._organizationCreationRedirect);
      }
    });
  }

  connectedCallback() {
    store.getState().init();
    TatorPage.prototype.connectedCallback.call(this);
    // Get organizations
    fetch("/rest/Organizations", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json())
    .then(organizations => {
      for (let organization of organizations) {
        this._insertOrganizationSummary(organization);
      }
      this._newOrganizationDialog.organizations = organizations;
      const adminOrganizations = organizations.filter(org => org.permission == "Admin");
      if (adminOrganizations.length > 0) {
        this._newOrganizationDialog.organizations = adminOrganizations;
        this._newOrganizationButton.style.display = "flex";
        this._newOrganization.style.display = "block";
      }
    })
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }

  _insertOrganizationSummary(organization) {
    const summary = document.createElement("organization-summary");
    summary.info = organization;
    this._organizations.insertBefore(summary, this._newOrganization);
    summary.addEventListener("remove", this._removeCallback);
  }

  _openNewOrganizationDialog() {
    this._newOrganizationDialog.init();
    this._newOrganizationDialog.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  _createOrganization() {
    // Creates organization using information in new organization dialog.
    const organizationSpec = this._newOrganizationDialog.getOrganizationSpec();
    const organizationPromise = fetch("/rest/Organizations", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(organizationSpec),
    })
    .then(response => response.json())
    .then(organization => {
      this._newOrganizationId = organization.id;
      return fetch(`/rest/Organization/${organization.id}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });
    })
    .then(response => response.json())
    .then(organization => {
      this._organizationCreationRedirect = `/${organization.id}/organization-settings`;
      this._insertOrganizationSummary(organization);
      return Promise.resolve(organization);
    });

    // const preset = this._newOrganizationDialog.getOrganizationPreset();
    // let promise;
    // switch (preset) {
    //   case "imageClassification":
    //     promise = this._configureImageClassification(organizationPromise);
    //     break;
    //   case "objectDetection":
    //     promise = this._configureObjectDetection(organizationPromise);
    //     break;
    //   case "multiObjectTracking":
    //     promise = this._configureMultiObjectTracking(organizationPromise);
    //     break;
    //   case "activityRecognition":
    //     promise = this._configureActivityRecognition(organizationPromise);
    //     break;
    //   case "none":
    //     break;
    //   default:
    //     console.error(`Invalid preset: ${preset}`);
    // }
    organizationPromise.then(() => {
      this._modalNotify.init("Organization created successfully!",
                             "Continue to organization settings or close this dialog.",
                             "ok",
                             "Continue to settings");
      this._modalNotify.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    })
    /*.catch(err => {
      this._organizationCreationRedirect = null;
      this._modalNotify.init("Organization creation failed!",
                             err.message,
                             "error",
                             "Close");
      this._modalNotify.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });*/
  }

  // _configureImageClassification(organizationPromise) {
  //   return organizationPromise.then(organization => {
  //     return fetch(`/rest/MediaTypes/${organization.id}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Images",
  //         dtype: "image",
  //         attribute_types: [{
  //           name: "Label",
  //           description: "Image classification label.",
  //           dtype: "string",
  //           order: 0,
  //         }],
  //       }),
  //     })
  //     .then(response => response.json());
  //   });
  // }

  // _configureObjectDetection(organizationPromise) {
  //   return organizationPromise.then(organization => {
  //     const imagePromise = fetch(`/rest/MediaTypes/${organization.id}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Images",
  //         dtype: "image",
  //         attribute_types: [],
  //       }),
  //     });
  //     const videoPromise = fetch(`/rest/MediaTypes/${organization.id}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Videos",
  //         dtype: "video",
  //         attribute_types: [],
  //       }),
  //     });
  //     return Promise.all([imagePromise, videoPromise]);
  //   })
  //   .then(responses => Promise.all(responses.map(resp => resp.json())))
  //   .then(([imageResponse, videoResponse]) => {
  //     return fetch(`/rest/LocalizationTypes/${this._newOrganizationId}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Boxes",
  //         dtype: "box",
  //         media_types: [imageResponse.id, videoResponse.id],
  //         attribute_types: [{
  //           name: "Label",
  //           description: "Object detection label.",
  //           dtype: "string",
  //           order: 0,
  //         }],
  //       }),
  //     });
  //   });
  // }

  // _configureMultiObjectTracking(organizationPromise) {
  //   return organizationPromise.then(organization => {
  //     return fetch(`/rest/MediaTypes/${organization.id}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Videos",
  //         dtype: "video",
  //         attribute_types: [],
  //       }),
  //     })
  //   })
  //   .then(response => response.json())
  //   .then(videoResponse => {
  //     const trackPromise = fetch(`/rest/StateTypes/${this._newOrganizationId}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Tracks",
  //         association: "Localization",
  //         interpolation: "none",
  //         media_types: [videoResponse.id],
  //         attribute_types: [{
  //           name: "Label",
  //           description: "Track label.",
  //           dtype: "string",
  //           order: 0,
  //         }],
  //       }),
  //     });
  //     const boxPromise = fetch(`/rest/LocalizationTypes/${this._newOrganizationId}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Boxes",
  //         dtype: "box",
  //         media_types: [videoResponse.id],
  //         attribute_types: [],
  //       }),
  //     });
  //     return Promise.all([trackPromise, boxPromise]);
  //   });
  // }

  // _configureActivityRecognition(organizationPromise) {
  //   return organizationPromise.then(organization => {
  //     return fetch(`/rest/MediaTypes/${organization.id}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Videos",
  //         dtype: "video",
  //         attribute_types: [],
  //       }),
  //     })
  //   })
  //   .then(response => response.json())
  //   .then(videoResponse => {
  //     return fetch(`/rest/StateTypes/${this._newOrganizationId}`, {
  //       method: "POST",
  //       credentials: "same-origin",
  //       headers: {
  //         "X-CSRFToken": getCookie("csrftoken"),
  //         "Accept": "application/json",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: "Activities",
  //         association: "Frame",
  //         interpolation: "latest",
  //         media_types: [videoResponse.id],
  //         attribute_types: [{
  //           name: "Something in view",
  //           description: "Whether something is happening in the video.",
  //           dtype: "bool",
  //           order: 0,
  //         }],
  //       }),
  //     });
  //   });
  // }
}

customElements.define("organizations-dashboard", OrganizationsDashboard);
