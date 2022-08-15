import { color } from "./drawGL_colors.js";
export class EffectManager
{
  constructor(video, canvas, draw)
  {
    this._video = video;
    this._canvas = canvas;
    this._draw = draw;
  }

  grayOut()
  {
    const frame = this._video.currentFrame();
    const maxX = this._canvas.width;
    const maxY = this._canvas.height;
    
    this._idx = 1;
    let prog = ()=>{
      this.clear();
      //this._draw.fillPolygon([[0,0], [maxX,0],[maxX,maxY],[0,maxY]], 0, color.BLACK, 75, [1.0,Math.atan(this._idx/10)*0.0025,0,0]);
      const delay = Math.floor(150 / 16);
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

  clear()
  {
    window.cancelAnimationFrame(this._animator);
    this._animator = null;
    this._draw.beginDraw();
  }

}