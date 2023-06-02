import { TatorElement } from "../tator-element.js";

export class EntityPanelContainer extends TatorElement {
  constructor() {
    super();

    //default state
    this.open = false;
    this._movingPanel = false;

    // Close side panel bar with arrow and panel title
    this._panelTop = document.createElement("entity-gallery-panel-top");
    this._shadow.appendChild(this._panelTop);

    // this element (aside)
    this.el = null;
  }

  //
  init({
    position = "right",
    main,
    isMediaSection = false,
    aside,
    pageModal,
    modelData,
    gallery,
    contents,
    bulkEdit = null,
  }) {
    this.main = main;
    this.aside = aside;
    this.gallery = gallery;
    this.position = position;
    this.contents = contents;
    this.bulkEdit = bulkEdit;

    this._resizer = document.createElement("div");
    this._resizer.className = "entity-panel-draghandle " + position;
    this._resizer.style.width = "6px";
    this._resizer.style.height = "100vh";

    if (this.position == "right") {
      this._shadow.appendChild(this._resizer);
      this.setUpResize();
      if (this.bulkEdit !== null) {
        this.bulkEdit._bulkEditBar.style.right = "40px";
      }
    }

    // listener to close panelContainer
    if (isMediaSection) {
      //then we have the media section....
      // this._panelTop.init({ pageModal, modelData, panelContainer: this });
      this.open = true;
      this._panelTop.init({
        panelContainer: this,
        customContentHandler: this.gallery.customContentHandler,
        isMediaSection: true,
        contents: this.contents,
      });
    } else if (this.gallery._customContent) {
      this._panelTop.init({
        pageModal,
        modelData,
        panelContainer: this,
        customContentHandler: this.gallery.customContentHandler,
      });
    } else {
      this._panelTop.init({ pageModal, modelData, panelContainer: this });
    }

    // if (position == "right") {
    //    this._panelTop._topBarArrow.addEventListener("click", this._toggleLeftOnClick.bind(this));
    // } else {
    this._panelTop._topBarArrow.addEventListener(
      "click",
      this._toggleRightOnClick.bind(this)
    );
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
    /* DEFAULT main = col-9, and aside = col-2 */
    if (this.open) {
      this._toggleShut();
    } else {
      this._toggleOpen();
    }
  }

  _toggleOpen() {
    this.aside.classList.remove("slide-close");
    this.main.classList.add("col-9");
    this.main.classList.remove("col-12");
    this.main.style.marginRight = "0";

    if (this.position == "left") {
      this._resizer.paddingLeft = "400px";
      this.main.style.paddingLeft = "400px";
      this.gallery._main.classList.remove("ml-6");
      this.gallery._main.classList.add("ml-3");
    } else {
      // this._resizer.paddingRight = "400px";
      this.gallery._main.classList.remove("mr-6");
      this.gallery._main.classList.add("mr-3");
    }

    if (this.bulkEdit !== null) {
      this.bulkEdit._bulkEditBar.style.right = "25%";
    }

    this._panelTop._topBarArrow.style.transform = "scaleX(1)";
    this.open = true;

    return this.open;
  }

  _toggleShut() {
    // remove any dragged sizing
    this.main.style.removeProperty("width");
    this.aside.style.removeProperty("width");

    this.main.classList.add("col-12");
    this.aside.classList.add("slide-close");

    this.main.classList.remove("col-9");
    this.main.style.marginRight = "2%";
    this._resizer.marginRight = "2%";

    if (this.position == "left") {
      this._resizer.paddingLeft = "2%";
      this.main.style.paddingLeft = "2%";
      this.main.style.marginRight = "0";
      this._resizer.marginRight = "0";
      this.gallery._main.classList.add("ml-6");
      this.gallery._main.classList.remove("ml-3");
    } else {
      this.gallery._main.classList.add("mr-6");
      this.gallery._main.classList.remove("mr-3");
    }

    if (this.bulkEdit !== null) {
      this.bulkEdit._bulkEditBar.style.right = "2%";
    }

    this.open = false;
    this._panelTop._topBarArrow.style.transform = "scaleX(-1)";

    return this.open;
  }

  setUpResize() {
    const initResizePanel = (e) => {
      if (!this._movingPanel) {
        this._movingPanel = true;
        window.addEventListener("mousemove", resizePanel, false);
        window.addEventListener("mouseup", stopResizePanel, false);
      }
    };
    const resizePanel = (e) => {
      if (!this.open) {
        // #todo take what you need from toggleOpen so this doesn't end up in the negative side
        // but fix the jump when this happens
        this._toggleOpen();
      }
      if (this._movingPanel) {
        if (this.position == "left") {
          this.aside.style.width = e.clientX + "px";
          this.main.style.width = `${this.aside.offsetLeft + 40} px`;
          this._resizer.style.left = `${e.clientX - 10}px !important`;
          // #todo left isn't done, add bulkEdit when panel bugs fixed
          // if (this.bulkEdit !== null) {
          // }
        } else {
          //right panel
          let num = window.innerWidth - this.aside.offsetLeft;
          this.aside.style.width =
            window.innerWidth - e.clientX + 0.02 * window.innerWidth + "px";
          this.main.style.width = `${window.innerWidth - Number(num)}px`;
          if (this.bulkEdit !== null) {
            this.bulkEdit._bulkEditBar.style.right =
              window.innerWidth - e.clientX + 0.02 * window.innerWidth + "px";
          }
        }
      }
    };

    const stopResizePanel = (e) => {
      window.removeEventListener("mousemove", resizePanel, false);
      window.removeEventListener("mouseup", stopResizePanel, false);
      if (this.position == "left") {
        this.main.style.width = `${this.aside.offsetLeft + 40} px`;
      } else {
        let num =
          window.innerWidth - this.aside.offsetLeft - this.aside.offsetWidth;
        this.main.style.width = `${window.innerWidth - Number(num)} px`;
      }
      this._movingPanel = false;
    };

    this._resizer.addEventListener("mousedown", initResizePanel, false);
  }
}

customElements.define("entity-panel-container", EntityPanelContainer);
