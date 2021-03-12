class EntityPanelPin {
    constructor({ panelContainer, storageKey }){
        this.storageKey = window.location.pathname; // Should contain project ID
        this.pinData = pinData;
        this.panelContainer = panelContainer;
        this._getStorage();

        this.pinContainer = document.createElement("nav");
        this.pinContainer.setAttribute("class", "entity-panel--container--pinned")
    }

    _pinThisEl(panelId){
        let pinnedBool = false;
        for(let [key, value] of Object.entries(this.currentStorage) ) {
            if(panelId == key){
                pinnedBool = true;
            }
        }
        //let pinSvg = "" @TODO
        this.pinAction = document.createElement("a");
        if(pinnedBool){
            this.pinAction.appendChild( document.createTextNode("- Unpin") );
            this.pinAction.addEventListener( "click", this.handleAddUnpin.bind(this) );
        } else {   
            this.pinAction.appendChild( document.createTextNode("+ Pin") );
            this.pinAction.addEventListener( "click", this.handleAddPin.bind(this) );
        }
        
        return this.pinAction;
    }

    handleUnpin(){
        this.pinAction.innerHTML = "+ Pin";
        this.pinAction.addEventListener( "click", this.handleAddPin.bind(this) );
        
        this._addToStorage();
    }

    handleAddPin(){
        this.pinAction.innerHTML = "- Unpin";
        this.pinAction.addEventListener( "click", this.handleAddUnpin.bind(this) );

        this._removeFromStorage();
    }

    pinEl(){
        // get any current pins and add to container
        let pins = this._getStorage();

        // pin = { obj : cardObj, imgSrc = readerResult}
        //
        for(let pin of pins){
            let pinEl = document.createElement("a");
            pinEl.setAttribute("class", "pinned-annotation");
            pinEl.setAttribute("data-pin-data", pin.obj)

            let pinImg = document.createElement("img");
            pinImg.setAttribute("src", pin.imgSrc);
            pinEl.appendChild(pinImg);

            pinEl.addEventListener("click", this.showPinnedContainer.bind(this))

            // Inner div of side panel
            let annotationPanelDiv = document.createElement("div");
            annotationPanelDiv.setAttribute("class", "entity-panel--div hidden")
            annotationPanelDiv.setAttribute("data-loc-id", pin.obj.id)
            this.panelContainer.appendChild( annotationPanelDiv );

            // Inner pinDiv
            let pinDiv = document.createElement("entity-attributes-panel from-pin");
            annotationPanel.init( pin.obj, this.panelContainer );
            annotationPanelDiv.appendChild(pinDiv);

            // Update view
            annotationPanelDiv.addEventListener("unselected", () => {
                pinEl.classList.remove("is-selected");
                annotationPanelDiv.classList.remove("is-selected");
                annotationPanelDiv.classList.add("hidden");
                console.log(annotationPanelDiv.classList);
                console.log("Hiding "+annotationPanelDiv.dataset.locId);
            });

            this.pinContainer.appendChild( pinEl )
        }

        return this.pinContainer;
    }

    _getStorage(){
        this.currentStorage = JSON.parse( localStorage.getItem( this.storageKey ) );
        if (this.currentStorage) return this.currentStorage;
        return this.currentStorage = {};
    }

    _addToStorage( pinData = this.pinData ){
        const id = pinData.id;
        if(this.currentStorage){
            this.currentStorage[id] = pinData;
            const newStorage = JSON.stringify(this.currentStorage);
            localStorage.setItem(this.storageKey, newStorage);
        } else {
            const newStorage = {}
            newStorage[id] = pinData;
            this.currentStorage = newStorage;
            localStorage.setItem(this.storageKey, JSON.stringify(newStorage) );
        }
    }

    _removeFromStorage(id = this.pinData.id){
        delete this.currentStorage['id'];
        localStorage.setItem(this.storageKey, JSON.stringify( this.currentStorage ) );
    }
}