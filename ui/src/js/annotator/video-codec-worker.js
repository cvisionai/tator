
import * as MP4Box from "./mp4box.all.js";
import { TatorTimeRanges } from "./video-codec.js";

// Internal class to write out a blob of data
class Writer {
  constructor(size) {
    this.data = new Uint8Array(size);
    this.idx = 0;
    this.size = size;
  }

  getData() {
    if(this.idx != this.size)
      throw "Mismatch between size reserved and sized used"

    return this.data.slice(0, this.idx);
  }

  writeUint8(value) {
    this.data.set([value], this.idx);
    this.idx++;
  }

  writeUint16(value) {
    // TODO: find a more elegant solution to endianess.
    var arr = new Uint16Array(1);
    arr[0] = value;
    var buffer = new Uint8Array(arr.buffer);
    this.data.set([buffer[1], buffer[0]], this.idx);
    this.idx +=2;
  }

  writeUint8Array(value) {
    this.data.set(value, this.idx);
    this.idx += value.length;
  }
}

// Manages a unique ordered list of keyframes provides access routines to find the nearest 
// keyframe given an input
// This method is overkill for fixed size fragments, but enables variable sized GOP playback
class KeyHeap {
  constructor()
  {
    this.clear();
  }

  // Clear knowledge of all keyframes
  clear()
  {
    this._buf = [];
  }

  // Add a new key frame location
  // Skip any previously encountered keyframes
  push(val)
  {
    let closest = this.closest_keyframe(val).thisSegment;
    if (val != closest)
    {
      this._buf.push(val);
      this._buf.sort((a,b)=>a-b);
      return false;
    }
    else
    {
      return true;
    }
  }

  // Find the closest preceding keyframe
  // @TODO: check for length/validity
  closest_keyframe(val)
  {
    let lastDistance = Number.MAX_VALUE;
    let lastTimestamp = 0;
    let idx = 0;
    for (idx = 0; idx < this._buf.length; idx++)
    {
      let timestamp = this._buf[idx];
      let thisDistance = val-timestamp;
      // Great Scott: Don't pull keyframes from the future.
      if (thisDistance < lastDistance && thisDistance >= 0)
      {
        lastDistance = thisDistance
        lastTimestamp = timestamp;
      }
      else
      {
        break;
      }
    }

    let nextSegment=null;
    let nearBoundary=false;
    if (idx < this._buf.length)
    {
      nextSegment = this._buf[idx];
      if (Math.abs(val-nextSegment) < Math.abs(val-lastTimestamp))
      {
        nearBoundary = true;
      }
    }

    //console.info(`${this._timescale} ${val} ${val/this._timescale} found ${lastTimestamp} ${lastTimestamp/this._timescale}`);

    return {"thisSegment": lastTimestamp, "nextSegment": nextSegment, "nearBoundary": nearBoundary};
  }
}

class TatorVideoBuffer {
  constructor(name)
  {
    this._name = name;
    this.use_codec_buffer = true;

    // Create MP4 unpacking elements
    //if (this._name == "Video Buffer 0")
    //{
    //  MP4Box.Log.setLogLevel(MP4Box.Log.info);
    //}
    this._mp4File = MP4Box.createFile();
    this._mp4File.onError = this._mp4OnError.bind(this);
    this._mp4File.onReady = this._mp4OnReady.bind(this);
    this._mp4File.onSamples = this._mp4Samples.bind(this);
    this._keyframes = new KeyHeap();
    this._pendingSeek = null;

    this._bufferedRegions = new TatorTimeRanges();

    this._videoDecoder = new VideoDecoder({
      output: this._frameReady.bind(this),
      error: this._frameError.bind(this)});

    // For  lack of a better guess put the default video cursor at 0
    this._current_cursor = 0.0;
    this._current_duration = 0.0;

    this._ready_frames=[];
  }

  _mp4OnError(e)
  {
    console.error(`${this._name} buffer reports ${e}`);
    if (this._loadedDataError)
    {
      this._loadedDataError();
    }
  }

