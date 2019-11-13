
var statusAnimator=null;
var defaultDotWidth=10;

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

// Handle generating a drag event within a canvas element
// The callback either receives an object with start + current
// representing an on-going drag
//
// Or the callback receives an object with start x/y and end x/y
// and the start/stop time of the drag (start.time + end.time)
//
class CanvasDrag
{
  // @param canvas jquery object for canvas element
  // @param cb callback function to handle dragging
  // @param dragLimiter minimum interval to report mouseMove
  constructor(canvas, scaleFn, cb, dragLimiter)
  {
    this._cb = cb;
    this._canvas = canvas;
    this._scaleFn=scaleFn;

    if (dragLimiter != undefined)
    {
      this._dragLimiter = dragLimiter;
    }
    else
    {
      // Default to 30fps
      this.dragLimiter = 1000.0/60;
    }
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));

    this._mouseMoveBound=this.onMouseMove.bind(this);
    this._mouseUpBound=this.onMouseUp.bind(this)
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
    var now = Date.now();
    var scale = this._scaleFn();
    var x = Math.min((event.pageX-this._canvas.offsetLeft),
                     this._canvas.offsetWidth)*scale[0]
    var y = Math.min((event.pageY-this._canvas.offsetTop),
                     this._canvas.offsetHeight)*scale[1];
    x = Math.max(x,0);
    y = Math.max(y,0);
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
    var last = this._event.current;
    delete this._event.current;
    this._event.end = {};
    var scale = this._scaleFn();
    document.removeEventListener("mouseup", this._mouseUpBound);
    document.removeEventListener("mousemove", this._mouseMoveBound);
    // If the event ended off canvas; use the last known good coordinate
    if (event.path[0] == this._canvas)
    {

      this._event.end.x = (event.pageX-this._canvas.offsetLeft)*scale[0];
      this._event.end.y = (event.pageY-this._canvas.offsetTop)*scale[1];
    }
    else
    {
      this._event.end.x = last.x;
      this._event.end.y = last.y;
    }
    this._event.end.time = Date.now();
    this._event.duration = this._event.end.time - this._event.start.time;
    if (this._cb &&
        this._event.duration > this.dragLimiter &&
        ! (this._event.end.x == this._event.start.x &&
           this._event.end.y == this._event.start.y))
    {
      this._cb(this._event);
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
                 'zoom-roi'];


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
    localization.color = color.BLUE;
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
      };
// Convenience class to handle displaying annotation files out of a
// data source into a draw buffer.
class AnnotationCanvas extends TatorElement
{
  // Construction requires a draw context +
  // data file
  constructor()
  {
    super();

    this._canvas=document.createElement("canvas");
    this._canvas.setAttribute("class", "video");
    this._canvas.setAttribute("height", "1");
    this._shadow.appendChild(this._canvas);

    this._draw=new DrawGL(this._canvas);
    this._dragHandler = new CanvasDrag(this._canvas,
                                       this._draw.displayToViewportScale.bind(this._draw),
                                       this.dragHandler.bind(this));
    this._draw.setPushCallback((frameInfo) => {return this.drawAnnotations(frameInfo);});

    this._canvas.addEventListener("mousedown", this.mouseDownHandler.bind(this));
    this._canvas.addEventListener("mouseup", this.mouseUpHandler.bind(this));
    this._canvas.addEventListener("mousemove", this.mouseOverHandler.bind(this));
    this._canvas.addEventListener("dblclick", this.dblClickHandler.bind(this));

    document.addEventListener("keydown", this.keydownHandler.bind(this));
    document.addEventListener("keyup", this.keyupHandler.bind(this));

    // Setup data
    this._framedData=new Map();
    this._recent = new Map();
    this._mouseMode = MouseMode.QUERY;
    this._lastAutoTrackColor = null;
    this._domParents = [];
    this._metaMode = false;

    this._offscreen = new OffscreenCanvas(100, 100);
    this._offscreenDraw = new DrawGL(this._offscreen);
  }

