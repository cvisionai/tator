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
    this.titleDiv.innerHTML = `ID ${obj.id}`;

    if(typeof obj.graphic !== "undefined" && obj.graphic !== null) {
      this.reader = new FileReader();
      this.reader.readAsDataURL(obj.graphic); // converts the blob to base64
      this.reader.addEventListener("load", this._setImgSrc.bind(this));
    } else {
      this._img.hidden = true;
    }

    let posText = document.createTextNode(`${obj.posText}`)
    this._pos_text.appendChild(posText);

    // Give card access to panel
    this.panelContainer = panelContainer;
    this.annotationPanelDiv = annotationPanelDiv;
    this._li.addEventListener("click", this.togglePanel.bind(this) );

    // this.typeInfo = document.createElement('div');
    // this.typeInfo.innerHTML = `${obj.metaDetails.name} (${obj.metaDetails.type})`;
    // this.descDiv.appendChild(this.typeInfo);

    // this.mediaLink = document.createElement('div');
    // this.mediaLink.innerHTML = `Media: ${obj.mediaLink}`;
    // this.descDiv.appendChild(this.mediaLink);

    // this.mediaLink = document.createElement('div');
    // this.mediaLink.innerHTML = `Media: ${obj.mediaLink}`;
    // this.descDiv.appendChild(this.mediaLink);

    // this.attributesDiv = document.createElement('div');
    // for(let attr of obj.attributes){
    //   let attrDiv = document.createElement("div");
    //   let attribute = document.createTextNode(`${attr} : ${obj.attributes[attr]}`);
    //   attrDiv.appendChild(attribute);
    //   this.attributesDiv.appendChild(attrDiv);
    // }
    // this.descDiv.appendChild(this.attributesDiv);

    // this.created = document.createElement('div');
    // this.created.innerHTML = `Created: ${obj.created}`;
    // this.descDiv.appendChild(this.created);

    // this.modified = document.createElement('div');
    // this.modified.innerHTML = `Modified: ${obj.modified}`;
    // this.descDiv.appendChild(this.modified);

    // this.modifiedby = document.createElement('div');
    // this.modifiedby.innerHTML = `Modified by: ${obj.username}`;
    // this.descDiv.appendChild(this.modifiedby);

    this.descDiv.hidden = false;
  }

  _setImgSrc (e) {
    return this._img.setAttribute("src", this.reader.result );
  }

  togglePanel(){
    console.log(`Opening: ${this.annotationPanelDiv.dataset.locId}`);

    // If we already have this open, toggle shut
    if(!this.annotationPanelDiv.hidden) {
      this.hidePanelContainer();
      this._li.classList.remove("is-selected");      
    } else {
      // Otherwise hide other content...
      let openPanels = this.panelContainer.querySelectorAll(".entity-panel--div:not([hidden])");
      console.log(openPanels);
      
      // Hides content div, deselects the _li
      for(let openPanel of openPanels){
        let unselectedEvent = new Event("unselected");
        openPanel.dispatchEvent(unselectedEvent);
        openPanel.hidden = true;
      }

      // Show this content
      this._li.classList.add("is-selected");
      this.annotationPanelDiv.hidden = false
      this.showPanelContainer();
    }   
  }

  hidePanelContainer(){
    this.panelContainer.classList.remove("slide");
    this.panelContainer.hidden = true;
  }

  showPanelContainer(){
    this.panelContainer.classList.add("slide");
    this.panelContainer.hidden = false;
  }

}
  
customElements.define("annotations-card", AnnotationsCard);
  