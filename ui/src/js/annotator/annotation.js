import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { DrawGL } from "./drawGL.js";
import { color } from "./drawGL_colors.js";
import { Utilities } from "../util/utilities.js";
import { handle_video_error } from "../annotation/annotation-common.js";
const getColorFilterMatrix = require('underwater-image-color-correction');


var statusAnimator=null;
var defaultDotWidth=10;
var defaultDrawWidth=3;
const annotation_alpha=0.7*255;

function clearStatus()
{
  if (statusAnimator)
  {
    clearTimeout(statusAnimator);
    statusAnimator=null;
  }
}

function updateStatus(msg, type, timeout)
{
  // This function should be deleted.
}

function distance_func(a,b)
{
  return Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2));
}

function enclosing_box(poly)
{
  let minX = Number.MAX_SAFE_INTEGER;
  let minY = Number.MAX_SAFE_INTEGER;
  let maxX = 0;
  let maxY = 0;
  for (let anchor of poly)
  {
    if (anchor[0] > maxX)
      maxX = anchor[0]
    if (anchor[1] > maxY)
      maxY = anchor[1]
    if (anchor[0] < minX)
      minX = anchor[0]
    if (anchor[1] < minY)
      minY = anchor[1]
  }
  return [minX,minY,maxX,maxY];
}

export class PolyMaker
{
  constructor(annotation)
  {
    this._ctrl = annotation;
    this._points = [];
    this._complete = false;
  }

  reset()
  {
    this._points = [];
    this._complete = false;
  }

  drawPointsAndLines(loc)
  {
    let normalCoords = this._ctrl.localizationToPoly({points:this._points});
    let width = defaultDrawWidth*this._ctrl._draw.displayToViewportScale()[0];
    for (let p of normalCoords)
    {
      this._ctrl._draw.drawCircle(p, width, color.WHITE);
    }

    if (this._points.length >= 2)
    {
      for (let idx = 0; idx < this._points.length-1; idx++)
      {
        this._ctrl._draw.drawLine(normalCoords[idx], normalCoords[idx+1], color.WHITE);
      }
    }

    if (this._points.length > 0 && loc)
    {
      this._ctrl._draw.drawLine(normalCoords[this._points.length-1], loc, color.GRAY);
    }

    if (loc)
    {
      let isClose = false;
      if (this._points.length > 0)
      {
        let distance = distance_func(loc,normalCoords[0]);
        if (distance < 15)
        {
          width *= 2.50;
        }
      }
      this._ctrl._draw.drawCircle(loc, width, color.WHITE);
    }
    this._ctrl._draw.dispImage(true, true);
  }

  onMouseDown(loc)
  {
    let normalCoords = this._ctrl.localizationToPoly({points:this._points});
    if (this._complete)
    {
      return;
    }
    if (this._points.length > 0)
    {
      let distance = distance_func(loc,normalCoords[0]);
      if (distance < 15)
      {
        // Close it
        this._points.push(this._points[0]);
        this.drawPointsAndLines();
        this._complete = true;
        // Calculate drag based on viewport coordinates
        let [minX,minY,maxX,maxY] = enclosing_box(normalCoords);
        let fakeDrag = {start: {x:minX,y:minY},
                        end: {x:maxX,y:maxY},
                        points: this._points, // These are always relative coords
                        url: this._ctrl._draw.viewport.toDataURL()};
        this._ctrl.makeModalCreationPrompt(this._ctrl.draft,fakeDrag)
        this._ctrl._canvas.dispatchEvent(
          new CustomEvent("drawComplete",
                    {composed: true,
                      detail: {metaMode: this._ctrl._metaMode}
                    }));
        return;
      }
    }
    this._points.push(this._ctrl.scaleToRelative(loc,true));
    this.drawPointsAndLines();
  }

  onMouseOver(loc)
  {
    if (this._complete)
    {
      return;
    }
    this.drawPointsAndLines(loc);
  }
}
// The clipboard acts like the power point clipboard
// +++++++++++++++++++++++++++++++++++
// +++++ Behavorial expectations: ++++
// +++++++++++++++++++++++++++++++++++
// - If on the same frame a cut/paste places the object back in the
// same spot
// - If on the same frame a copy/paste places the object 20 pixels down and to the right
// - If on a different frame a cut or copy places the object in the same spot on the new frame
// - After a cut the 'cut buffer' is cleared so that pasting is a no-op.
// - after a copy the 'copy buffer' is left along, so that pasting continues to duplicate the item.
export class Clipboard
{
  constructor(annotation)
  {
    this._annotationCtrl = annotation;
    document.addEventListener("keydown", this.keydown.bind(this));
    this._cutElement = null;
    this._copyElement = null;
  }

  isCutting(localization)
  {
    if (localization == null)
    {
      return false;
    }
    else
    {
      return ((this._cutElement && this._cutElement.id == localization.id) ||
              (this._copyElement && this._copyElement.id == localization.id));
    }
  }

  cutObject()
  {
    return this._cutElement;
  }

  clear()
  {
    this._cutElement = null;
    this._copyElement = null;
  }

  keydown(event)
  {
    if (this._annotationCtrl.activeLocalization == null &&
        this._cutElement == null &&
        this._copyElement == null)
    {
      return;
    }

    if (document.body.classList.contains("shortcuts-disabled"))
    {
      console.info("Shortcuts disabled!");
      return;
    }

    if (event.ctrlKey && event.code == "KeyX")
    {
      event.stopPropagation();
      if (this._cutElement == this._annotationCtrl.activeLocalization)
      {
        console.info("Cancel Cut");
        this._cutElement = null;
      }
      else
      {
        console.info("Cutting.");
        this._cutElement = this._annotationCtrl.activeLocalization;
      }
      this._annotationCtrl.refresh();
    }
    /*
    // Disabled for now
    if (event.ctrlKey && event.code == "KeyC")
    {
      console.info("Copying");
      event.stopPropagation();
      this._copyElement = Object.assign({},this._annotationCtrl.activeLocalization);
    }
    */
    if (event.ctrlKey && event.code == "KeyV")
    {

      if (this._cutElement)
      {
        if (this._cutElement.frame != this._annotationCtrl.currentFrame())
        {
          console.info("Pasting in cut-mode");
          this._annotationCtrl.modifyLocalization(this._cutElement,this._annotationCtrl.currentFrame());
        }
        else
        {
          this._cutElement = null;
          this._annotationCtrl.refresh();
        }
        this._cutElement = null;
      }
      else if (this._copyElement)
      {
         console.info("Pasting in copy-mode");
        //pass
      }
      event.stopPropagation();
    }
  }
}
// Handle generating a drag event within a canvas element
// The callback either receives an object with start + current
// representing an on-going drag
//
// Or the callback receives an object with start x/y and end x/y
// and the start/stop time of the drag (start.time + end.time)
//
export class CanvasDrag
{
  // @param canvas jquery object for canvas element
  // @param cb callback function to handle dragging
  // @param dragLimiter minimum interval to report mouseMove
  constructor(parent, canvas, scaleFn, cb, finalizer, dragLimiter)
  {
    this._cb = cb;
    this._finalizer = finalizer;
    this._canvas = canvas;
    this._scaleFn=scaleFn;
    this._active = false;

    if (dragLimiter != undefined)
    {
      this._dragLimiter = dragLimiter;
    }
    else
    {
      // Default to 30fps
      this.dragLimiter = 1000.0/60;
    }
    parent._textOverlay.addEventListener("mousedown", this.onMouseDown.bind(this));

    this._mouseMoveBound=this.onMouseMove.bind(this);
    this._mouseUpBound=this.onMouseUp.bind(this)
  }

  magnitude(start,end)
  {
    return Math.sqrt(Math.pow(start.x-end.x,2)+Math.pow(start.y-end.y,2));
  }

  isActive()
  {
    return this._active;
  }

  onMouseDown(event)
  {
    this._event={start : {}, current: {}}
    var scale = this._scaleFn();
    document.addEventListener("mouseup", this._mouseUpBound);
    document.addEventListener("mousemove", this._mouseMoveBound);
    this._event.start.x = event.offsetX*scale[0];
    this._event.start.y = event.offsetY*scale[1];
    this._event.current.x = this._event.start.x;
    this._event.current.y = this._event.start.y;
    this._event.start.time = Date.now();
  }

  onMouseMove(event)
  {
    if (event.buttons == 0)
    {
      this.onMouseUp(event);
    }
    this._active = true;
    var now = Date.now();
    var scale = this._scaleFn();
    var x = Math.min((event.pageX-this._canvas.offsetLeft),
                     this._canvas.offsetWidth)*scale[0]
    var y = Math.min((event.pageY-this._canvas.offsetTop),
                     this._canvas.offsetHeight)*scale[1];
    x = Math.round(Math.max(x,0));
    y = Math.round(Math.max(y,0));
    if (this._event.current != undefined)
    {
      if (now - this._event.current.time < this.dragLimiter)
      {
        // Debounce too many events based on limit
        return;
      }
      if (x == this._event.current.x &&
          y == this._event.current.y)
      {
        // If the mouse hasn't actually move, debounce
        return;
      }
    }
    this._event.current = {};
    this._event.current.x = x
    this._event.current.y = y;
    this._event.length = this.magnitude(this._event.start,
                                        this._event.current);
    this._event.current.time = now;
    this._event.duration = this._event.current.time -
      this._event.start.time;
    if (this._cb && this._event.duration > this.dragLimiter)
    {
      this._cb(this._event);
    }
  }

  onMouseUp(event)
  {
    this._active = false;
    var last = this._event.current;
    delete this._event.current;
    this._event.end = {};
    var scale = this._scaleFn();
    document.removeEventListener("mouseup", this._mouseUpBound);
    document.removeEventListener("mousemove", this._mouseMoveBound);
    // If the event ended off canvas; use the last known good coordinate
    this._event.end.x = last.x;
    this._event.end.y = last.y;
    if (event.path) {
      if (event.path[0] == this._canvas)
      {

        this._event.end.x = (event.pageX-this._canvas.offsetLeft)*scale[0];
        this._event.end.y = (event.pageY-this._canvas.offsetTop)*scale[1];
      }
    }
    this._event.end.time = Date.now();
    this._event.duration = this._event.end.time - this._event.start.time;
    this._event.length = this.magnitude(this._event.start,
                                        this._event.end);
    if (this._cb &&
        this._event.duration > this.dragLimiter &&
        ! (this._event.end.x == this._event.start.x &&
           this._event.end.y == this._event.start.y))
    {
      this._cb(this._event);
      this._finalizer(this._event);
    }
  }
}

/// Converts a drag (start/[current or end]) to a box defined by [sx,sy,w,h]
/// Nuance here is the user can drag left to right or right to left
function dragToBox(dragInfo)
{
  var end = null;
  if ('end' in dragInfo)
  {
    end = dragInfo.end;
  }
  else if ('current' in dragInfo)
  {
    end = dragInfo.current;
  }
  var sx = Math.min(dragInfo.start.x, dragInfo.end.x);
  var sy = Math.min(dragInfo.start.y, dragInfo.end.y);
  var w = Math.abs(end.x - dragInfo.start.x);
  var h = Math.abs(end.y - dragInfo.start.y);
  return [sx,sy,w,h];
}

function dragToLine(dragInfo)
{
  var end = null;
  if ('end' in dragInfo)
  {
    end = dragInfo.end;
  }
  else if ('current' in dragInfo)
  {
    end = dragInfo.current;
  }
  var x0 = dragInfo.start.x;
  var y0 = dragInfo.start.y;
  var x1 = end.x;
  var y1 = end.y;
  return [x0,y0,x1,y1];
}

// Given a polygon convert it to box convention
// 0---1
// |   |
// 3---2
//
// Can handle inversio
//
// 3---2
// |   |
// 0---1
//
// Does math between points 0 1 and 3
//
function polyToBox(poly)
{
  if (poly.length != 4)
  {
    return null;
  }

  var sx = Math.min(poly[0][0], poly[1][0]);
  var sy = Math.min(poly[0][1], poly[3][1]);
  var w = Math.abs(poly[1][0] - poly[0][0]);
  var h = Math.abs(poly[3][1] - poly[0][1]);
  return [sx,sy,w,h];

}

// All special cursor types, useful for clearing the deck
var cursorTypes=['vertical-resize',
                 'horizontal-resize',
                 'ne-resize',
                 'se-resize',
                 'nw-resize',
                 'sw-resize',
                 'grab',
                 'grabbing',
                 'pointer',
                 'move',
                 'crosshair',
                 'zoom-roi',
                 'not-allowed'];


function determineLineResizeType(mouseLocation,
                                 line)
{
  // 15 px margin for location
  var margin = 15;
  var resizeType=null;
  var impactVector=null;
  for (var idx = 0; idx < line.length; idx++)
  {
    // calculate cartesian distance to the point, if within the margin
    // it's a corner resize
    var distance = Math.sqrt(Math.pow(line[idx][0]-mouseLocation[0],2)+
                             Math.pow(line[idx][1]-mouseLocation[1],2));

    if (distance < margin)
    {
      switch(idx)
      {
        case 0:
        resizeType="move";
        impactVector=[[1.0,1.0],
                      [0.0,0.0]];
        break;
        case 1:
        resizeType="move";
        impactVector=[[0.0,0.0],
                      [1.0,1.0]];
        break;
      }
    }
  }

  if (resizeType)
  {
    return [resizeType, impactVector];
  }
  else
  {
    return null;
  }
}

function determinePolyResizeType(mouseLocation,poly)
{
  // 15 px margin for location
  var margin = 15;
  var resizeType=null;
  var impactVector=[];
  var minDistance = Number.MAX_SAFE_INTEGER;
  var distances=[];
  // Calculate the nearest point
  for (var idx = 0; idx < poly.length; idx++)
  {
    // calculate cartesian distance to the point, if within the margin
    // it's a corner resize
    var distance = Math.sqrt(Math.pow(poly[idx][0]-mouseLocation[0],2)+
    Math.pow(poly[idx][1]-mouseLocation[1],2));
    distances.push(distance);
    if (distance < minDistance)
    {
      minDistance = distance;
    }
  }

  for (var idx = 0; idx < poly.length; idx++)
  {
    // Handles overlapping point move for closed poly case.
    if (distances[idx] == minDistance && distances[idx] < margin)
    {
      resizeType="move";
      impactVector.push([1.0,1.0]);
    }
    else
    {
      impactVector.push([0.0,0.0]);
    }
  }

  if (resizeType)
  {
    return [resizeType, impactVector];
  }
  else
  {
    return null;
  }
}
// Given a mouse location and a box return resize type
// Box winds clockwise by convention from upper left
// (null if none)
// Returns a tuple name of resize type + per box coordinate impact vectors
// (During a drag a given
function determineBoxResizeType(mouseLocation,
                                box)
{
  // 15 px margin for location
  var margin = 15;
  var resizeType=null;
  var impactVector=null;
  // Check corners first
  for (var idx = 0; idx < box.length; idx++)
  {
    // calculate cartesian distance to the point, if within the margin
    // it's a corner resize
    var distance = Math.sqrt(Math.pow(box[idx][0]-mouseLocation[0],2)+
                             Math.pow(box[idx][1]-mouseLocation[1],2))
    if (distance < margin)
    {
      switch(idx)
      {
        case 0:
        resizeType="nw-resize";
        impactVector=[[1.0,1.0],
                      [0,1.0],
                      [0,0],
                      [1.0,0]];
        break;
        case 1:
        resizeType="ne-resize";
        impactVector=[[0,1],
                      [1,1],
                      [1,0],
                      [0,0]];
        break;
        case 2:
        resizeType="se-resize";
        impactVector=[[0,0],
                      [1,0],
                      [1,1],
                      [0,1]];
        break;
        case 3:
        resizeType="sw-resize";
        impactVector=[[1,0],
                      [0,0],
                      [0,1],
                      [1,1]];
        break;
      }
    }
  }

  // Pick corners first.
  if (resizeType)
  {
    return [resizeType, impactVector];
  }

  // 4 sides of a box
  for (var idx = 0; idx < 4; idx++)
  {
    // calculate y distance for first and 3rd
    // calculate x distance for 2nd and 4th
    var coordinate = ((idx + 1) % 2);

    var opp = idx % 2;
    var next = box[(idx + 1) % 4];
    var min = Math.min(box[idx][opp], next[opp]);
    var max = Math.max(box[idx][opp], next[opp]);

    var distance = Math.abs(box[idx][coordinate] - mouseLocation[coordinate]);
    var inRange = (mouseLocation[opp] > (min-margin) && mouseLocation[opp] < (max + margin));
    if (distance < margin && inRange)
    {
      switch(idx)
      {
        case 0:
        resizeType="vertical-resize";
        impactVector=[[0,1],
                      [0,1],
                      [0,0],
                      [0,0]];
        break;
        case 1:
        resizeType="horizontal-resize";
        impactVector=[[0,0],
                      [1,0],
                      [1,0],
                      [0,0]];
        break;
        case 2:
        resizeType="vertical-resize";
        impactVector=[[0,0],
                      [0,0],
                      [0,1],
                      [0,1]];
        break;
        case 3:
        resizeType="horizontal-resize";
        impactVector=[[1,0],
                      [0,0],
                      [0,0],
                      [1,0]];
        break;
      }
    }
  }


  if (resizeType)
  {
    return [resizeType, impactVector];
  }
  else
  {
    return null;
  }
}

function emphasisColor(localization)
{
  if (typeof localization.color === "undefined") {
    localization.color = color.TEAL;
  }
  return color.blend(color.WHITE, localization.color, 0.50);
}

const MouseMode =
      {
        // Default mode, query for localizations
        QUERY: 0,

        // This is when we are drawing a new localzation (and require meta)
        NEW : 1,

        // User has selected an annotation (this.activeAnnotation)
        SELECT : 2,

        // User is dragging an annotation (this.activeAnnotation)
        MOVE : 3,

        // User is resizing an annotation (this.activeAnnotation)
        RESIZE : 4,

        // User is setting an roi/zoom
        ZOOM_ROI: 5,

        // User is panning an roi
        PAN: 6,

        // User is making a new polygon
        NEW_POLY: 7
      };



// Defines a helper object to place text over the video canvas
export class TextOverlay extends TatorElement {
  constructor() {
    super();
    this._texts = [];
    this._enabledTexts = [];
    this._display = true;
  }

