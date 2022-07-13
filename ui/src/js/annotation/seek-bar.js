import { TatorElement } from "../components/tator-element.js";

export class SeekBar extends TatorElement {
  constructor() {
    super();
    this.bar = document.createElement("div");
    this.bar.setAttribute("class", "range-div select-pointer");
    this._shadow.appendChild(this.bar);

    this.handle = document.createElement("div");
    this.handle.setAttribute("class", "range-handle");
    this.handle.setAttribute("tabindex", "0");
    this.handle.style.cursor = "pointer";
    this.bar.appendChild(this.handle);
    this._loadedPercentage = 0;
    this._visualType = "";
    this._active = false;

    var that = this;
    var clickHandler=(evt)=>
    {
      this._active = false;
      var width = that.offsetWidth;
      var startX = that.offsetLeft;
      if (width == 0)
      {
        width =
          that.parentElement.offsetWidth;
        startX = that.parentElement.offsetLeft;
      }
      const percentage = ((evt.clientX-startX)/
                          width);
      that.value = Math.round((percentage * (that._max - that._min) + that._min));
      that.dispatchEvent(
        new CustomEvent("change",
                        {composed: true,
                         detail: {frame: that.value}}));
      evt.stopPropagation();
      return false;
    }
    this.bar.addEventListener("click", clickHandler);

    var dragHandler=function(evt)
    {
      if (evt.button == 0)
      {
        var width = that.offsetWidth;
        if (width == 0)
        {
          width = that.parentElement.offsetWidth;
        }
        var relativeX =
            Math.min(Math.max(evt.pageX - that.offsetLeft,0),
                     width);
        const percentage = Math.min(relativeX/width,
                                    that._loadedPercentage);
        that.value = Math.round((percentage * (that._max - that._min) + that._min));
        evt.stopPropagation();
        return false;
      }
      evt.cancelBubble=true;
      return false;
    }
    var releaseMouse=(evt)=>
    {
      console.info("RELEASE MOUSE.");
      this._active = false;
      clearInterval(that._periodicCheck);
      document.removeEventListener("mouseup",
                                   releaseMouse);
      document.removeEventListener("mousemove",
                                   dragHandler);
      that.dispatchEvent(new CustomEvent("change",
                                         {composed: true}));
      that.handle.classList.remove("range-handle-selected");
      // Add back in event handler next iteration (time=0)
      setTimeout(() =>
                 {
                   that.bar.addEventListener("click", clickHandler);
                 },0);
    }
    this.handle.addEventListener("mousedown", evt =>
                                 {
                                   this._active = true;
                                   this._lastValue = this.value;
          
                                   this._periodicCheck = setInterval(() =>
                                     {
                                      if (that._active == false)
                                      {
                                        clearInterval(this._periodicCheck);
                                        return;
                                      }
                                      //console.info(`Checking scrub bar @ ${this.value}`);
                                      if (this._value == this._lastValue)
                                      {
                                        return;
                                      }
                                      this._lastValue = this.value;
                                      this.dispatchEvent(
                                        new CustomEvent("input",
                                                        {composed: true,
                                                        detail: {frame: this.value}}));
                                     }
                                    , 33);
                                   that.bar.removeEventListener("click", clickHandler);
                                   document.addEventListener("mouseup",
                                                             releaseMouse);
                                   document.addEventListener("mousemove",
                                                             dragHandler);
                                   this.handle.classList.add("range-handle-selected");
                                   evt.stopPropagation();
                                   return false;
                                 });



    this.loadProgress = document.createElement("div");
    this.loadProgress.setAttribute("class", "range-loaded");
    this.onDemandProgress = document.createElement("div");
    this.onDemandProgress.setAttribute("class", "range-ondemand");
    this.bar.appendChild(this.loadProgress);
    this.bar.appendChild(this.onDemandProgress);

    this._min = 0;
    this._max = 100;
    this._value = 0;
  }

  changeVisualType(visualType) {
    if (visualType == "zoom") {
      this.visualType = "zoom";
      this.bar.setAttribute("class", "zoom-range-div select-pointer");
      this.loadProgress.setAttribute("class", "zoom-range-loaded");
    }
  }

  updateVisuals()
  {
    const percentage = ((this._value-this._min)/(this._max - this._min))*100;
    if (percentage > 100 || percentage < 0) {
      this.handle.style.display = "none";
    }
    else {
      this.handle.style.display = "block";
      this.handle.style.left = `${percentage}%`;
    }
  }

  get active()
  {
    return this._active;
  }

  attributeChangedCallback(name, oldValue, newValue)
  {
    switch(name)
    {
      case 'min':
      this._min = Number(newValue);
      break;
      case 'max':
      this._max = Number(newValue);
      break;
    }
    this.updateVisuals();
  }

  set value(val)
  {
    this._value=val;
    this.updateVisuals();
  }

  get value()
  {
    return this._value;
  }

  onBufferLoaded(evt)
  {
    this._loadedPercentage = evt.detail['percent_complete'];
    const percent_complete = evt.detail['percent_complete']*100;
    this.loadProgress.style.width=`${percent_complete}%`;
  }

  onDemandLoaded(evt)
  {
    // If it is 0, that means we reset.
    if (evt.detail.ranges.length == 0)
    {
      this.onDemandProgress.style.marginLeft = `0px`;
      this.onDemandProgress.style.width = `0px`;
      return;
    }
    let range = evt.detail.ranges[0]
    const start = range[0];
    const end = range[1];
    const startPercentage = start / this._max;
    const endPercentage = end / this._max;
    this.onDemandProgress.style.marginLeft = `${startPercentage*100}%`;
    const widthPx = Math.round((endPercentage-startPercentage)*this.bar.clientWidth);
    this.onDemandProgress.style.width = `${widthPx}px`;
  }

  /**
   * Alternative to onBufferLoaded. Uses a passed in frame
   */
  setLoadProgress(frame) {
    const percentage = ((frame-this._min)/(this._max - this._min));
    if (percentage > 1) {
      this.onBufferLoaded({detail: {percent_complete: 1.0}});
    }
    else if (percentage < 0) {
      this.onBufferLoaded({detail: {percent_complete: 0.0}});
    }
    else {
      this.onBufferLoaded({detail: {percent_complete: percentage}});
    }
  }

  static get observedAttributes() { return ['min', 'max']; }
}

customElements.define("seek-bar", SeekBar);
