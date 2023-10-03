/**
 * #TODO Ask if this should be moved to tator-js.
 */
import { TatorElement } from "../components/tator-element.js";

export class CanvasApplet extends TatorElement {

  /**
   * Constructor
   */
  constructor() {
    super();

    this._applet = null; // Must call init()
    this._active = false;
  }

  /**
   * @param {TatorElement.Applet} applet
   */
  init(applet) {
    this._applet = applet;

    this._main = document.createElement("main");
    this._main.setAttribute("class", "d-flex");
    this._shadow.appendChild(this._main);

    this.createSidebar();
    this.createCanvas();

    this._posText = document.createElement("div");
    this._posText.setAttribute("class", "py-2 px-2 f2 text-white");
    this._main.appendChild(this._posText);

    window.addEventListener("resize", () => {
      if (this._active) {
        this.redrawCanvas();
      }
    });
    
    this._canvasMode = "edit";
  }

  /**
   * Creates the toolbar to the left of the canvas
   */
  createSidebar() {

    this._sidebar = document.createElement("div");
    this._sidebar.setAttribute("class", "d-flex flex-column flex-items-center py-1 px-3");
    this._main.appendChild(this._sidebar);

    this._editButton = document.createElement("edit-button");
    this._sidebar.appendChild(this._editButton);

    this._editButton.addEventListener("click", () => {
      this.setCanvasMode("edit");
      this._editButton.blur();
    });

    this._zoomInButton = document.createElement("zoom-in-button");
    this._sidebar.appendChild(this._zoomInButton);

    this._zoomInButton.addEventListener("click", () => {
      this.setCanvasMode("zoom-in");
      this._zoomInButton.blur();
    });

    this._zoomOutButton = document.createElement("zoom-out-button");
    this._sidebar.appendChild(this._zoomOutButton);

    this._zoomOutButton.addEventListener("click", () => {
      this.setCanvasMode("zoom-out");
      this._zoomOutButton.blur();
    });

    this._panButton = document.createElement("pan-button");
    this._sidebar.appendChild(this._panButton);

    this._panButton.addEventListener("click", () => {
      this.setCanvasMode("pan");
      this._panButton.blur();
    });
  }

  setCanvasMode(mode) {
    this._canvasMode = mode;

    this.deselectSidebarButtons();

    if (this._canvasMode == "edit") {
      this._frameCanvas.style.cursor = "default";
      this._editButton._button.classList.add("btn-purple50");
    }
    else if (this._canvasMode == "zoom-in") {
      this._frameCanvas.style.cursor = "zoom-in";
      this._zoomInButton._button.classList.add("btn-purple50");
    }
    else if (this._canvasMode == "zoom-out") {
      this._frameCanvas.style.cursor = "zoom-out";
      this._zoomOutButton._button.classList.add("btn-purple50");
    }
    else if (this._canvasMode == "pan") {
      this._frameCanvas.style.cursor = "move";
      this._panButton._button.classList.add("btn-purple50");
    }
  }

  deselectSidebarButtons() {
    this._editButton._button.classList.remove("btn-purple50");
    this._zoomInButton._button.classList.remove("btn-purple50");
    this._zoomOutButton._button.classList.remove("btn-purple50");
    this._panButton._button.classList.remove("btn-purple50");
  }