  // Toggles displaying the texts
  display(showText)
  {
    this._display = showText;
    for (let idx = 0; idx < this._texts.length; idx++)
    {
      let text = this._texts[idx];
      let div = text.element;
      let x = text.x;
      let y = text.y;

      if (showText && this._enabledTexts[idx]) {
        div.style.display = "block";
        this._setPosition(x,y,div);
      }
      else {
        div.style.display = "none";
      }
    }
  }

  getDisplayStatus() {
    return this._display;
  }

  /**
   * Toggles the text on/off for a partiular text overlay
   * @param {integer} idx - Index returned from addText
   * @param {boolean} display - True to display the text, false to hide it.
   */
  toggleTextDisplay(idx, display) {

    var enabled;
    if (display === true || display === false) {
      this._enabledTexts[idx] = display;
      enabled = display;
    }
    else {
      enabled = this._enabledTexts[idx];
    }

    const text = this._texts[idx]
    const div = text.element;

    if (!enabled) {
      div.style.display = "none";
    }
    else {
      if (div.style.display == "none") {
        if (this._display) {
          div.style.display = "block";
        }
      }
      else {
        if (!this._display) {
          div.style.display = "none";
        }
      }
    }
  }

  // Resize the overlay to a given height/width
  resize(width,height)
  {
    this.style.marginLeft=`-${width}px`;
    this.style.width=`${width}px`;
    this.style.height=`${height}px`;
    this.style.display = null;
    for (let text of this._texts)
    {
      let div = text.element;
      let x = text.x;
      let y = text.y;
      this._setPosition(x,y,div);
    }
  }

  // Set the position of a div object
  _setPosition(x,y,div)
  {
    div.style.marginLeft =
      `${Math.round(x*this.clientWidth)-div.clientWidth/2}px`;
    div.style.marginTop =
      `${Math.round(y*this.clientHeight)-div.clientHeight/2}px`;
  }

  modifyText(idx,delta,display)
  {
    if (idx >= this._texts.length)
    {
      console.error("Out of bound access");
      return;
    }
    if (delta == undefined || delta == null)
    {
      delta = {};
    }

    let text = this._texts[idx]
    let div = text.element;

    if (delta.style)
    {
      let style = delta.style;
      // Apply style from object
      const keys = Object.getOwnPropertyNames(style);
      for (let key of keys)
      {
        div.style[key] = style[key];
      }
    }

    // Set new text before positioning
    if (delta.content)
    {
      div.textContent = delta.content;
    }

    if (delta.x)
    {
      text.x = delta.x;
    }
    if (delta.y)
    {
      text.y = delta.y;
    }
    this._setPosition(text.x,text.y,div);
    this.toggleTextDisplay(idx, display);
  }

  clearAll()
  {
    for (let text of this._texts)
    {
      this._shadow.removeChild(text.element);
    }
    this._enabledTexts = [];
  }

  // Add text at a given position
  // Default style is 24pt bold, style can be patched
  // via the userStyle object argument
  // Ex: {'fontSize': '36pt',color: 'red'} // bold red
  addText(x,y, content, userStyle)
  {
    let div = document.createElement("div");
    div.style.userSelect = "none";
    div.style.position = "absolute";
    div.style.width = "fit-content";

    let style = {"fontSize": "24pt",
                 "fontWeight": "bold",
                 "color": "white",
                 "background": "rgba(0,0,0,0.33)"};
    if (userStyle)
    {
      const keys = Object.getOwnPropertyNames(userStyle);
      for (let key of keys)
      {
        style[key] = userStyle[key];
      }
    }

    // Apply style from object
    const keys = Object.getOwnPropertyNames(style);
    for (let key of keys)
    {
      div.style[key] = style[key];
    }
    div.textContent = content;
    this._shadow.appendChild(div);
    this._setPosition(x,y,div);
    this._texts.push({element: div,x:x,y:y});
    this._enabledTexts.push(true);
    return this._texts.length-1;
  }
}
if (!customElements.get("text-overlay")) {
  customElements.define("text-overlay", TextOverlay);
}

// Convenience export class to handle displaying annotation files out of a
// data source into a draw buffer.
export class AnnotationCanvas extends TatorElement
{
  // Construction requires a draw context +
  // data file
  constructor()
  {
    super();

    this._canvas=document.createElement("canvas");
    this._canvas.setAttribute("class", "video");
    this._canvas.setAttribute("height", "1");
    this._canvas.style.zIndex = -1;
    this._shadow.appendChild(this._canvas);

    this._textOverlay = document.createElement("text-overlay");
    this._textOverlay.style.position = "absolute";
    this._textOverlay.style.display = "none"; // Don't display until a resize
    this._shadow.appendChild(this._textOverlay);
    this._coordinateOverlayIdx = this._textOverlay.addText(0.93,.05, "", {'fontSize':'12pt'});
    this._textOverlay.toggleTextDisplay(this._coordinateOverlayIdx,false);
    this.overlayTextStyle =
      {"fontSize": "24pt",
       "fontWeight": "bold",
       "color": "white",
       "background": "rgba(0,0,0,0.33)"};
    this._showTextOverlays = true;
    this._gridRows = 0;
    this._stretch = false;
    this._overrideState = null; // Used to pop back into a state during a zoom/pan

    this._shortcutsDisabled = false;

    // Context menu (right-click): Tracks
    this._contextMenuTrack = document.createElement("canvas-context-menu");
    this._contextMenuTrack.style.zIndex = 2;
    this._contextMenuTrack.hideMenu();
    this._shadow.appendChild(this._contextMenuTrack);
    this._contextMenuTrack.addMenuEntry("Set as main track", this.contextMenuCallback.bind(this));
    this._contextMenuTrack.addMenuEntry("Trim start to here", this.contextMenuCallback.bind(this));
    this._contextMenuTrack.addMenuEntry("Trim end to here", this.contextMenuCallback.bind(this));
    this._contextMenuTrack.addMenuEntry("Extend track", this.contextMenuCallback.bind(this));
    this._contextMenuTrack.addMenuEntry("Fill track gaps", this.contextMenuCallback.bind(this));
    this._contextMenuTrack.addMenuEntry("Merge into main track", this.contextMenuCallback.bind(this));
    this._contextMenuTrack.disableEntry("Merge into main track", true, "Need to set main track first");
    this._selectedMergeTrack = null;
    this._algoLaunchOptions = [];
    this._appletLaunchOptions = [];
    this._menuAppletShortcuts = {
      "ALT+1": null,
      "ALT+2": null,
      "ALT+3": null
    };

    // Don't display the fill track gaps option until it has been verified the algorithm has been registered.
    this._contextMenuTrack.displayEntry("Fill track gaps", false);

    // Context menu (right-click): Localizations/detections
    this._contextMenuLoc = document.createElement("canvas-context-menu");
    this._contextMenuLoc.hideMenu();
    this._shadow.appendChild(this._contextMenuLoc);
    this._contextMenuLoc.addMenuEntry("Add to main track", this.contextMenuCallback.bind(this));
    this._contextMenuLoc.disableEntry("Add to main track", true, "Need to set main track first");
    this._createNewTrackMenuEntries = [];

    // Context menu (right-click): Nothing selected
    this._contextMenuNone = document.createElement("canvas-context-menu");
    this._contextMenuNone.hideMenu();
    this._shadow.appendChild(this._contextMenuNone);
    this._createNewStateFrameMenuEntries = [];

    this._contextMenuFrame = 0;

    this._clipboard = new Clipboard(this);
    this._polyMaker = new PolyMaker(this);

    this._draw=new DrawGL(this._canvas);
    this._canvas.addEventListener('webglcontextlost', (evt) => {
      console.warn("WebGL Context lost");
      evt.preventDefault();
      setTimeout(() => {
        console.info("Restoring webGL context");
        this.reinitCanvas();}, 1000);
      return false;
    });
    this._dragHandler = new CanvasDrag(this,
                                       this._canvas,
                                       this._draw.displayToViewportScale.bind(this._draw),
                                       this.dragHandler.bind(this),
                                       this.mouseUpHandler.bind(this));
    this._draw.setPushCallback((frameInfo) => {return this.drawAnnotations(frameInfo);});

    // Text-overlay is in a higher z-index so mouse events get masked
    this._textOverlay.addEventListener("mousedown", this.mouseDownHandler.bind(this));
    this._textOverlay.addEventListener("mouseup", this.mouseUpHandler.bind(this));
    this._textOverlay.addEventListener("mousemove", this.mouseOverHandler.bind(this));
    this._textOverlay.addEventListener("mouseout", this.mouseOutHandler.bind(this));
    this._textOverlay.addEventListener("dblclick", this.dblClickHandler.bind(this));
    this._textOverlay.addEventListener("contextmenu", this.contextMenuHandler.bind(this));

    document.addEventListener("keydown", this.keydownHandler.bind(this));
    document.addEventListener("keyup", this.keyupHandler.bind(this));
    // Setup data
    this._framedData=new Map();
    this._recent = new Map();
    this._mouseMode = MouseMode.QUERY;
    this._lastAutoTrackColor = null;
    this._domParents = [];
    this._metaMode = false;
    this._redrawObj = null;
    this._fillBoxes = true;
    this._lastHoverDraw = 0;

    this._errorTextId = this._textOverlay.addText(0.5,0.5,"",{'fontSize': '14pt',color: 'red'});


    this._delConfirm = document.createElement("entity-delete-confirm");
    this._shadow.appendChild(this._delConfirm);

    this._delConfirm.addEventListener("confirmDelete", () => {
      this.deleteLocalization(this.activeLocalization);
      this.activeLocalization=null;
      this._mouseMode == MouseMode.QUERY;
    });

    try {
      this._offscreen = new OffscreenCanvas(100, 100);
      this._offscreenDraw = new DrawGL(this._offscreen);
    } catch {
      let evt = { detail : {hasOffScreenCanvas : false}}
      handle_video_error(evt, this._shadow);
      console.warn("No offscreen canvas capability.");
    }
  }

  get contextMenuNone() {
    return this._contextMenuNone;
  }

  enableShortcuts() {
    this._shortcutsDisabled = false;
  }

  disableShortcuts() {
    this._shortcutsDisabled = true;
  }

  setupOverlay(overlay_config)
  {
    const mode = overlay_config.mode;
    let pos = [0.5,0.9];
    let value = null;
    let style = null;
    if (overlay_config.pos)
    {
      pos = overlay_config.pos;
    }
    if (overlay_config.style)
    {
      style = overlay_config.style;
    }
    if (mode == "constant")
    {
      if (overlay_config.source == "name")
      {
        value = this._mediaInfo.name;
      }
      if (overlay_config.source == "constant")
      {
        value = overlay_config.consant;
      }
      if (overlay_config.source == "attribute")
      {
        value = this._mediaInfo.attributes[overlay_config.key];
      }
      if (value && overlay_config.slice)
      {
        const slice = overlay_config.slice;
        if (1 in slice)
        {
          value = value.slice(slice[0],slice[1]);
        }
        else
        {
          value = value.slice(slice[0]);
        }
      }
      this._textOverlay.addText(pos[0],pos[1],value, style);
    }


    if (mode == "datetime")
    {
      let name = this._mediaInfo.name;

      // Trim off ID if it is there
      if (name[1] == '_')
      {
        name = name.substr(2);
      }
      let start_time_8601 = name.substr(0,name.lastIndexOf('.')).replaceAll("_",':');
      let timeZoneIncluded = start_time_8601.lastIndexOf('-') > 7;
      if (timeZoneIncluded != true)
      {
        start_time_8601 += '-00:00'; // Assume zulu time
      }

      // Convert to seconds since epoch (browser local time)
      let time_since_epoch = Date.parse(start_time_8601);

      if (isNaN(time_since_epoch) == true)
      {
        console.info("Could not deduce time from file name");
        return;
      }

      let time_idx = this._textOverlay.addText(pos[0],pos[1],"");
      let lastUpdate = null;

      let locale = 'en-US';
      let options = {"timeZone": "UTC", "timeZoneName": "short"};
      if (overlay_config.locale)
      {
        locale = overlay_config.locale;
      }
      if (overlay_config.options)
      {
        const keys = Object.getOwnPropertyNames(overlay_config.options);
        for (const key of keys)
        {
          options[key] = overlay_config.options[key];
        }
      }
      let update_function = (seconds) => {
        if (lastUpdate == seconds)
        {
          return;
        }
        lastUpdate = seconds;
        const milliseconds = seconds * 1000;
        // This is automatically in the local timezone based on the parsing above.
        const d = new Date(time_since_epoch + milliseconds);

        // Output to the text format specified by the media type schema
        let proposal_time = d.toLocaleString(locale, options);
        proposal_time = proposal_time.replace(", 24:", ", 00:");
        this._textOverlay.modifyText(time_idx,{content: proposal_time, style: this.overlayTextStyle});
      };

      // Run first update
      update_function(0);

      if (this._mediaType.dtype == "video" || this._mediaType.dtype == "multi")
      {
        this.addEventListener("frameChange", (evt) => {
          const frame = evt.detail.frame;
          const seconds = Math.floor(frame / this._mediaInfo.fps);
          update_function(seconds);
        });
      }
    }
  }

  set mediaType(val) {
    this._mediaType = val;

    // Handle overlay config
    if (val.overlay_config)
    {
      if ('many' in val.overlay_config)
      {
        for (let config of val.overlay_config.many)
        {
          this.setupOverlay(config);
        }
      }
      else
      {
        this.setupOverlay(val.overlay_config);
      }
    }
  }

  set permission(val) {
    this._canEdit = hasPermission(val, "Can Edit");
  }

  _determineCanEdit(localization) {
    if (localization == undefined)
    {
      localization = this.activeLocalization;
    }
    if (localization == undefined)
    {
      return this._canEdit;
    }
    else
    {
      let validVersion = this._data.getVersion().bases.indexOf(localization.version) >= 0;
      validVersion |= this._data.getVersion().id == localization.version;
      return this._canEdit && validVersion;
    }
  }

  displayErrorMessage(message) {
    this._textOverlay.modifyText(this._errorTextId, {content: message}, true);
  }

  hideErrorMessage() {
    this._textOverlay.modifyText(this._errorTextId, {}, false);
  }

  /**
   * Add the given applet to the right click menu launch option
   * @param {string} appletName - Unique applet name name to add to the right click menu
   * @param {list} categories - List of categories associated with the applet
   */
  addAppletToMenu(appletName, categories) {
    if (this._appletLaunchOptions.includes(appletName)) {
      Utilities.warningAlert(`Duplicate name registered for menu: ${appletName}`)
    }
    if (this._algoLaunchOptions.includes(appletName)) {
      Utilities.warningAlert(`Duplicate name registered for menu: ${appletName}`)
    }

    this._appletLaunchOptions.push(appletName);

    var shortcuts = '';
    for (const choice of ["ALT+1", "ALT+2", "ALT+3"]) {
      if (categories.includes(choice)) {
        this._menuAppletShortcuts[choice] = appletName;
        shortcuts += ` (${choice})`;
      }
    }

    if (categories.includes("track-applet")) {
      this._contextMenuTrack.addMenuEntry(appletName, this.contextMenuCallback.bind(this));
    }
    else {
      this._contextMenuNone.addMenuEntry(appletName, this.contextMenuCallback.bind(this), shortcuts);
    }
  }

  /**
   * Add the given algorithm to the right click menu launch option
   * @param {string} algoName - Unique algorithm name to add to the right click menu
   */
  addAlgoLaunchOption(algoName) {
    if (this._appletLaunchOptions.includes(algoName)) {
      Utilities.warningAlert(`Duplicate name registered for menu: ${algoName}`)
    }
    if (this._algoLaunchOptions.includes(algoName)) {
      Utilities.warningAlert(`Duplicate name registered for menu: ${algoName}`)
    }

    this._algoLaunchOptions.push(algoName);
    this._contextMenuNone.addMenuEntry(algoName, this.contextMenuCallback.bind(this));
  }

  /**
   * Enables the fill track gaps context menu option
   */
  enableFillTrackGapsOption()
  {
    this._contextMenuTrack.displayEntry("Fill track gaps", true);
  }

  /**
   * Routine used to create a new "create track" button in the right-click menu for localizations
   * that are not part of tracks.
   */
  addCreateTrackType(stateTypeObj)
  {
    if (stateTypeObj.visible == false) {
      return;
    }

    if (stateTypeObj.isTrack) {
      var text = "Create new " + stateTypeObj.name;
      this._contextMenuLoc.addMenuEntry(text, this.contextMenuCallback.bind(this));
      this._createNewTrackMenuEntries.push(
        {menuText: text,
         stateType: stateTypeObj});
    }
    else {
      var text = "Create new " + stateTypeObj.name;
      this._contextMenuNone.addMenuEntry(text, this.contextMenuCallback.bind(this));
      this._createNewStateFrameMenuEntries.push(
        {menuText: text,
         stateType: stateTypeObj});
    }
  }