  set permission(val) {
    this._canEdit = hasPermission(val, "Can Edit");
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

  setupResizeHandler(dims)
  {
    const ratio=dims[0]/dims[1];
    var that = this;
    var resizeHandler = function()
    {
      // 175 is a magic number here matching the header + footer
      const maxHeight = window.innerHeight-175;
      const maxWidth = maxHeight*ratio;
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
    }

    // Set up resize handler.
    window.addEventListener("resize", () => {
      clearTimeout(this._resizeTimer);
      resizeHandler();
      requestAnimationFrame(() => {


        // Finalize the resize
        this._resizeTimer = setTimeout(() => {
          this._draw.resizeViewport(dims[0], dims[1]);
          this.refresh();
          resizeHandler();
        }, 100);
      });
    });
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  set mediaInfo(val) {
    this._mediaInfo = val;
  }

  set annotationData(val) {
    this._data = val;
    this._data.addEventListener("freshData", evt => {
      const typeObj = evt.detail.typeObj;
      if (typeObj.isLocalization) {
        let currentFrame = this.currentFrame();
        // Clean out old annotations for the type
        this._framedData.forEach((frameObj, frameIdx, map) => {
          frameObj.delete(typeObj.type.id);
        }, this);

        this.insertIntoFramedData(evt.detail.data, evt.detail.typeObj);
      } else if (typeObj.isTrack) {
        // Reset auto track
        this._lastAutoTrackColor = null;
        this._data._trackDb.forEach((trackObj, localizationIdx, map) => {
          if (trackObj.meta == typeObj.type.id) {
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
          track.association.localizations.forEach(localId => {
            this._data._trackDb[localId] = track;
          });

          if (track.association.color == null) {
            //Make a local color determination using color progression
            var drawColor = color.nextColor(this._lastAutoTrackColor);
            // Set the last auto color
            this._lastAutoTrackColor = drawColor;
            // Cache the downloaded copy of the track with the color value
            track.association.color = color.rgbToHex(drawColor);
          }
        });
      }
    });
  }

  updateType(typeObj, callback)
  {
    this._data.updateType(typeObj, callback);
  }

  keyupHandler(event)
  {
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
    if (document.body.classList.contains("tab-disabled") && event.key == "Tab") {
      return;
    }

    if (document.body.classList.contains("shortcuts-disabled")) {
      console.log("Shortcuts are disabled!");
      return;
    }

    if (this._mouseMode == MouseMode.QUERY || this._mouseMode == MouseMode.SELECT) {
      if (event.code == 'Space')
      {
        event.preventDefault();
        if (this._direction == Direction.STOPPED ||
            this._direction == Direction.BACKWARD)
        {
          this.play();
        }
        else
        {
          this.pause();
        }
      }
    }

    if (this._mouseMode == MouseMode.QUERY)
    {
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
        this.gotoFrame(this.currentFrame() + amount);
        return false;
      }
      if (event.key == 'ArrowLeft')
      {
        event.preventDefault();
        event.stopPropagation();
        this.gotoFrame(this.currentFrame() - amount);
        return false;
      }

      if (event.key == 'b')
      {
        if (this._direction == Direction.STOPPED ||
            this._direction == Direction.FORWARD)
        {
          this.playBackwards();
        }
        else
        {
          this.pause();
        }
      }
    }

    if (this._mouseMode == MouseMode.SELECT)
    {
      if (event.code == 'Delete' && this._canEdit)
      {
        this.deleteLocalization(this.activeLocalization);
        this.activeLocalization=null;
        this._mouseMode == MouseMode.QUERY;
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
        this._mouseMode == MouseMode.MOVE ) && this._canEdit)
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

        if (objType.type.dtype == 'box')
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
        else if (objType.type.dtype == 'line')
        {
          var line = this.localizationToLine(this.activeLocalization);
          for (var idx = 0; idx < 2; idx++)
          {
            line[idx][coord] += (amount*impactVector[0]);
          }
          line = this.boundsCheck(line);

          // Update localization based on motion
          var expLine=this.scaleToRelative(this.explodeLine(line));
          this.activeLocalization.x0 = expLine[0];
          this.activeLocalization.y0 = expLine[1];
          this.activeLocalization.x1 = expLine[2];
          this.activeLocalization.y1 = expLine[3];
          this.modifyLocalization();
        }
        else if (objType.type.dtype == 'dot')
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

      var frameId=data[idx]['frame'];
      var typeid = data[idx].meta;
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

    if (needRefresh == true)
    {
      this.refresh();
    }
  }

  localizationByLocation(clickLoc)
  {
    var loc = this.scaleToRelative(clickLoc);
    var currentFrame = this.currentFrame();
    var that = this;
    if (this._framedData.has(currentFrame))
    {
      var match = null;
      this._framedData.get(currentFrame).forEach(
        function(localizations)
        {
          return localizations.forEach(
            function(localization)
            {
              var meta = that.getObjectDescription(localization);
              if (match) return;
              if (meta.type.dtype == "box")
              {
                var maxX = localization.x + localization.width;
                var maxY = localization.y + localization.height;
                if ((loc[0] <= maxX  &&
                     loc[0] >= localization.x &&
                     loc[1] <= maxY &&
                     loc[1] >= localization.y))
                {
                  match = localization;
                }
              }
              // Thershold is a width
              var t = that.scaleToRelative([0,0,10])[2];
              if (meta.type.dtype == "dot")
              {
                var x=localization.x;
                var y=localization.y;
                var distance = Math.sqrt(Math.pow(loc[0]-x,2)+Math.pow(loc[1]-y,2));
                if ((distance) < t)
                {
                  match = localization;
                }
              }
              if (meta.type.dtype == "line")
              {
                var y2=localization.y1;
                var y1=localization.y0;
                var x2=localization.x1;
                var x1=localization.x0;

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
                    match = localization;
                  }
                }
              }
            })
        });
      return match;
    }
    else
    {
      return null;
    }
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

    //Scale box dimenisons
    var actX = (localization.x - roi[0]) *scaleFactor[0];
    var actY = (localization.y - roi[1])*scaleFactor[1];
    var actWidth = localization.width*scaleFactor[0];
    var actHeight = localization.height*scaleFactor[1];

    var poly = [[actX, actY],
                [actX + actWidth,
                 actY],
                [actX + actWidth,
                 actY + actHeight],
                [actX,
                 actY + actHeight]];

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

    //Scale box dimenisons
    var actX0 = (localization.x0 - roi[0]) *scaleFactor[0];
    var actY0 = (localization.y0 - roi[1])*scaleFactor[1];
    var actX1 = (localization.x1 - roi[0]) *scaleFactor[0];
    var actY1 = (localization.y1 - roi[1])*scaleFactor[1];

    var line = [[actX0,actY0], [actX1,actY1]];
    return line;
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
      width = defaultDotWidth;
    }