  _getExtradata(avccBox) {
    try
    {
      var i;
      var size = 7;
      for (i = 0; i < avccBox.SPS.length; i++) {
        // nalu length is encoded as a uint16.
        size+= 2 + avccBox.SPS[i].length;
      }
      for (i = 0; i < avccBox.PPS.length; i++) {
        // nalu length is encoded as a uint16.
        size+= 2 + avccBox.PPS[i].length;
      }

      var writer = new Writer(size);

      writer.writeUint8(avccBox.configurationVersion);
      writer.writeUint8(avccBox.AVCProfileIndication);
      writer.writeUint8(avccBox.profile_compatibility);
      writer.writeUint8(avccBox.AVCLevelIndication);
      writer.writeUint8(avccBox.lengthSizeMinusOne + (63<<2));

      writer.writeUint8(avccBox.nb_SPS_nalus + (7<<5));
      for (i = 0; i < avccBox.SPS.length; i++) {
        writer.writeUint16(avccBox.SPS[i].length);
        writer.writeUint8Array(avccBox.SPS[i].nalu);
      }

      writer.writeUint8(avccBox.nb_PPS_nalus);
      for (i = 0; i < avccBox.PPS.length; i++) {
        writer.writeUint16(avccBox.PPS[i].length);
        writer.writeUint8Array(avccBox.PPS[i].nalu);
      }

      return writer.getData();
    }
    catch (e)
    {
      console.warn(e);
      return null;
    }
  }

  _mp4OnReady(info)
  {
    this._codecString = info.tracks[0].codec;
    this._trackWidth = Math.round(info.tracks[0].track_width);
    this._trackHeight = Math.round(info.tracks[0].track_height);
    this._timescale = info.tracks[0].timescale;
    this._keyframes._timescale = this._timescale;
    this._playing = false;
    this._lastSeek = 0;

    // The canvas is used to render seek frames so we don't use up 
    // slots in the real-time memory of the VideoDecoder object, from the 
    // context we can generate ImageBitmap which should render fast enough
    // for seek or scrub conops.
    this._canvas = new OffscreenCanvas(this._trackWidth, this._trackHeight);
    //this._canvas = new OffscreenCanvas(320, 144);
    this._canvasCtx = this._canvas.getContext("2d", {desynchronized:true});

    let description = this._getExtradata(this._mp4File.moov.traks[0].mdia.minf.stbl.stsd.entries[0].avcC);

    if (description)
    {
      this._codecConfig = {
        codec: this._codecString,
        codedWidth: Number(this._trackWidth),
        codedHeight: Number(this._trackHeight),
        description: description};
    }
    else
    {
      // Resolve Issue parsing MIME string from AV1, digit isn't 0 padded, but should be.
      this._codecString = this._codecString.replace('.0M', '.00M');
      this._codecString = this._codecString.replace('.1M', '.01M');
      this._codecString = this._codecString.replace('.2M', '.02M');
      this._codecString = this._codecString.replace('.3M', '.03M');
      this._codecString = this._codecString.replace('.4M', '.04M');
      this._codecString = this._codecString.replace('.5M', '.05M');
      this._codecString = this._codecString.replace('.6M', '.06M');
      this._codecString = this._codecString.replace('.7M', '.07M');
      this._codecString = this._codecString.replace('.8M', '.08M');
      this._codecString = this._codecString.replace('.9M', '.09M');

      // Configure codec
      this._codecConfig = {
        codec: this._codecString,
        codedWidth: Number(this._trackWidth),
        codedHeight: Number(this._trackHeight)};
    }
    console.info(JSON.stringify(info.tracks[0]));
    console.info(`${this._name} is configuring decoder = ${JSON.stringify(this._codecConfig)}`);
    this._videoDecoder.configure(this._codecConfig);
    console.info(`${this._name} decoder reports ${this._videoDecoder.state}`);

    // Configure segment callback
    this._mp4File.setExtractionOptions(info.tracks[0].id);
    this._mp4File.start();
    console.info(JSON.stringify(info));

    postMessage({"type": "ready",
                 "data": info});
  }

