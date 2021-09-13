class AppsSpeciesPanelContainer extends TatorElement {
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

  init({ main, aside, pageModal, modelData, gallery }) {
     this.lside = main;
     this.rside = aside;
     this.gallery = gallery;

     // listener to close panelContainer
     this._panelTop._locImage = gallery._locImage;
     this._panelTop.init({ pageModal, modelData, panelContainer: this });
     const navTitle = document.createElement("h3");
     navTitle.setAttribute("class", "text-semibold");
     navTitle.style.marginRight = "14px";
     navTitle.textContent = "Change selected image";
     this._panelTop._navigation.controls.insertBefore(navTitle, this._panelTop._navigation.prev);
     this._panelTop._topBarArrow.addEventListener("click", this._toggleRightOnClick.bind(this));
     this._panelTop._topBarArrow.hidden = true;
     this._panelTop._navigation.controls.style.marginTop = "20px";
     this._panelTop._navigation.controls.setAttribute("class", "analysis__filter_condition_group mx-3 py-3 d-flex flex-items-center");
     this._panelTop._topBarID.hidden = true;

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
     this.rside.classList.remove("col-3");
     this.rside.classList.remove("slide-close");
     this.rside.classList.add("col-6");

     this.lside.classList.add("col-6");
     this.lside.classList.remove("col-12");
     this.lside.style.marginRight = "0";

     this.gallery._main.classList.remove("mr-6");
     this.gallery._main.classList.add("mr-3");

     this._panelTop._topBarArrow.style.transform = "scaleX(1)";
     this.open = true;

     return this.open;
  }

  _toggleShut() {
     this.lside.classList.add("col-12");

     this.rside.classList.remove("col-6");
     this.rside.classList.add("slide-close");
     this.rside.classList.add("col-3");

     this.lside.classList.remove("col-6");
     this.lside.style.marginRight = "2%";

     this.gallery._main.classList.add("mr-6");
     this.gallery._main.classList.remove("mr-3");

     this.open = false;
     this._panelTop._topBarArrow.style.transform = "scaleX(-1)";

     return this.open;
  }
}

customElements.define("apps-species-panel-container", AppsSpeciesPanelContainer);