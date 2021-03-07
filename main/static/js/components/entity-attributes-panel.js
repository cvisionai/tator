class EntityAttrPanel extends TatorElement {
    constructor() {
      super();
    
      // Panel Container
      this._main = document.createElement("div");
      this._main.setAttribute("class", "enitity-panel");
      this._shadow.appendChild(this._main);

      // Panel Img Container

      // Panel Img

      // Entity Data in Form

      // Actions

    }
   
  }
  
  customElements.define("entity-attributes-panel", EntityAttrPanel);  