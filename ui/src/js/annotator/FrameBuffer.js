/// Object to contain frames indexes ready to display
class FrameBuffer
{
    /// Construct a new frame buffer
    /// @param depth The depth of the buffer
    /// @param initializer function to call to initialize each element
    constructor(depth, initializer)
    {
	this._dispIdx = 0; //absolute idx of NEXT disp frame
	this._loadIdx = 0; //absolute idx of NEXT load frame
	this._buffer = [];
	var idx = 0;
	for (idx = 0; idx < depth; idx++)
	{
	    var newTex=initializer()
	    this._buffer.push(newTex);
	}
    };

    debug(arg)
    {
	var msg = arg + "\n\tLength = " + this._buffer.length;
	msg +="\n\tdispIdx = " + this._dispIdx + "("+this._dispIdx%30 +")";
	msg += "\n\tloadIdx = " + this._loadIdx + "(" + this._loadIdx%30 + ")";
	msg += "\tavailableDisplay = " + this.availableDisplay();
	msg += "\tavailableLoad = " + this.availableLoad();
	console.info(msg);
    }

    // Return the size of the frame bufer
    size()
    {
	return this._buffer.length;
    }
    
    // Return the next buffer to display
    display()
    {
	var cur = this._dispIdx % this._buffer.length;
	this._active=true;
	return this._buffer[cur];
    }

    active()
    {
	return this._active;
    }

    doneDisplay()
    {
	this._active=false;
	this._dispIdx = (this._dispIdx + 1) 
    }

    // Return the next buffer to load
    load()
    {
	var cur = this._loadIdx % this._buffer.length;
	this._loadIdx = (this._loadIdx + 1) 
	return this._buffer[cur];
    }

    // Returns the number of available frames to display
    availableDisplay()
    {
	return this._loadIdx - this._dispIdx;
    }

    // Returns the number of available frames to load
    availableLoad()
    {
	return this._buffer.length - this.availableDisplay();
    }

    reset()
    {
	this._loadIdx = 0;
	this._dispIdx = 0;
    }


    // Force the load to be at most count ahead of disp idx
    trim(count)
    {
        this._loadIdx = this._dispIdx + (count-1);
        return this._buffer[this._loadIdx % this._buffer.length].frame;
    }
};
