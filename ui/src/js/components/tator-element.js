import "../../css/styles.scss";

export const svgNamespace = "http://www.w3.org/2000/svg";

export class TatorElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({mode: "open"});

    let promises = [];
    const makeCss = (href) => {
      const css = document.createElement("link");
      css.setAttribute("rel", "stylesheet");
      css.setAttribute("href", href);
      this._shadow.appendChild(css);
      promises.push(new Promise(resolve => {
        css.addEventListener("load", resolve, false);
      }));
    }
   
    // Create a css link for components.
    makeCss("/static/components.css");

    // Use appropriate css for the page
    const pathname = window.location.pathname.split('/');
    if (pathname[2] == "account-profile") {
      makeCss("/static/account-profile.css");
    } else if (pathname[2] == "analytics") {
      makeCss("/static/analytics.css");
    } else if (pathname[2] == "annotation") {
      makeCss("/static/annotation.css");
      makeCss("/static/annotator.css");
    } else if (pathname[1] == "organizations") {
      makeCss("/static/organizations.css");
    } else if (pathname[2] == "organization-settings") {
      makeCss("/static/organization-settings.css");
    } else if (pathname[2] == "password-reset") {
      makeCss("/static/password-reset.css");
    } else if (pathname[2] == "project-detail") {
      makeCss("/static/project-detail.css");
    } else if (pathname[1] == "projects") {
      makeCss("/static/projects.css");
    } else if (pathname[1] == "registration") {
      makeCss("/static/registration.css");
    } else if (pathname[1] == "token") {
      makeCss("/static/token.css");
    }

    Promise.all(promises).then(() => {
      this.style.visibility = "visible";
    });
  }

  connectedCallback() {
    this.style.visibility = "hidden";
  }
}
