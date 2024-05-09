import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { ImageCanvas } from "../../../../scripts/packages/tator-js/pkg/src/index.js";

if (!customElements.get("image-canvas")) {
  customElements.define("image-canvas", ImageCanvas);
}

let MAGIC_PAD = 5; // if videos are failing at the end jump back this number of frames

export class AnnotationMultiImage extends TatorElement {
  constructor() {
    super();

    window.tator_multi = this;

    const playerDiv = document.createElement("div");
    playerDiv.setAttribute(
      "class",
      "annotation__multi-player rounded-bottom-2"
    );
    this._shadow.appendChild(playerDiv);
    this._playerDiv = playerDiv;

    // Magic number matching standard header + footer
    // #TODO Investigate if this is needed
    //this._videoHeightPadObject = { height: 210 };
    //this._headerFooterPad = 100; // Another magic number based on the header and padding below controls footer

    document.addEventListener("keydown", (evt) => {
      if (document.body.classList.contains("shortcuts-disabled")) {
        return;
      }
      if (evt.key == "t") {
        this.dispatchEvent(new Event("toggleTextOverlay", { composed: true }));
      }
    });
  }

  set permission(val) {
    for (let image of this._images) {
      image.permission = val;
    }
  }

  addDomParent(val) {
    this._domParents.push(val);
  }

  set undoBuffer(val) {
    for (let image of this._images) {
      image.undoBuffer = val;
    }
  }

