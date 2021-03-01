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
  }

  init(obj){
    console.log("card init");
    this.titleDiv.innerHTML = `ID ${obj.id}`;

    if(obj.graphic != "") {
      const urlCreator = window.URL || window.webkitURL;
      const imgSrc = urlCreator.createObjectURL(obj.graphic);
      this._img.setAttribute("src", imgSrc);
    } else {
      this._img.hidden = true;
    }

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

}
  
customElements.define("annotations-card", AnnotationsCard);
  