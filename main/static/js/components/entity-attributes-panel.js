class EntityAttrPanel extends TatorElement {
    constructor() {
      super();
    
      // Hide panel by default
      
      // Panel Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "entity-panel");
      //this._main.hidden = true;
      this._shadow.appendChild(this._main);

      // Panel Img Container
      this._imgContainer = document.createElement("div");
      this._imgContainer.setAttribute("class", "col-12 text-center");
      this._main.appendChild(this._imgContainer)

      // Panel Img
      this._img = document.createElement("img");
      this._imgContainer.appendChild(this._img);

      // Entity Data in Form ( @TODO Editable? or display only )
      this.entityData = document.createElement("entity-form-for-panel");
      this._main.appendChild(this.entityData);

      // // Actions
      // let actions = document.createElement("div");
      // actions.setAttribute("class", "d-flex");
      // this._main.appendChild(actions);

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