class EntityAttrPanel extends TatorElement {
    constructor() {
      super();
      
      // Panel Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "entity-panel px-3");
      //this._main.hidden = true;
      this._shadow.appendChild(this._main);

      // Pin Actions
      // Pin then < to close the panel (keep open v1)
      // this.pinned = new EntityPanelPin({ panelContainer: this });
      // let actions = this.pinned.pinThisEl();
      // actions.setAttribute("class", "d-flex");
      // this._main.appendChild(actions);

      // Content id
      this._heading = document.createElement("h4");
      this._heading.setAttribute("class", "h4 py-3")
      this._main.appendChild(this._heading);

      // Panel Img Container
      this._imgContainer = document.createElement("div");
      this._imgContainer.setAttribute("class", "text-center");
      this._main.appendChild(this._imgContainer)

      // Panel Img
      this._img = document.createElement("img");
      this._imgContainer.appendChild(this._img);

      // Entity Data in Form ( @TODO Editable? or display only )
      this.entityData = document.createElement("entity-form-for-panel");
      this._main.appendChild(this.entityData);

      //
      // this.pinnedEl = this.pinned.pinEl();
      // this._main.appendChild(this.pinnedEl);


      // // View media button link to annotation media
      // this.viewMedia = document.createElement("button");
      // this.viewMedia.setAttribute("class", "btn btn-charcoal col-6");
      // let vmText = document.createTextNode("View Media");
      // this.viewMedia.appendChild(vmText);
      // actions.appendChild(this.viewMedia);

      // // View submission
      // this.viewSubmission = document.createElement("button");
      // this.viewSubmission.setAttribute("class", "btn btn-charcoal col-6");
      // let vsText = document.createTextNode("View Submission");
      // this.viewSubmission.appendChild(vsText);
      // actions.appendChild(this.viewSubmission);

    }

    init( annotationObject, panelContainer ){
      // id,
      // metaDetails,
      // mediaLink,
      // graphic,
      // attributes,
      // created,
      // modified,
      // userName,
      // posText

      this._container = panelContainer;
      this._heading.appendChild( document.createTextNode( `ID ${annotationObject.id}` ) )

      if(typeof annotationObject.graphic !== "undefined" && annotationObject.graphic !== null) {
        this.reader = new FileReader();
        this.reader.readAsDataURL(annotationObject.graphic); // converts the blob to base64
        this.reader.addEventListener("load", this._setImgSrc.bind(this));
      } else {
        this._img.hidden = true;
      }

      this.entityData._init( annotationObject );

    }

    _setImgSrc (e) {
      return this._img.setAttribute("src", this.reader.result );
    }
   
  }
  
  customElements.define("entity-attributes-panel", EntityAttrPanel);  