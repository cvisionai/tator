import { BaseTimeline } from "../annotation/base-timeline.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/**
 * Web component that displays the video timeline axis in the annotator.
 *
 * Events dispatched:
 * "seekFrame"
 *    Sent when user selects a particular frame to seek to
 *    evt.detail.frame {integer}
 */
export class VideoTimeline extends BaseTimeline {
  constructor() {
    super();
  
    console.log("VideoTimeline constructor"); 
    this._timelineDiv = document.createElement("div");
    this._timelineDiv.id = "video-timeline";
    this._shadow.appendChild(this._timelineDiv);

    this._mainSvg = d3
      .select(this._shadow)
      .select("#video-timeline")
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("font", "14px sans-serif")
      .style("color", "#6d7a96");

    window.addEventListener("resize", this._updateSvgData());
    this._axisColor = "#6d7a96";
  }

  /**
   * Called whenever there's new data to be displayed on the timeline
   */
  _updateSvgData() {
    this._drawTimeline();
  }

  /**
   *
   */
  _drawTimeline() {
    var that = this;
    var maxFrame = this._maxFrame;
    if (isNaN(maxFrame)) {
      return;
    }

    this._mainStepPad = 2;
    this._mainStep = 10; // vertical height of each entry in the series / band
    this._mainMargin = { top: 5, right: 20, bottom: 10, left: 20 };
    this._mainHeight =
      1 * (this._mainStep + this._mainStepPad) +
      this._mainMargin.top +
      this._mainMargin.bottom;
    this._mainWidth = this._timelineDiv.offsetWidth;

    if (this._mainWidth <= 0) {
      return;
    }
    this._mainSvg.attr("viewBox", `0 0 ${this._mainWidth} ${this._mainHeight}`);

    // Define the axes
    this._mainX = d3
      .scaleLinear()
      .domain([this._minFrame, this._maxFrame])
      .range([0, this._mainWidth]);

    if (this._zoomTransform != null) {
      this._mainX.range(
        [0, this._mainWidth].map((d) => this._zoomTransform.applyX(d))
      );
    }

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._mainSvg.selectAll("*").remove();

    if (this.inFrameDisplayMode()) {
      var xAxis = (g) =>
        g
          .attr("transform", `translate(0,${this._mainMargin.top})`)
          .call(
            d3
              .axisBottom(this._mainX)
              .ticks()
              .tickSizeOuter(0)
              .tickFormat(d3.format("d"))
          )
          .call((g) => g.select(".domain").remove())
          .call((g) =>
            g
              .selectAll(".tick")
              .filter(
                (d) =>
                  this._mainX(d) < this._mainMargin.left * 2 ||
                  this._mainX(d) >= this._mainWidth - this._mainMargin.right * 2
              )
              .remove()
          );
    } else if (this.inRelativeTimeDisplayMode()) {
      var xAxis = (g) =>
        g
          .attr("transform", `translate(0,${this._mainMargin.top})`)
          .call(
            d3
              .axisBottom(this._mainX)
              .ticks()
              .tickSizeOuter(0)
              .tickFormat((d) => {
                return that._createRelativeTimeString(d);
              })
          )
          .call((g) => g.select(".domain").remove())
          .call((g) =>
            g
              .selectAll(".tick")
              .filter(
                (d) =>
                  this._mainX(d) < this._mainMargin.left * 2 ||
                  this._mainX(d) >= this._mainWidth - this._mainMargin.right * 2
              )
              .remove()
          );
    } else if (this.inUTCDisplayMode()) {
      var xAxis = (g) =>
        g
          .attr("transform", `translate(0,${this._mainMargin.top})`)
          .call(
            d3
              .axisBottom(this._mainX)
              .ticks()
              .tickSizeOuter(0)
              .tickFormat((d) => {
                return that._createUTCString(d, "time");
              })
          )
          .call((g) => g.select(".domain").remove())
          .call((g) =>
            g
              .selectAll(".tick")
              .filter(
                (d) =>
                  this._mainX(d) < this._mainMargin.left * 2 ||
                  this._mainX(d) >= this._mainWidth - this._mainMargin.right * 2
              )
              .remove()
          );
    }
    this._xAxis = xAxis;

    this._xAxisG = this._mainSvg
      .append("g")
      .style("font-size", "12px")
      .call(xAxis);

    this._mainFrameLine = this._mainSvg
      .append("line")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    this._mainFrameLineEnd = this._mainSvg
      .append("circle")
      .style("fill", "#fafafa")
      .attr("r", 5)
      .attr("opacity", "0");

    this._hoverFrameTextBackground = this._xAxisG
      .append("rect")
      .attr("width", this._mainWidth)
      .attr("height", this._mainStep);

    this._hoverFrameText = this._xAxisG
      .append("text")
      .style("font-size", "14px")
      .attr("x", this._mainWidth * 0.4)
      .attr("y", 10)
      .attr("fill", "#fafafa");

    this._zoom = d3
      .zoom()
      .scaleExtent([1, 20])
      .translateExtent([
        [0, 0],
        [this._mainWidth, this._mainHeight],
      ])
      .on("zoom", function (event) {
        that._zoomTransform = event.transform;
        that._mainX.range(
          [0, that._mainWidth].map((d) => event.transform.applyX(d))
        );
        that._xAxisG.call(that._xAxis);
        console.log(
          `new x-axis: ${that._mainX.invert(0)} ${that._mainX.invert(
            that._mainWidth
          )}`
        );
        that.dispatchEvent(
          new CustomEvent("newFrameRange", {
            detail: {
              start: Math.max(0, Math.round(that._mainX.invert(0))),
              end: Math.min(
                that._maxFrame,
                Math.round(that._mainX.invert(that._mainWidth))
              ),
            },
          })
        );
      });

    this._mainSvg.call(this._zoom);

    if (this._hoverFrame != null) {
      this._mainFrameLine
        .attr("opacity", "1.0")
        .attr("x1", this._mainX(this._hoverFrame))
        .attr("x2", this._mainX(this._hoverFrame))
        .attr("y1", -this._mainStep - this._mainMargin.bottom - 3)
        .attr("y2", this._mainHeight);

      this._hoverFrameText.attr("opacity", "1.0");
      this._hoverFrameTextBackground.attr("opacity", "1.0");

      if (this.inFrameDisplayMode()) {
        this._hoverFrameText.text(this._hoverFrame);
      } else if (this.inRelativeTimeDisplayMode()) {
        this._hoverFrameText.text(
          this._createRelativeTimeString(this._hoverFrame)
        );
      } else if (this.inUTCDisplayMode()) {
        this._hoverFrameText.text(this._createUTCString(this._hoverFrame));
      }

      if (this._mainX(this._hoverFrame) < this._mainWidth * 0.5) {
        this._hoverFrameText
          .attr("x", this._mainX(this._hoverFrame) + 15)
          .attr("text-anchor", "start");
      } else {
        this._hoverFrameText
          .attr("x", this._mainX(this._hoverFrame) - 15)
          .attr("text-anchor", "end");
      }

      var textBBox = this._hoverFrameText.node().getBBox();

      this._hoverFrameTextBackground
        .attr("opacity", "1.0")
        .attr("x", textBBox.x - textBBox.width / 4)
        .attr("y", textBBox.y)
        .attr("width", textBBox.width + textBBox.width / 2)
        .attr("height", textBBox.height)
        .attr("fill", "#151b28");
    }
  }

