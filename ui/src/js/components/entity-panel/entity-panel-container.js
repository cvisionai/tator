import { TatorElement } from "../tator-element.js";

export class EntityPanelContainer extends TatorElement {
   constructor() {
      super();

      //default state
      this.open = false;

      // Close side panel bar with arrow and panel title
      this._panelTop = document.createElement("entity-gallery-panel-top");
      this._shadow.appendChild(this._panelTop);

      // this element (aside)
      this.el = null;
   }

   //
   init({ position = "right", main, isMediaSection = false, aside, pageModal, modelData, gallery, contents }) {
      this.lside = main;
      this.rside = aside;
      this.gallery = gallery;
      this.position = position;
      this.contents = contents;

      // listener to close panelContainer
      if (isMediaSection) {
         //then we have the media section....
         // this._panelTop.init({ pageModal, modelData, panelContainer: this });
         this.open = true;
         this._panelTop.init({
            panelContainer: this,
            customContentHandler: this.gallery.customContentHandler,
            isMediaSection: true,
            contents: this.contents
         })
      } else if (this.gallery._customContent) {
         this._panelTop.init({ pageModal, modelData, panelContainer: this, customContentHandler: this.gallery.customContentHandler});
      } else {
         this._panelTop.init({ pageModal, modelData, panelContainer: this });
      }
      
      // if (position == "right") {
      //    this._panelTop._topBarArrow.addEventListener("click", this._toggleLeftOnClick.bind(this));
      // } else {
         this._panelTop._topBarArrow.addEventListener("click", this._toggleRightOnClick.bind(this));
      // }
      

      // Check and set current permission level on annotationPanel
      if (this.hasAttribute("permissionValue")) {
         let permissionVal = this.getAttribute("permissionValue");
         this._panelTop._panel.permission = permissionVal;
      }

      // when lock changes set attribute on forms to "View Only" / "Can Edit"
      this.addEventListener("permission-update", (e) => {
         this.setAttribute("permissionValue", e.detail.permissionValue);
         this._panelTop._panel.permission = e.detail.permissionValue;
      });

      // when lock changes set attribute on forms to "View Only" / "Can Edit"
      this.addEventListener("unselected", (e) => {
         this.gallery.cardNotSelected(e.detail.id);
      });
   }

   cardClicked() {
      // if panel is shut, open it bc new card was selected
      if (!this.open) {
         this._toggleOpen();
      }
   }

   _toggleRightOnClick() {
      // CLOSE
      /* DEFAULT lside = col-9, and rside = col-2 */
      if (this.open) {
         this._toggleShut();
      } else {
         this._toggleOpen();
      }
   }

   _toggleOpen() {
      this.rside.classList.remove("slide-close");
      
      this.lside.classList.add("col-9");
      this.lside.classList.remove("col-12");
      this.lside.style.marginRight = "0";

      if (this.position == "left") {
         this.lside.style.paddingLeft = "390px";
         this.gallery._main.classList.remove("ml-6");
         this.gallery._main.classList.add("ml-3");
      } else {
         this.gallery._main.classList.remove("mr-6");
         this.gallery._main.classList.add("mr-3");
      }
      
      

      this._panelTop._topBarArrow.style.transform = "scaleX(1)";
      this.open = true;
      
      return this.open;
   }

   _toggleShut() {
      this.lside.classList.add("col-12");
      
      this.rside.classList.add("slide-close");
      
      this.lside.classList.remove("col-9");
      this.lside.style.marginRight = "2%";

      if (this.position == "left") {
         this.lside.style.paddingLeft = "2%";
         this.lside.style.marginRight = "0";
         this.gallery._main.classList.add("ml-6");
         this.gallery._main.classList.remove("ml-3");
      } else {
         this.gallery._main.classList.add("mr-6");
         this.gallery._main.classList.remove("mr-3");
      }

      
      
      this.open = false;
      this._panelTop._topBarArrow.style.transform = "scaleX(-1)";

      return this.open;
   }
}

customElements.define("entity-panel-container", EntityPanelContainer);