  /**
   * Routine that's executed when a user selects a right-click menu option.
   * This will gather the appropriate information and dispatch the event
   * that should launch the appropriate dialog.
   */
  contextMenuCallback(menuText)
  {

    // It's possible that right clicking on a localization didn't actually set
    // the active track.
    // Handle case when localization is in a track
    if (this.activeLocalization) {
      if (this.activeLocalization.id in this._data._trackDb)
      {
        const track = this._data._trackDb[this.activeLocalization.id];
        this._activeTrack = track;
        this._activeTrackFrame = this.currentFrame();
      }
    }

    if (this._appletLaunchOptions.includes(menuText)) {
      this.dispatchEvent(new CustomEvent("launchMenuApplet", {
        detail: {
          appletName: menuText,
          frame: this.currentFrame(),
          media: this._videoObject,
          projectId: this._data._projectId,
          version: this._data.getVersion(),
          selectedTrack: this._activeTrack,
          selectedLocalization: this.activeLocalization
        },
        composed: true,
      }));
      return;
    }

    if (this._algoLaunchOptions.includes(menuText)) {
      this.dispatchEvent(new CustomEvent("launchAlgorithm", {
        detail: {
          algoName: menuText,
          frame: this.currentFrame(),
          mediaId: this._videoObject.id,
          projectId: this._data._projectId,
          version: this._data.getVersion(),
          selectedTrack: this._activeTrack,
          selectedLocalization: this.activeLocalization
        },
        composed: true,
      }));
      return;
    }

    // Save the general data that will be passed along to the dialog window
    var objDescription = {};
    objDescription.id = 'modifyTrack';
    objDescription.track = this._activeTrack;
    objDescription.localization = this.activeLocalization;
    objDescription.frame = this.currentFrame();
    objDescription.project = this._data._projectId;

    var createNewTrack = false;

    // See modify-track-dialog for interface types.
    if (menuText == "Extend track")
    {
      objDescription.interface = 'extend';
      objDescription.maxFrames = this._numFrames;
    }
    else if (menuText == "Trim start to here")
    {
      objDescription.interface = 'trim';
      objDescription.trimEndpoint = 'start';
    }
    else if (menuText == "Trim end to here")
    {
      objDescription.interface = 'trim';
      objDescription.trimEndpoint = 'end';
    }
    else if (menuText == "Merge into main track")
    {
      if (this._selectedMergeTrack.id == this._activeTrack.id)
      {
        window.alert("Cannot merge. Same track selected as main track.");
        return;
      }
      objDescription.interface = 'mergeTrack';
      objDescription.mainTrack = this._selectedMergeTrack;
    }
    else if (menuText == "Set as main track")
    {
      this._selectedMergeTrack = this._activeTrack;
      this._contextMenuTrack.disableEntry("Merge into main track", false);
      this._contextMenuLoc.disableEntry("Add to main track", false);
      return;
    }
    else if (menuText == "Add to main track")
    {
      objDescription.interface = 'addDetection';
      objDescription.mainTrack = this._selectedMergeTrack;
    }
    else if (menuText == "Fill track gaps")
    {
      objDescription.interface = "fillTrackGaps";
    }
    else
    {
      // Check to see if the menu matches the new track type.
      // If so, proceed foward and dispatch the appropriate event.
      for (const menuData of this._createNewTrackMenuEntries)
      {
        if (menuData.menuText == menuText)
        {
          objDescription = menuData.stateType;
          createNewTrack = true;
        }
      }

      if (!createNewTrack)
      {
        for (const menuData of this._createNewStateFrameMenuEntries)
        {
          if (menuData.menuText == menuText)
          {
            objDescription = menuData.stateType;
            createNewTrack = true;
          }
        }
      }

      if (!createNewTrack)
      {
        window.alert("Unrecognized right-click menu option caught: " + menuText)
        return;
      }
    }

    const dragInfo = {};
    var poly = [[0,0],[0,0],[0,0],[0,0]];
    if (this.activeLocalization)
    {
      poly = this.localizationToPoly(this.activeLocalization)
    }

    dragInfo.start = {x: poly[0][0], y: poly[0][1]};
    dragInfo.current = dragInfo.start;
    dragInfo.end = {x: poly[2][0], y: poly[2][1]};
    dragInfo.url = this._draw.viewport.toDataURL();

    if (createNewTrack)
    {
      var requestObj = {
        frame: this.currentFrame(),
      };

      if (this.activeLocalization) {
        requestObj.localization_ids = [this.activeLocalization.id]
      }

      this.dispatchEvent(new CustomEvent("create", {
        detail: {
          objDescription: objDescription,
          dragInfo: this.normalizeDrag(dragInfo),
          requestObj: requestObj,
          metaMode: false,
          canvasElement: this,
          mediaId: this._videoObject.id,
        },
        composed: true,
      }));
    }
    else
    {
      this.dispatchEvent(new CustomEvent("modifyTrack", {
        detail: {
          objDescription: objDescription,
          dragInfo: this.normalizeDrag(dragInfo),
          requestObj: null,
          metaMode: null,
        },
        composed: true,
      }));
    }
  }

  // This function can be used to redo the guts of the openGL setup if one
  // needs to. It can allow recovery from an openGL lost context.
  reinitCanvas()
  {
    // Remove the old one
    this._shadow.removeChild(this._canvas);
    this._canvas=document.createElement("canvas");
    this._canvas.setAttribute("class", "video");
    this._canvas.style.zIndex = -1;
    this._shadow.appendChild(this._canvas);

    // Re-initalize openGL component
    delete this._draw;
    this._draw=new DrawGL(this._canvas);
    this._dragHandler = new CanvasDrag(this,
                                       this._canvas,
                                       this._draw.displayToViewportScale.bind(this._draw),
                                       this.dragHandler.bind(this));

    // Set the canvas dimensions up correctly
    this._draw.resizeViewport(this._dims[0], this._dims[1]);
    this.refresh();
  }

  resetRoi()
  {
    // Center zoom
    this.setRoi(0,0,1.0, 1.0);
    this._dirty = true;
    this.dispatchEvent(new CustomEvent("zoomChange", {
      detail: {zoom: 100},
      composed: true
    }));
  }

  setRoi(sx, sy, width, height)
  {
    sx=Math.min(Math.max(0,sx),1.0);
    sy=Math.min(Math.max(0,sy),1.0);
    width=Math.min(Math.max(0,width),1.0);
    height=Math.min(Math.max(0,height),1.0);
    this._roi=[sx,sy,width,height];
    this._dirty = true;
    const zoomWidth = 1.0 / width;
    const zoomHeight = 1.0 / height;
    const zoom = Math.round(100 * Math.max(zoomWidth, zoomHeight));
    this.dispatchEvent(new CustomEvent("zoomChange", {
      detail: {zoom: zoom},
      composed: true
    }));
  }

  get domParents()
  {
    return this._domParents;
  }

  /**
   * Utilizes this._dims, this._gridRow, and this.heightPadObject
   */
  forceSizeChange() {
    const ratio=this._dims[0]/this._dims[1];
    var maxHeight;
    if (this._gridRows) {
      maxHeight = (window.innerHeight - this.heightPadObject.height) / this._gridRows;
    }
    else {
       maxHeight = window.innerHeight - this.heightPadObject.height;
    }
    let maxWidth = maxHeight*ratio;

    // If stretch mode is on, stretch the canvas
    if (this._stretch)
    {
      let hStretch = (maxWidth/this._canvas.width);
      let vStretch = (maxHeight/this._canvas.height);
      if (hStretch > 1 || vStretch > 1)
      {
        this._canvas.width = maxWidth;
        this._canvas.height = maxHeight;
        this._draw.resizeViewport(maxWidth, maxHeight);
      }
    }
    else
    {
      this._canvas.width = this._dims[0];
      this._canvas.height = this._dims[1];
    }
    this._canvas.style.maxHeight=`${maxHeight}px`;
    this.parentElement.style.maxWidth=`${maxWidth}px`;
    this._domParents.forEach(parent =>
                             {
                               var obj = parent.object;
                               var align = parent.alignTo;
                               if (align)
                               {
                                 var style=getComputedStyle(obj,null)
                                 const end = align.offsetLeft + align.offsetWidth;
                                 const width = end - obj.offsetLeft -
                                       parseInt(style.paddingRight);
                                 obj.style.maxWidth=`${width}px`;
                               }
                               else
                               {
                                 obj.style.maxWidth=`${maxWidth}px`;
                               }
                             });
    this._textOverlay.resize(this.clientWidth, this.clientHeight);
  }

  setupResizeHandler(dims, numGridRows, heightPadObject)
  {
    this._gridRows = numGridRows;
    if (heightPadObject == null) {
      this.heightPadObject = {height: 175}; // Magic number here matching the header + footer
    }
    else {
      this.heightPadObject = heightPadObject;
    }

    const ratio=dims[0]/dims[1];
    var that = this;
    var resizeHandler = function()
    {
      var maxHeight;
      if (that._gridRows) {
        maxHeight = (window.innerHeight - that.heightPadObject.height) / that._gridRows;
      }
      else {
         maxHeight = window.innerHeight - that.heightPadObject.height;
      }
      let maxWidth = maxHeight*ratio;

      // If stretch mode is on, stretch the canvas
      if (that._stretch)
      {
        let hStretch = (maxWidth/that._canvas.width);
        let vStretch = (maxHeight/that._canvas.height);
        if (hStretch > 1 || vStretch > 1)
        {
          that._canvas.width = maxWidth;
          that._canvas.height = maxHeight;
          that._draw.resizeViewport(maxWidth, maxHeight);
        }
      }
      else
      {
        that._canvas.width = that._dims[0];
        that._canvas.height = that._dims[1];
      }
      that._canvas.style.maxHeight=`${maxHeight}px`;
      that.parentElement.style.maxWidth=`${maxWidth}px`;
      that._domParents.forEach(parent =>
                               {
                                 var obj = parent.object;
                                 var align = parent.alignTo;
                                 if (align)
                                 {
                                   var style=getComputedStyle(obj,null)
                                   const end = align.offsetLeft + align.offsetWidth;
                                   const width = end - obj.offsetLeft -
                                         parseInt(style.paddingRight);
                                   obj.style.maxWidth=`${width}px`;
                                 }
                                 else
                                 {
                                   obj.style.maxWidth=`${maxWidth}px`;
                                 }
                               });
      that._textOverlay.resize(that.clientWidth, that.clientHeight);
      that.dispatchEvent(new Event("canvasResized"));
    }

    // Set up resize handler.
    window.addEventListener("resize", () => {
      clearTimeout(this._resizeTimer);
      this.forceSizeChange();
      this.dispatchEvent(new Event("canvasResized"));
      requestAnimationFrame(() => {


        // Finalize the resize
        this._resizeTimer = setTimeout(() => {
          //this._draw.resizeViewport(dims[0], dims[1]);
          if (this.isPaused() == true)
          {
            this._hqFallbackTimer = setTimeout(() => {this.refresh(true)}, 3000);
            this.refresh(false).then(() => {
              clearTimeout(this._hqFallbackTimer);
              this.refresh(true);
            });
          }
          this.forceSizeChange();
          this.dispatchEvent(new Event("canvasResized"));
        }, 10);
      });
    });
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  set mediaInfo(val) {
    this._mediaInfo = val;
  }

  set gridRows(val) {
    this._gridRows = val;
  }

  set stretch(val) {
    this._stretch = val;
  }

  set annotationData(val) {
    this._data = val;
    this._data.addEventListener("freshData", evt => {
      const typeObj = evt.detail.typeObj;
      if (typeObj.isLocalization) {
        let currentFrame = this.currentFrame();
        // Clean out old annotations for the type
        this._framedData.forEach((frameObj, frameIdx, map) => {
          frameObj.delete(typeObj.id);
        }, this);

        this.insertIntoFramedData(evt.detail.data, evt.detail.typeObj);
      } else if (typeObj.isTrack) {
        // Reset auto track
        this._lastAutoTrackColor = null;
        this._data._trackDb.forEach((trackObj, localizationIdx, map) => {
          if (trackObj.meta == typeObj.id) {
            this._data._trackDb.delete(localizationIdx);
          }
        }, this);
        // Sort prior to processing for consistent color progression
        evt.detail.data.sort(function(e1, e2) {
          if (e1.id < e2.id) {
            return -1;
          }
          if (e1.id > e2.id) {
            return 1;
          }
          else {
            return 0;
          }
        });
        evt.detail.data.forEach(track => {
          track.localizations.forEach(localId => {
            this._data._trackDb[localId] = track;
          });

          if (track.color == null) {
            //Make a local color determination using color progression
            var drawColor = color.nextColor(this._lastAutoTrackColor);
            // Set the last auto color
            this._lastAutoTrackColor = drawColor;
            // Cache the downloaded copy of the track with the color value
            track.color = color.rgbToHex(drawColor);
          }
        });
      }
    });
  }

  updateType(typeObj, callback)
  {
    this._data.updateType(typeObj, callback);
  }

  updateAllLocalizations()
  {
    this._data.updateLocalizations(this.refresh.bind(this), null);
  }

  contextMenuHandler(clickEvent)
  {
    // Disable the normal right click menu
    clickEvent.preventDefault();
    var clickLocation = [clickEvent.clientX, clickEvent.clientY];

    // Determine if the user right clicked on a state/track or a stand-alone localization/detection
    if (this.activeLocalization) {
      let localizationInTrack = this.activeLocalization.id in this._data._trackDb;
      if (localizationInTrack) {
        this._contextMenuTrack.displayMenu(clickLocation[0], clickLocation[1]);
      }
      else {
        // Right now, there are only track related right-click options for localizations.
        // The right-click menu might have been disabled if we are in image mode.
        if (this._createNewTrackMenuEntries.length > 0)
        {
          this._contextMenuLoc.displayMenu(clickLocation[0], clickLocation[1]);
        }
      }
    }
    else {
      // Nothing selected, display corresponding menu
      if (this._contextMenuNone.hasEntries())
      {
        this._contextMenuNone.displayMenu(clickEvent.clientX, clickEvent.clientY);
      }
    }
  }

  keyupHandler(event)
  {
    if (this._shortcutsDisabled) {
      return;
    }

    this._keydownFired = false;
    if (this._mouseMode == MouseMode.MOVE)
    {
      if (event.key == 'ArrowRight' ||
          event.key == 'ArrowLeft' ||
          event.key == 'ArrowUp' ||
          event.key == 'ArrowDown')
      {
        clearTimeout(this._keyUpTimer);
        this._keyUpTimer =
          setTimeout(() =>
                     {
                       this.modifyLocalization();
                     },375);
      }
    }
  }

  keydownHandler(event)
  {
    console.log(`this._shortcutsDisabled: ${this._shortcutsDisabled}`)
    if (this._shortcutsDisabled) {
      return;
    }

    if (document.body.classList.contains("tab-disabled") && event.key == "Tab") {
      return;
    }

    if (document.body.classList.contains("shortcuts-disabled")) {
      console.log("Shortcuts are disabled!");
      return;
    }

    if (this._mouseMode == MouseMode.QUERY)
    {
      if (event.ctrlKey && event.code == "Digit9")
      {
        this._effectManager.grayscale();
        return;
      }
      if (event.ctrlKey && event.code == "Digit8")
      {
        this._effectManager.grayscale({'color': color.BLACK, 'alpha': 128});
        document.body.style.cursor = "progress";
        setTimeout(()=>{
        this.underwaterCorrection();
        },33);
        return;
      }
      if (event.ctrlKey && event.code == "Digit7")
      {
        setTimeout(()=>{
        this.refresh(true);
        },0);
        return;
      }
      if (event.key == "1")
      {
        if (event.altKey == true) {
          if (this._menuAppletShortcuts["ALT+1"] != null) {
            event.preventDefault();
            event.stopPropagation();

            this.dispatchEvent(new CustomEvent("launchMenuApplet", {
              detail: {
                appletName: this._menuAppletShortcuts["ALT+1"],
                frame: this.currentFrame(),
                media: this._videoObject,
                projectId: this._data._projectId,
                version: this._data.getVersion(),
              },
              composed: true,
            }));
            return;
          }
        }
      }
      if (event.key == "2")
      {
        if (event.altKey == true) {
          if (this._menuAppletShortcuts["ALT+2"] != null) {
            event.preventDefault();
            event.stopPropagation();

            this.dispatchEvent(new CustomEvent("launchMenuApplet", {
              detail: {
                appletName: this._menuAppletShortcuts["ALT+2"],
                frame: this.currentFrame(),
                media: this._videoObject,
                projectId: this._data._projectId,
                version: this._data.getVersion(),
              },
              composed: true,
            }));
            return;
          }
        }
      }
      if (event.key == "3")
      {
        if (event.altKey == true) {
          if (this._menuAppletShortcuts["ALT+3"] != null) {
            event.preventDefault();
            event.stopPropagation();

            this.dispatchEvent(new CustomEvent("launchMenuApplet", {
              detail: {
                appletName: this._menuAppletShortcuts["ALT+3"],
                frame: this.currentFrame(),
                media: this._videoObject,
                projectId: this._data._projectId,
                version: this._data.getVersion(),
              },
              composed: true,
            }));
            return;
          }
        }
      }

      if (event.code == 'Tab')
      {
        event.preventDefault();

        var frame = this.currentFrame();
        var firstLocalization = this.getFirstLocalization(frame);
        if (firstLocalization)
        {
          this.selectLocalization(firstLocalization, true);
        }

        return false;
      }

      // Handle frame seek shortcuts
      var amount = 1;
      if (event.shiftKey == true)
      {
        amount *= 5;
      }
      if (event.key == 'ArrowRight')
      {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey == true)
        {
          this.advanceOneSecond(true);
        }
        else
        {
          this.gotoFrame(this.currentFrame() + amount, true);
        }
        return false;
      }
      if (event.key == 'ArrowLeft')
      {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey == true)
        {
          this.backwardOneSecond(true);
        }
        else
        {
          this.gotoFrame(this.currentFrame() - amount, true);
        }
        return false;
      }
    }

    if (this._mouseMode == MouseMode.SELECT)
    {
      if (event.code == 'Delete' && this._determineCanEdit(this.activeLocalization))
      {
        this._delConfirm.objectName = this.getObjectDescription(this.activeLocalization).name;
        this._delConfirm.confirm()
      }

      if (event.code == 'Tab')
      {
        event.preventDefault();

        var frame = this.currentFrame();
        var firstLocalization = this.getFirstLocalization(frame);
        if (firstLocalization)
        {
          //Select the first annotation
          var currentId = this.activeLocalization.id;
          var firstType=this._framedData.get(frame).keys().next().value;
          var nextLocalization=firstLocalization;
          var typeIter = this._framedData.get(frame).values();
          var done = false;
          // Not a sorted list so search through the whole thing
          var maxId = Number.MAX_VALUE;
          var typeList=typeIter.next();
          while (typeList.done == false && done == false)
          {
            for (var idx = 0; idx < typeList.value.length; idx++)
            {
              if (typeList.value[idx].id > currentId && typeList.value[idx].id < maxId)
              {
                maxId = typeList.value[idx].id;
                nextLocalization = typeList.value[idx];
              }
            }
            typeList=typeIter.next();
          }
          this.selectLocalization(nextLocalization, true);
        }
        return false;
      }
    }

