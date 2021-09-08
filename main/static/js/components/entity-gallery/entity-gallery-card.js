class EntityCard extends TatorElement {
    constructor() {
      super();

      // Entity Card

      // - @this._name Title text
      // - Card is list element; Parent can be UL element, or see: EntityCardGallery
      // - Card links out to one destination
      // Optional: 
      // - @this.descDiv Div can contain anything else, desc or other (HIDDEN)
      // - @this._ext Detail text
      // - @this._pos_text Pagination position text
      // - @this._more Menu (HIDDEN)
      // - @this.getAttribute('thumb-gif') Gif for hover effect

      // List element (card)
      this._li = document.createElement("li");
      this._li.setAttribute("class", "entity-card rounded-2 clickable");
      this._shadow.appendChild(this._li);
  
      // Link
      this._link = document.createElement("a");
      this._link.setAttribute("class", "entity-card__link file__link d-flex flex-items-center text-white");
      this._link.setAttribute("href", "#");
      this._li.appendChild(this._link);
  
      // Image, spinner until SRC set
      this._img = document.createElement("img");
      this._img.setAttribute("src", "/static/images/spinner-transparent.svg");
      this._img.setAttribute("class", "entity-card__image rounded-1");
      this._link.appendChild(this._img);
  
      // containing div for li element (styling)
      this._styledDiv = document.createElement("div");
      this._styledDiv.setAttribute("class", "entity-card__title__container py-2 px-2 lh-default");
      this._li.appendChild(this._styledDiv);
  
      // Title Div
      this.titleDiv = document.createElement("div");
      this.titleDiv.setAttribute("class", "entity-card__title py-1");
      this._styledDiv.appendChild(this.titleDiv);
      this.titleDiv.hidden = true;
  
      // Text for Title Div
      this._name = document.createElement("a");
      this._name.setAttribute("class", "text-semibold text-white css-truncate");
      this._name.setAttribute("href", "#");
      this.titleDiv.appendChild(this._name);

      // OPTIONAL Description Div
      this.descDiv = document.createElement("div");
      this.descDiv.setAttribute("class", "entity-card__description py-1 f2");
      this._styledDiv.appendChild(this.descDiv);
      this.descDiv.hidden = true; // HIDDEN default
  
      // "More" (three dots) menu (OPTIONAL)
      this._more = document.createElement("media-more");
      this._more.setAttribute("class", "entity-card__more position-relative");
      this._more.style.opacity = 0;
      this.titleDiv.appendChild(this._more); 
      this._more.hidden = true; // HIDDEN default

      // OPTIONAL pagination + id display
      this._bottom = document.createElement("div");
      this._bottom.setAttribute("class", "f3 d-flex flex-justify-between");
      this._styledDiv.appendChild(this._bottom);

      // OPTIONAL Detail text (ie file extension)
      this._ext = document.createElement("span");
      this._ext.setAttribute("class", "f3 text-gray");
      this._ext.hidden = true;
      this._bottom.appendChild(this._ext);
      
      // OPTIONAL Pagination position
      this._pos_text = document.createElement("span");
      this._pos_text.setAttribute("class", "f3 text-gray pr-2");
      
      this._bottom.appendChild(this._pos_text);

      // OPTIONAL ID data
      this._id_text = document.createElement("span");
      this._id_text.setAttribute("class", "f3 text-gray px-2");
      this._bottom.appendChild(this._id_text);
  
      // More menu styling (if included)
      this.addEventListener("mouseenter", () => {
        this._more.style.opacity = 1;
      });

      this.addEventListener("mouseleave", () => {
        this._more.style.opacity = 0;
      });

      this.addEventListener("click", this.togglePanel.bind(this) );

      // prep this var
      this._tmpHidden = null;
      this.attributeDivs = {};
      this._currentShownAttributes = "";
  
      /* Holds attributes for the card */
      this.attributesDiv = document.createElement('div');
    }
  
    static get observedAttributes() {
      return ["thumb", "thumb-gif", "name", "processing", "pos-text"];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      switch (name) {
        case "thumb":
          if (this._thumb != newValue) {
            this._img.setAttribute("src", newValue);
            this._img.onload = () => {this.dispatchEvent(new Event("loaded"))};
            this._thumb = newValue;
          }
          break;
        case "thumb-gif":
          if (this._thumbGif != newValue) {
            this._thumbGif = newValue;
            this._li.addEventListener("mouseenter", () => {
              if (this.hasAttribute("thumb-gif")) {
                this._img.setAttribute("src", this.getAttribute("thumb-gif"));
              }
            });
            this._li.addEventListener("mouseleave", () => {
              if (this.hasAttribute("thumb")) {
                this._img.setAttribute("src", this.getAttribute("thumb"));
              }
            });
          }
          break;
        case "name":
          const dot = Math.max(0, newValue.lastIndexOf(".") || Infinity);
          const ext = newValue.slice(dot + 1);
          this._ext.textContent = ext.toUpperCase();
          this._name.textContent = newValue.slice(0, dot);
          this._li.setAttribute("title", newValue);
          this._more.setAttribute("name", newValue);
          break;
        case "processing":
          if (newValue === null) {
            this._more.removeAttribute("processing");
          } else {
            this._more.setAttribute("processing", "");
          }
          break;
        case "pos-text":
          this._pos_text.textContent = newValue;
      }
    }
  
    

  init({ obj, panelContainer, cardLabelsChosen }) {
      // Give card access to panel
      this.panelContainer = panelContainer;
      this.cardObj = obj;
  
      // ID is title
      this._id_text.innerHTML = `ID: ${this.cardObj.id}`;
  
      // Graphic
      if(typeof this.cardObj.image !== "undefined" && this.cardObj.image !== null) {
        //this.setAttribute("thumb", obj.image);
        this.setImageStatic(obj.image);
      } else if(typeof obj.graphic !== "undefined" && obj.graphic !== null) {
        this.reader = new FileReader();
        this.reader.readAsDataURL(obj.graphic); // converts the blob to base64
        this.reader.addEventListener("load", this._setImgSrc.bind(this));
      } else {
        //this.setAttribute("thumb", "/static/images/spinner-transparent.svg");
        this.setImageStatic("/static/images/spinner-transparent.svg");
      }
  
      // Add position text related to pagination
      this.setAttribute("pos-text", obj.posText);
  
  
      /**
       * Attributes hidden on card are controlled by outer menu 
      */
    if (obj.attributeOrder && obj.attributeOrder.length > 0) {
        // Clear this in case of reuse / re-init
        this.attributesDiv.innerHTML = "";
        for(const attr of obj.attributeOrder){
          let attrStyleDiv = document.createElement("div");
          attrStyleDiv.setAttribute("class", `entity-gallery-card__attribute`);
          
          let attrLabel = document.createElement("span");
          attrLabel.setAttribute("class", "f3 text-gray text-normal");
          attrStyleDiv.appendChild(attrLabel);
  
          let key = attr.name;
          if(obj.attributes !== null && typeof obj.attributes[key] !== "undefined" && obj.attributes[key] !== null && obj.attributes[key] !== ""){
            attrLabel.appendChild( document.createTextNode(`${obj.attributes[key]}`) );
          } else {
            attrLabel.innerHTML =`<span class="text-dark-gray"><<span class="text-italics ">not set</span>></span>`;
          }
  
          // add to the card & keep a list
          this.attributeDivs[key] = {};
          this.attributeDivs[key].div = attrStyleDiv;
          this.attributeDivs[key].value = attrLabel;
  
          if(cardLabelsChosen && Array.isArray(cardLabelsChosen) && cardLabelsChosen.length > 0){
            // If we have any preferences saved check against it
            if(cardLabelsChosen.indexOf(key) > -1) {     
              // console.log("FOUND "+key+" at index "+cardLabelsChosen.indexOf(key));
            } else {
              attrStyleDiv.classList.add("hidden");
            }
          }       
  
          this.attributesDiv.appendChild(attrStyleDiv);
        }
  
        if(this.attributeDivs){       
          // Show description div
          this.descDiv.appendChild(this.attributesDiv);
          this.descDiv.hidden = false;
        }
      }
    }
  
    /**
    * Custom label display update
    */
    _updateShownAttributes(evt){
      let labelValues = evt.detail.value;
      
      if(this.attributeDivs){
        // show selected
        for (let [key, value] of Object.entries(this.attributeDivs)) {
          if(labelValues.includes(key)){
            value.div.classList.remove("hidden");
          } else {
            value.div.classList.add("hidden");
          }
        } 
      }
    }
  
    /**
     * Update Attribute Values
     * - If side panel is edited the card needs to update attributes
     */
     _updateAttributeValues(data) {
      for (let [attr, value] of Object.entries(data.attributes)) {
        if(this.attributeDivs[attr] != null){
          this.attributeDivs[attr].value.innerHTML = value;
        } else {
          attrLabel.innerHTML =`<span class="text-dark-gray"><<span class="text-italics ">not set</span>></span>`;
        }
      }
    }
  
    set posText(val){
      this.setAttribute("pos-text", val);
    }
  
    /**
     * Set the card's main image thumbnail
     * @param {image} image
     */
    setImage(image) {
      this.reader = new FileReader();
      this.reader.readAsDataURL(image); // converts the blob to base64
      this.reader.addEventListener("load", this._setImgSrcReader.bind(this));
    }
  
    _setImgSrcReader() {
      this._img.setAttribute("src", this.reader.result);
      this._img.onload = () => {this.dispatchEvent(new Event("loaded"))};
    }
  
    setImageStatic(image) {
      //this.setAttribute("thumb", image);
      this._img.setAttribute("src", image);
      this.cardObj.image = image;
      this._img.onload = () => {this.dispatchEvent(new Event("loaded"))};
    }
  
    togglePanel(e){
      e.preventDefault();

      if(this._li.classList.contains("is-selected")) {
        this._deselectedCardAndPanel();    
      } else {
        this._selectedCardAndPanel();
      }
    }
  
    _unselectOpen() {
      const cardId = this.panelContainer._panelTop._panel.getAttribute("selected-id");

      // if it exists, close it!
      if(typeof cardId !== "undefined" && cardId !== null) {
        let evt = new CustomEvent("unselected", { detail: { id: cardId } });
        this.panelContainer.dispatchEvent(evt); // this even unselected related card
      }
    }
  
    _deselectedCardAndPanel(){
      this.cardClickEvent(false); 
      this._li.classList.remove("is-selected");
      this.annotationEvent("hide-annotation");
    }
  
  _selectedCardAndPanel() {
    // Hide open panels
    this._unselectOpen();
      this.cardClickEvent(true);
      this.annotationEvent("open-annotation");
      this._li.classList.add("is-selected");
    }
  
    cardClickEvent(openFlag = false){
      /* @ "card-click"*/
      // Send event to panel to hide the localization canvas & title
      let cardClickEvent = new CustomEvent("card-click", { detail : { openFlag, cardObj : this.cardObj } });
      this.dispatchEvent( cardClickEvent );
    }
  
    annotationEvent(evtName){
      // Send event to panel to hide the localization
      let annotationEvent = new CustomEvent(evtName, { detail : { cardObj : this.cardObj } });
      this.panelContainer.dispatchEvent( annotationEvent );
    }
   
  }
  
  customElements.define("entity-card", EntityCard);  