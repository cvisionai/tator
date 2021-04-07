class EntityGalleryPanel extends TatorElement {
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

      // Entity Data in Form ( @TODO Editable? or display only )
      this.entityData = document.createElement("entity-gallery-panel-form");
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
    cardObj
  }){
      this.cardObj = cardObj;

      // Heading
      //this._heading.textContent = `Annotation Information (ID: ${cardObj.id})`;      

      // Setup linkout and the entity data for panel here
      this._mediaLink = this.cardObj.mediaLink;
      this.entityData._init(this.cardObj);
    }

  }

  customElements.define("entity-gallery-panel", EntityGalleryPanel);