class ResizeMouseHandler
{
    constructor(resizerBar)
    {
        this._resizerBar = resizerBar;
        this._resizerBar.addEventListener('mousedown', this._onMouseDown.bind(this));
        this._resizerBar.addEventListener('mouseup', this._onMouseUp.bind(this));
        this._resizerBar.addEventListener('mousemove', this._onMouseMove.bind(this));
        this._resizerBar.addEventListener('mouseout', this._onMouseOut.bind(this));
    }

    _onMouseDown(e)
    {
        this._mouseDown = true;
        this._resizerBar.style.backgroundColor = 'white';
    }

    _onMouseUp(e)
    {
        this._mouseDown = false;
        this._resizerBar.style.backgroundColor = null;
    }

    _onMouseOut(e)
    {
        this._resizerBar.style.backgroundColor = null
    }

    _onMouseMove(e)
    {
        if (this._mouseDown)
        {
            // Resize the multi
        }
    }
}
export class AnnotationMultiResizer
{
    constructor(multi, resizerBar)
    {
        this._multi = multi;
        this._mouseHandler = new ResizeMouseHandler(resizerBar);
    }
}