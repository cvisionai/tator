export class MultiRenderer {
  constructor() {
   this._videos = {}; 
   this._callbacks = {};
   this._frameReq = {};
   this._readyCount = 0;
  }

  addVideo(video, element)
  {
    this._videos[video] = element;
    this._callbacks[video] = null;
    this._frameReq[video] = 0;
  }

  notifyReady(video, callback)
  {
    this._callbacks[video] =callback;
    this.checkAll();
  }

  setFrameReq(video, frame)
  {
    this._frameReq[video] = frame;
  }

  checkAll()
  {
    // Check all the videos for ready, bail out if they aren't all set.
    for (let video in this._videos)
    {
      let callback = this._callbacks[video];
      // If we get to the end let it go.
      if (this._frameReq[video] > this._videos[video].length-5)
      {
        if (callback != null)
        {
          this._videos[video].gotoFrame(this._videos[video].length-5, true);
        }
        this._callbacks[video] = null;
        continue;
      }
      if (callback == null || this._videos[video]._draw.canPlay() <= 0)
      {
        return;
      }
    }


    if (this._timer != null)
    {
      // Debounce if we are already doing an animation frame
      return;
    }

    this._timer = window.requestAnimationFrame((domtime) => {
      // Clear timer value as it fired
      this._timer = null;

      // Fire each video draw synchronously, we'll end back in checkAll() 
      // upon successful drawing.
      for (let video in this._videos)
      {
        if (this._callbacks[video] != null)
        {
          this._callbacks[video].bind(this._videos[video])(domtime);
        }
      }
    });
  }

  stopThread()
  {
    cancelAnimationFrame(this._timer);
    this._timer = null;
    for (let video in this._videos)
    {
      this._callbacks[video] = null;
    }
  }
}