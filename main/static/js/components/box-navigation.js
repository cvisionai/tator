class BoxNavigation extends TatorElement {
   constructor() {
      super();

      this.roundedBox = document.createElement("div");
      this.roundedBox.setAttribute("class", "analysis__dashboard-box d-flex flex-items-center rounded-2");
      this._shadow.appendChild(this.roundedBox);

      this._content = document.createElement("div");
      this._content.setAttribute("class", "flex-items-center text-center");
      this._content.style.width = "100%";
      this.roundedBox.appendChild(this._content);
   }
}

customElements.define("box-navigation", BoxNavigation);