// An unstyled div for displaying parsed markdown.
class MarkdownDiv extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({mode: "open"});

    // Create an unstyled div that accepts unparsed markdown.
    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);
  }

  init(text) {
    this._div.innerHTML = marked(text);
  }
}

customElements.define("markdown-div", MarkdownDiv);
