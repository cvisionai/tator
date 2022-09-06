export var CTRL_SIZE = 4*8; // Keep 256-bit alignment of raw frame data

export class VideoBufferManager
{
  // Size of a frame and how many to keep
  constructor(size, depth)
  {
    // Allocate 
    this._slots=[]
    for (let idx = 0; idx < depth; idx++)
    {
      let buffer = new SharedArrayBuffer(size+CTRL_SIZE);
      let ctrl = new Uint32Array(buffer, 0, CTRL_SIZE);
      Atomics.store(ctrl, 0, 0);
      this._slots.push(buffer);
    }
  }

  getSlot()
  {
    for (let idx = 0; idx < this._slots.length; idx++)
    {
      let buffer = this._slots[idx];
      let ctrl = new Uint32Array(buffer, 0, CTRL_SIZE);
      // Attempts to claim slot, if it isn't claimed sets it to 1, returns old value
      if (Atomics.exchange(ctrl, 0, 1) == 0)
      {
        return buffer;
      }
    }
    console.error("Consumed all the image slots, no where to put latest decoded frame.");
    return null;
  }
}