  createCanvas() {
    this._frameCanvas = document.createElement("canvas");
    this._main.appendChild(this._frameCanvas);
    this._frameCanvasContext = this._frameCanvas.getContext("2d");

    this._frameCanvas.offScreenCanvas = document.createElement("canvas");
    this._offscreenCanvasContext = this._frameCanvas.offScreenCanvas.getContext("2d");

    this._frameImage = new Image();

    console.log(`Windows device pixel ratio: ${window.devicePixelRatio}`)

    this._frameCanvas.addEventListener("mouseup", (event) => {

      event.preventDefault();

      //
      // GET NORMALIZED COORDINATES OF MOUSE UP
      //
      var selectedCanvasPoint = [
        event.offsetX / this._frameCanvas.offsetWidth,
        event.offsetY / this._frameCanvas.offsetHeight,
      ];

      for (let idx = 0; idx < 2; idx++ ) {
        if (selectedCanvasPoint[idx] > 1.0) {
          selectedCanvasPoint[idx] = 1;
        }
        if (selectedCanvasPoint[idx] < 0.0) {
          selectedCanvasPoint[idx] = 0;
        }
      }

      console.log(`mouseUp - zoom-in - selected point - ${selectedCanvasPoint}`);

      if (this._canvasMode == "zoom-in") {
        this._canvasZoom *= 1.20;
        this._canvasCenterPoint = selectedCanvasPoint;
        this.redrawCanvas();
      }
      else if (this._canvasMode == "zoom-out") {
        this._canvasZoom *= 0.8;
        if (this._canvasZoom < 1) {
          this._canvasZoom = 1;
        }
        this._canvasCenterPoint = selectedCanvasPoint;
        this.redrawCanvas();
      }

    });

    this._frameCanvas.addEventListener("mousemove", (event) => {

      event.preventDefault();

      //
      // GET NORMALIZED COORDINATES
      //
      var selectedCanvasPoint = [
        event.offsetX / this._frameCanvas.offsetWidth,
        event.offsetY / this._frameCanvas.offsetHeight,
      ];

      for (let idx = 0; idx < 2; idx++ ) {
        if (selectedCanvasPoint[idx] > 1.0) {
          selectedCanvasPoint[idx] = 1;
        }
        if (selectedCanvasPoint[idx] < 0.0) {
          selectedCanvasPoint[idx] = 0;
        }
      }

    });

  }

  /**
   *
   */
  getTitle() {
    return this._applet.name;
  }

  /**
   *
   */
  getDescription() {
    return this._applet.description;
  }

