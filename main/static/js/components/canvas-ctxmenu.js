class CanvasContextMenu extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "btn-clear btn-border d-flex px-2 py-2 rounded-1 f2 annotation__setting");
    this._div.style.position = "absolute";
    this._div.style.width = "auto";
    this._div.style.height = "auto";
    this._div.style.opacity = 0.9;
    this._shadow.appendChild(this._div);

    this._buttons = {};
  }

  addMenuEntry(newText, callback)
  {
    const button = document.createElement("button");
    button.setAttribute("class", "btn-clear d-flex flex-items-center py-2 text-gray hover-text-white");
    button.textContent = newText;
    button.addEventListener("click", () => {
      this.hideMenu();
      callback();
    });
    this._div.appendChild(button);
    this._buttons[newText] = button;
  }

  hideMenu()
  {
    this._div.style.display = "none";
  }

  disableEntry(entryText, disable)
  {
    this._buttons[entryText].disabled = disable;
  }

  displayMenu(x, y)
  {
    this._div.style.zIndex = -100;
    this._div.style.display = "block";

    var finalX = x;// + this._div.offsetWidth;
    var finalY = y;// + this._div.offsetHeight * 0.75;

    this._div.style.zIndex = 1;
    this._div.style.left = finalX + "px";
    this._div.style.top = finalY + "px";
    this._div.style.display = "block";
  }
}

customElements.define("canvas-context-menu", CanvasContextMenu);
