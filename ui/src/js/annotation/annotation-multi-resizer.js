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
        this._resizerBar.addEventListener("dblclick", this.onDoubleClick.bind(this));
        this._mode = "show";
    }

    onDoubleClick(evt) {
        if (this._mode == "show")
        {
            this.setMode("hidden");
        }
        else
        {
            this.setMode("show");
        }
        this._contextMenu.hideMenu();
    }

    onContextMenu(evt) {
        evt.preventDefault();
        this._contextMenu.displayMenu(evt.clientX, evt.clientY);
    }

    onMouseOut(evt) {
        this._hideTimer = setTimeout(() => {
            this._contextMenu.hideMenu();
        }, 3000);
        clearTimeout(this._showTimeout);
        if (this._mode == "hidden")
        {
            this._previewHideTimeout = setTimeout(() => {this.hidePreview();}, 100);
        }
    }

    onMouseEnter(evt) {
        if (this._mode == "hidden")
        {
            clearTimeout(this._previewHideTimeout);
            this._showTimeout = setTimeout(() => {this.showPreview();}, 75);
        }
    }

    showPreview()
    {
        let barBox = this._resizerBar.getBoundingClientRect();
        this._multi._selectedDock.style.display="flex";
        let dockBox = this._multi._selectedDock.getBoundingClientRect();
        this._multi._selectedDock.style.position = "absolute";
        this._multi._selectedDock.style.width = barBox.width + "px";
        this._multi._selectedDock.style.top = `${(barBox.top - dockBox.height)}px`;
    }

    hidePreview()
    {
        this._multi._selectedDock.style.display="none";
        this._multi._selectedDock.style.position = null;
    }

    clearPreview()
    {
        this._multi._selectedDock.style.display=null;
        this._multi._selectedDock.style.position = null;
        this._multi._selectedDock.style.width = null;
        this._multi._selectedDock.style.top = null;
    }

    setMode(mode)
    {
        this._mode = mode;
        this.setMenuBasedOnMode();
        this._multi.setFocusURL();
        this._multi.setMultiProportions();
    }

    setMenuBasedOnMode()
    {
        if (this._mode == "hidden")
        {
            this._contextMenu.displayEntry("Show", true);
            this._contextMenu.displayEntry("Hide", false);
        }
        else
        {
            this._contextMenu.displayEntry("Show", false);
            this._contextMenu.displayEntry("Hide", true);
        }
    }
}