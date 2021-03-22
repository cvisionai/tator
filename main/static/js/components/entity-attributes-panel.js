class EntityAttrPanel extends TatorElement {
    constructor() {
      super();

      // Panel Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "entity-panel px-3");
      //this._main.hidden = true;
      this._shadow.appendChild(this._main);

      // Content id
      this._heading = document.createElement("h2");
      this._heading.setAttribute("class", "h2 py-3")
      this._main.appendChild(this._heading);

      // Panel Img Container
      this._imgContainer = document.createElement("div");
      this._imgContainer.setAttribute("class", "text-center");
      this._main.appendChild(this._imgContainer);

      // Panel Graphic Img
      this._img = document.createElement("img");
      this._imgContainer.appendChild(this._img);

      // Panel Img Canvas
      this._image = document.createElement("image-canvas");
      this._main.appendChild(this._image);

      // Image modal link @TODO styling - this is for specific testing
      const modalLinkDiv = document.createElement("div");
      modalLinkDiv.setAttribute("class", "d-flex flex-items-center py-1");
      this._main.appendChild(modalLinkDiv);
      
      this._modalLink = document.createElement("a");
      this._modalLink.setAttribute("href", "#");
      this._modalLink.textContent = "Open Modal";
      modalLinkDiv.appendChild(this._modalLink);     


      // Entity Data in Form ( @TODO Editable? or display only )
      this.entityData = document.createElement("entity-form-for-panel");
      this._main.appendChild(this.entityData);

      // View media button link to annotation media
      this._linksDiv = document.createElement("div");
      this._linksDiv.setAttribute("class", "annotation__panel-group px-4 py-3 text-gray f1 d-flex col-11");
      this._main.appendChild(this._linksDiv);

      const mediaLinkDiv = document.createElement("div");
      mediaLinkDiv.setAttribute("class", "d-flex flex-items-center py-1");
      this._linksDiv.appendChild(mediaLinkDiv);

      const mediaLinkLabel = document.createElement("label");
      mediaLinkLabel.textContent = "View Annotation In Media";
      mediaLinkDiv.appendChild(mediaLinkLabel);

      this._mediaLink = document.createElement("a");
      this._mediaLink.setAttribute("href", "#");
      //mediaLinkDiv.appendChild(this._mediaLink);
      const goToFrameButton = document.createElement("entity-frame-button");
      goToFrameButton.style.marginLeft = "16px";
      mediaLinkDiv.appendChild(goToFrameButton);

      // actions.appendChild(this.viewMedia);

      // // View submission
      // this.viewSubmission = document.createElement("button");
      // this.viewSubmission.setAttribute("class", "btn btn-charcoal col-6");
      // let vsText = document.createTextNode("View Submission");
      // this.viewSubmission.appendChild(vsText);
      // actions.appendChild(this.viewSubmission);

      this._mediaLink = "#";
      goToFrameButton.addEventListener("click", () => {
        window.location = this._mediaLink;
      });
    }

  async init( {        
    cardObj, 
    panelContainer, 
    panelData, 
    pageModal  
  }){
      this.cardObj = cardObj;
      this.panelContainer = panelContainer
      this.panelData = panelData;
      this.pageModal = pageModal;

      this._heading.textContent = `Annotation Information (ID: ${cardObj.id})`;

      // Show localization in side panel
      // @TODO show media with localization here
      if(typeof this.cardObj.graphic !== "undefined" && this.cardObj.graphic !== null) {
        this.reader = new FileReader();
        this.reader.readAsDataURL(this.cardObj.graphic); // converts the blob to base64
        this.reader.addEventListener("load", this._setImgSrc.bind(this));
      } else {
        this._img.setAttribute("src", "/static/images/spinner-transparent.svg");
        this._img.hidden = false;
      }

      // Create canvas Image
      this.setupImage();
      // @TODO for now just show media with localization in modal on click
      this._modalLink.addEventListener("click", this._popModalWithPlayer.bind(this))

      // Setup linkout and the entity data for panel here
      this._mediaLink = this.cardObj.mediaLink;
      this.entityData._init(this.cardObj);
    }

    setupImage(){
      this._initPlayer();
      
    }
    
    _popModalWithPlayer(e){
      e.preventDefault();

      // Title
      let text = document.createTextNode( this._heading.textContent );
      this.pageModal._titleDiv.append(text);
      
      // Main Body
      this._initPlayer();
      this.pageModal._main.appendChild( this.loc || {} );

      // When we close modal, remove the player
      //this.pageModal.addEventListener("close", this._removePlayer.bind(this));

      this.pageModal.setAttribute("is-open", "true")      
    }

    _initPlayer(){
      // @TODO optimize later - only init this the first time
      //if(typeof this.cardObj.mediaData !== "undefined" && this.cardObj.mediaData !== null){
        // Get mediaData and save it to this card object
        let mediaId = this.cardObj.mediaId;
        
        this.panelData.getMediaData( mediaId ).then((data) => {
          this.cardObj.mediaData = data;

          this.loc = document.createElement("localization-in-page");

          // Init creates a canvas element with media & localization controls
          this.loc._init({
            annotationObject : this.cardObj,
            panelContainer : this.panelContainer
          });

          // Inits image-only canvas
          this._image.mediaInfo = this.cardObj.mediaData.mediaInfo;

          // After init, or if this has already been defined return 
          return this.loc;
        });
        
    }

    _removePlayer(){
      // Clear this panel player and title from modal
      this.modal._titleDiv.innerHTML = "";
      this.modal._main.innerHTML = "";
    }

    /**
    * Set the card's main image thumbnail
    * @param {image} image
    */
    setImage(image) {
      this.reader = new FileReader();
      this.reader.readAsDataURL(image); // converts the blob to base64
      this.reader.addEventListener("load", this._setImgSrc.bind(this));
    }

    _setImgSrc () {
      this._img.setAttribute("src", this.reader.result);
      this._img.hidden = false;
    }

  }

  customElements.define("entity-attributes-panel", EntityAttrPanel);