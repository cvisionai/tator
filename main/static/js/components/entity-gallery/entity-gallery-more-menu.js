class EntityGalleryMoreMenu extends TatorElement {
   constructor() {
      super();

      this.details = document.createElement("details");
      this.details.setAttribute("class", "position-relative");
      this._shadow.appendChild(this.details);

      this.summary = document.createElement("summary");
      this.summary.setAttribute("class", "btn-clear h2 text-gray hover-text-white");
      this.details.appendChild(this.summary);

      this.summary.style.height = "32px";
      this.summary.style.width = "35px";

      const moreIcon = document.createElement("more-icon");
      this.summary.appendChild(moreIcon);

      const styleDiv = document.createElement("div");
      styleDiv.setAttribute("class", "files__main files-wrap");
      this.details.appendChild(styleDiv);

      this._menu = document.createElement("div");
      this._menu.setAttribute("class", "entity-gallery-tools--menu px-2 d-flex flex-column f2");
      styleDiv.appendChild(this._menu);

      this.summary.addEventListener("click", this._showMenu.bind(this));

      window.addEventListener("click", () => {
         //Hide the menus if visible
         this.details.open = false;
      });

   }

   _showMenu(e) {
      e.stopPropagation();
      if (details.open) {
         // toggle close
         this.details.open = false;
      } else {
         // toggle open
         this.details.open = true;
      }
   }

}

customElements.define("entity-gallery-more-menu", EntityGalleryMoreMenu);
