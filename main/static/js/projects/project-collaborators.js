class ProjectCollaborators extends TatorElement {
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
    for (let username of val) {
      const span = document.createElement("span");
      span.setAttribute("class", "avatar circle d-flex flex-items-center flex-justify-center f3");
      if (!first) {
        span.setAttribute("style", "background-color: #696cff");
      }
      let initials = username.match(/\b\w/g) || [];
      initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
      span.textContent = initials;
      this._div.appendChild(span);
      first = false;
    }
  }
}

customElements.define('project-collaborators', ProjectCollaborators);
