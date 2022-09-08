import { color } from "./drawGL_colors.js";
export class EffectManager
{
  constructor(video, canvas, draw)
  {
    this._video = video;
    this._canvas = canvas;
    this._draw = draw;
  }

  grayOut(delay_ms)
  {
    if (delay_ms == undefined)
    {
      delay_ms = 150;
    }
    const frame = this._video.currentFrame();
    const maxX = this._canvas.width;
    const maxY = this._canvas.height;
    
    this._idx = 1;
    let prog = ()=>{
      this._draw.beginDraw();
      //this._draw.fillPolygon([[0,0], [maxX,0],[maxX,maxY],[0,maxY]], 0, color.BLACK, 75, [1.0,Math.atan(this._idx/10)*0.0025,0,0]);
      const delay = Math.floor(delay_ms / 16);
      if (this._idx > delay)
      {
        this._draw.fillPolygon([[0,0], [maxX,0],[maxX,maxY],[0,maxY]], 0, color.BLACK, 10 + (75*Math.atan((this._idx-delay)/10)));
        this._draw.dispImage(true,false, frame);
      }
      this._animator = requestAnimationFrame(prog);
      this._idx++;
    };
    prog();
  }

  darken(req_color, alpha)
  {
    if (req_color == undefined)
    {
      req_color = color.BLACK;
    }
    if (alpha == undefined)
    {
      alpha = 128;
    }
    const frame = this._video.currentFrame();
    const maxX = this._canvas.width;
    const maxY = this._canvas.height;
    this.clear();
    this._draw.fillPolygon([[0,0], [maxX,0],[maxX,maxY],[0,maxY]], 0, req_color, alpha);
    this._draw.dispImage(true,false, frame);
  }

  grayscale(darken)
  {
    const frame = this._video.currentFrame();
    const maxX = this._canvas.width;
    const maxY = this._canvas.height;
    this.clear();
    this._draw.fillPolygon([[0,0], [maxX,0],[maxX,maxY],[0,maxY]], 0, color.BLACK, 255, [2.0,0,0,0]);
    if (darken)
    {
      this._draw.fillPolygon([[0,0], [maxX,0],[maxX,maxY],[0,maxY]], 0, darken.color, darken.alpha);
    }
    this._draw.dispImage(true,false, frame);
  }

  clear()
  {
    if (this._animator != null)
    {
      window.cancelAnimationFrame(this._animator);
      this._animator = null;
    }
    this._draw.beginDraw();
  }

}