  /**
   * Call this to initialize the timeline.
   * This will default the display mode to frames.
   *
   * @param {integer} minFrame
   * @param {integer} maxFrame
   */
  init(minFrame, maxFrame, fps) {
    if (minFrame != this._minFrame && this._maxFrame != maxFrame) {
      // Reset the zoom if the play window has changed
      this._zoomTransform = null;
    }

    this._minFrame = minFrame;
    this._maxFrame = maxFrame;
    this._hoverFrame = null;
    this.redraw();
  }

  updateTimelineColor(axisColor) {
    this._axisColor = axisColor;
    this._updateSvgData();
  }

  showFrameHover(frame) {
    this._hoverFrame = frame;
    this._updateSvgData();
  }

  hideFrameHover() {
    this._hoverFrame = null;
    this._updateSvgData();
  }

  /**
   * Manual zoom controls
   */

  zoomIn() {
    this._zoom.scaleBy(this._mainSvg.transition().duration(250), 2);
  }
  zoomOut() {
    this._zoom.scaleBy(this._mainSvg.transition().duration(250), 0.5);
  }
  panLeft() {
    this._zoom.translateBy(this._mainSvg.transition().duration(250), 50, 0);
  }
  panRight() {
    this._zoom.translateBy(this._mainSvg.transition().duration(250), -50, 0);
  }
  resetZoom() {
    this._zoom.scaleTo(this._mainSvg.transition().duration(250), 1);
  }
}

customElements.define("video-timeline", VideoTimeline);