  _mp4Samples(track_id, ref, samples)
  {
    let muted = true;

    let min_cts = Number.MAX_VALUE;
    let max_cts = Number.MIN_VALUE;
    // Samples can be out of CTS order, when calculating frame diff
    // take that into consideration
    if (this._frame_delta == undefined)
    {
      if (samples.length > 2)
      {
        let times = [];
        for (let idx=0; idx < Math.min(10,samples.length); idx++)
        {
          times.push(samples[idx].dts); // NOT CTS fix bug with frames more than 10 out of order
        }
        times.sort((a,b)=>a-b);
        this._frame_delta = times[1]-times[0];
        postMessage({"type": "frameDelta",
                     "frameDelta": this._frame_delta});
      }
    }

    // Sort by DTS / Find nearest keyframe cts in sample list
    // These can be out of order when random access occurs
    samples.sort((a,b) => {return a.dts-b.dts});
    let keyframe_info = this._keyframes.closest_keyframe(this._current_cursor*this._timescale);
    let nearest_keyframe = keyframe_info.thisSegment;

    let new_samples = [];
    // Remove duplicates
    for (let d_idx = 0; d_idx < samples.length; d_idx++)
    {
      let n_idx = d_idx + 1;
      if (n_idx == samples.length)
      {
        new_samples.push(samples[d_idx]);
      }
      else
      {
        if (samples[d_idx].cts != samples[n_idx].cts)
        {
          new_samples.push(samples[d_idx]);
        }
        else
        {
          console.info(`Avoiding dupe ${samples[d_idx]}`);
        }
      }
    }

    if (samples.length != new_samples.length)
    {
      console.info(`${this._name}: Removed ${samples.length-new_samples.length} duplicates`);
    }
    samples = new_samples;

    let start_idx = 0;
    for (start_idx; start_idx < samples.length-1; start_idx++)
    {
      if (samples[start_idx].cts >= nearest_keyframe)
        break;
    }
    if (this._name == "Video Buffer 0")
    {
      console.info(`${this._name}: start_idx=${start_idx} ${samples[start_idx].cts} KF=${nearest_keyframe}`);
      let dts_string="";
      for (let p_idx = 0; p_idx < samples.length; p_idx++)
      {
        dts_string += `${samples[p_idx].dts}, `; 
      }
      console.info(dts_string);
    }
    const cursor_in_ctx = this._current_cursor * this._timescale;
    if (this._frame_delta != undefined)
    {
      let sample_delta = Math.abs(cursor_in_ctx-samples[start_idx].cts) / this._frame_delta;
      if (sample_delta <= 25)
      {
        muted = false;
      }
    }

    //console.info(`${performance.now()}: Calling mp4 samples, count=${samples.length} sample_start=${samples[0].cts} delta=${this._frame_delta} muted=${muted} cursor_ctx=${cursor_in_ctx}`);
    if (muted == false || this._playing == true)
    {
      this._seek_in_progress=true;
      let finished=false;      
      let idx = start_idx;
      this._frame_count = 0;
      this._ready_frames=[];
      this._transfers=[];
      for (idx = start_idx; idx < samples.length; idx++)
      {
        if (this._name == "Video Buffer 0")
        {
          console.info(`GOT ${this._current_cursor} = ${samples[idx].cts/this._timescale}`);
        }
        this._bufferedRegions.push(samples[idx].cts, samples[idx].cts+this._frame_delta);
        const chunk = new EncodedVideoChunk({
          type: (samples[idx].is_sync ? 'key' : 'delta'),
          timestamp: samples[idx].cts,
          data: samples[idx].data
        });
        try
        {
        this._videoDecoder.decode(chunk);
        }
        catch(e)
        {
          console.warn(`${e}`);
        }

        if (samples[idx].cts < min_cts)
        {
          min_cts = samples[idx].cts;
        }
        if (samples[idx].cts > max_cts)
        {
          max_cts = samples[idx].cts;
        }
        if (samples[idx].is_sync)
        {
          this._keyframes.push(samples[idx].cts);
          if (idx > start_idx && this._playing == false)
          {
            break; // If we get to the next key frame we decoded enough.
          }
        }
      }

      // In seek cases wait for the whole GOP to decode.
      if (this._playing == false)
      {
        console.info("Forcing a flush to get all frames from this GOP");
        this._videoDecoder.flush()
        .then(()=>{
          console.info("Completed GOP");
        })
        .catch((e)=>{
          console.warn(e)
        });
      }

      // Handle all samples for processing keyframes and what not at the end of decoding
      for (; idx < samples.length; idx++)
      {
        if (this._name == "Video Buffer 0")
        {
          console.info(`POST-GAME GOT ${this._current_cursor} = ${samples[idx].cts/this._timescale}`);
        }
        this._bufferedRegions.push(samples[idx].cts, samples[idx].cts+this._frame_delta);
        if (samples[idx].cts < min_cts)
        {
          min_cts = samples[idx].cts;
        }
        if (samples[idx].cts > max_cts)
        {
          max_cts = samples[idx].cts;
        }
        if (samples[idx].is_sync)
        {
          this._keyframes.push(samples[idx].cts);
        }
      }
      //console.info(`Asking to decode ${idx} frames from ${samples.length} START=${samples[0].cts}`);
    }
    else
    {
      
      // Push any undiscovered keyframes
      for (let idx = samples.length-1; idx >= 0; idx--)
      {
        if (this._name == "Video Buffer 0")
        {
          console.info(`MUTED GOT = ${samples[idx].cts}`);
        }
        this._bufferedRegions.push(samples[idx].cts, samples[idx].cts+this._frame_delta);
        if (samples[idx].cts < min_cts)
        {
          min_cts = samples[idx].cts;
        }
        if (samples[idx].cts > max_cts)
        {
          max_cts = samples[idx].cts;
        }
        if (samples[idx].is_sync)
        {
          if (this._keyframes.push(samples[idx].cts))
          {
            break;
          }
        }
      }
    }
    this._bufferedRegions.print(`${this._name} CTS ${this._timescale}`);

    if (max_cts >= min_cts)
    {
      // Update the manager on what is buffered
      postMessage({'type': "buffered",
                   'ranges': this._bufferedRegions._buffer}); 
    }
    console.info(`${this._name}: ${this._current_cursor} ${this._current_cursor*this._timescale} ${muted}: Finished mp4 samples, count=${samples.length}`);
    if (this._pendingSeek > 0)
    {
      const seek_timestamp = this._pendingSeek*this._timescale;
      for (let idx = 0; idx < this._bufferedRegions.length; idx++)
      {
        console.info(`${this._name}: Pending Seek to ${seek_timestamp} ${this._bufferedRegions.start(idx)} to ${this._bufferedRegions.end(idx)}`);
        if (seek_timestamp > this._bufferedRegions.start(idx) && seek_timestamp <= this._bufferedRegions.end(idx))
        {
          const seek_value = this._pendingSeek;
          this._pendingSeek = null;
          this._setCurrentTime(seek_value, false);
        }
      }
    }
  }