  /**
   * @abstract
   */
  getIcon() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
      <path d="M9 10l.01 0"></path>
      <path d="M15 10l.01 0"></path>
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0"></path>
    </svg>`;
  }

  redrawCanvas() {

    console.log("******************** canvas-applet: redrawCanvas");

    var canvasHeight = window.innerHeight - 100;
    var ratio = canvasHeight / this._frameImage.height;

    var imageCanvasSize = [Math.floor(ratio * this._frameImage.width), Math.floor(ratio * this._frameImage.height)]
    console.log(`imageCanvasSize ${imageCanvasSize[0]} ${imageCanvasSize[1]}`);
    this._frameCanvas.width = imageCanvasSize[0];
    this._frameCanvas.height = imageCanvasSize[1];

    //
    // Set the previous canvas state to nominal values if this is the first time through
    //
    if (this._prevCanvasState == null) {  
      this._prevCanvasState = {
        zoom: 1,
        topLeft: [0, 0],
        visibleCanvasSize: imageCanvasSize,
        offScreenCanvasSize: imageCanvasSize
      }
      this._canvasZoom = 1;
    }

    console.log(`canvasZoom: ${this._canvasZoom}`)

    //
    // Create the offscreen canvas size
    //
    var offScreenCanvasSize = [0, 0];
    offScreenCanvasSize[0] = Math.floor(imageCanvasSize[0] * this._canvasZoom);
    offScreenCanvasSize[1] = Math.floor(imageCanvasSize[1] * this._canvasZoom);
    this._frameCanvas.offScreenCanvas.width = offScreenCanvasSize[0];
    this._frameCanvas.offScreenCanvas.height = offScreenCanvasSize[1];
    console.log(`offScreenCanvasSize - ${offScreenCanvasSize[0]} ${offScreenCanvasSize[1]}`);

    //
    // Draw the stuff on the offscreen canvas
    //
    this._offscreenCanvasContext.clearRect(0, 0, offScreenCanvasSize[0], offScreenCanvasSize[1]);
    this._offscreenCanvasContext.drawImage(this._frameImage, 0, 0, offScreenCanvasSize[0], offScreenCanvasSize[1]);

    //
    // Take the normalized visible canvas center point
    // and convert it to the offscreen canvas coordinates
    //
    var offScreenCenter = [0, 0];
    offScreenCenter[0] = this._prevCanvasState.topLeft[0] + this._canvasCenterPoint[0] * this._prevCanvasState.visibleCanvasSize[0];
    offScreenCenter[0] = offScreenCenter[0] / this._prevCanvasState.offScreenCanvasSize[0];
    offScreenCenter[1] = this._prevCanvasState.topLeft[1] + this._canvasCenterPoint[1] * this._prevCanvasState.visibleCanvasSize[1];
    offScreenCenter[1] = offScreenCenter[1] / this._prevCanvasState.offScreenCanvasSize[1];

    var imageCenterX = offScreenCenter[0] * offScreenCanvasSize[0];
    var imageCenterY = offScreenCenter[1] * offScreenCanvasSize[1];
    console.log(`imageCenter ${imageCenterX} ${imageCenterY}`);

    this._posText.textContent = `${offScreenCenter[0].toFixed(2)}, ${offScreenCenter[1].toFixed(2)}`;

    //
    // Figure out the top left visible canvas <-> offscreen canvas relationship
    // Make it so the visible canvas does not expand past the image
    //
    var topLeftCanvas = [0, 0];
    topLeftCanvas[0] = imageCenterX - offScreenCanvasSize[0] * 0.5;
    topLeftCanvas[0] = Math.floor(topLeftCanvas[0]);
    if (topLeftCanvas[0] < 0) {
      topLeftCanvas[0] = 0;
    }
    if (topLeftCanvas[0] + imageCanvasSize[0] > offScreenCanvasSize[0]) {
      topLeftCanvas[0] = offScreenCanvasSize[0] - imageCanvasSize[0];
    }

    topLeftCanvas[1] = imageCenterY - offScreenCanvasSize[1] * 0.5;
    topLeftCanvas[1] = Math.floor(topLeftCanvas[1]);
    if (topLeftCanvas[1] < 0) {
      topLeftCanvas[1] = 0;
    }
    if (topLeftCanvas[1] + imageCanvasSize[1] > offScreenCanvasSize[1]) {
      topLeftCanvas[1] = offScreenCanvasSize[1] - imageCanvasSize[1];
    }

    console.log(`topLeftCanvas ${topLeftCanvas[0]} ${topLeftCanvas[1]}`);

    //
    // Draw
    //

    this._frameCanvasContext.clearRect(0, 0, imageCanvasSize[0], imageCanvasSize[1]);
    this._frameCanvasContext.drawImage(
      this._frameCanvas.offScreenCanvas,
      topLeftCanvas[0], topLeftCanvas[1], imageCanvasSize[0], imageCanvasSize[1],
      0, 0, imageCanvasSize[0], imageCanvasSize[1]);

    //
    // Save the canvas state so we can recalculate next time around
    //

    this._prevCanvasState.zoom = this._canvasZoom;
    this._prevCanvasState.topLeft = topLeftCanvas;
    this._prevCanvasState.visibleCanvasSize = imageCanvasSize;
    this._prevCanvasState.offScreenCanvasSize = offScreenCanvasSize;

  }

  updateFrame(frameBlob) {

    this._prevCanvasState = null;
    this._canvasZoom = 1;
    this._canvasCenterPoint = [0.5, 0.5];

    var that = this;
    this._frameImage.onload = function () {
      that.redrawCanvas();
    };
    this._frameImage.src = URL.createObjectURL(frameBlob);
  }

  /**
   * @param data {Object}
   * - frame
   * - version
   * - media
   * - projectId
   * - selectedTrack
   * - selectedLocalization
   * - annotationData
   * - canvas
   */
  show(data) {

    this._active = true;
    this.setCanvasMode("edit");

  }

  allowedToClose() {
  }

  close() {

    this._active = false;

  }
}

customElements.define("canvas-applet", CanvasApplet);