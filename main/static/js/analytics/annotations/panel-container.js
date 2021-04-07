class AnnotationsPanelContainer extends TatorElement {
    constructor() {
        super();

        //default state
        this.open = false;

        // Close side panel bar with arrow and panel title
        this._panelTop = document.createElement("entity-gallery-panel-top");
        this._shadow.appendChild(this._panelTop);

        // this element (aside)
        this.el = null;

        // _panelContainer listeners
        // this.addEventListener("open-annotation", this._panelTop.updateCanvas.bind(this));
        // this.addEventListener("preview-annotation-start", this._panelTop.previewStopCanvas.bind(this));
        // this.addEventListener("preview-annotation-stop", this._panelTop.previewStartCanvas.bind(this));
        // this.addEventListener("hide-annotation", this._panelTop.hideCanvas.bind(this));
    }

    init({ main, aside, pageModal, modelData }){
        this.lside = main;
        this.rside = aside;

        // listener to close panelContainer
        this._panelTop.init( { pageModal, modelData, panelContainer : this } );
        this._panelTop._topBarArrow.addEventListener("click", this._toggleRightOnClick.bind(this));
    }

    cardClicked(){
        // if panel is shut, open it bc new card was selected
        if(!this.open){
            this._toggleOpen();
        }
    }

    _toggleRightOnClick(){
        // CLOSE
        /* DEFAULT lside = col-9, and rside = col-2 */
        if(this.open){
            this._toggleShut();
        } else {
            this._toggleOpen();
        }
    }

    _toggleOpen(){
        this.rside.classList.remove("slide-close");
        this.lside.classList.add("col-9");
        this.lside.classList.remove("col-12");
        this.lside.style.marginRight = "0";
        this._panelTop._topBarArrow.style.transform ="scaleX(1)";
        this.open = true;
        return this.open;
    }

    _toggleShut(){
        this.lside.classList.add("col-12");
        this.rside.classList.add("slide-close");
        this.lside.classList.remove("col-9");
        this.lside.style.marginRight = "2%";
        this.open = false;
        this._panelTop._topBarArrow.style.transform ="scaleX(-1)";
        return this.open;
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