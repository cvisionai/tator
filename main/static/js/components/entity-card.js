class EntityCard extends TatorElement {
    constructor() {
      super();
  
      this._li = document.createElement("li");
      this._li.setAttribute("class", "project__file rounded-2");
      this._shadow.appendChild(this._li);
  
      this._link = document.createElement("a");
      this._link.setAttribute("class", "file__link d-flex flex-items-center text-white");
      this._link.setAttribute("href", "#");
      this._li.appendChild(this._link);
  
      this._img = document.createElement("img");
      this._img.setAttribute("src", "/static/images/spinner-transparent.svg");
      this._img.setAttribute("class", "col-12 rounded-1");
      this._link.appendChild(this._img);
  
      const div = document.createElement("div");
      div.setAttribute("class", "py-2 px-2 lh-default");
      this._li.appendChild(div);
  
      this.titleDiv = document.createElement("div");
      this.titleDiv.setAttribute("class", "py-1 d-flex flex-justify-between");
      div.appendChild(this.titleDiv);
  
      this._name = document.createElement("a");
      this._name.setAttribute("class", "text-semibold text-white css-truncate");
      this._name.setAttribute("href", "#");
      this.titleDiv.appendChild(this._name);
  
      this._more = document.createElement("media-more");
      this._more.setAttribute("class", "position-relative");
      this._more.style.opacity = 0;
      this.titleDiv.appendChild(this._more);
  
      this._ext = document.createElement("span");
      this._ext.setAttribute("class", "f3 text-gray");
      div.appendChild(this._ext);
  
      this._pos_text = document.createElement("span");
      this._pos_text.setAttribute("class", "f3 text-gray px-2");
      div.appendChild(this._pos_text);
  
      this.addEventListener("mouseenter", () => {
        this._more.style.opacity = 1;
      });
  
      this.addEventListener("mouseleave", () => {
        this._more.style.opacity = 0;
      });
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
   
  }
  
  customElements.define("entity-card", EntityCard);  