class AnnotationsPanelContainer extends TatorElement {
    constructor() {
        super();

        // Close side panel bar with arrow and panel title
        this._panelTop = document.createElement("entity-gallery-panel-top");
        this._shadow.appendChild(this._panelTop);
        
        // data
        this.panelData = document.createElement("annotation-panel-data");

        // this element (aside)
        this.el = null;

        // _panelContainer listeners
        // this.addEventListener("open-annotation", this._panelTop.updateCanvas.bind(this));
        // this.addEventListener("preview-annotation-start", this._panelTop.previewStopCanvas.bind(this));
        // this.addEventListener("preview-annotation-stop", this._panelTop.previewStartCanvas.bind(this));
        // this.addEventListener("hide-annotation", this._panelTop.hideCanvas.bind(this));
    }

    init({ main, aside, pageModal }){
        this.el = aside;
        this.panelWrapper = this.el; // @TODO fix references to this
        // listener to close panelContainer
        this._panelTop._toggleRightOnClick( { lside : main, rside : this.el } );
        this._panelTop._locImageInit({pageModal});
    }

    showCanvas(e){
        // The canvas is made, and this event provides the data
        this._panelTop._locImage._mainCanvas.classList.remove("hidden");
        this._panelTop._locImage.data( "main", e.detail.cardObj );
    }

    hideCanvas(e){
        // This empties the data, and hides the element
        this._panelTop._locImage._mainCanvas.classList.add("hidden");
    }

    previewStartCanvas(e){
        // This adds the data, and shows the element
        this._panelTop._locImage._previewCanvas.classList.remove("hidden");
        this._panelTop._locImage.data( "preview", e.detail.cardObj );

        // Main canvas is hidden
        this._panelTop._locImage._mainCanvas.classList.add("hidden");
    }

    previewStopCanvas(e){
        // This empties the data, and hides the element
        this._panelTop._locImage._previewCanvas.classList.add("hidden");
        
        // Main canvas is hidden
        this._panelTop._locImage._mainCanvas.classList.show("hidden");
    }
}

customElements.define("annotations-panel-container", AnnotationsPanelContainer);  