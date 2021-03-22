class EntityAttrPanelTop extends TatorElement {
    constructor() {
      super();

        //default state
        this.open = true;

        // Panel top bar
        this._topBar = document.createElement("div");
        this._topBar.setAttribute("class", "entity-panel--container--top-bar");
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
        this._box.setAttribute("class", "px-3 py-6");
        this._topBar.appendChild(this._box);

        // Panel name
        this._topBarH3 = document.createElement("h3");
        this._topBarH3.setAttribute("class", "entity-panel--container--top-bar--h3 text-semibold h3 ");
        this._topBarH3.appendChild( document.createTextNode("Annotation Viewer") );
        this._box.appendChild(this._topBarH3);

        // Panel text
        this._topBarP = document.createElement("p");
        this._topBarP.setAttribute("class", "entity-panel--container--top-bar--p text-gray py-2 ");
        this._topBarP.appendChild( document.createTextNode("Hover over localizations in gallery to preview annotations. Click to pin in the viewer.") );
        this._box.appendChild(this._topBarP); 
    }

    _toggleRightOnClick({lside, rside}){
      this.lside = lside;
      this.rside = rside;
        // CLOSE
        /* DEFAULT lside = col-9, and rside = col-2 */
        this._topBarArrow.addEventListener("click", () => {
          if(this.open){
            lside.classList.add("col-12");
            rside.classList.add("slide-close");
            lside.classList.remove("col-9");
            lside.style.marginRight = "2%";
            this.open = false;
            this._topBarArrow.style.transform ="scaleX(-1)";
            return this.open;
          } else {
            rside.classList.remove("slide-close");
            lside.classList.add("col-9");
            lside.classList.remove("col-12");
            lside.style.marginRight = "0";
            this._topBarArrow.style.transform ="scaleX(1)";
            this.open = true;
            return this.open;
          }

        });

        // rside.addEventListener("mouseenter", () => {
        //   if(rside.classList.contains("slide-close")){
        //     rside.classList.add("show-arrow");
        //     lside.classList.remove("col-11");
        //   }
        // });

        // rside.addEventListener("mouseleave", () => {
        //   if(rside.classList.contains("slide-close")){
        //     rside.classList.remove("show-arrow");
        //     lside.classList.remove("col-11");
        //   }
        // });

    }

    cardClicked(){
      if(!this.open){
        this.rside.classList.remove("slide-close");
        this.lside.classList.add("col-9");
        this.lside.classList.remove("col-12");
        this.lside.style.marginRight = "0";
        this._topBarArrow.style.transform ="scaleX(1)";
        this.open = true;
        
        return this.open;
      }
    }
   
  }
  
  customElements.define("entity-attr-panel-top", EntityAttrPanelTop);  