  pause()
  {
    this._playing = false;
    this._mp4File.stop();
  }

  play()
  {
    this._pendingSeek = null;
    //console.info(`PLAYING VIDEO ${this._current_cursor}`);
    this._videoDecoder.reset();
    this._videoDecoder.configure(this._codecConfig);
    let keyframe_info = this._keyframes.closest_keyframe(this._current_cursor*this._timescale);
    let nearest_keyframe = keyframe_info.thisSegment;
    this._playing = true;
    this._mp4File.stop();
    //console.info(`${performance.now()}: COMMANDING MP4 SEEK ${video_time} ${nearest_keyframe/this._timescale}`);
    this._mp4File.seek(nearest_keyframe/this._timescale);
    this._mp4File.start();
    
  }


  _frameReady(frame)
  {
    //console.info(`${this._name}@${this._current_cursor}: Frame Ready = ${frame.timestamp/this._timescale}`);
    if (this._playing == true)
    {      
      const cursor_in_ctx = this._current_cursor*this._timescale;
      if (frame.timestamp < cursor_in_ctx)
      {
        frame.close();
        return;
      }
      this._current_cursor = frame.timestamp / this._timescale;
      if (this._playing == true)
      {
        //console.info(`${performance.now()}: Sending ${this._ready_frames.length}`);
        postMessage({"type": "frame",  
                    "data": frame,
                    "cursor": this._current_cursor},
                    [frame]
                    ); // transfer frame copy to primary UI thread
        this._ready_frames=[];
        this._transfers=[];
      }
    }
    else
    {
      const cursor_in_ctx = this._current_cursor*this._timescale;
      const timestamp = frame.timestamp;
      //console.info(`${performance.now()}: FRAME ${frame.timestamp/this._timescale}`);
      if (cursor_in_ctx >= timestamp && cursor_in_ctx < (timestamp + this._frame_delta))
      {
        // Make an ImageBitmap from the frame and release the memory
        this._canvasCtx.drawImage(frame,0,0);
        let image = this._canvas.transferToImageBitmap(); //GPU copy of frame
        console.info(`${this._name}@${this._current_cursor}: Publishing @ ${frame.timestamp/this._timescale}-${(frame.timestamp+this._frame_delta)/this._timescale}`);
        frame.close();
        postMessage({"type": "image",
                    "data": image,
                    "timestamp": timestamp,
                    "seconds": timestamp/this._timescale,
                    "fastMode": this._fastMode},
                    image);
      }
      else
      {
        //console.info(`${this._name}@${this._current_cursor}: Did not care about frame @ ${frame.timestamp/this._timescale}-${(frame.timestamp+this._frame_delta)/this._timescale}`);
        frame.close(); // don't care about the frame
      }
    }
  }

