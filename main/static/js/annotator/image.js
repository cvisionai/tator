var State = {PLAYING: 0, IDLE: 1, LOADING: -1};

class ImageCanvas extends AnnotationCanvas
{
  constructor()
  {
    super();
    this._imageElement=document.createElement("img");
    this._imageElement.crossOrigin = "anonymous";
    this._good=false;
  }

  /**
   * Call this prior to mediaInfo
   * @param {integer} val - If provided, media assumed to be a video and the particular frame
   *                        will be used. This should be null if dealing with an image.
   */
  set videoFrame(val) {
    this._videoFrame = val;
  }


  /**
   * @param {Media object} val - Media object to load the canvas with
   */
  set mediaInfo(val) {
    super.mediaInfo = val;
    this._dims = [val.width, val.height];
    this.resetRoi();
    this._videoObject = val;
    this._draw.clear();

    // Have to wait for canvas to draw.
    new Promise(async resolve => {
      while (true) {
        if (this._canvas.clientHeight > 0) {
          break;
        }
        await new Promise(res => setTimeout(res, 10));
      }

      // Height isn't available, so approximate with width
      let display_size=this._canvas.offsetWidth;

      if (Number.isInteger(this._videoFrame)) {
        // Assume it's a video file. Get the appropriate frame and display that.
        fetch(`/rest/GetFrame/${val.id}?frames=${this._videoFrame}&quality=${display_size}`, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "image/*",
            "Content-Type": "image/*"
          }
        })
        .then(response => response.blob())
        .then(imageBlob => {

          var reader = new FileReader();
          var that = this;
          reader.addEventListener("load", function () {
            // convert image file to base64 string
            that.loadFromURL(reader.result, that._dims)
            .then(() => {
              that._good = true;
              that.refresh();
            })
            .then(() => {
              that.dispatchEvent(new Event("canvasReady", {
                composed: true
              }));
            });
          });
          reader.readAsDataURL(imageBlob); // converts the blob to base64
        });
      }
      else {
        // Normal image media file. Load the image from the given URL
        let url = null;
        if (val.media_files) {
          if (val.media_files.image) {
            url = val.media_files.image[0].path;
          }
        }
        this.loadFromURL(url, this._dims)
        .then(() => {
          this._good = true;
          this.refresh()
        })
        .then(() => {
          this.dispatchEvent(new Event("canvasReady", {
            composed: true
          }));
        });
      }
    });
  }

  // Images are neither playing or paused
  isPaused()
  {
    return true;
  }
  refresh()
  {
    // Prevent image buffer from loading prior to localizations
    if (this._good==false)
    {
      return;
    }
    const cWidth=this._canvas.width;
    const cHeight=this._canvas.height;
    // Calculate scaled image height, such that
    // the height matches the height of the viewscreen
    // and set the scaled width accordingly to maintain aspect
    const scale=cHeight/this._dims[1];
    const sHeight=this._dims[1]*scale;
    const sWidth=this._dims[0]*scale;

    // Calculate the margin we have in width
    const margin=cWidth-sWidth;
    // We want half of the margin to the left of the image frame
    const leftSide=margin/2;

    var frame = 0
    if (Number.isInteger(this._videoFrame)) {
      frame = this._videoFrame;
    }
    const promise = new Promise(resolve => {
      if (this._draw.canPlay())
      {
        this._draw.updateImage(this._roi[0],this._roi[1], //No clipping
                               this._roi[2],this._roi[3], //Image size
                               leftSide,0, //Place 'full-screen'
                               sWidth,sHeight, // Use canvas size
                              );
        this.moveOffscreenBuffer(this._roi);
      }
      else
      {
        this._draw.pushImage(frame,
                             this._imageElement,
                             this._roi[0],this._roi[1], //No clipping
                             this._roi[2],this._roi[3], //Image size
                             leftSide,0, //Place 'full-screen'
                             sWidth,sHeight, // Use canvas size
                             this._dirty
                            );

        this.updateOffscreenBuffer(frame,
                                   this._imageElement,
                                   this._dims[0],
                                   this._dims[1],
                                   this._roi);
      }
      // Images are always paused.
      this.onPause();
      this._draw.dispImage(true);
      resolve();
    });
    return promise;
  }

  loadFromURL(URL, dims)
  {
    // The browser can't handle 4k images for various overlay
    // effects (notable preview dim). Because we only display the image
    // at the client width, we can scale the dims here to be more efficient
    // from a graphics pipeline perspective.
    // Note: dims[0] is width.
    // Because we don't display using full screen (approx 70% max out the
    // viewport at that)
    this._imageScale = (window.screen.width*0.70) / dims[0];
    this._dims=[Math.round(dims[0]*this._imageScale),
                Math.round(dims[1]*this._imageScale)];
    this._draw.resizeViewport(this._dims[0], this._dims[1]);
    this._imageElement.setAttribute("src", URL);

    this.setupResizeHandler(dims);
    return this._imageElement.decode();
  }

  // 'Media Interface' implementations
  currentFrame()
  {
    if (Number.isInteger(this._videoFrame)) {
      return this._videoFrame;
    }
    else {
      return 0;
    }
  }

  gotoFrame(frame)
  {
    return this.refresh();
  }

  setupButtons(state)
  {

  }

  captureFrame(localizations)
  {
    this.makeOffscreenDownloadable(localizations, this._mediaInfo['name']);
  }
}

customElements.define("image-canvas", ImageCanvas);