    //Scale box dimenisons
    var actX0 = (localization.x - roi[0]) *scaleFactor[0];
    var actY0 = (localization.y - roi[1])*scaleFactor[1];
    var actX1 = (localization.x - roi[0]) *scaleFactor[0];
    var actY1 = (localization.y - roi[1])*scaleFactor[1];
    actX0 -= width/2;
    actX1 += width/2;
    var line = [[actX0,actY0], [actX1,actY1]];
    return line;
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
  mouseOverHandler(mouseEvent)
  {
    var that = this;
    var location = this.scaleToViewport([mouseEvent.offsetX, mouseEvent.offsetY]);
    // If we are in select or query modes change cursor on over
    if (this._mouseMode == MouseMode.QUERY || this._mouseMode == MouseMode.SELECT)
    {
      // Clear old pointer type
      cursorTypes.forEach((t) => {this._canvas.classList.remove("select-"+t);});
      var localization = this.localizationByLocation(location);
      if (localization)
      {
        if(localization != this.activeLocalization) {
          this._canvas.classList.add("select-pointer");

          if (this._mouseMode == MouseMode.QUERY &&
              this._emphasis != localization)
          {
            this._emphasis = localization;
            this.describeLocalization(localization);
            this.emphasizeLocalization(localization);
          }
        }
      }
      else
      {
        this._canvas.classList.remove("select-pointer");
        if (this._emphasis != null && this._emphasis != this.activeLocalization)
        {
          this._emphasis = null;
          this.refresh();
        }
      }
    }
    if (this._mouseMode == MouseMode.SELECT && this._canEdit)
    {
      var resizeType=null;
      var type = this.getObjectDescription(this.activeLocalization).type.dtype;
      if (type == 'box')
      {
        var poly = this.localizationToPoly(this.activeLocalization);
        var resizeType=determineBoxResizeType(location,
                                              poly);
      }
      else if (type == 'line')
      {
        var line = this.localizationToLine(this.activeLocalization);
        var resizeType=determineLineResizeType(location,
                                               line);
      }
      if (resizeType)
      {
        console.log(`resize type = ${resizeType}`);
        this._canvas.classList.add("select-"+resizeType[0]);
      }
      else
      {
        // Check to see if we are nearby are in the localization
        var localization = this.localizationByLocation(location);
        if (localization && localization.id == this.activeLocalization.id)
        {
          // Re-emphasize the localization for track handling
          this.emphasizeLocalization(this.activeLocalization, color.WHITE);

          // If we tripped in during a select, don't override the pointer
          if (mouseEvent.buttons == 0)
          {
            this._canvas.classList.add("select-grab");
          }
          else
          {
            this._canvas.classList.add("select-grabbing");
          }
          this._emphasis = localization;
        }
        else if (localization)
        {
          // User moved off localization
          this._canvas.classList.add("select-pointer");
          var emphasis=[{obj: this.activeLocalization, color: color.WHITE}, {obj: localization, color: null}];
          this.emphasizeMultiLocalizations(emphasis);
          this._emphasis = localization;
        }
        else
        {
          // User moved off localization
          this._canvas.classList.remove("select-pointer");
          this._emphasis = null;
          this.emphasizeLocalization(this.activeLocalization, color.WHITE);
        }
      }
    }
    if (this._mouseMode == MouseMode.ZOOM_ROI)
    {
      this._canvas.classList.add("select-zoom-roi");
    }

    if (this._mouseMode == MouseMode.NEW)
    {
      cursorTypes.forEach((t) => {this._canvas.classList.remove("select-"+t);});
      this._canvas.classList.add("select-crosshair");
    }
  }


