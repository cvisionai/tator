export class AnnotationMultiResizer
{
    constructor(multi, resizerBar)
    {
        this._multi = multi;
        this._resizerBar = resizerBar;
        this._contextMenu = document.createElement("canvas-context-menu");
        this._contextMenu.hideMenu();
        this._resizerBar.appendChild(this._contextMenu);
        this._contextMenu.addMenuEntry("Hide", () => {
            this.setMode("hidden")
        });
        this._contextMenu.addMenuEntry("Show", () => {
            this.setMode("show")
        });
        this._contextMenu.displayEntry("Show", false);


        this._resizerBar.addEventListener("contextmenu", this.onContextMenu.bind(this));
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
        }, 3000);
    }

    onMouseEnter(evt) {
        clearTimeout(this._hideTimer);
    }

    setMode(mode)
    {
        this._mode = mode;
        if (mode == "hidden")
        {
            this._contextMenu.displayEntry("Show", true);
            this._contextMenu.displayEntry("Hide", false);
            this._multi._selectedDock.style.display="none";

        }
        else
        {
            this._contextMenu.displayEntry("Show", false);
            this._contextMenu.displayEntry("Hide", true);
            this._multi._selectedDock.style.display="flex";
        }
    }

}