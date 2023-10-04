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
    this._sidebar.setAttribute(
      "class",
      "d-flex flex-column flex-items-center py-1 px-3"
    );
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
    } else if (this._canvasMode == "zoom-in") {
      this._frameCanvas.style.cursor = "zoom-in";
      this._zoomInButton._button.classList.add("btn-purple50");
    } else if (this._canvasMode == "zoom-out") {
      this._frameCanvas.style.cursor = "zoom-out";
      this._zoomOutButton._button.classList.add("btn-purple50");
    } else if (this._canvasMode == "pan") {
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

  /**
   * @param {array} offscreenRoi
   *    [0] = x (0.0 .. 1.0)
   *    [1] = y (0.0 .. 1.0)
   *    [2] = width (0.0 .. 1.0)
   *    [3] = height (0.0 .. 1.0)
   * @param {float} x
   *    -1.0 .. 1.0 in visible canvas coordinates (width)
   *    This is a percentage of the offscreenRoi's width
   * @param {float} y
   *    -1.0 .. 1.0 in visible canvas coordinates (height)
   *    This is a percentage of the offscreenRoi's height
   * @returns {array}
   *    [0] = x in offscreen canvas coordinates (normalized)
   *    [1] = y in offscreen canvas coordinates (normalized)
   */
  convertVisibleToOffscreen(x, y, offscreenRoi) {
    var offscreenX = offscreenRoi[0] + offscreenRoi[2] * x;
    var offscreenY = offscreenRoi[1] + offscreenRoi[3] * y;

    if (offscreenX < 0) {
      offscreenX = 0;
    } else if (offscreenX > 1) {
      offscreenX = 1;
    }

    if (offscreenY < 0) {
      offscreenY = 0;
    } else if (offscreenY > 1) {
      offscreenY = 1;
    }

    return [offscreenX, offscreenY];
  }

  createCanvas() {
    this._frameCanvas = document.createElement("canvas");
    this._main.appendChild(this._frameCanvas);
    this._frameCanvasContext = this._frameCanvas.getContext("2d");

    this._frameCanvas.offScreenCanvas = document.createElement("canvas");
    this._offscreenCanvasContext =
      this._frameCanvas.offScreenCanvas.getContext("2d");

    this._frameImage = new Image();

    console.log(`Windows device pixel ratio: ${window.devicePixelRatio}`);

    this._dragging = false;

    this._frameCanvas.addEventListener("mousedown", (event) => {
      this._dragging = true;

      this._event = { start: {}, current: {} };
      this._event.start.time = Date.now();

      var selectedCanvasPoint = [
        event.offsetX / this._frameCanvas.offsetWidth,
        event.offsetY / this._frameCanvas.offsetHeight,
      ];

      for (let idx = 0; idx < 2; idx++) {
        if (selectedCanvasPoint[idx] > 1.0) {
          selectedCanvasPoint[idx] = 1;
        }
        if (selectedCanvasPoint[idx] < 0.0) {
          selectedCanvasPoint[idx] = 0;
        }
      }

      this._event.start.point = selectedCanvasPoint;
    });

    this._frameCanvas.addEventListener("mouseup", (event) => {
      this._dragging = false;
      this._event = null;

      //
      // GET NORMALIZED COORDINATES OF MOUSE UP
      //
      var selectedCanvasPoint = [
        event.offsetX / this._frameCanvas.offsetWidth,
        event.offsetY / this._frameCanvas.offsetHeight,
      ];

      for (let idx = 0; idx < 2; idx++) {
        if (selectedCanvasPoint[idx] > 1.0) {
          selectedCanvasPoint[idx] = 1;
        }
        if (selectedCanvasPoint[idx] < 0.0) {
          selectedCanvasPoint[idx] = 0;
        }
      }

      console.log(`mouseUp - selected point - ${selectedCanvasPoint}`);

      if (this._canvasMode == "zoom-in") {
        this._canvasZoom *= 2;

        if (this._canvasZoom > 8) {
          this._canvasZoom = 8;
        }

        // The 0.25 is related with zoom.
        this._canvasCenterPoint = [
          selectedCanvasPoint[0] + 0.25,
          selectedCanvasPoint[1] + 0.25,
        ];
        this.redrawCanvas();
      } else if (this._canvasMode == "zoom-out") {
        this._canvasZoom *= 0.5;
        if (this._canvasZoom < 1) {
          this._canvasZoom = 1;
        }
        this._canvasCenterPoint = [
          selectedCanvasPoint[0] - 0.5,
          selectedCanvasPoint[1] - 0.5,
        ];
        this.redrawCanvas();
      }
    });

    this._frameCanvas.addEventListener("mousemove", (event) => {
      //
      // GET NORMALIZED COORDINATES
      //
      var selectedCanvasPoint = [
        event.offsetX / this._frameCanvas.offsetWidth,
        event.offsetY / this._frameCanvas.offsetHeight,
      ];

      for (let idx = 0; idx < 2; idx++) {
        if (selectedCanvasPoint[idx] > 1.0) {
          selectedCanvasPoint[idx] = 1;
        }
        if (selectedCanvasPoint[idx] < 0.0) {
          selectedCanvasPoint[idx] = 0;
        }
      }

      if (!this._dragging) {
        return;
      }

      var now = Date.now();
      var duration = now - this._event.start.time;

      if (this._canvasMode == "pan" && duration > 1000.0 / 60) {
        this._deltaX = selectedCanvasPoint[0] - this._event.start.point[0];
        this._deltaY = selectedCanvasPoint[1] - this._event.start.point[1];
        this._canvasCenterPoint[0] = 0.5 - this._deltaX;
        this._canvasCenterPoint[1] = 0.5 - this._deltaY;

        this._event.start.time = now;
        this._event.start.point = selectedCanvasPoint;

        this.redrawCanvas();
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

    console.log(
      `selectedCanvasPoint - ${this._canvasCenterPoint[0]} ${this._canvasCenterPoint[1]}`
    );

    //
    // Set the visible canvas size based on available document space
    // while maintaining frame image ratio.
    //
    var canvasHeight = window.innerHeight - 100;
    var ratio = canvasHeight / this._frameImage.height;

    var imageCanvasSize = [
      Math.floor(ratio * this._frameImage.width),
      Math.floor(ratio * this._frameImage.height),
    ];
    this._frameCanvas.width = imageCanvasSize[0];
    this._frameCanvas.height = imageCanvasSize[1];

    // #TODO Figure out zoom based on the ratio
    console.log(`frameImage <-> document space ratio: ${ratio}`);
    console.log(`imageCanvasSize: ${imageCanvasSize[0]} ${imageCanvasSize[1]}`);

    //
    // Create the offscreen canvas size based on the frame image ratio and requested zoom
    //
    var offScreenCanvasSize = [0, 0];
    offScreenCanvasSize[0] = Math.floor(imageCanvasSize[0] * this._canvasZoom);
    offScreenCanvasSize[1] = Math.floor(imageCanvasSize[1] * this._canvasZoom);
    this._frameCanvas.offScreenCanvas.width = offScreenCanvasSize[0];
    this._frameCanvas.offScreenCanvas.height = offScreenCanvasSize[1];

    console.log(
      `offScreenCanvasSize - ${offScreenCanvasSize[0]} ${offScreenCanvasSize[1]}`
    );

    //
    // Set the previous canvas state to nominal values if this is the first time through
    //
    if (this._prevCanvasState == null) {
      this._prevCanvasState = {
        zoom: 1,
        topLeft: [0, 0],
        visibleCanvasSize: imageCanvasSize,
        offScreenCanvasSize: imageCanvasSize,
      };
    }

    console.log(`canvasZoom: ${this._canvasZoom}`);

    //
    // Draw the stuff on the offscreen canvas
    //
    this._offscreenCanvasContext.clearRect(
      0,
      0,
      offScreenCanvasSize[0],
      offScreenCanvasSize[1]
    );
    this._offscreenCanvasContext.drawImage(
      this._frameImage,
      0,
      0,
      offScreenCanvasSize[0],
      offScreenCanvasSize[1]
    );

    //
    // 1. Convert the selected canvas point into the corresponding offscreen point
    // 2. Using the known visible canvas size, figure out the relative offscreen roi
    //
    var rOffscreenTopLeft = this.convertVisibleToOffscreen(
      this._canvasCenterPoint[0] - 0.5,
      this._canvasCenterPoint[1] - 0.5,
      this._offscreenRoi
    );

    var rWidth = imageCanvasSize[0] / offScreenCanvasSize[0];
    if (rWidth + rOffscreenTopLeft[0] > 1.0) {
      rOffscreenTopLeft[0] = 1 - rWidth;
    }
    if (rOffscreenTopLeft[0] < 0) {
      rOffscreenTopLeft[0] = 0;
    }

    var rHeight = imageCanvasSize[1] / offScreenCanvasSize[1];
    if (rHeight + rOffscreenTopLeft[1] > 1.0) {
      rOffscreenTopLeft[1] = 1 - rHeight;
    }
    if (rOffscreenTopLeft[0] < 0) {
      rOffscreenTopLeft[1] = 0;
    }

    this._offscreenRoi = [
      rOffscreenTopLeft[0],
      rOffscreenTopLeft[1],
      rWidth,
      rHeight,
    ];

    this._posText.textContent = `${this._offscreenRoi[0].toFixed(
      2
    )}, ${this._offscreenRoi[1].toFixed(2)}, ${this._offscreenRoi[2].toFixed(
      2
    )}, ${this._offscreenRoi[3].toFixed(2)}`;

    //
    // Draw
    //
    this._frameCanvasContext.clearRect(
      0,
      0,
      imageCanvasSize[0],
      imageCanvasSize[1]
    );
    this._frameCanvasContext.drawImage(
      this._frameCanvas.offScreenCanvas,
      this._offscreenRoi[0] * offScreenCanvasSize[0], // sx
      this._offscreenRoi[1] * offScreenCanvasSize[1], // sy
      this._offscreenRoi[2] * offScreenCanvasSize[0], // swidth
      this._offscreenRoi[3] * offScreenCanvasSize[1], // swidth
      0, // dx
      0, // dy
      imageCanvasSize[0], // dwidth
      imageCanvasSize[1]
    ); // dheight
  }

  updateFrame(frameBlob) {
    this._prevCanvasState = null;
    this._canvasZoom = 1;
    this._canvasCenterPoint = [0.5, 0.5];
    this._offscreenRoi = [0, 0, 1.0, 1.0]; // Initialize with 1-to-1 mapping

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

  allowedToClose() {}

  close() {
    this._active = false;
  }
}

customElements.define("canvas-applet", CanvasApplet);