  describeLocalization(localization)
  {
    var msg ="";
    var keys = Object.keys(localization.attributes);

    // Use localization attributes, unless we are in a track
    var attributes = localization.attributes;
    if (localization.id in this._data._trackDb)
    {
      attributes=this._data._trackDb[localization.id].attributes;
    }
    for (var idx = 0; idx < Math.min(2,keys.length); idx++)
    {
      var key = keys[idx];
      var descriptor=
          Object.getOwnPropertyDescriptor(attributes,
                                          key);
      if (idx != 0)
      {
        msg += ", ";
      }
      msg+= `${key} = ${descriptor.value}`;
    }

    var className = "primary";
    if (msg != "")
    {
      var msgDiv = updateStatus(msg, className, -1);
    }

  }

  // if the user releases their mouse over an animation handle accordingly
  mouseUpHandler(event)
  {
    if (this._mouseMode == MouseMode.SELECT || this._mouseMode == MouseMode.RESIZE)
    {
      cursorTypes.forEach((t) => {this._canvas.classList.remove("select-"+t);});
    }
  }

  // If the user clicked an annotation, bring up an edit form if they clicked nothing, reset
  mouseDownHandler(clickEvent)
  {
    cursorTypes.forEach((t) => {this._canvas.classList.remove("select-"+t);});
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
        if (this.draft.type.dtype == "dot")
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
        this.selectLocalization(localization);

        var poly = this.localizationToPoly(localization);
        var resizeType=determineBoxResizeType(clickLocation,
                                              poly);

        // Grab the target
        if (this._canEdit) {
          this._canvas.classList.add("select-grabbing");
        }
      }
    }
    else if (this._mouseMode == MouseMode.SELECT)
    {
      var resizeType = null;
      if (this._canEdit) {
        var type = this.getObjectDescription(this.activeLocalization).type.dtype;
        if (type == 'box')
        {
          var poly = this.localizationToPoly(this.activeLocalization);
          resizeType=determineBoxResizeType(clickLocation,
                                            poly);
        }
        else if (type == 'line')
        {
          var line = this.localizationToLine(this.activeLocalization);
          resizeType=determineLineResizeType(clickLocation,
                                             line);
        }
      }

      if (resizeType)
      {
        this._mouseMode = MouseMode.RESIZE;
        this._impactVector=resizeType[1];
        this._canvas.classList.add("select-"+resizeType[0]);
      }
      else if (localization == this.activeLocalization && this._canEdit)
      {
        this._canvas.classList.add("select-grabbing");
      }
      else if (localization)
      {
        this.selectLocalization(localization);
      }
      else
      {
        // Means we deselected the selection.
        clearStatus();
        if (this._animator)
        {
          clearTimeout(this._animator);
        }
        this.activeLocalization = null;
        this.refresh();
        this._mouseMode = MouseMode.QUERY;
      }
    }
    if (this._mouseMode == MouseMode.ZOOM_ROI)
    {
      this._canvas.classList.add("select-crosshair");
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
      clearTimeout(this._animator);
    }
    this.activeLocalization = null;
    this.refresh();
    if (this._mouseMode == MouseMode.SELECT) {
      this._mouseMode = MouseMode.QUERY;
    }
  }

  selectLocalization(localization, skipAnimation, muteOthers)
  {
    var that = this;
    // Always go to select from query
    if ((this._mouseMode != MouseMode.PAN) && (this._mouseMode != MouseMode.ZOOM_ROI))
    {
      this._mouseMode = MouseMode.SELECT;
    }
    this.describeLocalization(localization);

    if (this.activeLocalization && this.activeLocalization.id == localization.id)
    {
      //If we are already selected skip animation
      skipAnimation=true;
    }

    if (skipAnimation == true)
    {
      this.emphasizeLocalization(localization,
                                 color.WHITE,
                                 muteOthers);
    }
    else
    {
      this.highlightLocalization(localization, 500,
                                 {cycles: 1,
                                  initColor: color.blend(color.WHITE,emphasisColor(localization),0.50)}).
        then(
          () =>
            {
              that.emphasizeLocalization(localization,
                                         color.WHITE);
            });
    }
    this.activeLocalization = localization;
    // Handle case when localization is in a track
    if (localization.id in this._data._trackDb)
    {
      const track = this._data._trackDb[localization.id];
      this.dispatchEvent(new CustomEvent("select", {
        detail: track,
        composed: true,
      }));
    } else {
      this.dispatchEvent(new CustomEvent("select", {
        detail: localization,
        composed: true,
      }));
    }
  }

  selectTrack(track)
  {
    const frame = track.association.segments[0][0];
    this.gotoFrame(frame).then(() => {
      this._data._dataByType.forEach((value, key, map) => {
        if (key != track.meta) {
          for (const localization of value) {
            const sameId = this._data._trackDb[localization.id].id == track.id;
            const firstFrame = localization.frame == frame;
            if (sameId && firstFrame) {
              this.selectLocalization(localization, true);
              return;
            }
          }
        }
      });
    });
  }

  emphasizeMultiLocalizations(listOfLocalizations, muteOthers)
  {
    if (muteOthers == undefined)
    {
      muteOthers = false;
    }
    listOfLocalizations.forEach(pair =>
                                {
                                  var localization = pair.obj;
                                  var userColor = pair.color;
                                  var meta = this.getObjectDescription(localization);
                                  var width = meta.type.line_width;


                                  var drawColor = userColor;
                                  if (userColor == undefined)
                                  {
                                    var drawColor = emphasisColor(localization);
                                  }

                                  if (meta.type.dtype == "box")
                                  {
                                    var poly = this.localizationToPoly(localization);
                                    this._draw.drawPolygon(poly, drawColor, width);
                                  }
                                  else if (meta.type.dtype == "line")
                                  {
                                    var line = this.localizationToLine(localization);
                                    this._draw.drawLine(line[0], line[1], drawColor, width);
                                  }
                                  else if (meta.type.dtype == 'dot')
                                  {
                                    var line = this.localizationToDot(localization, defaultDotWidth);
                                    this._draw.drawLine(line[0], line[1], drawColor, defaultDotWidth);
                                  }
                                  // Handle case when localization is in a track
                                  if (localization.id in this._data._trackDb)
                                  {
                                    const track = this._data._trackDb[localization.id];
                                    this.dispatchEvent(new CustomEvent("select", {
                                      detail: track,
                                      composed: true,
                                    }));
                                  } else {
                                    this.dispatchEvent(new CustomEvent("select", {
                                      detail: localization,
                                      composed: true,
                                    }));
                                  }

                                });

    this._draw.dispImage(true, muteOthers);


  }

  // Emphasis is applied to the localization
  emphasizeLocalization(localization, userColor, muteOthers)
  {
    var tempList=[]
    tempList.push({"obj": localization,
                   "color":userColor});
    this.emphasizeMultiLocalizations(tempList, muteOthers);
  }

  clearAnimation()
  {
    if (this._animator)
    {
      clearTimeout(this._animator);
      this._animator = null;
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
      clearTimeout(this._animator);
    }

    var cycles = 7;
    if ('cycles' in options)
    {
      cycles = options.cycles;
    }

    var initColor = localization.color;

    if ('initColor' in options)
    {
      initColor = options.initColor;
    }

    var meta = this.getObjectDescription(localization);
    var width = meta.type.line_width;
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
            resolve();
          }

          frameIdx++;
          if (meta.type.dtype == 'box')
          {
            that._draw.drawPolygon(poly, getColorForFrame(frameIdx), width);
          }
          else if (meta.type.dtype == 'line')
          {
            that._draw.drawLine(line[0], line[1], getColorForFrame(frameIdx), width);
          }
          else if (meta.type.dtype == 'dot')
          {
            var dotline = that.localizationToDot(localization, defaultDotWidth);
            that._draw.drawLine(dotline[0], dotline[1], getColorForFrame(frameIdx), defaultDotWidth);
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

  // Scale the given vector from pixel coordinates to relative coordinates
  scaleToRelative(vector, isLine=false)
  {
    var normalFactor=[this._draw.clientWidth/this._roi[2],
                      this._draw.clientHeight/this._roi[3]];
    var shiftFactor=[this._roi[0], this._roi[1],0,0];

    // Lines need shifting on all coordinates
    if (isLine)
    {
      shiftFactor=[this._roi[0], this._roi[1],this._roi[0],this._roi[1]];
    }
    // First go to image coordinates to take account of zoom, etc.
    var relative=new Array(vector.length);
    for (var idx = 0; idx < vector.length; idx++)
    {
      relative[idx] = ((vector[idx] / normalFactor[idx % 2]) + shiftFactor[idx]);
    }

    return relative;
  }

  // Construct a new metadata type based on the argument provided
  newMetadataItem(typeId, metaMode)
  {
    if ("pause" in this) {
      this.pause();
    }
    this.refresh();
    const objDescription = this._data._dataTypes[typeId];
    if (objDescription.isLocalization == true)
    {
      this._mouseMode = MouseMode.NEW;
      this.draft=objDescription;
      this._canvas.classList.add("select-draw");
      updateStatus("Ready for annotation.", "primary", -1);
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
    if (localization.meta in this._data._dataTypes)
    {
      return objDescription=this._data._dataTypes[localization.meta];
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
      if (objDescription.type.dtype=="box")
      {
        localization=this.scaleToRelative(boxInfo);
        requestObj.x = localization[0];
        requestObj.y = localization[1];
        requestObj.width = localization[2];
        requestObj.height = localization[3];
      }
      else if (objDescription.type.dtype=="line")
      {
        localization=this.scaleToRelative(lineInfo, true);
        requestObj.x0 = localization[0];
        requestObj.y0 = localization[1];
        requestObj.x1 = localization[2];
        requestObj.y1 = localization[3];
      }
      else if (objDescription.type.dtype=='dot')
      {
        var previewSize=50;
        localization=this.scaleToRelative(dotInfo);
        boxInfo=[dotInfo[0]-50, dotInfo[1]-50, 100,100];
        requestObj.x = localization[0];
        requestObj.y = localization[1];
      }

      requestObj.frame = this.currentFrame();
    }

    this.dispatchEvent(new CustomEvent("create", {
      detail: {
        objDescription: objDescription,
        dragInfo: dragInfo,
        requestObj: requestObj,
        metaMode: this._metaMode
      },
      composed: true,
    }));
  }

  deleteLocalization(localization,successCb, failureCb)
  {
    if (this._animator)
    {
      clearTimeout(this._animator);
    }

    const objDescription = this.getObjectDescription(localization);
    this._undo.del("Localization", localization.id, objDescription)
    this._mouseMode = MouseMode.QUERY;
  }

  modifyLocalization()
  {
    const objDescription = this.getObjectDescription(this.activeLocalization);
    const submitUrl="/rest/Localization/" + this.activeLocalization.id;

    var requestObj = {};
    var patchObj = {};

    patchObj.resourcetype = objDescription.type.resourcetype.replace("EntityType", "Entity");
    // Update positions (TODO can optomize and only update if they changed) (same goes for all fields)
    if (objDescription.type.dtype=='box')
    {
      patchObj.x = this.activeLocalization.x;
      patchObj.y = this.activeLocalization.y;
      patchObj.width = this.activeLocalization.width;
      patchObj.height = this.activeLocalization.height;
    }
    else if (objDescription.type.dtype=='line')
    {
      patchObj.x0 = this.activeLocalization.x0;
      patchObj.y0 = this.activeLocalization.y0;
      patchObj.x1 = this.activeLocalization.x1;
      patchObj.y1 = this.activeLocalization.y1;
    }
    else if (objDescription.type.dtype=='dot')
    {
      patchObj.x = this.activeLocalization.x;
      patchObj.y = this.activeLocalization.y;
    }

    this._undo.patch("Localization", this.activeLocalization.id, patchObj, objDescription);
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
      var overX = Math.min(this.clientWidth-coord[0],0);
      var overY = Math.min(this.clientHeight-coord[1]-1, 0);

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
      that._draw.drawPolygon(boxCoords,
                             colorReq);
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

      that._draw.beginDraw();
      that._draw.drawLine(lineCoords[0],
                          lineCoords[1],
                          colorReq);
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
      var type=this.draft.type.dtype;

      if (type == "box")
      {
        if ('end' in dragEvent)
        {
          drawBox(dragEvent.start,
                  dragEvent.end);
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
    else if (this._canEdit)
    {
      var that = this;
      //We are moving or resizing
      if (this._mouseMode == MouseMode.SELECT)
      {
        this._mouseMode = MouseMode.MOVE;
      }
      if (this._mouseMode == MouseMode.MOVE)
      {
        clearTimeout(this._animator);

        var objType = this.getObjectDescription(this.activeLocalization);

        var translatedLine = function(begin, end)
        {
          var line = that.localizationToLine(that.activeLocalization);
          line[0][0] += end.x - begin.x;
          line[1][0] += end.x - begin.x;
          line[0][1] += end.y - begin.y;
          line[1][1] += end.y - begin.y;

          line = that.boundsCheck(line);
          return line;
        }

        var translatedDot = function(begin, end)
        {
          var line = that.localizationToDot(that.activeLocalization);
          line[0][0] += end.x - begin.x;
          line[1][0] += end.x - begin.x;
          line[0][1] += end.y - begin.y;
          line[1][1] += end.y - begin.y;
          return line;
        }

        var translatedPoly = function(begin, end)
        {
          // Translate the box based on the drag
          var box=that.localizationToPoly(that.activeLocalization);
          for (var idx = 0; idx < 4; idx++)
          {
            box[idx][0] += end.x - begin.x;
            box[idx][1] += end.y - begin.y;
          }
          box = that.boundsCheck(box);
          return box;
        };

        if ('end' in dragEvent)
        {
          console.log("Moved = " + JSON.stringify(dragEvent));
          // TODO: Handle move event
          cursorTypes.forEach((t) => {this._canvas.classList.remove("select-"+t);});
          if (objType.type.dtype == 'box')
          {
            var localization=this.scaleToRelative(polyToBox(translatedPoly(dragEvent.start, dragEvent.end)));
            this.activeLocalization.x = localization[0];
            this.activeLocalization.y = localization[1];
            this.activeLocalization.width = localization[2];
            this.activeLocalization.height = localization[3];
          }
          else if (objType.type.dtype == 'line')
          {
            var line=translatedLine(dragEvent.start, dragEvent.end);
            var lineScaled=this.scaleToRelative([line[0][0], line[0][1], line[1][0], line[1][1]]);
            this.activeLocalization.x0 = lineScaled[0];
            this.activeLocalization.y0 = lineScaled[1];
            this.activeLocalization.x1 = lineScaled[2];
            this.activeLocalization.y1 = lineScaled[3];
          }
          else if (objType.type.dtype == 'dot')
          {
            var newXY = this.scaleToRelative([dragEvent.end.x, dragEvent.end.y]);
            this.activeLocalization.x = newXY[0];
            this.activeLocalization.y = newXY[1];
          }
          this.modifyLocalization();
        }
        else
        {
          if (objType.type.dtype == 'box')
          {
            this._draw.drawPolygon(translatedPoly(dragEvent.start, dragEvent.current), color.WHITE, objType.type.line_width);
          }
          else if (objType.type.dtype == 'line')
          {
            var line = translatedLine(dragEvent.start, dragEvent.current);
            this._draw.drawLine(line[0], line[1], color.WHITE, objType.type.line_width);
          }
          else
          {
            var line = translatedDot(dragEvent.start, dragEvent.current);
            this._draw.drawLine(line[0], line[1], color.WHITE, defaultDotWidth);
          }
          this._draw.dispImage(true, true);
        }
      }
      if (this._mouseMode == MouseMode.RESIZE)
      {
        clearTimeout(this._animator);
        var type =
            this.getObjectDescription(this.activeLocalization).type.dtype;

        var translatedLine = function(begin, end)
        {
          var line = that.localizationToLine(that.activeLocalization);
          line[0][0] += (end.x - begin.x) * that._impactVector[0][0];
          line[0][1] += (end.y - begin.y) * that._impactVector[0][1];
          line[1][0] += (end.x - begin.x) * that._impactVector[1][0];
          line[1][1] += (end.y - begin.y) * that._impactVector[1][1];
          return line;
        }
        var translatedPoly = function(begin, end)
        {
          var box=that.localizationToPoly(that.activeLocalization);
          for (var idx = 0; idx < 4; idx++)
          {
            box[idx][0] += (end.x - begin.x) * that._impactVector[idx][0];
            box[idx][1] += (end.y - begin.y) * that._impactVector[idx][1];
          }
          return box;
        };

        if ('end' in dragEvent)
        {
          console.log("Resized = " + JSON.stringify(dragEvent));

          if (type == 'box')
          {
            var localization=this.scaleToRelative(polyToBox(translatedPoly(dragEvent.start, dragEvent.end)));
            this.activeLocalization.x = localization[0];
            this.activeLocalization.y = localization[1];
            this.activeLocalization.width = localization[2];
            this.activeLocalization.height = localization[3];
          }
          else if (type == 'line')
          {
            var localization=this.scaleToRelative(this.explodeLine(translatedLine(dragEvent.start, dragEvent.end)));
            this.activeLocalization.x0 = localization[0];
            this.activeLocalization.y0 = localization[1];
            this.activeLocalization.x1 = localization[2];
            this.activeLocalization.y1 = localization[3];
          }
          this.modifyLocalization();
        }
        else
        {
          if (type == 'box')
          {
            this._draw.drawPolygon(translatedPoly(dragEvent.start, dragEvent.current), color.WHITE, this.getObjectDescription(this.activeLocalization).type.line_width);
          }
          else (type == 'line')
          {
            var line = translatedLine(dragEvent.start, dragEvent.current);
            this._draw.drawLine(line[0],line[1], color.WHITE, this.getObjectDescription(this.activeLocalization).type.line_width);
          }
          this._draw.dispImage(true, true);
        }
      }
    }
  }

  drawAnnotations(frameInfo, drawContext, roi)
  {
    const annotation_alpha=0.7*255;

    if (drawContext == undefined)
    {
      drawContext = this._draw;
    }
    // scale factor based on canvas height versus image height
    // Draw commands are in viewspace coordinates, but annotations
    // are in image coordinates.
    var frameIdx = frameInfo.frame;
    if (this._framedData.has(frameIdx))
    {
      var typeDict = this._framedData.get(frameIdx);
      for (let typeid of typeDict.keys())
      {
        var localList = typeDict.get(typeid);
        for (var localIdx = 0; localIdx < localList.length; localIdx++)
        {
          var localization=localList[localIdx];
          var typeObject=this.getObjectDescription(localization);
          var type=typeObject.type.dtype;
          var width=typeObject.type.line_width;

          // Default to blue
          var drawColor = color.BLUE;
          var meta = this.getObjectDescription(localization).type;
          var trackColor = null;
          if (localization.id in this._data._trackDb)
          {
            trackColor = this._data._trackDb[localization.id].association.color;

            if (trackColor)
            {
              drawColor = color.hexToRgb(trackColor);
            }
          }
          else if (meta.colorMap != null)
          {
            var keyname = meta.colorMap.key;
            if (keyname && keyname in localization.attributes)
            {
              var keyvalue=localization.attributes[keyname];
              if (keyvalue in meta.colorMap.map)
              {
                drawColor = color.hexToRgb(meta.colorMap.map[keyvalue])
              }
            }
          }

          localization.color = drawColor;

          if (type=='box')
          {
            var poly = this.localizationToPoly(localization, drawContext, roi);
            drawContext.drawPolygon(poly, localization.color, width, annotation_alpha);
          }
          else if (type == 'line')
          {
            var line = this.localizationToLine(localization, drawContext, roi);
            drawContext.drawLine(line[0], line[1], localization.color, width, annotation_alpha);
          }
          else if (type == 'dot')
          {
            var line = this.localizationToDot(localization, defaultDotWidth, drawContext, roi);
            drawContext.drawLine(line[0], line[1], localization.color, defaultDotWidth, annotation_alpha);
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
    this._mouseMode = MouseMode.QUERY;
    this.refresh();
  }

  onPlay()
  {
    this.activeLocalization = null;
    this._mouseMode = MouseMode.QUERY;
  }

  onPause()
  {
    if (this.activeLocalization) {
      if (this.currentFrame() !== this.activeLocalization.frame) {
        this.activeLocalization = null;
        this._mouseMode = MouseMode.QUERY;
      } else {
        this.selectLocalization(this.activeLocalization);
      }
    }
  }

  zoomIn()
  {
    var that = this;
    this.refresh().then(
      function()
      {
        updateStatus("Select an area to zoom", "primary", -1);
        that._mouseMode = MouseMode.ZOOM_ROI;
        cursorTypes.forEach((t) => {that._canvas.classList.remove("select-"+t);});
        that._canvas.classList.add("select-zoom-roi");
      });
  }

  zoomOut()
  {
    cursorTypes.forEach((t) => {this._canvas.classList.remove("select-"+t);});
    this._mouseMode = MouseMode.QUERY;
    updateStatus("Reset to full frame");
    this.resetRoi();
    this.refresh();
  }

  pan()
  {
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
      this.moveOffscreenBuffer([localization.x, localization.y,
                                localization.width, localization.height]);
      makeSnapshot();
    }
    else
    {
      this.seekFrame(localization.frame,
                     (frameIdx, source, width, height) => {
                       this.updateOffscreenBuffer(frameIdx, source, width, height);
                       this.moveOffscreenBuffer([localization.x, localization.y,
                                localization.width, localization.height]);
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
    const width = this._offscreen.width;
    const height = this._offscreen.height;

    this._offscreenDraw.clearRect(0,0,width,height);
    this._offscreenDraw.dispImage(true, !localizations);

    this._offscreen.convertToBlob().then(
      (png_data) =>
        {
          var png_file = URL.createObjectURL(png_data);
          var anchor = document.createElement('a');
          anchor.href=png_file;
          anchor.download=`${filename}.png`;
          anchor.click();
        });
  }
}
