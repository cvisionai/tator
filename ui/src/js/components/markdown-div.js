import marked from 'https://cdn.jsdelivr.net/npm/marked@14.0.0/+esm';

// An unstyled div for displaying parsed markdown.
export class MarkdownDiv extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });

    // Create an unstyled div that accepts unparsed markdown.
    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);
  }

  init(text) {
    const renderer = new marked.Renderer();
    const linkRenderer = renderer.link;
    renderer.link = (href, title, text) => {
      const html = linkRenderer.call(renderer, href, title, text);
      return html.replace(
        /^<a /,
        '<a target="_blank" rel="nofollow" style="color:#a2afcd"'
      );
    };
    this._div.innerHTML = marked(text, { renderer });
  }
}

customElements.define("markdown-div", MarkdownDiv);