  set mediaInfo(val) {
    this._mediaInfo = val;
    this._images = [];
    this._multi_layout = val.media_files["layout"];

    let setup_image = (idx, image_info) => {

      var isPrime = idx == 0;
      if (isPrime) {
        let prime = this._images[idx];
        this.parent._browser.canvas = prime;
      }

      const smallTextStyle = {
        fontSize: "16pt",
        fontWeight: "bold",
        color: "white",
        background: "rgba(0,0,0,0.33)",
      };
      this._images[idx].overlayTextStyle = smallTextStyle;

      // #TODO This should be changed to dispatched events vs. calling the parent directly.
      this.parent._getMetadataTypes(
        this,
        this._images[idx]._canvas,
        idx != 0, //whether to block signal registration
        image_info.id, // sub-element real-id
        false // only update on last video
      );

      if (this._permission) {
        this._images[idx].permission = this._permission;
      }
      if (this._undoBuffer) {
        this._images[idx].undoBuffer = this._undoBuffer;
      }
    };

    // First, setup the nominal grid section which will be based off the predefined configuration
    this._gridDiv = document.createElement("div");
    this._gridDiv.setAttribute("class", "annotation__multi-grid");
    this._gridDiv.style.gridTemplateColumns = "auto ".repeat(
      this._multi_layout[1]
    );
    this._gridDiv.style.gridTemplateRows = "auto ".repeat(
      this._multi_layout[0]
    );
    this._imgDiv.appendChild(this._gridDiv);

    // Next, setup the focus video/dock areas.
    this._focusTopDiv = document.createElement("div");
    this._focusTopDiv.setAttribute("class", "d-flex");
    this._imgDiv.appendChild(this._focusTopDiv);

    this._focusDiv = document.createElement("div");
    this._focusDiv.setAttribute("class", "d-flex flex-justify-right");
    this._focusTopDiv.appendChild(this._focusDiv);

    this._focusTopDockDiv = document.createElement("div");
    this._focusTopDockDiv.setAttribute("class", "d-flex flex-wrap");
    this._focusTopDiv.appendChild(this._focusTopDockDiv);

    this._focusBottomDiv = document.createElement("div");
    this._focusBottomDiv.setAttribute("class", "d-flex");
    this._imgDiv.appendChild(this._focusBottomDiv);

    this._focusBottomDockDiv = document.createElement("div");
    this._focusBottomDockDiv.setAttribute(
      "class",
      "annotation__multi-secondary d-flex flex-row"
    );
    this._focusBottomDiv.appendChild(this._focusBottomDockDiv);

    this._imageDivs = {};
    this._imageGridInfo = {};
    let idx = 0;
    let image_resp = [];
    this._selectedDock = null; // Set with right click options
    this._numImages = val.media_files["ids"].length;

    for (const img_id of val.media_files["ids"]) {
      const wrapper_div = document.createElement("div");
      wrapper_div.setAttribute("class", "annotation__multi-grid-entry d-flex");
      this._imageDivs[img_id] = wrapper_div;

      let roi_image = document.createElement("image-canvas");
      this._imageGridInfo[img_id] = {
        row: Math.floor(idx / this._multi_layout[1]) + 1,
        col: (idx % this._multi_layout[1]) + 1,
        image: roi_image,
      };

      this._images.push(roi_image);
      wrapper_div.appendChild(roi_image);
      image_resp.push(
        fetchCredentials(`/rest/Media/${img_id}?presigned=28800`, {}, true)
      );

      // Setup addons for multi-menu and initialize the gridview
      this.assignToGrid(false);
      this.setupMultiMenu(img_id);
      idx += 1;
    }

    let image_info = [];
    Promise.all(image_resp).then((values) => {
      for (let resp of values) {
        image_info.push(resp.json());
      }
      Promise.all(image_info)
        .then(() => {
          this._primaryImageIndex = 0;

          for (let idx = 0; idx < image_info.length; idx++) {
            setup_image(idx, image_info[idx]);
          }

          let multiview = null;
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.has("multiview")) {
            multiview = searchParams.get("multiview");
            let focusNumber = parseInt(multiview);
            if (multiview == "hGrid") {
              this.setHorizontal();
            } else if (!isNaN(focusNumber)) {
              this._selectedDock = this._focusTopDockDiv;

              let currentIndex = 0;
              for (let imageId in this._imageDivs) {
                if (currentIndex == focusNumber) {
                  this.setFocus(imageId);
                  break;
                }
                currentIndex++;
              }
            }
          }

          this.dispatchEvent(
            new Event("canvasReady", {
              composed: true,
            })
          );
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  setMultiviewUrl(multiviewType, img_id) {
    let get_pos = () => {
      let idx = 0;
      for (let imageId in this._imageDivs) {
        if (imageId == img_id) {
          break;
        } else {
          idx++;
        }
      }
      return idx;
    };

    if (multiviewType == "horizontal") {
      var multiview = "hGrid";
    } else {
      var multiview = get_pos(img_id);
    }
    var search_params = new URLSearchParams(window.location.search);
    search_params.set("multiview", multiview);
    const path = document.location.pathname;
    const searchArgs = search_params.toString();
    var newUrl = path + "?" + searchArgs;
    if (this.pushed_state) {
      window.history.replaceState(this.multview_state_obj, "Multiview", newUrl);
    } else {
      window.history.pushState(this.multview_state_obj, "Multiview", newUrl);
      this.pushed_state = true;
    }
  }

  setFocus(img_id) {
    this._multiLayoutState = "focus";
    for (let imageId in this._imageDivs) {
      let image = this._imageDivs[imageId].children[0];
      image.contextMenuNone.hideMenu();
      if (imageId != img_id) {
        this.assignToSecondary(Number(imageId));
      } else {
        this.setMultiviewUrl("focus", Number(imageId));
        this.assignToPrimary(Number(imageId));
      }
    }
  }

  setFocusVertical(img_id) {
    this._selectedDock = this._focusTopDockDiv;
    this.setFocus(img_id);
  }

  setHorizontal() {
    this._multiLayoutState = "horizontal";
    this._selectedDock = this._focusBottomDockDiv;
    this.setMultiviewUrl("horizontal");
    for (let imageId in this._imageDivs) {
      let image = this._imageDivs[imageId].children[0];
      image.contextMenuNone.hideMenu();
      this.assignToSecondary(Number(imageId));
      image.contextMenuNone.displayEntry("Focus Image", true);
      image.contextMenuNone.displayEntry("Horizontal Multiview", false);
      image.contextMenuNone.displayEntry("Reset Multiview", true);
    }
  }

  setupMultiMenu(img_id) {
    let div = this._imageDivs[img_id];
    let image_element = div.children[0];

    this.pushed_state = false;
    this.multview_state_obj = { state: "multiview" };
    let reset_url = () => {
      var search_params = new URLSearchParams(window.location.search);
      if (search_params.has("multiview")) {
        search_params.delete("multiview");
        const path = document.location.pathname;
        const searchArgs = search_params.toString();
        var newUrl = path + "?" + searchArgs;
        if (this.pushed_state) {
          window.history.replaceState(
            this.multview_state_obj,
            "Multiview",
            newUrl
          );
        } else {
          window.history.pushState(
            this.multview_state_obj,
            "Multiview",
            newUrl
          );
          this.pushed_state = true;
        }
      }
    };

    // Move all the images back into their respective spots in the grid
    let reset = () => {
      for (let imageId in this._imageDivs) {
        let image = this._imageDivs[imageId].children[0];
        image.contextMenuNone.hideMenu();
      }
      this.assignToGrid();
      reset_url();
    };

    let focusVertical = () => {
      this.setFocusVertical(img_id);
    };

    image_element.contextMenuAvailable.then(() => {
      image_element.contextMenuNone.addMenuEntry("Focus Image", focusVertical);
      image_element.contextMenuNone.addMenuEntry(
        "Horizontal Multiview",
        this.setHorizontal.bind(this)
      );
      image_element.contextMenuNone.addMenuEntry("Reset Multiview", reset);
    });
  }

  // Move all but the first to secondary
  debug_multi() {
    let pos = 0;
    for (let image in this._imageDivs) {
      if (pos != 0) {
        this.assignToSecondary(Number(image));
      }
      pos++;
    }
  }

  makeAllVisible(node) {
    node.style.visibility = null;
    for (let child of node.children) {
      this.makeAllVisible(child);
    }

    // Don't forget about the shadow children
    if (node._shadow) {
      for (let child of node._shadow.children) {
        this.makeAllVisible(child);
      }
    }
  }
  assignToPrimary(img_id) {
    let div = this._imageDivs[img_id];
    this._focusDiv.appendChild(div);
    this.setMultiProportions();
    // These go invisible on a move.
    this.makeAllVisible(div);
    let image = div.children[0];

    for (let idx = 0; idx < this._images.length; idx++) {
      if (img_id == this._images[idx]._mediaInfo.id) {
        this._primaryImageIndex = idx;
        break;
      }
    }
  }

  assignToSecondary(img_id) {
    let div = this._imageDivs[img_id];
    this._selectedDock.appendChild(div);
    this.setMultiProportions();
    // These go invisible on a move.
    this.makeAllVisible(div);
  }

  assignToGrid(setContextMenu = true) {
    this._multiLayoutState = "grid";

    for (let idx = 0; idx < this._mediaInfo.media_files["ids"].length; idx++) {
      let imageId = this._mediaInfo.media_files["ids"][idx];
      if (imageId in this._imageDivs == false) {
        continue;
      }
      let div = this._imageDivs[imageId];
      this._gridDiv.appendChild(div);
      this.makeAllVisible(div);

      let image = div.children[0];

      if (setContextMenu) {
        image.contextMenuNone.displayEntry("Focus Image", true);
        image.contextMenuNone.displayEntry("Horizontal Multiview", true);
        image.contextMenuNone.displayEntry("Reset Multiview", false);
      }
      image.gridRows = this._multi_layout[0];

      let gridInfo = this._imageGridInfo[imageId];
      image.style.gridColumn = gridInfo.col;
      image.style.gridRow = gridInfo.row;
    }
    this._primaryImageIndex = 0;

    this._gridDiv.style.display = "grid";
    this._focusDiv.style.display = "none";
    this._focusBottomDockDiv.style.display = "none";
    this._focusTopDockDiv.style.display = "none";

    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 250);
  }

  /**
   * Expected to be called only when a image is being focused
   */
  setMultiProportions() {
    var horizontalDock = this._selectedDock == this._focusBottomDockDiv;

    if (horizontalDock) {
      this._focusDiv.style.display = "none";
      this._selectedDock.style.display = "flex";
      this._selectedDock.style.width = "100%";
    } else {
      this._focusDiv.style.display = "flex";
      this._selectedDock.style.display = "block";
      this._focusDiv.style.width = "70%";
      this._selectedDock.style.width = "30%";
    }
    this._gridDiv.style.display = "none";

    for (let primary of this._focusDiv.children) {
      primary.children[0].stretch = true;
      primary.children[0].contextMenuNone.displayEntry("Focus Image", false);
      primary.children[0].contextMenuNone.displayEntry(
        "Horizontal Multiview",
        true
      );
      primary.children[0].contextMenuNone.displayEntry("Reset Multiview", true);
      primary.children[0].gridRows = 1;
      primary.children[0].style.gridColumn = null;
      primary.children[0].style.gridRow = null;
    }

    for (let docked of this._selectedDock.children) {
      docked.children[0].stretch = true;
      docked.children[0].contextMenuNone.displayEntry("Focus Image", true);
      docked.children[0].contextMenuNone.displayEntry(
        "Horizontal Multiview",
        true
      );
      docked.children[0].contextMenuNone.displayEntry("Reset Multiview", true);
      docked.children[0].style.gridColumn = null;
      docked.children[0].style.gridRow = null;

      if (horizontalDock) {
        docked.children[0].gridRows = 1;
      } else {
        docked.children[0].gridRows = this._selectedDock.children.length;
      }
    }

    // Wait for reassignments to calculate resize event.
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 250);
  }

  set annotationData(val) {
    // Debounce this
    if (this._annotationData) {
      return;
    }

    this._annotationData = val;
    for (let image of this._images) {
      image.annotationData = val;
    }
  }

  newMetadataItem(dtype, metaMode, objId) {
    for (let image of this._images) {
      image.style.cursor = "crosshair";
      image.newMetadataItem(dtype, metaMode, objId);
    }
  }

  updateType(objDescription) {
    this._image.updateType(objDescription);
  }

  refresh() {
    for (let image of this._images) {
      image.refresh();
    }
  }

  defaultMode() {
    for (let image of this._images) {
      image.style.cursor = "default";
      image.defaultMode();
    }
  }

  zoomPlus() {
    for (let image of this._images) {
      let [x, y, width, height] = image._roi;
      width /= 2.0;
      height /= 2.0;
      x += width / 2.0;
      y += height / 2.0;
      image.setRoi(x, y, width, height);
      image._dirty = true;
      image.refresh();
    }
  }

  zoomMinus() {
    for (let image of this._images) {
      let [x, y, width, height] = image._roi;
      width *= 2.0;
      height *= 2.0;
      x -= width / 4.0;
      y -= height / 4.0;
      width = Math.min(width, image._dims[0]);
      height = Math.min(height, image._dims[1]);
      x = Math.max(x, 0);
      y = Math.max(y, 0);
      image.setRoi(x, y, width, height);
      image._dirty = true;
      image.refresh();
    }
  }

  zoomIn() {
    for (let image of this._images) {
      image.style.cursor = "zoom-in";
      image.zoomIn();
    }
  }

  zoomOut() {
    for (let image of this._images) {
      image.zoomOut();
    }
  }

  pan() {
    for (let image of this._images) {
      image.style.cursor = "move";
      image.pan();
    }
  }

  /**
   * Place holder for annotation-page.js. The current frame is generally assumed to be 0.
   */
  goToFrame(frame) {
    return;
  }

  selectNone() {
    for (let image of this._images) {
      image.selectNone();
    }
  }

  selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame) {
    for (let image of this._images) {
      if (image._mediaInfo.id == loc.media || image._mediaInfo.id == loc.media_id) {
        image.selectLocalization(loc, skipAnimation, muteOthers, skipGoToFrame);
      } else {
        image.selectNone();
      }
    }
  }

  selectTrack(track, frameHint, skipGoToFrame) {
    for (let image of this._images) {
      if (
        image._mediaInfo.id == track.media ||
        image._mediaInfo.id == track.media_id
      ) {
        image.selectTrack(track, frameHint, skipGoToFrame);
      } else {
        image.selectNone();
      }
    }
  }

  selectTrackUsingId(stateId, stateTypeId, frameHint, skipGoToFrame) {
    const ids = this._annotationData._dataByType
      .get(stateTypeId)
      .map((elem) => elem.id);
    const index = ids.indexOf(stateId);
    const track = this._annotationData._dataByType.get(stateTypeId)[index];
    this.selectTrack(track, frameHint, skipGoToFrame);
  }

  deselectTrack() {
    for (let image of this._images) {
      image.deselectTrack();
    }
  }

  addCreateTrackType(stateTypeObj) {
    for (let image of this._images) {
      image.addCreateTrackType(stateTypeObj);
    }
  }

  addAlgoLaunchOption(algoName) {
    for (let image of this._images) {
      image.addAlgoLaunchOption(algoName);
    }
  }

  addAppletToMenu(appletName, categories) {
    for (let image of this._images) {
      image.addAppletToMenu(appletName, categories);
    }
  }

  updateAllLocalizations() {
    for (let image of this._images) {
      image.updateAllLocalizations();
    }
  }

  toggleBoxFills(fill) {
    for (let image of this._images) {
      image.toggleBoxFills(fill);
    }
  }

  toggleTextOverlays(on) {
    for (let image of this._images) {
      image.toggleTextOverlays(on);
    }
  }
}

customElements.define("annotation-multi-image", AnnotationMultiImage);
