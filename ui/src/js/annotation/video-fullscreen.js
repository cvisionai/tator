import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class VideoFullscreen extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute(
      "class",
      "video__fullscreen d-flex btn-clear px-0 h2 text-gray hover-text-white"
    );
    this._shadow.appendChild(button);

    this._maximize = document.createElementNS(svgNamespace, "svg");
    this._maximize.setAttribute("class", "video__maximize");
    this._maximize.setAttribute("viewBox", "0 0 32 32");
    this._maximize.setAttribute("height", "1em");
    this._maximize.setAttribute("width", "1em");
    button.appendChild(this._maximize);

    const maxTitle = document.createElementNS(svgNamespace, "title");
    maxTitle.textContent = "Maximize (Ctrl-M)";
    this._maximize.appendChild(maxTitle);

    const maxPath = document.createElementNS(svgNamespace, "path");
    maxPath.setAttribute(
      "d",
      "M10.667 2.667h-4c-0.54 0-1.057 0.108-1.531 0.304-0.489 0.203-0.929 0.5-1.297 0.868s-0.665 0.808-0.868 1.297c-0.196 0.473-0.304 0.991-0.304 1.531v4c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333v-4c0-0.183 0.036-0.355 0.1-0.509 0.067-0.163 0.167-0.309 0.291-0.433s0.271-0.223 0.433-0.291c0.155-0.064 0.327-0.1 0.509-0.1h4c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333zM29.333 10.667v-4c0-0.54-0.108-1.057-0.304-1.531-0.203-0.491-0.5-0.931-0.868-1.299s-0.808-0.665-1.299-0.868c-0.472-0.195-0.989-0.303-1.529-0.303h-4c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333h4c0.183 0 0.355 0.036 0.509 0.1 0.163 0.067 0.309 0.167 0.433 0.291s0.223 0.271 0.291 0.433c0.064 0.155 0.1 0.327 0.1 0.509v4c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333zM21.333 29.333h4c0.54 0 1.057-0.108 1.531-0.304 0.491-0.203 0.931-0.5 1.299-0.868s0.665-0.808 0.868-1.299c0.195-0.472 0.303-0.989 0.303-1.529v-4c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333v4c0 0.183-0.036 0.355-0.1 0.509-0.067 0.163-0.167 0.309-0.291 0.433s-0.271 0.223-0.433 0.291c-0.155 0.064-0.327 0.1-0.509 0.1h-4c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333zM2.667 21.333v4c0 0.54 0.108 1.057 0.304 1.531 0.203 0.491 0.5 0.931 0.868 1.299s0.808 0.665 1.299 0.868c0.472 0.195 0.989 0.303 1.529 0.303h4c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-4c-0.183 0-0.355-0.036-0.509-0.1-0.163-0.067-0.309-0.167-0.433-0.291s-0.223-0.271-0.291-0.433c-0.064-0.155-0.1-0.327-0.1-0.509v-4c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333z"
    );
    this._maximize.appendChild(maxPath);

    this._minimize = document.createElementNS(svgNamespace, "svg");
    this._minimize.setAttribute("class", "video__minimize");
    this._minimize.setAttribute("viewBox", "0 0 32 32");
    this._minimize.setAttribute("height", "1em");
    this._minimize.setAttribute("width", "1em");
    this._minimize.style.display = "none";
    button.appendChild(this._minimize);

    const minTitle = document.createElementNS(svgNamespace, "title");
    minTitle.textContent = "Minimize (Ctrl-M)";
    this._minimize.appendChild(minTitle);

    const minPath = document.createElementNS(svgNamespace, "path");
    minPath.setAttribute(
      "d",
      "M9.333 4v4c0 0.183-0.036 0.355-0.1 0.509-0.068 0.163-0.167 0.309-0.291 0.433s-0.271 0.223-0.433 0.291c-0.155 0.064-0.327 0.1-0.509 0.1h-4c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333h4c0.54 0 1.057-0.108 1.531-0.304 0.491-0.203 0.931-0.5 1.299-0.868s0.664-0.808 0.867-1.297c0.196-0.473 0.304-0.991 0.304-1.531v-4c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333zM28 9.333h-4c-0.183 0-0.355-0.036-0.509-0.1-0.163-0.067-0.309-0.167-0.433-0.291s-0.223-0.271-0.291-0.433c-0.064-0.155-0.1-0.327-0.1-0.509v-4c0-0.736-0.597-1.333-1.333-1.333s-1.333 0.597-1.333 1.333v4c0 0.54 0.108 1.057 0.304 1.531 0.203 0.491 0.5 0.931 0.868 1.299s0.808 0.665 1.299 0.868c0.472 0.195 0.989 0.303 1.529 0.303h4c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333zM22.667 28v-4c0-0.183 0.036-0.355 0.1-0.509 0.067-0.163 0.167-0.309 0.291-0.433s0.271-0.223 0.433-0.291c0.155-0.064 0.327-0.1 0.509-0.1h4c0.736 0 1.333-0.597 1.333-1.333s-0.597-1.333-1.333-1.333h-4c-0.54 0-1.057 0.108-1.531 0.304-0.491 0.203-0.931 0.5-1.299 0.868s-0.665 0.808-0.868 1.299c-0.195 0.472-0.303 0.989-0.303 1.529v4c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333zM4 22.667h4c0.183 0 0.355 0.036 0.509 0.1 0.163 0.067 0.309 0.167 0.433 0.291s0.223 0.271 0.291 0.433c0.064 0.155 0.1 0.327 0.1 0.509v4c0 0.736 0.597 1.333 1.333 1.333s1.333-0.597 1.333-1.333v-4c0-0.54-0.108-1.057-0.304-1.531-0.203-0.491-0.5-0.931-0.868-1.299s-0.808-0.665-1.299-0.868c-0.472-0.195-0.989-0.303-1.529-0.303h-4c-0.736 0-1.333 0.597-1.333 1.333s0.597 1.333 1.333 1.333z"
    );
    this._minimize.appendChild(minPath);

    document.addEventListener("fullscreenchange", (evt) => {
      if (document.fullscreenElement) {
        this.setAttribute("is-maximized", "");
      } else {
        this.removeAttribute("is-maximized");
      }
    });
  }

  static get observedAttributes() {
    return ["is-maximized"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "is-maximized":
        if (newValue === null) {
          this._maximize.style.display = "block";
          this._minimize.style.display = "none";
        } else {
          this._maximize.style.display = "none";
          this._minimize.style.display = "block";
        }
    }
  }
}

customElements.define("video-fullscreen", VideoFullscreen);
