import { ModalDialog } from "../components/modal-dialog.js";
import { Utilities } from "../util/utilities.js";
import { TatorElement } from "../components/tator-element.js";


export class ToolsAppletPanel extends TatorElement {
  constructor() {
    super();

    this._panel = document.createElement("div");
    this._panel.setAttribute("style", "position: fixed; width: 500px; height: 80vh; z-index: 1000;")
    this._panel.setAttribute("class", "py-2 px-2");
    this._panel.hidden = true;
    this._shadow.appendChild(this._panel);

    this._appletView = document.createElement("iframe");
    this._appletView.setAttribute("style", "width: 100%; height: 100%;"); //d-flex col-12
    this._panel.appendChild(this._appletView);  

    // Stores the Tator Applet objects this dialog will utilize
    // Each object property/key will be the applet name
    // # Applet *tools* are unique objects so this could be removed
    this._applets = {};

    // Will point to the applet element to interface with inside the iframe
    this._appletElement = null;
    this._appletData = null;
    this._appletTrigger = null;
    this._canvas = null;

    this._appletView.addEventListener("load", this.initApplet.bind(this));
  }

  // /**
  //  * @param {string} width - default|wide|extra-wide
  //  */
  // _setModalWidth(width) {
  //   if (width == "default") {
  //     this._div.classList.remove("modal-wide");
  //     this._div.classList.remove("modal-extra-wide");
  //   }
  //   else if (width == "wide") {
  //     this._div.classList.add("modal-wide");
  //     this._div.classList.remove("modal-extra-wide");

  //   }
  //   else if (width == "extra-wide") {
  //     this._div.classList.remove("modal-wide");
  //     this._div.classList.add("modal-extra-wide");
  //   }
  // }

  // /**
  //  * @param {string} title - Title to display in dialog
  //  */
  // _setModalTitle(title) {
  //   this._title.nodeValue = title;
  // }

  /**
   * @param {string} msg - Message to display using the window utilities
   */
  _displayProgressMessage(msg) {
    Utilities.showSuccessIcon(msg, "#00000000");
  }
  _displayErrorMessage(msg) {
    Utilities.warningAlert(msg, "#ff3e1d");
  }
  _displaySuccessMessage(msg) {
    Utilities.showSuccessIcon(msg);
  }

  /**
   * @param {string} text - Text of accept button
   */
  _setAcceptButtonText(text) {
    this._acceptBtn.textContent = text;
  }

  /**
   * Expected to be done at initialization
   * @param {annotation-data} dataInterface - Interface to annotation page's data buffer
   */
  setDataInterface(dataInterface) {
    this._dataInterface = dataInterface;
  }

  /**
   * Saves the applet object internally
   * @param {Tator.Applet} applet
   */
  saveApplet(applet, annotatorPage, canvas, canvasElement) {
    this._page = annotatorPage;
    this._canvas = canvas;
    this._canvasElement = canvasElement;
    
    // Setup
    this._applets[applet.name] = applet;
    // this.setDataInterface(data);
    // this._appletData = data; // ##?
    
    //
    this._appletTrigger = document.createElement("tools-applet-button");
    this._appletTrigger._title = applet.name;
    this._page._sidebar.addAppletPanel(this._panel, this._appletTrigger);

    //
    this._appletTrigger.addEventListener("click", this.togglePanel.bind(this));

    // Then populate the panel
    this._appletView.src = applet.html_file;
  }

  togglePanel() {
    this._panel.hidden = !this._panel.hidden;
  }

  /**
   * Set the applet to display using the provided applet name
   * @param {string} appletName - Name of loaded applet to display in modal
   * @param {Object} data - Applet data. Expected to have the following properties:
   *     frame {int}
   *     version {Tator.Version}
   *     media {Tator.Media}
   *     projectId {int}
   */
  setApplet(appletName, data) {
    this._appletView.src = this._applets[appletName].html_file;
    // this._appletData = data;
    this.openPanel();
  }

  initApplet() {
    // if (this._appletData == null) { return; }

    this._appletElement = this._appletView.contentWindow.document.getElementById("toolsApplet");
    if(this._appletElement == null) { return; }

    this._appletElement.addEventListener("closeApplet", this.togglePanel.bind(this));

    // Listen for html registration, and page event with svg as detail
    this._appletElement.addEventListener("icon-ready", (evt) => {
      if (this._appletTrigger !== null && evt.detail.icon !== null) {
        this._appletTrigger.setIcon(evt.detail.icon);
      } else {
        console.warn("Event icon ready heard, but not enough data to set icon.")
      }
    });

    // this._appletElement.addEventListener("refreshDataType", (evt) => {
    //   // Get the key expected by the annotation data interface (e.g. box_1)
    //   // and use that to get the data type object
    //   const dataType = evt.detail.dataType;
    //   const dataTypeKey = `${dataType.dtype}_${dataType.id}`;
    //   const typeToUpdate = this._dataInterface._dataTypes[dataTypeKey];
    //   this._dataInterface.updateType(typeToUpdate);
    // });

    // this._appletElement.addEventListener("updateAcceptText", (evt) => {
    //   this._setAcceptButtonText(evt.detail.text);
    // });

    // this._appletElement.addEventListener("displayAcceptButton", () => {
    //   this._acceptBtn.style.display = "flex";
    // });

    // this._appletElement.addEventListener("hideAcceptButton", () => {
    //   this._acceptBtn.style.display = "none";
    // });

    // this._appletElement.addEventListener("updateHeight", (evt) => {
    //   this._appletView.style.height = evt.detail.height;
    // });

    // // Listen for URL param events
    // console.log(window.history.state);
    // window.document.addEventListener('bookmark-update', handleEvent, false)
    // function handleEvent(e) {
    //   let params = ""; // e.detail { paramsList: [ { name: "foo", value: "bar"} ] }
    //   for (let pair of e.detail.paramsList) {
    //     params += `${pair.name}=${pair.value}&`
    //   }

    //   window.history.pushState(e.detail.state, '', `${window.location.origin}${window.location.pathname}?${params}`);
    // }

    // window.addEventListener('hashchange', this.hashHandler.bind(this), false);
    

    // Set the applet data
    // this._appletElement.updateData(this._appletData);

    // // Update the UI
    // this._appletElement.updateUI();

    // RUN THIS LAST! listeners need to be in place above first
    this._appletElement.init({ canvas: this._canvas, canvasElement: this._canvasElement });
    
    //
    this.dispatchEvent(new Event("appletReady"));
  }

}

customElements.define("tools-applet-panel", ToolsAppletPanel);
