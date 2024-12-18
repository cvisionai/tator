export class AnnotationMultiResizer
{
    constructor(multi, resizerBar)
    {
        this._multi = multi;
        this._resizerBar = resizerBar;
        this._contextMenu = document.createElement("canvas-context-menu");
        this._contextMenu.hideMenu();
        this._resizerBar.appendChild(this._contextMenu);
        this._contextMenu.addMenuEntry("Hide", () => {});
        this._resizerBar.addEventListener("contextmenu", this.onContextMenu.bind(this));
        this._resizerBar.addEventListener("mousedown", this.onMouseDown.bind(this));
        this._resizerBar.addEventListener("mouseout", this.onMouseOut.bind(this));
        this._resizerBar.addEventListener("mouseenter", this.onMouseEnter.bind(this));
    }

    onContextMenu(evt) {
        evt.preventDefault();
        this._contextMenu.displayMenu(evt.clientX, evt.clientY);
    }

    onMouseDown(evt) {
        this._contextMenu.hideMenu();
    }

    onMouseOut(evt) {
        this._hideTimer = setTimeout(() => {
            this._contextMenu.hideMenu();
        }, 1000);
    }

    onMouseEnter(evt) {
        clearTimeout(this._hideTimer);
    }

}