  _frameError(error)
  {
    console.warn(`${this._name} DECODE ERROR ${error}`);
    postMessage({"type": "error",
                 "message": error});
  }

  // Set the current video time
  //
  // Timing considerations:
  // - This will either grab from pre-decoded frames and run very quickly or
  //   jump to the nearest preceding keyframe and decode new frames (slightly slower)
  _setCurrentTime(video_time, informational)
  {
    this._current_cursor = video_time;
    console.info(`${this._name} now @ ${this._current_cursor}: ${informational}`);
    if (informational)
    {
      return;
    }
    if ((performance.now() - this._lastSeek) < 100)
    {
      this._fastMode = true;
    }
    else
    {
      this._fastMode = false;
    }
    const seek_timestamp = video_time*this._timescale;
    for (let idx = 0; idx < this._bufferedRegions.length; idx++)
    {
      if (seek_timestamp > this._bufferedRegions.start(idx) && seek_timestamp <= this._bufferedRegions.end(idx))
      {
        console.info(`Found it, going in ${video_time} ${seek_timestamp} ${this._bufferedRegions.start(idx)} ${this._bufferedRegions.end(idx)}!`);
        this._lastSeek = performance.now();

        let keyframe_info = this._keyframes.closest_keyframe(seek_timestamp);
        // If the codec closed on us, opportunistically reopen it
        if (this._videoDecoder.state == 'closed')
        {
          this._videoDecoder = new VideoDecoder({
            output: this._frameReady.bind(this),
            error: this._frameError.bind(this)});
          
        }
        this._videoDecoder.reset();
        this._videoDecoder.configure(this._codecConfig);
        let nearest_keyframe = keyframe_info.thisSegment;
        this._mp4File.stop();
        console.info(`${this._name}: COMMANDING MP4 SEEK ${video_time} ${nearest_keyframe/this._timescale}`);
        this._mp4File.seek(nearest_keyframe/this._timescale);
        this._mp4File.start();
        return;
      }
    }

    // Wait for the data async to come in
    this._pendingSeek = video_time;
  }

