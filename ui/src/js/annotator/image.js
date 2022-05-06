import { AnnotationCanvas } from "./annotation.js";
import { getCookie } from "../util/get-cookie.js";

var State = {PLAYING: 0, IDLE: 1, LOADING: -1};

export class ImageCanvas extends AnnotationCanvas
{
  constructor()
  {
    super();
    this._imageElement=document.createElement("img");
    this._imageElement.crossOrigin = "anonymous";
    this._good=false;
    this._supportsAvif=false;

    // There is no browser API call for 'is format supported' for images like for video content
    /// This attempts to load a small AVIF file as a test
    this._avifCheckDone=false; //Sequence variable to allow for out of order execution.
    var avif_test = new Image();
    avif_test.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
    try
    {
      avif_test.decode().then(() =>
      {
        this._supportsAvif = true;
        this._avifCheckDone = true;
        if (this._mediaFiles)
        {
          this._loadFromMediaFiles();
        }
      }).catch(()=>
      {
        this._supportsAvif = false;
        this._avifCheckDone = true;
        if (this._mediaFiles)
        {
          this._loadFromMediaFiles();
        }
      }
      );
    }
    catch(e)
    {
      // Console doesn't supporot AVIF
    }
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
    this._draw.blank();

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
      let this_id = val.id;
      let this_frame = this._videoFrame;

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

          if (this_id != this._videoObject.id || this_frame != this._videoFrame)
          {
            console.warn(`Video ID or Frame Fetch has been received out of order.`);
          }
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
        if (val.media_files && val.media_files.image) {
          this._mediaFiles = val.media_files;
          if (this._avifCheckDone == true)
          {
            this._loadFromMediaFiles();
          }
        }
      }
    });
  }

  _loadFromMediaFiles()
  {
    let url = null;
    // Discover all image files that we support
    let best_idx = 0;
    for (let idx = 0; idx < this._mediaFiles.image.length; idx++)
    {
      if (this._mediaFiles.image[idx].mime == "image/avif" && this._supportsAvif == true)
      {
        best_idx = idx;
        break;
      }
      else
      {
        best_idx = idx;
      }
    }
    url = this._mediaFiles.image[best_idx].path;
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

if (!customElements.get("image-canvas")) {
  customElements.define("image-canvas", ImageCanvas);
}
