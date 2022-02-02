import { TatorElement } from "../components/tator-element.js";

export class ProjectCollaborators extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "projects__collaborators avatars d-flex");
    this._shadow.appendChild(this._div);
  }

  set usernames(val) {
    // Clear out old collaborators
    this._div.innerHTML="";

    let first = true;
    const maxAvatars = 4;
    for (const [index, username] of val.entries()) {
      const span = document.createElement("span");
      span.setAttribute("class", "avatar circle d-flex flex-items-center flex-justify-center f3");
      if (!first) {
        span.setAttribute("style", "background-color: #696cff");
      }
      let initials;
      if (index >= maxAvatars) {
        initials = "+" + String(val.length - maxAvatars);
      } else {
        initials = username.match(/\b\w/g) || [];
        initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
      }
      span.textContent = initials;
      this._div.appendChild(span);
      first = false;
      if (index >= maxAvatars) {
        break;
      }
    }
  }
}

customElements.define('project-collaborators', ProjectCollaborators);
