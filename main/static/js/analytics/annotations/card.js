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
    this.titleDiv.innerHTML = `ID ${obj.id}`;

    // Give card access to panel
    this.panelContainer = panelContainer;
    this.annotationPanelDiv = annotationPanelDiv;
    this._li.addEventListener("click", this.togglePanel.bind(this) );

    // Additional information about localization
    // Name and type like "ABOX (Box)"
    this.typeInfo = document.createElement('div');
    this.typeInfo.innerHTML = `${obj.metaDetails.name} (${obj.metaDetails.type})`;
    this.titleDiv.appendChild(this.typeInfo);


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

    for(const [attr, value] of Object.entries(obj.attributes)){
      let attrDiv = document.createElement("div");
      attrDiv.setAttribute("class", `card-attribute ${encodeURI(obj.metaDetails.name)}_${encodeURI(attr)}`)
      
      let attrLabel = document.createElement("strong");
      attrLabel.appendChild( document.createTextNode(`${attr}: `) );
      attrLabel.setAttribute("class", "text-bold");
      attrDiv.appendChild(attrLabel);
      
      let attribute = document.createTextNode(value);
      attrDiv.appendChild(attribute);

      this.attributesDiv.appendChild(attrDiv);
    }
    this.descDiv.appendChild(this.attributesDiv);

    // Create Date
    this.created = document.createElement('div');
    this.created.innerHTML = `Created: ${obj.created}`;
    this.descDiv.appendChild(this.created);

    // Modified Date
    this.modified = document.createElement('div');
    this.modified.innerHTML = `Modified: ${obj.modified}`;
    this.descDiv.appendChild(this.modified);

    // Modified By
    this.modifiedby = document.createElement('div');
    this.modifiedby.innerHTML = `By: ${obj.userName}`;
    this.descDiv.appendChild(this.modifiedby);

    // Show description div
    this.descDiv.hidden = false;
  }

  _setImgSrc (e) {
    return this._img.setAttribute("src", this.reader.result );
  }

  togglePanel(){
    console.log(`Opening: ${this.annotationPanelDiv.dataset.locId}`);

    
    if(!this.annotationPanelDiv.hidden) {
      // If we already have this open, toggle shut
      this._li.classList.remove("is-selected"); 
      this.annotationPanelDiv.hidden = true;
      this.hidePanelContainer(); 
    } else {
      // Otherwise find and close open panel... should just be 1, but grabbing all...
      let openPanels = this.panelContainer.querySelectorAll(".entity-panel--div:not([hidden])");
      console.log(openPanels);
      
      // Hides content div, deselects the _li
      for(let openPanel of openPanels){
        let unselectedEvent = new Event("unselected");
        openPanel.dispatchEvent(unselectedEvent);
      }
      // Show this content
      this._li.classList.add("is-selected");
      this.annotationPanelDiv.hidden = false;
      this.showPanelContainer();
    }   
  }

  hidePanelContainer(){
    this.panelContainer.classList.remove("slide");
  }

  showPanelContainer(){
    this.panelContainer.classList.add("slide");
  }

}
  
customElements.define("annotations-card", AnnotationsCard);
  