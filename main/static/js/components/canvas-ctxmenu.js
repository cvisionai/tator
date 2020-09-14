class CanvasContextMenu extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting");
    this._div.style.position = "absolute";
    this._div.style.zIndex = 1;
    this._shadow.appendChild(this._div);

    var ul = document.createElement("ul");
    this._div.appendChild(ul);
    var li = document.createElement("li");
    li.appendChild(document.createTextNode("wooooooo"));
    ul.appendChild(li);
    li = document.createElement("li");
    li.appendChild(document.createTextNode("blahhhhh"));
    ul.appendChild(li);

  }

}

customElements.define("canvas-context-menu", CanvasContextMenu);
