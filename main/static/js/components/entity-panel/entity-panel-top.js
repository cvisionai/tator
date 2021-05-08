class EntityGalleryPanelTop extends TatorElement {
    constructor() {
      super();

      // Panel top bar
      this._topBar = document.createElement("div");
      //this._topBar.setAttribute("class", "entity-panel--container--top-bar");
      this._shadow.appendChild(this._topBar);

      // topbar arrow
      this._topBarArrow = document.createElement("span");
      this._topBarArrow.setAttribute("class", "top-bar-arrow");
      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("class", "f2 icon-chevron-right");
      //svg.setAttribute("viewBox", "0 0 32 32");
      svg.setAttribute("height", "40px");
      svg.setAttribute("width", "40px");
      this._topBarArrow.appendChild(svg);
  
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M12.943 24.943l8-8c0.521-0.521 0.521-1.365 0-1.885l-8-8c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l7.057 7.057-7.057 7.057c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z");
      svg.appendChild(path);
      this._topBar.appendChild(this._topBarArrow);

      // Text box
      this._box = document.createElement("div");
      this._box.setAttribute("class", "px-3 pt-4");
      this._topBar.appendChild(this._box);

      // Panel name
      this._topBarH3 = document.createElement("h3");
      this._topBarH3.setAttribute("class", "entity-panel--container--top-bar--h3 text-semibold h3 ");
      this._headingText = document.createElement("span");
      this._headingText.appendChild(document.createTextNode("No Selection."));
      this._topBarH3.appendChild( this._headingText );
      this._box.appendChild(this._topBarH3);

      // Panel ID
      this._topBarID = document.createElement("span");
      this._topBarID.setAttribute("class", "entity-panel--container--top-bar--id text-normal text-gray h3 ");
      this._topBarH3.appendChild(this._topBarID);

      // Panel text
      // this._topBarP = document.createElement("p");
      // this._topBarP.setAttribute("class", "entity-panel--container--top-bar--p text-gray py-2 ");
      // this._topBarP.appendChild( document.createTextNode("Hover over localizations in gallery to preview annotations. Click to pin in the viewer.") );
      // this._box.appendChild(this._topBarP);

      // Panel Img Canvas
      this._locImage = document.createElement("entity-gallery-panel-localization");
      this._box.appendChild(this._locImage);

      // Image modal link container @TODO styling
      const modalLinkDiv = document.createElement("div");
      modalLinkDiv.setAttribute("class", "d-flex flex-items-center py-1");
      this._shadow.appendChild(modalLinkDiv);
      
      // Modal link @TODO styling & copy
      // this._modalLink = document.createElement("a");
      // this._modalLink.setAttribute("class", "btn btn-clear btn-charcoal h3")
      // this._modalLink.setAttribute("href", "#");
      // this._modalLink.textContent = "View in Modal";
      // modalLinkDiv.appendChild(this._modalLink); 

      // Modal CTA
      //this._modalLink.addEventListener("click", this._locImage._popModalWithPlayer.bind(this))
    }

    init({pageModal, modelData, panelContainer}){
      this._locImage.init( {pageModal, modelData, panelContainer} );
    }

    cardClicked(e){
      this.locDataHandler(e.detail);
    }

    locDataHandler(evtDetail){
      console.log("evtDetail");
      console.log(evtDetail);
      if(evtDetail.openFlag){
        // We're opening the panel with new card click
        this._locImage.initAndShowData({ cardObj : evtDetail.cardObj });
        this._locImage.classList.remove("hidden");
        this._headingText.innerHTML = `Annotation `;
        this._topBarID.innerHTML = ` | ID: ${evtDetail.cardObj.id}`;
      } else {
        this._locImage.classList.add("hidden");
        this._headingText.innerHTML = `No selection.`;
        this._topBarID.innerHTML = ``;
      }
    }
   
  }
  
  customElements.define("entity-gallery-panel-top", EntityGalleryPanelTop);  