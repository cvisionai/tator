class AnnotationsCard extends EntityCard {
  constructor() {
    super();
    // Entity Card
    // - @this._name Title
    // - Card is list element; Parent can be UL element, or see: EntityCardGallery
    // - Card links out to one destination
    // Optional: 
    // - @this._ext Detail text
    // - @this._pos_text Pagination position text
    // - @this._more Menu
    // - @this.getAttribute('thumb-gif') Gif for hover effect

    // Add annotation class to list item
    this._li.classList.add("analysis__annotation");

  }

  init(obj, panelContainer, annotationPanelDiv){
    // ID is title
    //this.titleDiv.innerHTML = `ID ${obj.id}`;
    this._id_text.innerHTML = `ID ${obj.id}`;

    // Give card access to panel
    this.panelContainer = panelContainer;
    this.annotationPanelDiv = annotationPanelDiv;
    this.addEventListener("click", this.togglePanel.bind(this) );
    this.addEventListener("mouseenter", this._mouseEnterHandler.bind(this) );

    // Additional information about localization
    // Name and type like "ABOX (Box)"
    this.typeInfo = document.createElement('div');
    this.typeInfo.innerHTML = `${obj.metaDetails.name} (${obj.metaDetails.type})`;
    //this.titleDiv.appendChild(this.typeInfo);


    // Graphic
    if(typeof obj.graphic !== "undefined" && obj.graphic !== null) {
      this.reader = new FileReader();
      this.reader.readAsDataURL(obj.graphic); // converts the blob to base64
      this.reader.addEventListener("load", this._setImgSrc.bind(this));
    } else {
      this._img.hidden = true;
    }

    // Add position text related to pagination
    let posText = document.createTextNode(`${obj.posText}`)
    this._pos_text.appendChild(posText);

    // Link to the media @TODO
    // this.mediaLink = document.createElement('div');
    // this.mediaLink.innerHTML = `Media ID ${obj.mediaLink}`;
    // this.descDiv.appendChild(this.mediaLink);

    // Attributes for as many exist
    this.attributesDiv = document.createElement('div');
    let i = 0;
    for(const [attr, value] of Object.entries(obj.attributes)){
      let attrDiv = document.createElement("div");
      attrDiv.setAttribute("class", `card-attribute ${encodeURI(obj.metaDetails.name)}_${encodeURI(attr)}`)
      if(i != 0) attrDiv.classList.add("hidden")
      i++;
      let attrLabel = document.createElement("span");
      attrLabel.appendChild( document.createTextNode(`${attr}: `) );
      attrLabel.setAttribute("class", "text-bold f3");
      attrDiv.appendChild(attrLabel);
      
      let attribute = document.createTextNode(value);
      attrDiv.appendChild(attribute);

      this.attributesDiv.appendChild(attrDiv);
    }
    this.descDiv.appendChild(this.attributesDiv);

    // // Create Date
    // this.created = document.createElement('div');
    // this.created.innerHTML = `Created: ${obj.created}`;
    // this.descDiv.appendChild(this.created);

    // // Modified Date
    // this.modified = document.createElement('div');
    // this.modified.innerHTML = `Modified: ${obj.modified}`;
    // this.descDiv.appendChild(this.modified);

    // // Modified By
    // this.modifiedby = document.createElement('div');
    // this.modifiedby.innerHTML = `By: ${obj.userName}`;
    // this.descDiv.appendChild(this.modifiedby);

    // Show description div
    this.descDiv.hidden = false;

    // More actions
    // this._more.hidden = false;
    // Add more ... > labels, swap views?
  }

  _setImgSrc (e) {
    return this._img.setAttribute("src", this.reader.result );
  }

  _mouseEnterHandler(e){
    const isHidden = this.annotationPanelDiv.classList.contains("hidden");
    const isSelected = this.annotationPanelDiv.classList.contains("is-selected")
    if(isHidden && !isSelected) {
      console.log(`Previewing: ${this.annotationPanelDiv.dataset.locId}`);
      // If we do not already have this open or selected... show a preview
      this._showPreview();

      // Wait for mouse out to stop preview
      const once = { once : true };
      this.addEventListener("mouseout", this._removePreview.bind(this), once );
    } 
  }

  _showPreview() {
    // Tmp Hide open panels (if any)
    this.tmpHidden = this.panelContainer.querySelector(".is-selected");
    console.log("temp hide?"+this.tmpHidden);
    if(this.tmpHidden != null) {
      this.tmpHidden.classList.add("hidden");
      console.log("temp hiding :"+this.tmpHidden.dataset.locId);
    }

    // Show this panel
    //this.annotationPanelDiv.classList.remove("hidden");
    this.annotationPanelDiv.classList.add("preview");
  }

  _removePreview(e) {
    // Hide this panel
    //this.annotationPanelDiv.classList.add("hidden");
    this.annotationPanelDiv.classList.remove("preview");

    // Restore the hidden panel
    if(this.tmpHidden != null) this.tmpHidden.classList.remove("hidden");
  }

  togglePanel(){
    console.log(`Opening: ${this.annotationPanelDiv.dataset.locId}`);
    // If they click while in preview, don't do this
    // const isInPreview = this.annotationPanelDiv.classList.contains("preview");
    // if(isInPreview) {
    //   const once = { once : true };
    //   this.removeEventListener("mouseout", this._removePreview.bind(this), once );  
    // }
   
    if(this._li.classList.contains("is-selected")) {
          // const isInPreview = this.annotationPanelDiv.classList.contains("preview");
      // If we already have this open, toggle shut
      this._deselectedCard();
       
    } else {
      // Hide open panels
      this._hideOpenPanel();

      // Show this content
      this._selectedCard();
    }   
  }

  _hideOpenPanel(){
    // Otherwise find and close open panel... should just be 1, but grabbing all...
    let openPanel = this.panelContainer.querySelector(".is-selected");

    if(openPanel != null){
      let unselectedEvent = new CustomEvent("unselected");
      console.log("Dispatching event to "+openPanel.dataset.locId);
      openPanel.dispatchEvent( unselectedEvent );
    }
  }

  _deselectedCard(){
    this._li.classList.remove("is-selected");
    this.annotationPanelDiv.classList.remove("is-selected");
    this.annotationPanelDiv.classList.add("hidden");
    this.annotationPanelDiv.classList.remove("preview");
    //this.hidePanelContainer();

    //Add back listener
    this.addEventListener("mouseenter", this._mouseEnterHandler.bind(this) );

  }

  _selectedCard(){
    this.tmpHidden = this.annotationPanelDiv;
    this._li.classList.add("is-selected");
    this.annotationPanelDiv.classList.add("is-selected");
    this.annotationPanelDiv.classList.remove("hidden");
    this.annotationPanelDiv.classList.remove("preview");
    //this.showPanelContainer();

    //remove preview listener
    this.removeEventListener("mouseenter", this._mouseEnterHandler.bind(this) );
  }

  // @TODO - currently not used bc we assume panel stays open
  // hidePanelContainer(){
  //   this.panelContainer.classList.remove("slide");
  // }

  // showPanelContainer(){
  //   this.panelContainer.classList.add("slide");
  // }

}
  
customElements.define("annotations-card", AnnotationsCard);
  