  // Append data to the mp4 file
  // - This data should either be sequentially added or added on a segment boundary
  // - Prior to adding video segments the mp4 header must be supplied first.
  appendBuffer(data)
  {
    console.info(`${this._name}: Appending Data ${data.fileStart} ${data.byteLength} ${data.frameStart}`);
    
    if (this._pendingSeek && data.frameStart != undefined)
    {
      this._mp4File.lastBoxStartPosition = data.fileStart;
      this._mp4File.nextParsePosition = data.fileStart;
      this._mp4File.dtsBias = Math.round(data.frameStart * this._timescale);
      console.info(`Setting dts bias to FS=${data.fileStart} BIAS=${this._mp4File.dtsBias} ${this._mp4File.dtsBias/this._timescale}`);
      this._mp4File.stop();
      this._mp4File.seek(0); // Always go to 0 for this
      this._mp4File.start();
      this._mp4File.appendBuffer(data);
    }
    else
    {
      this._mp4File.ctsBias = null;
      this._mp4File.appendBuffer(data);
    }
  }

  truncate()
  {
    let trak = this._mp4File.getTrackById(1);
    const cursor_cts = this._current_cursor * this._timescale;
    const keyframe_info = this._keyframes.closest_keyframe(cursor_cts);
    const keyframe_cts = keyframe_info.thisSegment;
    const keyframe_next_cts = keyframe_info.nextSegment;
    let release_list=[];
    let seconds_list=[];
    this._bufferedRegions.clear();
    const oldSize = this._mp4File.samplesDataSize;
    for (let idx = 0; idx < trak.samples.length; idx++)
    {
      let sample_cts = trak.samples[idx].cts;
      const sample_info = this._keyframes.closest_keyframe(sample_cts);
      // If we are before this keyframe
      if (sample_cts < keyframe_cts)
      {
        release_list.push(idx);
        seconds_list.push(sample_cts/this._timescale);
      }
      // If we are beyond the next keyframe
      else if (keyframe_next_cts != null && sample_cts > keyframe_next_cts)
      {
        release_list.push(idx);
        seconds_list.push(sample_cts/this._timescale);
      }
      // If the sample is a sync frame beyond our targeted segment
      else if (sample_cts > keyframe_cts && sample_cts == sample_info.thisSegment)
      {
        release_list.push(idx);
        seconds_list.push(sample_cts/this._timescale);
      }
      else
      {
        // We found a keeper (in this GOP)
        this._bufferedRegions.push(sample_cts, sample_cts+this._frame_delta);
      }
    }
    console.info(`${this._name}: OLD_SIZE=${oldSize} NEW_SIZE=${this._mp4File.samplesDataSize}`);
    this._bufferedRegions.print(`${this._name}: Post Truncate`)
    postMessage({'type': "buffered",
                 'ranges': this._bufferedRegions._buffer});
  }
}

///////////////////////////////////////
/// Web Worker Interface
///////////////////////////////////////
var ref = null;
onmessage = function(e)
{
  const msg = e.data;
  if (msg.type == "init")
  {
    const random = Math.random();
    ref = new TatorVideoBuffer(msg.name);
  }
  else if (msg.type == "appendBuffer")
  {
    msg.data.fileStart = msg.fileStart;
    msg.data.frameStart = msg.frameStart;
    ref.appendBuffer(msg.data);
  }
  else if (msg.type == "currentTime")
  {
    ref._setCurrentTime(msg.currentTime, msg.informational);
  }
  else if (msg.type == "pause")
  {
    ref.pause();
  }
  else if (msg.type == "play")
  {
    ref.play();
  }
  else if (msg.type == "truncate")
  {
    ref.truncate();
  }
}