    if ((this._mouseMode == MouseMode.SELECT ||
        this._mouseMode == MouseMode.MOVE ) && this._determineCanEdit(this.activeLocalization))
    {
      if (event.key == 'ArrowRight' ||
          event.key == 'ArrowLeft' ||
          event.key == 'ArrowUp' ||
          event.key == 'ArrowDown')
      {
        this._mouseMode = MouseMode.MOVE;
        var coord = 0;
        var amount = 0;
        var impactVector = [1,1,1,1];

        if (event.key == 'ArrowRight')
        {
          coord = 0;
          amount = 1;
          if (event.altKey)
          {
            impactVector = [-1,1,1, -1];
          }
        }
        if (event.key == 'ArrowLeft')
        {
          coord = 0;
          amount = -1;
          if (event.altKey)
          {
            impactVector = [-1,1,1,-1];
          }
        }
        if (event.key == 'ArrowUp')
        {
          coord = 1;
          amount = -1;
          if (event.altKey)
          {
            impactVector = [1,1,-1,-1];
          }
        }
        if (event.key == 'ArrowDown')
        {
          coord = 1;
          amount = 1;
          if (event.altKey)
          {
            impactVector = [1,1,-1,-1];
          }
        }

        // Move a lot when you hold shift down
        if (event.shiftKey == true)
        {
          amount *= 5;
        }

        var meta=this.getObjectDescription(this.activeLocalization);
        var objType = this.getObjectDescription(this.activeLocalization);

        if (objType.dtype == 'box')
        {
          var poly = this.localizationToPoly(this.activeLocalization);
          for (var idx = 0; idx < 4; idx++)
          {
            poly[idx][coord] += (amount*impactVector[idx]);
          }
          poly = this.boundsCheck(poly);

          // Update localization based on motion
          var boxCoords=this.scaleToRelative(polyToBox(poly));
          this.activeLocalization.x = boxCoords[0];
          this.activeLocalization.y = boxCoords[1];
          this.activeLocalization.width = boxCoords[2];
          this.activeLocalization.height = boxCoords[3];
        }
        else if (objType.dtype == 'line')
        {
          var line = this.localizationToLine(this.activeLocalization);
          for (var idx = 0; idx < 2; idx++)
          {
            line[idx][coord] += (amount*impactVector[0]);
          }
          line = this.boundsCheck(line);

          // Update localization based on motion
          var expLine=this.scaleToRelative(this.explodeLine(line), true);
          this.activeLocalization.x0 = expLine[0];
          this.activeLocalization.y0 = expLine[1];
          this.activeLocalization.x1 = expLine[2];
          this.activeLocalization.y1 = expLine[3];
          this.modifyLocalization();
        }
        else if (objType.dtype == 'dot')
        {
          // Add to current localization first
          if (coord == 0)
          {
            var pixel = 1.0/this._dims[0];
            var newX = this.activeLocalization.x + (amount*impactVector[0]*pixel);
            if (newX <= 1.0 && newX >= 0)
            {
              this.activeLocalization.x = newX;
            }
          }
          else if (coord == 1)
          {
            var pixel = 1.0/this._dims[1];
            var newY = this.activeLocalization.y + (amount*impactVector[1]*pixel);
            if (newY <= 1.0 && newY >= 0)
            {
              this.activeLocalization.y = newY;
            }
          }
          var line = this.localizationToDot(this.activeLocalization,
                                            defaultDotWidth);

        }

        this.selectLocalization(this.activeLocalization, true, true);
        this._mouseMode = MouseMode.MOVE; //select puts us back in select mode
        return false;
      }

      // If we somehow get in here..
      return false;
    }
  }

  insertIntoFramedData(data, typeObj)
  {
    // We are hot if the frame being described is currently displayed
    var needRefresh=false;
    var currentFrame = this.currentFrame();

    for (var idx = 0; idx < data.length; idx++)
    {
      var element=data[idx];
      if (element.media_id != this._videoObject.id &&
          element.media != this._videoObject.id)
      {
        continue;
      }

      var frameId=data[idx]['frame'];
      var typeid = typeObj.id;
      if (this.activeLocalization) {
        if (data[idx].id == this.activeLocalization.id) {
          this.activeLocalization = {
            ...this.activeLocalization,
            ...data[idx]
          };
        }
      }

      // Determine if we are describing current frame
      if (currentFrame == frameId)
      {
        needRefresh = true;
      }

      if (this._framedData.has(frameId))
      {
        if (this._framedData.get(frameId).has(typeid))
        {
          this._framedData.get(frameId).get(typeid).push(data[idx]);
        }
        else
        {
          this._framedData.get(frameId).set(typeid,[data[idx]]);
        }
      }
      else
      {
        // No data exists for this frame, so make a new typeid map
        this._framedData.set(frameId,new Map());
        this._framedData.get(frameId).set(typeid,[data[idx]]);
      }
    }
    console.info("Fetched " + data.length + " annotations.");

    if (needRefresh == true && this._ready == true)
    {
      this.refresh();
    }
    else
    {
      this.addEventListener("seekReady", ()=>{
        this.refresh();
      });
    }
  }

  toggleBoxFills(fill)
  {
    // fill is True if localization boxes should be filled.
    // False will make all box fills transparent.
    this._fillBoxes = fill;
  }

  toggleTextOverlays(on)
  {
    // on is True if text overlays should be shown.
    // Fill will make all text overlays disappear
    this._textOverlay.display(on);
  }

  getTextOverlayDisplayStatus()
  {
    return this._textOverlay.getDisplayStatus();
  }

  determineLocalizationResizeType(location, localization)
  {
    var resizeType=null;
    if (localization == null)
    {
      return null;
    }
    var type = this.getObjectDescription(localization).dtype;
    if (type == 'poly')
    {
      var poly = this.localizationToPoly(localization);
      resizeType=determinePolyResizeType(location,
                                              poly);
    }
    else if (type == 'box')
    {
      var poly = this.localizationToPoly(localization);
      resizeType=determineBoxResizeType(location,
                                            poly);
    }
    else if (type == 'line')
    {
      var line = this.localizationToLine(localization);
      resizeType=determineLineResizeType(location,
                                              line);
    }
    return resizeType;
  }

  computeLocalizationColor(localization, meta)
  {
    // Default fill is solid
    var fill = {"style": "solid","color":color.TEAL,"alpha":0.15*255};
    var drawColor = color.TEAL;
    var trackColor = null;
    var alpha = annotation_alpha;
    var useHandles = false;

    let decodeColor = (value) => {
      if (typeof(value) == "string")
      {
        drawColor = color.hexToRgb(value)
      }
      else
      {
        drawColor = value.slice(0,3);
        if (value.length == 4)
        {
          alpha = value[3];
        }
      }
      //Set the fill color to the box draw color
      fill.color = drawColor;
    };
    let decodeFill = (fill_obj) => {
      fill.style=fill_obj.style;
      let value =fill_obj.color;
      if (value == undefined)
        return;
      if (typeof(value.color) == "string")
      {
        fill.color = color.hexToRgb(value)
      }
      else
      {
        fill.color = value.slice(0,3);
        if (value.length == 4)
        {
          fill.alpha = value[3];
        }
      }
    };

    let colorMap = (objAttributes, skipDefault) => {

      if (skipDefault == false)
      {
        if (meta.colorMap.default)
        {
          decodeColor(meta.colorMap.default);
        }

        if (meta.colorMap.defaultFill)
        {
          decodeFill(meta.colorMap.defaultFill);
        }

        if (meta.colorMap.version)
        {
          if (localization.version in meta.colorMap.version)
          {
            decodeColor(meta.colorMap.version[localization.version]);
          }
        }
      }

      var keyname = meta.colorMap.key;
      if (keyname && keyname in objAttributes)
      {
        var keyvalue = objAttributes[keyname];
        if (meta.colorMap.map && keyvalue in meta.colorMap.map)
        {
          decodeColor(meta.colorMap.map[keyvalue]);
        }
        if (meta.colorMap.fillMap && keyvalue in meta.colorMap.fillMap)
        {
          decodeFill(meta.colorMap.fillMap[keyvalue]);
        }
      }

      // If we define a alpha_ranges routine
      if (meta.colorMap.alpha_ranges)
      {
        keyname = meta.colorMap.alpha_ranges.key;
        var keyvalue=localization.attributes[keyname];
        if (keyvalue)
        {
          for (let ranges of meta.colorMap.alpha_ranges.alphas)
          {
            if (keyvalue >= ranges[0] && keyvalue < ranges[1])
            {
              alpha = ranges[2];
            }
          }
        }
      }
    };

    let localizationMatchesActiveTrack = this._activeTrack && this._activeTrack.localizations.includes(localization.id);
    let localizationInTrack = localization.id in this._data._trackDb;

    if (localization.id in this._data._trackDb)
    {
      if (localizationMatchesActiveTrack)
      {
        alpha = 1.0*255;
        trackColor = "FFFFFF";
        useHandles = true;
      }
      else
      {
        trackColor = this._data._trackDb[localization.id].color;
      }
      if (trackColor)
      {
        drawColor = color.hexToRgb(trackColor);
      }
    }

    if (meta.colorMap)
    {
      if (localizationInTrack)
      {
        colorMap(this._data._trackDb[localization.id].attributes, true);
      }
      else
      {
        colorMap(localization.attributes, false);
      }
    }
    fill.color = drawColor;

    // Handle state based color choices
    // If we are cutting the localization apply half alpha at gray
    if (this._clipboard.isCutting(localization))
    {
      drawColor = color.MEDIUM_GRAY;
      alpha = 0.5 * 255;
    }

    // If this is the active localization it is white @ 255
    if (localizationMatchesActiveTrack)
    {
      fill.alpha = 0.0;
    }
    else if (this.activeLocalization && this.activeLocalization.id == localization.id)
    {
      drawColor = color.WHITE;
      fill.alpha = 0.0;
      useHandles = true;
      if (this._emphasis && this._emphasis.id == localization.id)
      {
        alpha = 255;
      }
      if (this._clipboard.isCutting(localization))
      {
        alpha *= 0.5;
        fill.alpha *= 0.5;
      }
    }
    else if (this._emphasis && this._emphasis.id == localization.id)
    {
      // If this is the emphasized localization it is white-blended @ 255
      drawColor = color.blend(color.WHITE, drawColor, 0.50);
      fill.alpha *= 0.5;
      if (this._clipboard.isCutting(localization))
      {
        alpha *= 0.5;
      }
    }

    // If the fill is disabled, just set the alpha to fully transparent
    if (!this._fillBoxes)
    {
      fill.alpha = 0.0;
    }

    return {"color": drawColor, "alpha": alpha, "fill": fill, "handles": useHandles};
  }

  // Given a localization translate it based on the drag action, the impact vector (member) should be
  // set to indicate which points are suspectable to motion in which proportionality (x,y,or both).
  // If the impact vector is null then all points of the localization are moved equally in both x,y
  // based on the vector of motion of end-begin.
  translateLocalization(begin, end, localization)
  {
    var poly = [];
    if (localization == undefined)
    {
      localization = this.activeLocalization;
    }
    var type = this.getObjectDescription(localization).dtype;
    if (type == 'dot')
    {
      var center = this.localizationToDot(localization);
      center[0] += end.x - begin.x;
      center[1] += end.y - begin.y;
      return center;
    }
    else if (type == 'line')
    {
      poly = this.localizationToLine(localization);
    }
    else if (type == 'box' || type == 'poly')
    {
      poly = this.localizationToPoly(localization);
    }

    if (this._impactVector)
    {
      for (var idx = 0; idx < poly.length; idx++)
      {
        poly[idx][0] += (end.x - begin.x) * this._impactVector[idx][0];
        poly[idx][1] += (end.y - begin.y) * this._impactVector[idx][1];
      }
    }
    else
    {
      for (var idx = 0; idx < poly.length; idx++)
      {
        poly[idx][0] += (end.x - begin.x);
        poly[idx][1] += (end.y - begin.y);
      }
    }
    return poly;
  }

  localizationByLocation(clickLoc)
  {
    var loc = this.scaleToRelative(clickLoc);
    var currentFrame = this.currentFrame();
    var that = this;

    let hypot = (a,b) =>
        {
          return Math.sqrt(Math.pow(a,2)+Math.pow(b,2));
        };
    let distance_func = (a,b) =>
        {
          return Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2));
        };

    let localizations = [];
    if (this._framedData.has(currentFrame))
    {
      for (let typed_list of this._framedData.get(currentFrame))
      {
        if (typed_list[0] != "CFM")
        {
          localizations.push(...typed_list[1]);
        }
      }
    }

    // Add the cut object for mouse experience
    if (this._clipboard.cutObject() && this._clipboard.cutObject().frame != currentFrame)
    {
      localizations.push(this._clipboard.cutObject());
    }

    var match = null;
    let distances=[];
    for (let localization of localizations)
    {
      var meta = that.getObjectDescription(localization);
      if (meta.dtype == "poly")
      {
        let [minX,minY,maxX,maxY] = enclosing_box(localization.points);
        let in_poly = (loc) => {
          return loc[0] >= minX && loc[0] <= maxX && loc[1] >= minY && loc[1] <= maxY;
        }
        const poly_threshold = hypot(maxX-minX,maxY-minY);
        for (let anchor of localization.points)
        {
          var distance = distance_func(anchor, loc);
          if (distance < poly_threshold && in_poly(loc))
          {
            distances.push({"distance": distance,
                            "data": localization});
          }
        }
      }
      if (meta.dtype == "box")
      {
        var nw = [localization.x,localization.y];
        var sw = [localization.x,localization.y+localization.height];
        var ne = [localization.x+localization.width,localization.y];
        var se = [localization.x+localization.width,localization.y+localization.height];
        if (loc[0] <= ne[0] && loc[0] >= nw[0] &&
            loc[1] <= se[1] && loc[1] >= ne[1])
        {
          for (let corner of [nw,sw,ne,se])
          {
            var distance = distance_func(corner, loc);
            if (distance < hypot(localization.width/2, localization.height/2))
            {
              distances.push({"distance": distance,
                              "data": localization});
            }
          }
        }
      }
      // Thershold is a width
      var t = that.scaleToRelative([0,0,10])[2];
      if (meta.dtype == "dot")
      {
        var pos = [localization.x, localization.y];
        var distance = distance_func(pos, loc);
        if ((distance) < t)
        {
          distances.push({"distance": distance,
                          "data": localization});
        }
      }
      if (meta.dtype == "line")
      {
        var y2=localization.y + localization.v;
        var y1=localization.y;
        var x2=localization.x + localization.u;
        var x1=localization.x;

        var x_min=Math.min(x1,x2);
        var y_min=Math.min(y1,y2);
        var x_max=Math.max(x1,x2);
        var y_max=Math.max(y1,y2);

        if (loc[0] > x_min && loc[0] < x_max &&
            loc[1] > y_min && loc[1] < y_max )
        {
          // Line distance equation
          var distanceFromLine=Math.abs(((y2-y1)*loc[0])-
                                        ((x2-x1)*loc[1])+
                                        (x2*y1)-(y2*x1))/
              Math.sqrt(Math.pow(y2-y1,2)+Math.pow(x2-x1,2));
          if (distanceFromLine < t)
          {
            distances.push({"distance": distanceFromLine,
                            "data": localization});
          }
        }
      }
    }
    //distances now contains a list of canidates so sort them and return the first one
    if (distances.length > 0)
    {
      distances.sort((a,b) => {return a['distance'] - b['distance']});
      match = distances[0].data;
    }
    return match;
  }

  localizationToPoly(localization, drawCtx, roi)
  {
    if (roi == undefined)
    {
      roi = this._roi;
    }

    if (drawCtx == undefined)
    {
      drawCtx = this._draw;
    }

    // scale factor based on canvas height versus image height
    // Draw commands are in viewspace coordinates, but annotations
    // are in image coordinates.

    var scaleFactor=[drawCtx.clientWidth/roi[2],
                     drawCtx.clientHeight/roi[3]];

    var poly = [];
    if (localization.points)
    {
      for (let point of localization.points)
      {
        poly.push([(point[0] - roi[0]) *scaleFactor[0],
                   (point[1] - roi[1]) *scaleFactor[1]]);
      }
    }
    else
    {
      //Scale box dimenisons
      var actX = (localization.x - roi[0]) *scaleFactor[0];
      var actY = (localization.y - roi[1])*scaleFactor[1];
      var actWidth = localization.width*scaleFactor[0];
      var actHeight = localization.height*scaleFactor[1];

      poly = [[actX, actY],
              [actX + actWidth,
               actY],
              [actX + actWidth,
               actY + actHeight],
              [actX,
                actY + actHeight]];
    }

    return poly;
  }

  localizationToLine(localization, drawCtx, roi)
  {
    if (roi == undefined)
    {
      roi = this._roi;
    }

    if (drawCtx == undefined)
    {
      drawCtx = this._draw;
    }

    var scaleFactor=[drawCtx.clientWidth/roi[2],
                     drawCtx.clientHeight/roi[3]];

    //Scale box dimensions
    var actX0 = (localization.x - roi[0]) / roi[2];
    var actY0 = (localization.y - roi[1]) / roi[3];
    var actX1 = (localization.x + localization.u - roi[0]) / roi[2];
    var actY1 = (localization.y + localization.v - roi[1]) / roi[3];

    scaleFactor[0] *= roi[2];
    scaleFactor[1] *= roi[3];

    return [[actX0*scaleFactor[0],actY0*scaleFactor[1]],[actX1*scaleFactor[0], actY1*scaleFactor[1]]];
  }

  localizationToDot(localization, width, drawCtx, roi)
  {
    if (roi == undefined)
    {
      roi = this._roi;
    }

    if (drawCtx == undefined)
    {
      drawCtx = this._draw;
    }

    var scaleFactor=[drawCtx.clientWidth/roi[2],
                     drawCtx.clientHeight/roi[3]];

    if (width == undefined)
    {
      width = Math.round(defaultDotWidth*this._draw.displayToViewportScale()[0]);
    }

    //Scale to get actual center of dot
    var actX0 = (localization.x - roi[0]) *scaleFactor[0];
    var actY0 = (localization.y - roi[1])*scaleFactor[1];
    return [actX0,actY0];
  }

  explodeLine(line)
  {
    return [line[0][0],line[0][1],line[1][0],line[1][1]];
  }

  scaleToViewport(location)
  {
    var scale = this._draw.displayToViewportScale();
    return [location[0]*scale[0], location[1]*scale[1]];
  }

  mouseOutHandler(mouseEvent)
  {
    let needRefresh = false;
    this._textOverlay.classList.remove("select-pointer");
    this._textOverlay.toggleTextDisplay(this._coordinateOverlayIdx,false);
    if (this._emphasis != null && this._emphasis != this.activeLocalization)
    {
      this._emphasis = null;
      needRefresh = true;
    }
    if (this._lastHoverDraw > 0)
    {
      needRefresh = true;
    }
    if (needRefresh == true)
    {
      this.refresh();
    }
  }

  mouseOverHandler(mouseEvent)
  {
    if (this._playing)
    {
      return;
    }
    var that = this;
    var location = this.scaleToViewport([mouseEvent.offsetX, mouseEvent.offsetY]);
    var relativeVPLocation = [location[0]/this._dims[0], location[1]/this._dims[1]];
    var relativeImageLocation = [(relativeVPLocation[0]*this._roi[2])+this._roi[0],
                                 (relativeVPLocation[1]*this._roi[3])+this._roi[1]];
    var absImageLocation = [relativeImageLocation[0]*this._dims[0], relativeImageLocation[1]*this._dims[1]];
    this._textOverlay.toggleTextDisplay(this._coordinateOverlayIdx,true);
    const overlay_coordinate_msg =  `${Math.round(absImageLocation[0])},${Math.round(absImageLocation[1])}`;
    this._textOverlay.modifyText(this._coordinateOverlayIdx,
                                 {content: overlay_coordinate_msg});
    // If we are in select or query modes change cursor on over
    if (this._mouseMode == MouseMode.QUERY || this._mouseMode == MouseMode.SELECT)
    {
      // Clear old pointer type
      cursorTypes.forEach((t) => {this._textOverlay.classList.remove("select-"+t);});
      var localization = this.localizationByLocation(location);
      if (localization)
      {
        if (localization.frame != this.currentFrame())
        {
          this._textOverlay.classList.add("select-not-allowed");
          return;
        }
        if(localization != this.activeLocalization) {
          this._textOverlay.classList.add("select-pointer");
          this.emphasizeLocalization(localization);
        }
      }
      else
      {
        // This is a mouse out event. User has moved outside a localization.
        // If there is an active localization (i.e. a selected one), then select that one

        if (this._emphasis != null && this._emphasis != this.activeLocalization)
        {
          this._textOverlay.classList.remove("select-pointer");
          this._emphasis = null;
          this.refresh();
        }
      }
    }
    if (this._mouseMode == MouseMode.SELECT && this._determineCanEdit(this.activeLocalization))
    {
      this._impactVector = null;
      var resizeType = this.determineLocalizationResizeType(location, this.activeLocalization);

      var localization = this.localizationByLocation(location);
      if ((resizeType && this._clipboard.isCutting(this.activeLocalization)) ||
          this._clipboard.isCutting(localization) && localization.id == this.activeLocalization.id) {
        this._textOverlay.classList.add("select-not-allowed");
        this.emphasizeLocalization(this.activeLocalization);
      }
      else if (resizeType)
      {
        this._textOverlay.classList.add("select-"+resizeType[0]);
        this._impactVector = resizeType[1];
        this.refresh();
      }
      else
      {
        // Check to see if we are nearby are in the localization
        if (localization && this.activeLocalization && localization.id == this.activeLocalization.id)
        {
          // If we tripped in during a select, don't override the pointer
          if (mouseEvent.buttons == 0)
          {
            this._textOverlay.classList.add("select-grab");
          }
          else
          {
            this._textOverlay.classList.add("select-grabbing");
          }
          this.emphasizeLocalization(localization);
        }
        else if (localization)
        {
          // User moved off localization
          this._textOverlay.classList.add("select-pointer");
          this.emphasizeLocalization(localization);
        }
        else
        {
          // User moved off localization
          this._textOverlay.classList.remove("select-pointer");
          if (this._emphasis != null)
          {
            this._emphasis = null;
            this.refresh();
          }
        }
      }
    }
    if (this._mouseMode == MouseMode.ZOOM_ROI)
    {
      this._textOverlay.classList.add("select-zoom-roi");
    }

    if (this._mouseMode == MouseMode.NEW_POLY)
    {
      cursorTypes.forEach((t) => {that._textOverlay.classList.remove("select-"+t);});
      this._textOverlay.classList.add("select-crosshair");
      this._polyMaker.onMouseOver(location);
    }
    if (this._overrideState == MouseMode.NEW_POLY)
    {
      // TODO: This would be ideal but causes some flashes that are unsightly.
      //this._polyMaker.onMouseOver(null); // use poly shape, but no next point hint.
    }
    if (this._mouseMode == MouseMode.NEW)
    {
      cursorTypes.forEach((t) => {this._textOverlay.classList.remove("select-"+t);});
      this._textOverlay.classList.add("select-crosshair");
      let over_threshold = () => {
        return (performance.now()-this._lastHoverDraw) > (1000.0/30);
      };
      if (this._dragHandler.isActive() == false)
      {
        if (over_threshold())
        {
          this._lastHoverDraw = performance.now();
          this.drawCrosshair(location, color.WHITE, 200);
          this._draw.dispImage(true,false);
        }
      }
      else
      {
        this._lastHoverDraw = 0;
      }
    }
  }

  // if the user releases their mouse over an animation handle accordingly
  mouseUpHandler(event)
  {
    if (this._mouseMode == MouseMode.SELECT || this._mouseMode == MouseMode.RESIZE)
    {
      cursorTypes.forEach((t) => {this._textOverlay.classList.remove("select-"+t);});
    }
    else if (this._mouseMode == MouseMode.PAN)
    {
      // When drawing a poly, only allow one move at a time.
      if (this._overrideState == MouseMode.NEW_POLY)
      {
        this._canvas.dispatchEvent(
                      new CustomEvent("modeChange",
                                {composed: true,
                                detail: {newMode: "new_poly", metaMode: this._metaMode}
                                }));
        this.defaultMode();
      }
    }

    // Mode Change logic
    if (this._mouseMode == MouseMode.MOVE || this._mouseMode == MouseMode.RESIZE)
    {
      // Change back to SELECT after a MOVE or RESIZE
      this._mouseMode = MouseMode.SELECT;
    }
  }

  // If the user clicked an annotation, bring up an edit form if they clicked nothing, reset
  mouseDownHandler(clickEvent)
  {
    this._clickTime = performance.now();

    this._contextMenuTrack.hideMenu();
    this._contextMenuLoc.hideMenu();
    this._contextMenuNone.hideMenu();

    if (document.body.classList.contains("shortcuts-disabled")) {
      document.body.classList.remove("shortcuts-disabled");
      document.activeElement.blur();
    }
    cursorTypes.forEach((t) => {this._textOverlay.classList.remove("select-"+t);});
    clickEvent.preventDefault();
    var clickLocation =
        this.scaleToViewport([clickEvent.offsetX, clickEvent.offsetY]);
    var localization = this.localizationByLocation(clickLocation);
    var that = this;
    if (this._mouseMode == MouseMode.ZOOM_ROI)
    {
      if (clickEvent.button == 2)
      {
        this._mouseMode = MouseMode.QUERY;
        updateStatus("Zoom Cancelled");
        return false;
      }
    }
    if (this._mouseMode == MouseMode.PAN)
    {
      if (clickEvent.button == 2)
      {
        this._mouseMode = MouseMode.QUERY;
        updateStatus("Pan Cancelled");
        return false;
      }

      if (clickEvent.button == 0)
      {
        this._panStartRoi = this._roi;
      }
    }
    if (this._mouseMode == MouseMode.NEW_POLY)
    {
      this._polyMaker.onMouseDown(clickLocation);
    }
    if (this._mouseMode == MouseMode.NEW)
    {
      if (clickEvent.button == 2)
      {
        this._mouseMode = MouseMode.QUERY;
        updateStatus("Annotation Cancelled");
        return false;
      }

      if (clickEvent.button == 0)
      {
        if (this.draft.dtype == "dot")
        {
          const dragEvent = {};
          dragEvent.start = {x: clickLocation[0], y: clickLocation[1]};
          dragEvent.current = dragEvent.start;
          dragEvent.end = dragEvent.start;
          dragEvent.url = this._draw.viewport.toDataURL();

          // Make a fake drag on the click event
          dragEvent.start = dragEvent.current;
          this.makeModalCreationPrompt(this.draft,
                                       dragEvent,
                                       null,
                                       null);
          this._canvas.dispatchEvent(
            new CustomEvent("drawComplete",
                      {composed: true,
                        detail: {metaMode : this._metaMode}
                      }
                     ));
          this._dragHandler.onMouseUp(dragEvent);
        }
      }
    }
    if (this._mouseMode == MouseMode.QUERY)
    {
      if (localization)
      {
        if (localization.frame != this.currentFrame())
        {
          this._textOverlay.classList.add("select-not-allowed");
          return;
        }
        this.selectLocalization(localization);

        var poly = this.localizationToPoly(localization);
        var resizeType=determineBoxResizeType(clickLocation,
                                              poly);

        if (this._clipboard.isCutting(localization)) {
          this._textOverlay.classList.add("select-not-allowed");
        }
        // Grab the target
        else if (this._determineCanEdit(localization)) {
            this._textOverlay.classList.add("select-grabbing");
        }
      }
    }
    else if (this._mouseMode == MouseMode.SELECT)
    {
      var resizeType = null;
      this._impactVector=null;
      if (this._determineCanEdit(this.activeLocalization)) {
        resizeType = this.determineLocalizationResizeType(clickLocation, this.activeLocalization);
      }

      if ((resizeType && this._clipboard.isCutting(this.activeLocalization)) ||
          this._clipboard.isCutting(localization) && localization == this.activeLocalization)

      {
        this._textOverlay.classList.add("select-not-allowed");
      }
      else if (resizeType)
      {
        this._mouseMode = MouseMode.RESIZE;
        this._impactVector=resizeType[1];
        this._textOverlay.classList.add("select-"+resizeType[0]);
      }
      else if (localization == this.activeLocalization && this._determineCanEdit(localization))
      {
        this._textOverlay.classList.add("select-grabbing");
      }
      else if (localization)
      {
        if (localization.frame != this.currentFrame())
        {
          this._textOverlay.classList.add("select-not-allowed");
          return;
        }

        // Before selecting the localization, clear out the previous selected track
        // (if there is one). This will prevent a bounce back and forth effect.
        clearStatus();
        this.clearAnimation();
        this.activeLocalization = null;
        this.deselectTrack()
        this.selectLocalization(localization);
      }
      else
      {
        // Means we deselected the selection.
        clearStatus();
        this.clearAnimation();
        this.activeLocalization = null;
        this.deselectTrack()
        this.refresh();
        this._mouseMode = MouseMode.QUERY;
      }
    }
    if (this._mouseMode == MouseMode.ZOOM_ROI)
    {
      this._textOverlay.classList.add("select-crosshair");
    }
  }

  getFirstLocalization(frame)
  {
    if (this._framedData.has(frame) == false)
    {
      return null;
    }

    var lowLocalization=null;
    var minIdx = Number.MAX_VALUE;
    var typeIter = this._framedData.get(frame).values();
    var typeList=typeIter.next();
    while (typeList.done == false)
    {
      for (var idx = 0; idx < typeList.value.length; idx++)
      {
        if (typeList.value[idx].id < minIdx)
        {
          lowLocalization = typeList.value[idx];
          minIdx = typeList.value[idx].id;
        }
      }
      typeList=typeIter.next();
    }

    return lowLocalization;
  }

  selectNone() {
    clearStatus();
    if (this._animator)
    {
      this.clearAnimation();
    }
    this.activeLocalization = null;
    this._emphasis = null;
    if (this._mouseMode == MouseMode.SELECT) {
      this._mouseMode = MouseMode.QUERY;
    }
    return this.refresh();
  }

  // Note: skipAnimation is ignored for now.
  selectLocalization(localization, skipAnimation, muteOthers, skipGoToFrame)
  {
    // Seek to a frame if we aren't actually there but trying to display
    // a localization
    if (localization.frame != this.currentFrame())
    {
      if (skipGoToFrame)
      {
        clearStatus();
        this.clearAnimation();
        this.activeLocalization = null;
        this.deselectTrack();
        this.refresh();
        this._mouseMode = MouseMode.QUERY;
        return;
      }
      else
      {
        this.gotoFrame(localization.frame, true).then(() => {
          this.selectLocalization(localization, skipAnimation, muteOthers);
        });
        return;
      }
    }

    var that = this;
    // Always go to select if we aren't just 're-selecting'
    // TODO: Maybe check for re-entrancy instead of state-logic here
    if ((this._mouseMode != MouseMode.PAN) &&
        (this._mouseMode != MouseMode.ZOOM_ROI) &&
        (this._mouseMode != MouseMode.NEW))
    {
      this._mouseMode = MouseMode.SELECT;
    }

    if (this.activeLocalization && this.activeLocalization.id == localization.id)
    {
      //If we are already selected skip animation
      return;
    }

    this.activeLocalization = localization;
    if (skipAnimation == true)
    {
        this.emphasizeLocalization(localization,
                                   color.WHITE,
                                   muteOthers);
    }
    else
    {
      this.highlightLocalization(localization, 250,
                                 {cycles: 1,
                                  initColor: color.blend(color.WHITE,emphasisColor(localization),0.50)}).
        then(
          () =>
            {
              that.refresh();
            });
    }
    // Handle case when localization is in a track
    if (localization.id in this._data._trackDb)
    {
      const track = this._data._trackDb[localization.id];
      this._activeTrack = track
      this._activeTrackFrame = this.currentFrame();
    }

    this.dispatchEvent(new CustomEvent("select", {
      detail: localization,
      composed: true,
    }));
  }

  deselectTrack()
  {
    this._activeTrack = null;
    this._activeTrackFrame = -1;
  }

  selectTrackUsingId(stateId, stateTypeId, frameHint, skipGoToFrame)
  {
    const ids = this._data._dataByType.get(stateTypeId).map(elem => elem.id);
    const index = ids.indexOf(stateId);
    const elem = this._data._dataByType.get(stateTypeId)[index];
    this.selectTrack(elem, frameHint, skipGoToFrame);
  }

  selectTrack(track, frameHint, skipGoToFrame)
  {
    let frame = frameHint;
    if (frame == undefined)
    {
      frame = track.segments[0][0];
    }

    // Checking against the active track prevents infinite recursion cases due to refreshes
    // hitting the pause function and in turn hitting this method.
    // Checking the frame allows the track slider work in the entity browser.
    if (track == this._activeTrack && frame == this._activeTrackFrame)
    {
      return;
    }

    clearStatus();
    this.clearAnimation();
    this.activeLocalization = null;

    if (this._activeTrack && track.id != this._activeTrack.id)
    {
      this.deselectTrack();
      this.refresh();
      this._mouseMode = MouseMode.QUERY;
      this._activeTrack = track;
    }

    let trackSelectFunctor = () => {
      // TODO: This lookup isn't very scalable; we shouldn't iterate over
      // all localizations to find the track
      this._data._dataByType.forEach((value, key, map) => {
        if (key != track.meta) {
          for (const localization of value) {
            if (localization.id in this._data._trackDb) {
              const sameId = this._data._trackDb[localization.id].id == track.id;
              const firstFrame = localization.frame == frame;
              if (sameId && firstFrame) {
                this.selectLocalization(localization, true);
                this._activeTrackFrame = frame;
                return;
              }
            }
          }
        }
      });
    };

    if (frame != this.currentFrame())
    {
      if (!skipGoToFrame) {
        this.gotoFrame(frame).then(trackSelectFunctor);
      }
    }
    else
    {
      trackSelectFunctor();
    }
  }

  emphasizeMultiLocalizations(listOfLocalizations, muteOthers)
  {
    if (muteOthers == undefined)
    {
      muteOthers = false;
    }
    listOfLocalizations.forEach(pair => {
      console.log("listOfLocalizations... pair:");
      console.log(pair);

      var localization = pair.obj;
      var userColor = pair.color;
      var meta = this.getObjectDescription(localization);
      var width = meta.line_width;
      // Make the line width appear as monitor pixels
      width *= this._draw.displayToViewportScale()[0];
      width = Math.round(width);


      var drawColor = userColor;
      if (userColor == undefined)
      {
        var drawColor = emphasisColor(localization);
      }
      let match = false;
      if (this.activeLocalization && this.activeLocalization.id == localization.id)
      {
        match = true;
      }

      if (meta.dtype == "box" || meta.dtype == "box")
      {
        var poly = this.localizationToPoly(localization);
        this._draw.drawPolygon(poly, drawColor, width);
        this.accentWithHandles(this._draw, meta.dtype, poly, drawColor, width, annotation_alpha, match);
      }
      else if (meta.dtype == "line")
      {
        var line = this.localizationToLine(localization);
        this._draw.drawLine(line[0], line[1], drawColor, width);
        this.accentWithHandles(this._draw, meta.dtype, line, drawColor, width, annotation_alpha, match);
      }
      else if (meta.dtype == 'dot')
      {
        const dotWidth = Math.round(defaultDotWidth*this._draw.displayToViewportScale()[0]);
        var center = this.localizationToDot(localization, dotWidth);
        this._draw.drawCircle(center, dotWidth/2, drawColor);
      }
      // Handle case when localization is in a track
      if (localization.id in this._data._trackDb)
      {
        const track = this._data._trackDb[localization.id];
        this._activeTrack = track
        this._activeTrackFrame = this.currentFrame();
      }

      this.dispatchEvent(new CustomEvent("select", {
        detail: localization,
        composed: true,
      }));
    });

    this._draw.dispImage(true, muteOthers);


  }

  // Emphasis is applied to the localization
  emphasizeLocalization(localization, userColor, muteOthers)
  {
    if (localization == null)
    {
      console.warn("Emphasizing null localization");
      return;
    }
    if (muteOthers)
    {
      var tempList=[]
      tempList.push({"obj": localization,
                     "color":userColor});
      this.emphasizeMultiLocalizations(tempList, muteOthers);
    }
    else
    {
      // TODO: Why is this check really here to avoid a refresh?
      if (this._emphasis == null || (this._emphasis == null && (this._emphasis.id != localization.id)))
      {
        this._emphasis = localization;
        this.refresh();
      }
    }
  }

  clearAnimation()
  {
    if (this._animator)
    {
      console.info("Stopping animation");
      clearTimeout(this._animator);
      this._animator = null;
      this._animatedLocalization = null;
    }
  }

  // Given a localization highlight it visually by pulsating it
  // duraiton = ms to pulsate
  // options structure:
  //    - cycles : Number of cycles (even leaves it as it was, odd opposite)
  //
  // Returns a promise for when the animation is over.
  highlightLocalization(localization, duration, options)
  {
    if (this._animator)
    {
      this.clearAnimation();
    }

    this._animatedLocalization = localization;

    var cycles = 7;
    if ('cycles' in options)
    {
      cycles = options.cycles;
    }

    var initColor = localization.color;
    var initAlpha = 0.7*255;
    var initFillAlpha = 0.025*255;
    var finalFillAlpha = 0.0;

    if ('initColor' in options)
    {
      initColor = options.initColor;
    }

    if ('initAlpha' in options)
    {
      initAlpha = options.initAlpha;
    }

    var finalAlpha=255;
    if (this._clipboard.isCutting(localization))
    {
      finalAlpha = 128;
    }

    // Don't over animate if we are using the entity browser
    if (this._emphasis != localization)
    {
      finalAlpha = 0.7 * 255;
    }

    var meta = this.getObjectDescription(localization);
    var width = meta.line_width;
    width *= this._draw.displayToViewportScale()[0];
    width = Math.round(width);
    var poly = this.localizationToPoly(localization);
    var line = this.localizationToLine(localization);
    var that = this;
    var frameInterval=(1000/30);
    var frames = duration/frameInterval;
    var frameIdx = 0;
    var rampLength=Math.ceil(frames/cycles);
    var increments = [(255.0-initColor[0])/rampLength,
                      (255.0-initColor[1])/rampLength,
                      (255.0-initColor[2])/rampLength];
    var alpha_increment = (finalAlpha - initAlpha) / rampLength;
    var fill_alpha_increment = (finalFillAlpha - initFillAlpha) / rampLength;
    var getColorForFrame = function(frame)
    {
      var color = [0,0,0];
      for (var idx = 0; idx < 3; idx++)
      {
        if (Math.floor(frame / rampLength) % 2 == 0)
        {
          color[idx] = initColor[idx] + ((frame%rampLength)*increments[idx]);
        }
        else
        {
          color[idx] = 255 - ((frame%rampLength)*increments[idx]);
        }
      }
      return color;
    };

    var getAlphaForFrame = function(frame)
    {


      var alpha = 0;
      var fill_alpha = 0;
      if (Math.floor(frame / rampLength) % 2 == 0)
      {
        alpha = initAlpha + ((frame%rampLength)*alpha_increment);
        fill_alpha = initFillAlpha + ((frame%rampLength)*fill_alpha_increment);
      }
      else
      {
        alpha = finalAlpha - ((frame%rampLength)*alpha_increment);
        fill_alpha = finalFillAlpha - ((frame%rampLength)*fill_alpha_increment);
      }
      return {"alpha": alpha, "fillAlpha": fill_alpha};
    }

    var promise = new Promise(
      function(resolve)
      {
        var animator=function()
        {
          if (frameIdx < frames)
          {
            that._animator=setTimeout(animator, frameInterval);
          }
          else
          {
            that._animatedLocalization = null;
            resolve();
          }

          frameIdx++;
          let alphaInfo = getAlphaForFrame(frameIdx);
          let alpha = alphaInfo.alpha;
          let fillAlpha = alphaInfo.fillAlpha;
          var colorInfo = that.computeLocalizationColor(localization,meta);

          if (meta.dtype == 'box' || meta.dtype == 'poly')
          {
            that._draw.drawPolygon(poly, getColorForFrame(frameIdx), width, alpha);
            if (colorInfo['handles'] == true || meta.dtype == 'poly')
            {
              that.accentWithHandles(that._draw, meta.dtype, poly, getColorForFrame(frameIdx), width, alpha);
            }
            if (colorInfo.fill.style == "solid")
            {
              that._draw.fillPolygon(poly, width, getColorForFrame(frameIdx), fillAlpha);
            }
            if (colorInfo.fill.style == "blur")
            {
              that._draw.fillPolygon(poly, width, getColorForFrame(frameIdx), fillAlpha,[1.0,0.01,0,0]);
            }
            if (colorInfo.fill.style == "gray")
            {
              that._draw.fillPolygon(poly, width, getColorForFrame(frameIdx), fillAlpha,[2.0,0,0,0]);
            }
          }
          else if (meta.dtype == 'line')
          {
            that._draw.drawLine(line[0], line[1], getColorForFrame(frameIdx), width, alpha);
            if (colorInfo['handles'] == true)
            {
              that.accentWithHandles(that._draw,meta.dtype, line, getColorForFrame(frameIdx), width, alpha);
            }
          }
          else if (meta.dtype == 'dot')
          {
            const dotWidth = Math.round(defaultDotWidth*that._draw.displayToViewportScale()[0]);
            var center = that.localizationToDot(localization);
            that._draw.drawCircle(center, dotWidth/2, getColorForFrame(frameIdx), alpha);
          }
          that._draw.dispImage(true);
        }
        animator();
      });
    return promise;
  }

  // If the user double clicked an annotation, bring up an edit form
  dblClickHandler(clickEvent)
  {
    clickEvent.preventDefault();
    var clickLocation = this.scaleToViewport([clickEvent.offsetX, clickEvent.offsetY]);
    var relativeLocation = this.scaleToRelative(clickLocation);
    if (clickEvent.altKey == true && this.isPaused() == true)
    {
      if (clickEvent.button == 0)
      {
        let [_, __, width, height] = this._roi;
        width /= 2.0;
        height /= 2.0;
        let x = relativeLocation[0] - (width/2);
        let y = relativeLocation[1] - (height/2);
        this.setRoi(x, y, width, height);
        this._dirty = true;
        this.refresh();
      }
    }
    else if (clickEvent.ctrlKey == true && this.isPaused() == true)
    {
      if (clickEvent.button == 0)
      {
        let [_, __, width, height] = this._roi;
        width *= 2.0;
        height *= 2.0;
        width = Math.min(width, 1.0);
        height = Math.min(width, 1.0);
        let x = relativeLocation[0] - (width/2);
        let y = relativeLocation[1] - (height/2);
        x = Math.max(x,0.0);
        y = Math.max(y,0.0);
        this.setRoi(x, y, width, height);
        this._dirty = true;
        this.refresh();
      }
    }
    else
    {
      var localization = this.localizationByLocation(clickLocation);
      if (localization)
      {
        this.makeModalEditPrompt(localization);
      }
      else
      {
        console.info("No Localization here");
      }
    }
  }

  // Scale the given vector from pixel coordinates to relative coordinates
  scaleToRelative(vector, isLine=false)
  {
    var normalFactor=[this._draw.clientWidth/this._roi[2],
                      this._draw.clientHeight/this._roi[3]];
    var shiftFactor=[this._roi[0], this._roi[1],0,0];

    var relative=new Array(vector.length);
    // Lines need shifting on all coordinates
    // First go to image coordinates to take account of zoom, etc.
    if (isLine)
    {
      for (var idx = 0; idx < vector.length; idx++)
      {
        relative[idx] = ((vector[idx] / normalFactor[idx % 2]) + shiftFactor[idx%2]);
      }
    }
    else
    {
      for (var idx = 0; idx < vector.length; idx++)
      {
        relative[idx] = ((vector[idx] / normalFactor[idx % 2]) + shiftFactor[idx]);
      }
    }

    return relative;
  }

  // Construct a new metadata type based on the argument provided
  // objId given if this is to redraw an existing annotation
  newMetadataItem(typeId, metaMode, obj)
  {
    if ("pause" in this) {
      this.dispatchEvent(new Event("pause"));
    }
    this.refresh();
    const objDescription = this._data._dataTypes[typeId];
    if (objDescription.isLocalization == true)
    {
      // If we are redrawing a localization set the token
      if (obj != undefined)
      {
        this._redrawObj = obj;
        this._mouseMode = MouseMode.NEW;
        this.selectLocalization(obj, true, false);
      }
      else
      {
        if (this._data._dataTypes[typeId].dtype == 'poly')
        {
          this._polyMaker.reset();
          this._mouseMode = MouseMode.NEW_POLY;
        }
        else
        {
          this._mouseMode = MouseMode.NEW;
        }
      }
      this.draft=objDescription;
      this._textOverlay.classList.add("select-draw");
      updateStatus("Ready for annotation.", "primary", -1);
      this._metaMode = metaMode;
    }
    else if (objDescription.isTrack == true) {
      this._mouseMode = MouseMode.NEW;
      this.draft = objDescription;
      this._textOverlay.classList.add("select-draw");
      updateStatus("Ready for first track annotation.", "primary", -1);
      this._metaMode = metaMode;
    }
    else
    {
      this.makeModalCreationPrompt(objDescription);
    }
  }

  getObjectDescription(localization)
  {
    var objDescription = null;
    const key = localization.meta;
    if (key in this._data._dataTypes)
    {
      return objDescription=this._data._dataTypes[key];
    }

    return objDescription;
  }

  makeModalEditPrompt(localization)
  {
    const objDescription = this.getObjectDescription(localization);
    this.dispatchEvent(new CustomEvent("edit", {
      detail: {
        objDescription: objDescription,
        localization: localization,
      },
      composed: true,
    }));
  }

  makeModalCreationPrompt(objDescription,
                          dragInfo,
                          successCb,
                          failureCb,
                          hideCb)
  {
    const requestObj={};

    if (dragInfo)
    {
      //Add additional content for localization
      // Kind of a union here
      let boxInfo = dragToBox(dragInfo);
      let lineInfo = dragToLine(dragInfo);
      let dotInfo = [dragInfo.start.x, dragInfo.start.y];
      let localization=null;
      let type = objDescription.dtype;
      if (type == "state") {
        // We are creating a track.
        type = objDescription.localizationType.dtype;
      }

      if (type=="poly")
      {
        // Forward the points to the REST call
        requestObj.points=dragInfo.points;
      }
      if (type=="box")
      {
        localization=this.scaleToRelative(boxInfo);
        requestObj.x = localization[0];
        requestObj.y = localization[1];
        requestObj.width = localization[2];
        requestObj.height = localization[3];
      }
      else if (type=="line")
      {
        localization=this.scaleToRelative(lineInfo, true);
        const [x0, y0, x1, y1] = localization;
        requestObj.x = x0;
        requestObj.y = y0;
        requestObj.u = x1 - x0;
        requestObj.v = y1 - y0;
      }
      else if (type=='dot')
      {
        var previewSize=50;
        localization=this.scaleToRelative(dotInfo);
        boxInfo=[dotInfo[0]-50, dotInfo[1]-50, 100,100];
        requestObj.x = localization[0];
        requestObj.y = localization[1];
      }

      requestObj.frame = this.currentFrame();
    }


    if (this._redrawObj !== null && typeof this._redrawObj !== "undefined") {
      // Only do cloning if the object selected is in a parent layer to the selected version.
      if (this._data.getVersion().bases.indexOf(this._redrawObj.version) >= 0)
      {
        let tempObj = Object.assign({}, this._redrawObj);
        tempObj.x = requestObj.x;
        tempObj.y = requestObj.y;
        tempObj.width = requestObj.width;
        tempObj.height = requestObj.height;
        tempObj.u = requestObj.u;
        tempObj.v = requestObj.v;
        this.cloneToNewVersion(tempObj, this._data.getVersion().id);
      }
      else
      {
        this._undo.patch("Localization", this._redrawObj.id, requestObj, objDescription);
      }
      this._redrawObj = null;
    } else {
      // Drag info is now in DOM coordinates
      this.dispatchEvent(new CustomEvent("create", {
        detail: {
          objDescription: objDescription,
          dragInfo: this.normalizeDrag(dragInfo),
          requestObj: requestObj,
          metaMode: this._metaMode,
          canvasElement: this,
          mediaId: this._videoObject.id
        },
        composed: true,
      }));
    }
  }

  normalizeDrag(drag)
  {
    let normalize = (point) => {
      return {
        x: point.x * (this.clientWidth / this._canvas.width),
        y: point.y * (this.clientHeight / this._canvas.height)}
    };
    if ('current' in drag)
    {
      drag.current = normalize(drag.current);
    }
    if ('start' in drag)
    {
      drag.start = normalize(drag.start);
    }
    if ('end' in drag)
    {
      drag.end = normalize(drag.end);
    }
    return drag;
  }

  deleteLocalization(localization,successCb, failureCb)
  {
    if (this._animator)
    {
      this.clearAnimation();
    }

    const objDescription = this.getObjectDescription(localization);
    let hadParent = (localization.parent != null);
    if (hadParent)
    {
      console.info("Finding lost parent");
      this.dispatchEvent(new CustomEvent("temporarilyMaskEdits",
                                       {composed: true,
                                        detail: {enabled: true}}));
      fetchRetry(`/rest/Localization/${localization.id}`,
                 {method: "DELETE",
                  ...this._undo._headers()}).then(() => {
                    this.updateType(objDescription,() => {
                      this.dispatchEvent(new CustomEvent("temporarilyMaskEdits",
                                       {composed: true,
                                        detail: {enabled: false}}));
                      this.refresh();
                    });

                  });
    }
    else
    {
      this._undo.del("Localization", localization.id, objDescription).then(() => {
        this.refresh(); //Remove ghosts
      })
    }
    this.selectNone();
  }

  static updatePositions(localization, objDescription)
  {
    let boundsFix = (number) => {
      return Math.min(1,Math.max(0,number));
    };
    let boundsFixPoint = (point) => {
      return [Math.min(1,Math.max(0,point[0])), Math.min(1,Math.max(0,point[1]))];
    };
    let boundsFixVector = (x, u) => {
      return Math.min(1-x, Math.max(-x, u));
    };

    let patchObj = {}
    // Update positions (TODO can optomize and only update if they changed) (same goes for all fields)
    if (objDescription.dtype == 'poly')
    {
      let points = [];
      for (let p of localization.points)
      {
        points.push(boundsFixPoint(p));
      }
      patchObj.points = points;
    }
    else if (objDescription.dtype=='box')
    {
      patchObj.x = boundsFix(localization.x);
      patchObj.y = boundsFix(localization.y);
      patchObj.width = boundsFix(localization.width);
      patchObj.height = boundsFix(localization.height);
    }
    else if (objDescription.dtype=='line')
    {
      patchObj.x = boundsFix(localization.x0);
      patchObj.y = boundsFix(localization.y0);
      patchObj.u = boundsFixVector(localization.x0, localization.x1 - localization.x0);
      patchObj.v = boundsFixVector(localization.y0, localization.y1 - localization.y0);
    }
    else if (objDescription.dtype=='dot')
    {
      patchObj.x = boundsFix(localization.x);
      patchObj.y = boundsFix(localization.y);
    }
    return patchObj;
  }

  cloneToNewVersion(localization, dest_version)
  {
    const objDescription = this.getObjectDescription(localization);
    let original_meta = localization.meta;
    let frame = localization.frame;
    let current = [];
    try
    {
      current = this._framedData.get(frame).get(original_meta);
    }
    catch(_)
    {

    }

    if (dest_version == undefined)
    {
      dest_version = this._data.getVersion().id;
    }

    if (current == undefined)
    {
      current = [];
    }

    // Check for current derivations in the same layer (bad)
    for (let local of current)
    {
      if (local.parent == localization.id &&
          local.version == dest_version)
      {
        console.error("Already a clone in this layer!");
        let old_id = localization.id;
        this.selectNone();
        this.updateType(objDescription,() => {
          let restored = this._framedData.get(frame).get(original_meta);
          for (let local of restored)
          {
            if (local.id == old_id)
            {
              this.selectLocalization(local, true);
              break;
            }
          }
        });
        return;
      }
    }

    // Make the clone
    let newObject = AnnotationCanvas.updatePositions(localization,objDescription);
    newObject.parent = localization.id;
    newObject = Object.assign(newObject, localization.attributes);
    newObject.version = dest_version;
    newObject.type = Number(localization.meta.split("_")[1]);
    newObject.media_id = localization.media;
    newObject.frame = localization.frame;
    console.info(newObject);
    this.dispatchEvent(new CustomEvent("temporarilyMaskEdits",
                                       {composed: true,
                                        detail: {enabled: true}}));
    let request_obj = {method: "POST",
                       ...this._undo._headers(),
                       body: JSON.stringify([newObject])};
    fetchRetry(`/rest/Localizations/${localization.project}`, request_obj).then(() => {
      this.updateType(objDescription,() => {
        // Find the localization we just made and select it
        let localizations = this._framedData.get(newObject.frame).get(original_meta);
        for (let local of localizations)
        {
          if (local.parent == newObject.parent)
          {
            this.selectLocalization(local, true);
            break;
          }
        }
        this.dispatchEvent(new CustomEvent("temporarilyMaskEdits",
                                           {composed: true,
                                            detail: {enabled: false}}));
      });
    });
  }

  // TODO handle this all as a signal up in annotation-page
  modifyLocalization(localization, frame)
  {
    if (localization == undefined)
    {
      localization = this.activeLocalization;
    }
    if (frame != undefined)
    {
      localization.frame = frame;
    }
    const objDescription = this.getObjectDescription(localization);
    let original_meta = localization.meta;
    if (this._data.getVersion().bases.indexOf(localization.version) >= 0)
    {
      console.info("Modifying a localization from another layer!");
      this.cloneToNewVersion(localization, this._data.getVersion().id);
    }
    else
    {
      let patchObj = AnnotationCanvas.updatePositions(localization,objDescription);
      if (frame != undefined)
      {
        patchObj.frame = frame;
      }
      this._undo.patch("Localization", localization.id, patchObj, objDescription);
    }
  }

  boundsCheck(coords)
  {
    var xAdj = 0;
    var yAdj = 0;

    // Calculate how over or under we are in a potential move
    var count = coords.length;
    for (var idx = 0; idx < count; idx++)
    {
      var coord = coords[idx];
      var minusX = Math.max(0-coord[0],0);
      var minusY = Math.max(0-coord[1],0);
      var overX = Math.min(this._dims[0]-coord[0],0);
      var overY = Math.min(this._dims[1]-coord[1]-1, 0);

      if (minusX != 0)
      {
        xAdj = minusX;
      }
      if (overX != 0)
      {
        xAdj = overX;
      }

      if (minusY != 0)
      {
        yAdj = minusY;
      }
      if (overY != 0)
      {
        yAdj = overY;
      }
    }

    // Apply the delta to get us back in the canvas
    for (var idx = 0; idx < count; idx++)
    {
      coords[idx][0] += xAdj;
      coords[idx][1] += yAdj;
    }

    return coords
  }

  drawCrosshair(center, color_req, alpha)
  {
    const maxX = this._canvas.width;
    const maxY = this._canvas.height;
    let vertical = [[center[0], 0], [center[0],maxY]];
    let horizontal = [[0, center[1]], [maxX,center[1]]];
    this._draw.drawLine(vertical[0],
                        vertical[1],
                        color_req,
                        defaultDrawWidth*this._draw.displayToViewportScale()[0],
                        alpha);
    this._draw.drawLine(horizontal[0],
                        horizontal[1],
                        color_req,
                        defaultDrawWidth*this._draw.displayToViewportScale()[0],
                        alpha);
  }

  fix_box(box)
  {
    let min = Number.MAX_SAFE_INTEGER;
    let min_idx = -1;
    let max = 0;
    let max_idx = -1;
    for (let idx = 0; idx < box.length; idx++)
    {
      let dist = Math.sqrt(Math.pow(box[idx][0],2)+Math.pow(box[idx][1],2));
      if (dist < min)
      {
        min = dist;
        min_idx = idx;
      }
      if (dist > max)
      {
        max = dist;
        max_idx = idx;
      }
    }
    let x0 = box[min_idx][0];
    let y0 = box[min_idx][1];
    let x1 = box[max_idx][0];
    let y1 = box[max_idx][1];
    let new_box = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
    return new_box;
  }

  accentWithHandles(drawCtx, type, item, color_req, width, alpha, activeSelection)
  {
    let allZeros = true;
    for (let idx = 0; idx < item.length; idx++)
    {
      if (item[idx][0] != 0 || item[idx][1] != 0)
      {
        allZeros = false;
        break;
      }
    }
    if (allZeros)
    {
      return;
    }
    if (width == null)
    {
      width = Math.round(defaultDrawWidth * this._draw.displayToViewportScale()[0]);
    }

    const dotWidth = width * 1.33;
    let get_width = (idx) => {
      if (this._impactVector)
      {
        try
        {
          if (activeSelection && (this._impactVector[idx][0] != 0 || this._impactVector[idx][1] != 0))
          {
            return dotWidth * 2.0;
          }
        }
        catch(e)
        {
          // not critical error, but potentially during mouse over at weird time
          // just use regular dot width if there is an inconsistency.
        }
      }
      return dotWidth;
    };

    let get_color = (idx) => {
      if (this._impactVector)
      {
        try
        {
          if (activeSelection && (this._impactVector[idx][0] != 0 || this._impactVector[idx][1] != 0))
          {
            return color.MEDIUM_GRAY;
          }
        }
        catch(e)
        {
          // not critical error, but potentially during mouse over at weird time
          // just use regular dot width if there is an inconsistency.
        }
      }
      return color_req;
    };

    if (type == 'poly')
    {
      drawCtx.drawCircle(item[0], get_width(0), get_color(0), alpha);
      for (let idx = 1; idx < item.length; idx++)
      {
        if (item[idx][0] != item[0][0] || item[idx][1] != item[0][1])
        {
          drawCtx.drawCircle(item[idx], get_width(idx), get_color(idx), alpha);
        }
      }
    }
    else if (type == 'box')
    {
      // Box case
      item = this.fix_box(item);
      const halfX = (item[0][0]+item[1][0])/2;
      const halfY = (item[0][1]+item[3][1])/2;
      drawCtx.drawCircle(item[0], dotWidth, color_req, alpha);
      drawCtx.drawCircle([halfX,item[0][1]], dotWidth, color_req, alpha);
      drawCtx.drawCircle(item[1], dotWidth, color_req, alpha);
      drawCtx.drawCircle([item[1][0],halfY], dotWidth, color_req, alpha);
      drawCtx.drawCircle(item[2], dotWidth, color_req, alpha);
      drawCtx.drawCircle([halfX,item[2][1]], dotWidth, color_req, alpha);
      drawCtx.drawCircle(item[3], dotWidth, color_req, alpha);
      drawCtx.drawCircle([item[3][0],halfY], dotWidth, color_req, alpha);
    }
    else if (type == 'line')
    {
      const halfX = (item[0][0]+item[1][0])/2;
      const halfY = (item[0][1]+item[1][1])/2;
      drawCtx.drawCircle(item[0], get_width(0), get_color(0), alpha);
      drawCtx.drawCircle(item[1], get_width(1), get_color(1), alpha);
      drawCtx.drawCircle([halfX,halfY], dotWidth, color_req, alpha);
    }
  }

  blackoutOutside(box)
  {
    box = this.fix_box(box);

    const maxX = this._canvas.width;
    const maxY = this._canvas.height;
    let left = [[0,0],
                [box[0][0],0],
                [box[0][0], maxY],
                [0,maxY]
               ];
    let right = [[box[1][0],0],
                 [maxX, 0],
                 [maxX, maxY],
                 [box[1][0], maxY]];
    let top = [[box[0][0],0],
               [box[1][0], 0],
               [box[1][0], box[1][1]],
               [box[0][0], box[1][1]]];
    let bottom = [[box[3][0],box[3][1]],
                  [box[2][0], box[2][1]],
                  [box[2][0], maxY],
                  [box[3][0], maxY]];

    this._draw.fillPolygon(left, 0, color.BLACK, 75);
    this._draw.fillPolygon(right, 0, color.BLACK, 75);
    this._draw.fillPolygon(top, 0, color.BLACK, 75);
    this._draw.fillPolygon(bottom, 0, color.BLACK, 75);
  }

  dragHandler(dragEvent)
  {
    var that = this;

    var drawBox=function(dragStart, dragEnd, colorReq)
    {
      if (colorReq == undefined)
      {
        colorReq=color.WHITE;
      }
      var x0 = dragStart.x;
      var y0 = dragStart.y;
      var x1 = dragEnd.x;
      var y1 = dragStart.y;
      var x2 = dragEnd.x;
      var y2 = dragEnd.y;
      var x3 = dragStart.x;
      var y3 = dragEnd.y;

      var boxCoords = [[x0,y0],[x1,y1],[x2,y2],[x3,y3]];

      that._draw.beginDraw();
      that.blackoutOutside(boxCoords);
      that._draw.drawPolygon(boxCoords,
                             colorReq,
                             defaultDrawWidth*that._draw.displayToViewportScale()[0]);
      that._draw.dispImage(true, true);
    }
    var drawLine=function(dragStart, dragEnd, colorReq)
    {
      if (colorReq == undefined)
      {
        colorReq=color.WHITE;
      }
      var x0 = dragStart.x;
      var y0 = dragStart.y;
      var x1 = dragEnd.x;
      var y1 = dragEnd.y;

      var lineCoords = [[x0,y0],[x1,y1]];
      var fauxBoxCoords = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];

      that._draw.beginDraw();
      that.blackoutOutside(fauxBoxCoords);
      that._draw.drawLine(lineCoords[0],
                          lineCoords[1],
                          colorReq,
                          defaultDrawWidth*that._draw.displayToViewportScale()[0]);
      that._draw.dispImage(true, true);
    }
    if (this._mouseMode == MouseMode.PAN)
    {
      if (typeof dragEvent.current !== "undefined")
      {
        let dx = dragEvent.start.x - dragEvent.current.x;
        let dy = dragEvent.start.y - dragEvent.current.y;
        dx *= this._roi[2] / this._draw.clientWidth;
        dy *= this._roi[3] / this._draw.clientHeight;
        let [x, y, w, h] = this._panStartRoi;
        x += dx;
        y += dy;

        if (x < 0) {
          x = 0;
        }
        if (y < 0) {
          y = 0;
        }

        if (x + w > 1.0)
        {
          x -= (x+w - 1.0);
        }
        if (y + h > 1.0)
        {
          y -= (y+h - 1.0);
        }

        this.setRoi(x, y, w, h);
        this.refresh();
      }
    }
    else if (this._mouseMode==MouseMode.ZOOM_ROI)
    {
      if ('end' in dragEvent)
      {
        drawBox(dragEvent.start,
                dragEvent.end);
        var boxInfo = dragToBox(dragEvent);
        var imageRoi=this.scaleToRelative(boxInfo);
        that.setRoi(imageRoi[0],imageRoi[1],imageRoi[2],imageRoi[3]);
        that.refresh();
        updateStatus("Zoom Activated");
        this._mouseMode = MouseMode.QUERY;
        this._canvas.dispatchEvent(
          new CustomEvent("drawComplete",
                    {composed: true,
                      detail: {metaMode: this._metaMode}
                    }));
        if (this._overrideState == MouseMode.NEW_POLY)
        {
          this._canvas.dispatchEvent(
                        new CustomEvent("modeChange",
                                  {composed: true,
                                    detail: {newMode: "new_poly", metaMode: this._metaMode}
                                  }));
        }
      }
      else
      {
        drawBox(dragEvent.start,
                dragEvent.current);
      }
    }
    else if (this.draft)
    {
      // We are drawing
      let type=this.draft.dtype;
      if (type == "state") {
        // We are creating a track.
        type = this.draft.localizationType.dtype;
      }

      if (type == "box")
      {
        if ('end' in dragEvent)
        {
          drawBox(dragEvent.start,
                  dragEvent.end);
          console.info(window.performance.now());
          dragEvent.url = this._draw.viewport.toDataURL();
          console.info(window.performance.now());
          this.makeModalCreationPrompt(this.draft,
                                       dragEvent,
                                       null,
                                       null);
          console.info(window.performance.now());
          this._canvas.dispatchEvent(
            new CustomEvent("drawComplete",
                      {composed: true,
                       detail: {metaMode: this._metaMode}
                      }));
        }
        else
        {
          drawBox(dragEvent.start,
                  dragEvent.current);
        }
      }
      else if (type == "line")
      {
        if ('end' in dragEvent)
        {
          drawLine(dragEvent.start, dragEvent.end);
          var that = this;
          dragEvent.url = this._draw.viewport.toDataURL();
          this.makeModalCreationPrompt(this.draft,
                                       dragEvent,
                                       null,
                                       null);
          this._canvas.dispatchEvent(
            new CustomEvent("drawComplete",
                      {composed: true,
                        detail: {metaMode: this._metaMode}
                      }));
        }
        else
        {
          drawLine(dragEvent.start, dragEvent.current);
        }
      }
      else if (type == "dot")
      {
      }
      else
      {
        console.info(`ERROR: Unsupported Localization type '${type}'`);
      }
    }
    else if (this._determineCanEdit())
    {
      var that = this;
      //We are moving or resizing
      if (this._mouseMode == MouseMode.SELECT)
      {
        let now = performance.now();
        let delta = now - this._clickTime;
        let length = dragEvent.length;
        // Debounce accidental moves
        if (delta > 250 || length > 100)
        {
          if (!this._clipboard.isCutting(this.activeLocalization))
          {
            this._mouseMode = MouseMode.MOVE;
          }
        }
        else
        {
          console.info(`Blocked quick move of ${delta}ms and ${length}px`);
        }
      }
      if (this._mouseMode == MouseMode.MOVE)
      {
        this.clearAnimation();

        var objType = this.getObjectDescription(this.activeLocalization);

        if ('end' in dragEvent)
        {
          console.log("Moved = " + JSON.stringify(dragEvent));
          // TODO: Handle move event
          cursorTypes.forEach((t) => {this._textOverlay.classList.remove("select-"+t);});
          if (objType.dtype == 'poly')
          {
            let newPoints = this.translateLocalization(dragEvent.start, dragEvent.end);
            for (let idx = 0; idx < newPoints.length; idx++)
            {
              newPoints[idx] = this.scaleToRelative(newPoints[idx],true);
            }
            this.activeLocalization.points = newPoints;
          }
          else if (objType.dtype == 'box')
          {
            var localization=this.scaleToRelative(polyToBox(this.translateLocalization(dragEvent.start, dragEvent.end)));
            this.activeLocalization.x = localization[0];
            this.activeLocalization.y = localization[1];
            this.activeLocalization.width = localization[2];
            this.activeLocalization.height = localization[3];
          }
          else if (objType.dtype == 'line')
          {
            var line=this.translateLocalization(dragEvent.start, dragEvent.end);
            var lineScaled=this.scaleToRelative([line[0][0], line[0][1], line[1][0], line[1][1]], true);
            this.activeLocalization.x0 = lineScaled[0];
            this.activeLocalization.y0 = lineScaled[1];
            this.activeLocalization.x1 = lineScaled[2];
            this.activeLocalization.y1 = lineScaled[3];
          }
          else if (objType.dtype == 'dot')
          {
            var newXY = this.scaleToRelative([dragEvent.end.x, dragEvent.end.y]);
            this.activeLocalization.x = newXY[0];
            this.activeLocalization.y = newXY[1];
          }
          this.modifyLocalization();
        }
        else
        {
          if (objType.dtype == 'box' || objType.dtype =='poly')
          {
            let poly = this.translateLocalization(dragEvent.start, dragEvent.current);
            that.blackoutOutside(poly);
            this._draw.drawPolygon(poly, color.WHITE,
                                   Math.round(objType.line_width * this._draw.displayToViewportScale()[0]));
            this.accentWithHandles(this._draw,objType.dtype, poly, color.WHITE, Math.round(objType.line_width * this._draw.displayToViewportScale()[0]), annotation_alpha, true);
          }
          else if (objType.dtype == 'line')
          {
            var line = this.translateLocalization(dragEvent.start, dragEvent.current);
            let x0 = line[0][0];
            let y0 = line[0][1];
            let x1 = line[1][0];
            let y1 = line[1][1];
            var fauxBoxCoords = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
            that.blackoutOutside(fauxBoxCoords);
            this._draw.drawLine(line[0], line[1], color.WHITE, Math.round(objType.line_width * this._draw.displayToViewportScale()[0]));
            this.accentWithHandles(this._draw,objType.dtype, line, color.WHITE, Math.round(objType.line_width * this._draw.displayToViewportScale()[0]), annotation_alpha, true);
          }
          else
          {
            var center = this.translateLocalization(dragEvent.start, dragEvent.current);
            const dotWidth = Math.round(defaultDotWidth * this._draw.displayToViewportScale()[0]);
            this._draw.drawCircle(center, dotWidth/2, color.WHITE);
          }
          this._draw.dispImage(true, true);
        }
      }
      if (this._mouseMode == MouseMode.RESIZE)
      {
        this.clearAnimation();
        var type =
            this.getObjectDescription(this.activeLocalization).dtype;

        if ('end' in dragEvent)
        {
          console.log("Resized = " + JSON.stringify(dragEvent));

          if (type == 'poly')
          {
            let newPoints = this.translateLocalization(dragEvent.start, dragEvent.end);
            for (let idx = 0; idx < newPoints.length; idx++)
            {
              newPoints[idx] = this.scaleToRelative(newPoints[idx],true);
            }
            this.activeLocalization.points = newPoints;
          }
          else if (type == 'box')
          {
            var localization=this.scaleToRelative(polyToBox(this.translateLocalization(dragEvent.start, dragEvent.end)));
            this.activeLocalization.x = localization[0];
            this.activeLocalization.y = localization[1];
            this.activeLocalization.width = localization[2];
            this.activeLocalization.height = localization[3];
          }
          else if (type == 'line')
          {
            var localization=this.scaleToRelative(this.explodeLine(this.translateLocalization(dragEvent.start, dragEvent.end)), true);
            this.activeLocalization.x0 = localization[0];
            this.activeLocalization.y0 = localization[1];
            this.activeLocalization.x1 = localization[2];
            this.activeLocalization.y1 = localization[3];
          }
          this.modifyLocalization();
        }
        else
        {
          // Make the line width appear as monitor pixels
          let width = this.getObjectDescription(this.activeLocalization).line_width;
          width *= this._draw.displayToViewportScale()[0];
          width = Math.round(width);
          if (type == 'box' || type == 'poly')
          {
            let poly = this.translateLocalization(dragEvent.start, dragEvent.current);
            that.blackoutOutside(poly);
            this._draw.drawPolygon(poly, color.WHITE, width);
            this.accentWithHandles(this._draw,type, poly, color.WHITE, width, 255, true);
          }
          else if (type == 'line')
          {
            var line = this.translateLocalization(dragEvent.start, dragEvent.current);
            let x0 = line[0][0];
            let y0 = line[0][1];
            let x1 = line[1][0];
            let y1 = line[1][1];
            var fauxBoxCoords = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
            that.blackoutOutside(fauxBoxCoords);
            this._draw.drawLine(line[0],line[1], color.WHITE, width);
            that.accentWithHandles(that._draw,type, line,color.WHITE, width, 255, true);
          }
          this._draw.dispImage(true, true);
        }
      }
    }
  }

  drawAnnotations(frameInfo, drawContext, roi)
  {
    if (drawContext == undefined)
    {
      drawContext = this._draw;
    }

    // scale factor based on canvas height versus image height
    // Draw commands are in viewspace coordinates, but annotations
    // are in image coordinates.
    var frameIdx = frameInfo.frame;

    // #TODO Consider moving this outside of this function into its own
    //       routine that is called when a frame change occurs.
    if (this.currentFrame() != this._contextMenuFrame)
    {
      // Dont' call this stuff in playing mode.
      if (this._playing != true)
      {
        this._contextMenuFrame = frameIdx;
        this._contextMenuTrack.hideMenu();
        this._contextMenuLoc.hideMenu();
        this._contextMenuNone.hideMenu();
      }
    }

    if (this._clipboard.cutObject() && this._clipboard.cutObject().frame != frameIdx)
    {
      let localization = this._clipboard.cutObject();
      var typeObject=this.getObjectDescription(localization);
      var type=typeObject.dtype;
      var width=typeObject.line_width;
      // Make the line width appear as monitor pixels
      width *= this._draw.displayToViewportScale()[0];
      width = Math.round(width);

      localization.color = color.MEDIUM_GRAY;
      let alpha = 0.5*255;

      if (type=='box' || type=='poly')
      {
        var poly = this.localizationToPoly(localization, drawContext, roi);
        drawContext.drawPolygon(poly, localization.color, width, alpha);
        this.accentWithHandles(drawContext,type, poly, localization.color, width, alpha);
      }
      else if (type == 'line')
      {
        var line = this.localizationToLine(localization, drawContext, roi);
        drawContext.drawLine(line[0], line[1], localization.color, width, alpha);
        this.accentWithHandles(drawContext,type, line, localization.color, width, alpha);
      }
      else if (type == 'dot')
      {
        const dotWidth = Math.round(defaultDotWidth*this._draw.displayToViewportScale()[0]);
        var center = this.localizationToDot(localization, dotWidth, drawContext, roi);
        drawContext.drawCircle(center, dotWidth/2, localization.color, alpha);
      }
      else
      {
        console.warn("Unsupported localization type: " + type);
      }
    }
    if (this._framedData.has(frameIdx))
    {
      var typeDict = this._framedData.get(frameIdx);
      for (let typeid of typeDict.keys())
      {
        // Handle CFM if present
        if (typeid == "CFM")
        {
          this._draw.setCFM(this._framedData.get(frameIdx).get('CFM'));
          continue;
        }
        var localList = typeDict.get(typeid);

        for (var localIdx = 0; localIdx < localList.length; localIdx++)
        {
          var localization=localList[localIdx];
          if (this._animatedLocalization && this._animatedLocalization.id == localization.id)
          {
            continue;
          }
          var localization=localList[localIdx];
          var meta=this.getObjectDescription(localization);
          var type=meta.dtype;
          var width=meta.line_width;
          // Make the line width appear as monitor pixels
          width *= this._draw.displayToViewportScale()[0];
          width = Math.round(width);

          // Compute the localization color
          var colorInfo = this.computeLocalizationColor(localization,meta);
          localization.color = colorInfo.color
          var fill = colorInfo.fill;

          if (type=='box' || type=='poly')
          {
            var poly = this.localizationToPoly(localization, drawContext, roi);
            drawContext.drawPolygon(poly, localization.color, width, colorInfo.alpha);
            if (colorInfo['handles'] == true || type=='poly')
            {
              let match = false;
              if (this.activeLocalization && this.activeLocalization.id == localization.id)
              {
                match = true;
              }
              this.accentWithHandles(drawContext,
                                     type,
                                    poly,
                                    localization.color,
                                    width,
                                    colorInfo.alpha,
                                    match);
            }
            if (fill.style == "solid")
            {
              drawContext.fillPolygon(poly, width, fill.color, fill.alpha);
            }
            if (fill.style == "blur")
            {
              drawContext.fillPolygon(poly, width, fill.color, fill.alpha,[1.0,0.01,0,0]);
            }
            if (fill.style == "gray")
            {
              drawContext.fillPolygon(poly, width, fill.color, fill.alpha,[2.0,0,0,0]);
            }
          }
          else if (type == 'line')
          {
            var line = this.localizationToLine(localization, drawContext, roi);
            drawContext.drawLine(line[0], line[1], localization.color, width, colorInfo.alpha);
            if (colorInfo['handles'] == true)
            {
              this.accentWithHandles(drawContext,type, line, localization.color, width, colorInfo.alpha, true);
            }
          }
          else if (type == 'dot')
          {
            const dotWidth = Math.round(defaultDotWidth*this._draw.displayToViewportScale()[0]);
            var center = this.localizationToDot(localization, dotWidth, drawContext, roi);
            drawContext.drawCircle(center, dotWidth/2, localization.color, colorInfo.alpha);
          }
          else
          {
            console.warn("Unsupported localization type: " + type);
          }
        }
      }
      return drawContext.dumpDraw();
    }
    else
    {
      return null;
    }
  }

  defaultMode()
  {
    this.draft = null;
    // Only refresh if it wasn't a call to new else we get flashes
    if (this._mouseMode != MouseMode.NEW || this._lastHoverDraw > 0)
    {
      this._lastHoverDraw == 0;
      this.refresh();
    }
    if (this._overrideState)
    {
      this._mouseMode = this._overrideState;
      this.draft = this._oldDraft;
      this._oldDraft = null;
      this._overrideState = null;
    }
    else
    {
      this._mouseMode = MouseMode.QUERY;
    }
    this._metaMode = false;
  }

  onPlay()
  {
    this._clipboard.clear();
    this._emphasis = null;
    this._mouseMode = MouseMode.QUERY;
  }

  onPause()
  {
    if (this.activeLocalization) {
      if (this.currentFrame() !== this.activeLocalization.frame) {
        this.activeLocalization = null;
        this._mouseMode = MouseMode.QUERY;
      } else {
        this.emphasizeLocalization(this.activeLocalization);
        //this.selectLocalization(this.activeLocalization);
      }
    }
    if (this._activeTrack)
    {
      let numSegments = this._activeTrack.segments.length;
      let trackStillValid = false;
      let currentFrame = this.currentFrame();
      let minFrame = Number.MAX_SAFE_INTEGER;
      let maxFrame = 0;
      for (let idx = 0; idx < numSegments; idx++)
      {
        let segStart = this._activeTrack.segments[idx][0];
        let segEnd = this._activeTrack.segments[idx][1];
        if (segStart < minFrame)
        {
          minFrame = segStart;
        }
        if (segEnd > maxFrame)
        {
          maxFrame = segEnd;
        }
        if (currentFrame >= segStart &&
            currentFrame <= segEnd)
        {
          trackStillValid = true;
          break;
        }
      }

      // Don't de-select the track if it is non-continious
      if (currentFrame >= minFrame && currentFrame <= maxFrame)
      {
        trackStillValid = true;
      }

      if (trackStillValid)
      {
        this.selectTrack(this._activeTrack, currentFrame);
      }
      else
      {
        this.deselectTrack();
      }
    }
  }

  zoomIn()
  {
    var that = this;
    this.refresh().then(
      () =>
      {
        if (this._mouseMode == MouseMode.NEW_POLY)
        {
          this._overrideState = MouseMode.NEW_POLY;
          this._oldDraft = this.draft;
        }
        updateStatus("Select an area to zoom", "primary", -1);
        this._mouseMode = MouseMode.ZOOM_ROI;
        cursorTypes.forEach((t) => {that._textOverlay.classList.remove("select-"+t);});
        this._textOverlay.classList.add("select-zoom-roi");
      });
  }

  zoomOut()
  {
    cursorTypes.forEach((t) => {this._textOverlay.classList.remove("select-"+t);});
    updateStatus("Reset to full frame");
    if (this._mouseMode == MouseMode.NEW_POLY)
    {
      this._overrideState = MouseMode.NEW_POLY;
      this._oldDraft = this.draft;
    }
    this.resetRoi();
    this.defaultMode();
  }

  pan()
  {
    if (this._mouseMode == MouseMode.NEW_POLY)
    {
      this._overrideState = MouseMode.NEW_POLY;
      this._oldDraft = this.draft;
    }
    this._mouseMode = MouseMode.PAN;
    updateStatus("Drag to pan");
  }

  // Move an existing image within an off-screen buffer
  moveOffscreenBuffer(roi)
  {
    if (roi == undefined)
    {
      roi = [0.0,0.0,1.0,1.0];
    }

    this._offscreenDraw.setPushCallback(
      (frameData) => {return this.drawAnnotations(frameData,
                                                  this._offscreenDraw,
                                                  roi);});

    const width=this._dims[0]*roi[2];
    const height=this._dims[1]*roi[3];
    if (this._offscreen.width != width ||
        this._offscreen.height != height)
    {
      this._offscreen.width = width;
      this._offscreen.height = height;
      this._offscreenDraw.resizeViewport(width, height);
    }
    this._offscreenDraw.updateImage(roi[0],roi[1],
                                    roi[2],roi[3],
                                    0,0,
                                    width,height,
                                    true);
  }

  // Update off-screen buffer with new image data
  updateOffscreenBuffer(frameIdx, source, width, height, roi)
  {
    if (roi == undefined)
    {
      roi = this._roi;
    }

    if (this._offscreen == undefined)
    {
      return;
    }
    this._offscreenDraw.setPushCallback(
        (frameData) => {return this.drawAnnotations(frameData,
                                                    this._offscreenDraw,
                                                    roi);});
    // Adjust height/weight based on roi
    width=width*roi[2];
    height=height*roi[3];
    if (this._offscreen.width != width ||
        this._offscreen.height != height)
    {
      this._offscreen.width = width;
      this._offscreen.height = height;
      this._offscreenDraw.resizeViewport(width, height);
    }
    this._offscreenDraw.clear();
    this._offscreenDraw.pushImage(frameIdx,
                                  source,
                                  roi[0],roi[1],
                                  roi[2],roi[3],
                                  0,0,
                                  width,height,
                                  true);

  }

  moveToLocalization(localization) {
    if (localization.meta.startsWith('box')) {
      this.moveOffscreenBuffer([localization.x, localization.y,
                                localization.width, localization.height]);
    } else if (localization.meta.startsWith('line')) {
      const x0 = localization.x;
      const y0 = localization.y;
      const x1 = localization.x + localization.u;
      const y1 = localization.y + localization.v;
      const width = Math.abs(x0 - x1);
      const height = Math.abs(y0 - y1);
      const x = Math.min(x0, x1);
      const y = Math.min(y0, y1);
      this.moveOffscreenBuffer([x, y, width, height]);
    } else if (localization.meta.startsWith('dot')) {
      const width = 0.2;
      const height = 0.2;
      const x = Math.min(Math.max(0, localization.x - 0.1), 0.8);
      const y = Math.min(Math.max(0, localization.y - 0.1), 0.8);
      this.moveOffscreenBuffer([x, y, width, height]);
    } else if (localization.meta.startsWith('poly')) {
      let x0 = 1.0;
      let y0 = 1.0;
      let x1 = 0.0;
      let y1 = 0.0;
      for (const [px, py] of localization.points) {
        x0 = Math.min(x0, px);
        y0 = Math.min(y0, py);
        x1 = Math.max(x1, px);
        y1 = Math.max(y1, py);
      }
      const width = Math.abs(x0 - x1);
      const height = Math.abs(y0 - y1);
      const x = Math.min(x0, x1);
      const y = Math.min(y0, y1);
      this.moveOffscreenBuffer([x, y, width, height]);
    }
  }

  makeDownloadableLocalization(localization)
  {
    var that = this;
    var makeSnapshot = function()
    {
      var filename="";
      var attrs=localization.attributes;
      Object.keys(attrs).forEach((key) => {
        const descriptor=Object.getOwnPropertyDescriptor(attrs, key);
        filename += `${key}_${descriptor.value}`;
      })
      if (filename != "")
      {
        filename += '_';
      }
      filename += `Frame_${localization.frame}_${that._mediaInfo['name']}`;
      that.makeOffscreenDownloadable(false, filename);
      // reset to where we where
      that.moveOffscreenBuffer(that._roi);
    }

    if (this.currentFrame() == localization.frame)
    {
      this.moveToLocalization(localization);
      makeSnapshot();
    }
    else
    {
      this.seekFrame(localization.frame,
                     (frameIdx, source, width, height) => {
                       this.updateOffscreenBuffer(frameIdx, source, width, height);
                       this.moveToLocalization(localization);
                       makeSnapshot();
                       // Put the off screen back to normal
                       this.seekFrame(this.currentFrame(),
                                      (frameIdx, source, width, height) => {
                                        this.updateOffscreenBuffer(frameIdx, source, width, height);
                                      });
                     });
    }

  }

  makeOffscreenDownloadable(localizations, filename)
  {
    this.getPNGdata(localizations).then((png_data) =>
        {
          var png_file = URL.createObjectURL(png_data);
          var anchor = document.createElement('a');
          anchor.href=png_file;
          anchor.download=`${filename}.png`;
          anchor.click();
      });
  }

  getPNGdata(localizations) {
    const width = this._offscreen.width;
    const height = this._offscreen.height;

    this._offscreenDraw.clearRect(0,0,width,height);
    this._offscreenDraw.dispImage(true, !localizations);

    return this._offscreen.convertToBlob();
  }

  underwaterCorrection(skip_shader)
  {
    const begin = performance.now();
    // TODO this actually lets us due the entire GOP (this is in NV12 off the decoder!)
    let frameData = this._videoElement[this._seek_idx]._buffer.codec_image_buffer;
    let newFrame = new VideoFrame(new Uint8Array(frameData), {'format': frameData.format,
                                                'codedWidth': frameData.width,
                                                'codedHeight': frameData.height,
                                                'timestamp': frameData.timestamp});
    const width = frameData.width;
    const height = frameData.height;
    console.info(`Underwater correction using ${width}x${height} canvas`);
    let temp = new OffscreenCanvas(width, height);
    let tempCtx = temp.getContext("2d", {desynchronized:true});
    console.info(`Canvas creation (Remove this step) ${performance.now()-begin} ms`);
    // Rasterize to RGBA / ImageData
    tempCtx.drawImage(newFrame,0,0, width, height);
    newFrame.close();

    let imageData = tempCtx.getImageData(0,0,width,height);
    // Get the Array Buffer + off to the races
    let data = imageData.data;

    let histogram_input = this.getGOPTile();
    let filter = getColorFilterMatrix(histogram_input.data, width, height);

    console.info(`Underwater correction Matrix in ${performance.now()-begin} ms`);
    console.info(`Color correction matrix: ${filter}`);

    if (skip_shader == true)
    {
      for (var i = 0; i < data.length; i += 4)
      {
        data[i] = Math.min(255, Math.max(0, data[i] * filter[0] + data[i + 1] * filter[1] + data[i + 2] * filter[2] + filter[4] * 255)) // Red
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * filter[6] + filter[9] * 255)) // Green
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * filter[12] + filter[14] * 255)) // Blue
      }
    }
    else
    {
      console.info("Using OpenGL accelerated CFM")
      this._draw.setCFM(filter);
    }

    // update display, this function takes an ImageData too!
    this.drawFrame(this.currentFrame(), imageData, this._dims[0], this._dims[1], true);
    this._effectManager.clear();
    this._draw.disableCFM();
    console.info(`Underwater correction finished in ${performance.now()-begin} ms`);
    document.body.style.cursor = null;
  }

  loadPerFrameCFM()
  {
    let attachments = this._mediaInfo.media_files.attachment;
    let found_it = -1;
    if (attachments != null)
    {
      for (let idx = 0; idx < attachments.length; idx++)
      {
        if (attachments[idx].name == "cfm.bin")
        {
          found_it = idx;
        }
      }
    }
    if (found_it == -1)
    {
      window.alert("No per-frame color correction available for this video.");
      return;
    }

    fetch(attachments[found_it].path)
    .then(response => {return response.arrayBuffer();})
    .then((buffer)=>{
      let cfm = new Float64Array(buffer);
      const cfmLength = 4*5;
      console.info(`Fetched color filter matrix for ${cfm.length/cfmLength} frames (size=${buffer.byteLength})!`);
      for (let frameIdx = 0; frameIdx < cfm.length; frameIdx++)
      {
        if (this._framedData.has(frameIdx) != true)
        {
          this._framedData.set(frameIdx,new Map());
        }
        let frameMap = this._framedData.get(frameIdx);
        frameMap.set('CFM', cfm.slice(frameIdx*cfmLength, (frameIdx+1)*cfmLength));
      }
      this.refresh();
    });
  }
  underwaterCorrection_notile()
  {
    const begin = performance.now();
    // TODO this actually lets us due the entire GOP (this is in NV12 off the decoder!)
    let frameData = this._videoElement[this._seek_idx]._buffer.codec_image_buffer;
    let newFrame = new VideoFrame(new Uint8Array(frameData), {'format': frameData.format,
                                                'codedWidth': frameData.width,
                                                'codedHeight': frameData.height,
                                                'timestamp': frameData.timestamp});
    const width = frameData.width;
    const height = frameData.height;
    console.info(`Underwater correction using ${width}x${height} canvas`);
    let temp = new OffscreenCanvas(width, height);
    let tempCtx = temp.getContext("2d", {desynchronized:true});
    console.info(`Canvas creation (Remove this step) ${performance.now()-begin} ms`);
    // Rasterize to RGBA / ImageData
    tempCtx.drawImage(newFrame,0,0, width, height);
    newFrame.close();

    let imageData = tempCtx.getImageData(0,0,width,height);
    // Get the Array Buffer + off to the races
    let data = imageData.data;

    let filter = getColorFilterMatrix(data, width, height);
    console.info(`Underwater correction Matrix in ${performance.now()-begin} ms`);
    console.info(`Color correction matrix: ${filter}`);
    if (skip_shader == true)
    {
      for (var i = 0; i < data.length; i += 4)
      {
        data[i] = Math.min(255, Math.max(0, data[i] * filter[0] + data[i + 1] * filter[1] + data[i + 2] * filter[2] + filter[4] * 255)) // Red
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * filter[6] + filter[9] * 255)) // Green
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * filter[12] + filter[14] * 255)) // Blue
      }
    }
    else
    {
      console.info("Using OpenGL accelerated CFM")
      this._draw.setCFM(filter);
    }

    // update display, this function takes an ImageData too!
    this.drawFrame(this.currentFrame(), imageData, this._dims[0], this._dims[1], true);
    this._effectManager.clear();
    console.info(`Underwater correction finished in ${performance.now()-begin} ms`);
    document.body.style.cursor = null;
  }

  getGOPTile()
  {
    let frameData = this._videoElement[this._seek_idx]._buffer.codec_image_buffer;
    let newFrame = new VideoFrame(new Uint8Array(frameData), {'format': frameData.format,
                                                'codedWidth': frameData.width,
                                                'codedHeight': frameData.height,
                                                'timestamp': frameData.timestamp});
    const width = frameData.width;
    const height = frameData.height;
    console.info(`Tile GOP using ${width}x${height} canvas`);
    let temp = new OffscreenCanvas(width, height);
    let tempCtx = temp.getContext("2d", {desynchronized:true});
    newFrame.close();
    // Rasterize to RGBA / ImageData

    let matches = this._videoElement[this._seek_idx]._buffer.images_near_cursor(25, 25);
    let nearest_square = Math.floor(Math.sqrt(matches.length));
    console.info(`Found ${matches.length} near by frames. ${nearest_square}`);
    const tileWidth = Math.round(width/nearest_square);
    const tileHeight = Math.round(height/nearest_square);
    let idx = 0;
    for (let i = 0; i < nearest_square; i++)
    {
      for (let j = 0; j < nearest_square; j++)
      {
        frameData = this._videoElement[this._seek_idx]._buffer.get_image(matches[idx]);
        newFrame = new VideoFrame(new Uint8Array(frameData), {'format': frameData.format,
                                                  'codedWidth': frameData.width,
                                                  'codedHeight': frameData.height,
                                                  'timestamp': frameData.timestamp});
        tempCtx.drawImage(newFrame,i*tileWidth,j*tileHeight, tileWidth, tileHeight);
        newFrame.close();
        idx++;
      }
    }
    
    return tempCtx.getImageData(0,0,width,height);
  }
  tileGOP()
  {
    const begin = performance.now();
    // TODO this actually lets us due the entire GOP (this is in NV12 off the decoder!)
    let imageData = this.getGOPTile();
    // update display, this function takes an ImageData too!
    this.drawFrame(this.currentFrame(), imageData, this._dims[0], this._dims[1], true);
    console.info(`Tile GOP finished in ${performance.now()-begin} ms`);
    document.body.style.cursor = null;
  }
}