
import * as MP4Box from "./mp4box.all.js";
import { TatorTimeRanges } from "./video-codec.js";

const MAX_DECODED_FRAMES_PER_DECODER = 8;

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

    return {"thisSegment": lastTimestamp, "nextSegment": nextSegment, "nearBoundary": nearBoundary};
  }
}

class TatorVideoBuffer {
  constructor(name)
  {
    this._name = name;
    this.use_codec_buffer = true;

    // Create MP4 unpacking elements
    //if (this._name == "Video Buffer 720")
    //{
      //MP4Box.Log.setLogLevel(MP4Box.Log.info);
    //}

    this._initDataMap = new Map();
    this._mp4FileMap = new Map();
    this._keyframeMap = new Map();
    this._encoderConfig = new Map();
    this._timescaleMap = new Map();
    this._frameDeltaMap = new Map();
    this._frameInfoMap = new Map();
    this._pendingSeek = null;
    this._pendingEncodedFrames = [];
    this._framesOut = 0;

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

  _mp4OnReady(info, timestampOffset)
  {
    this._codecString = info.tracks[0].codec;
    this._trackWidth = Math.round(info.tracks[0].track_width);
    this._trackHeight = Math.round(info.tracks[0].track_height);
    this._timescaleMap.set(timestampOffset,info.tracks[0].timescale);
    this._playing = false;
    this._lastSeek = 0;

    // The canvas is used to render seek frames so we don't use up 
    // slots in the real-time memory of the VideoDecoder object, from the 
    // context we can generate ImageBitmap which should render fast enough
    // for seek or scrub conops.
    this._canvas = new OffscreenCanvas(this._trackWidth, this._trackHeight);
    //this._canvas = new OffscreenCanvas(320, 144);
    this._canvasCtx = this._canvas.getContext("2d", {desynchronized:true});

    let description = this._getExtradata(this._mp4FileMap.get(timestampOffset).moov.traks[0].mdia.minf.stbl.stsd.entries[0].avcC);

    if (description)
    {
      this._encoderConfig.set(timestampOffset, {
        codec: this._codecString,
        codedWidth: Number(this._trackWidth),
        codedHeight: Number(this._trackHeight),
        description: description});
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
      info.tracks[0].codec = this._codecString;

      // Configure codec
      this._encoderConfig.set(timestampOffset,{
        codec: this._codecString,
        codedWidth: Number(this._trackWidth),
        codedHeight: Number(this._trackHeight)});
    }
    console.info(JSON.stringify(info.tracks[0]));
    console.info(`${this._name} is configuring decoder = ${JSON.stringify(this._encoderConfig.get(timestampOffset))}`);
    try
    {
      this._videoDecoder.configure(this._encoderConfig.get(timestampOffset));
    }
    catch(e)
    {
      // Only do this on a fail (stale decoder)
      this._videoDecoder = new VideoDecoder({
            output: this._frameReady.bind(this),
            error: this._frameError.bind(this)});
      this._videoDecoder.configure(this._encoderConfig.get(timestampOffset));
    }
    console.info(`${this._name} decoder reports ${this._videoDecoder.state}`);

    console.info(JSON.stringify(info));

    postMessage({"type": "ready",
                 "data": info,
                 "timestampOffset": timestampOffset});
  }

  _mp4Samples(track_id, timestampOffset, samples)
  {
    let muted = true;
    //console.info(`${this._name} GOT=${samples.length} ${timestampOffset} ${this._framesOut}`);
    let min_cts = Number.MAX_VALUE;
    let max_cts = Number.MIN_VALUE;
    const relative_cursor = this._current_cursor - timestampOffset;
    // Samples can be out of CTS order, when calculating frame diff
    // take that into consideration
    if (this._frameDeltaMap.has(timestampOffset) == false)
    {
      if (samples.length > 2)
      {
        let times = [];
        for (let idx=0; idx < Math.min(10,samples.length); idx++)
        {
          times.push(samples[idx].dts); // NOT CTS fix bug with frames more than 10 out of order
        }
        times.sort((a,b)=>a-b);
        this._frameDeltaMap.set(timestampOffset, times[1]-times[0]);
        postMessage({"type": "frameDelta",
                     "frameDelta": times[1]-times[0],
                     "timestampOffset": timestampOffset});
      }
    }

    const nextTimestampOffset = this.nextTimestampOffset(timestampOffset);

    // Sort by DTS / Find nearest keyframe cts in sample list
    // These can be out of order when random access occurs
    samples.sort((a,b) => {return a.dts-b.dts});
    let keyframe_info = this._keyframeMap.get(timestampOffset).closest_keyframe(relative_cursor*this._timescaleMap.get(timestampOffset));
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
          //console.info(`Avoiding dupe ${samples[d_idx].cts}`);
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
    const cursor_in_ctx = relative_cursor * this._timescaleMap.get(timestampOffset);
    if (this._frameDeltaMap.has(timestampOffset))
    {
      let sample_delta = Math.abs(cursor_in_ctx-samples[start_idx].cts) / this._frameDeltaMap.get(timestampOffset);
      if (sample_delta <= 25)
      {
        muted = false;
      }
    }

    const timestampOffsetInCtx=Math.floor(timestampOffset*this._timescaleMap.get(timestampOffset));
    //console.info(`${this._name}: TIMESTAMP ${timestampOffset} is ${timestampOffsetInCtx}`);
    //console.info(`${performance.now()}: Calling mp4 samples, count=${samples.length} muted=${muted} cursor_ctx=${cursor_in_ctx}`);
    if (muted == false || this._playing == true || this.keyframeOnly == true)
    {
      this._seek_in_progress=true;
      let finished=false;      
      let idx = start_idx;
      this._frame_count = 0;
      this._ready_frames=[];
      this._transfers=[];
      for (idx = start_idx; idx < samples.length; idx++)
      {
        // If we spill into the next timestamp offset bomb out.
        const start_frame_time = timestampOffset+samples[idx].cts/this._timescaleMap.get(timestampOffset);
        if (this._switchTape == null &&
            nextTimestampOffset != null && 
            start_frame_time >= nextTimestampOffset)
        {
          console.info(`NOTICE: ${idx}: ${start_frame_time} > ${nextTimestampOffset} bombing out.`);
          this._oldTape = timestampOffset;
          this._switchTape = nextTimestampOffset;
          if (this._playing == true)
          {
            break;
          }
        }

        if (this.keyframeOnly == true && samples[idx].is_sync == false)
        {
          continue; // skip over non keyframes
        }

        //console.info(`${this._name}: SENDING ${timestampOffsetInCtx} + ${samples[idx].cts} ${this._timescaleMap.get(timestampOffset)}`);
        this._bufferedRegions.push(start_frame_time, timestampOffset+(samples[idx].cts+this._frameDeltaMap.get(timestampOffset))/this._timescaleMap.get(timestampOffset));
        const chunk = new EncodedVideoChunk({
          type: (samples[idx].is_sync ? 'key' : 'delta'),
          timestamp: timestampOffsetInCtx+samples[idx].cts,
          data: samples[idx].data
        });
        try
        {
          const sample_cts = samples[idx].cts;
          let push_it = () => {
            this._framesOut++;
            this._frameInfoMap.set(Math.floor(timestampOffsetInCtx+sample_cts),
                                  timestampOffset);
            this._videoDecoder.decode(chunk);
          };
          if (this._framesOut < MAX_DECODED_FRAMES_PER_DECODER && this._pendingEncodedFrames.length == 0)
          {
            push_it();
          }
          else
          {
            //console.info(`Deferring ${sample_cts}`);
            //console.info(`${performance.now()} ${this._name}: Decode Governor engaged FO=${this._framesOut}.`)
            this._pendingEncodedFrames.push(push_it);
          }
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
          this._keyframeMap.get(timestampOffset).push(samples[idx].cts);
          //console.info(`${idx} > ${start_idx}, ${this._playing==false}, ${this.keyframeOnly}`);
          if (this._playing == false && (idx > start_idx || this.keyframeOnly == true))
          {
            //console.info("Bombing out!");
            if (this.keyframeOnly == true)
            {
              this._mp4FileMap.get(timestampOffset).stop(); // Stop event handler
            }
            break; // If we get to the next key frame we decoded enough.
          }
        }
      }

      // In seek cases wait for the whole GOP to decode.
      if (this._playing == false)
      {
        //console.info("Forcing a flush to get all frames from this GOP");
        this._videoDecoder.flush()
        .then(()=>{
          //console.info("Completed GOP");
        })
        .catch((e)=>{
          //console.warn(e)
        });
      }

      // Handle all samples for processing keyframes and what not at the end of decoding
      for (idx = start_idx; idx < samples.length; idx++)
      {
        this._bufferedRegions.push(timestampOffset+samples[idx].cts/this._timescaleMap.get(timestampOffset), 
                                  timestampOffset+(samples[idx].cts+this._frameDeltaMap.get(timestampOffset))/this._timescaleMap.get(timestampOffset));
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
          this._keyframeMap.get(timestampOffset).push(samples[idx].cts);
        }
      }
      //console.info(`Asking to decode ${idx} frames from ${samples.length} START=${samples[0].cts}`);
    }
    else
    {
      const timestampOffsetInCtx=timestampOffset*this._timescaleMap.get(timestampOffset);
      // Push any undiscovered keyframes
      for (let idx = samples.length-1; idx >= 0; idx--)
      {
        this._bufferedRegions.push(timestampOffset+samples[idx].cts/this._timescaleMap.get(timestampOffset), timestampOffset+(samples[idx].cts+this._frameDeltaMap.get(timestampOffset))/this._timescaleMap.get(timestampOffset));
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
          if (this._keyframeMap.get(timestampOffset).push(samples[idx].cts))
          {
            break;
          }
        }
      }
    }
    //this._bufferedRegions.print(`${this._name} WORKER ${min_cts/this._timescaleMap.get(timestampOffset)} to ${max_cts/this._timescaleMap.get(timestampOffset)}`);

    if (max_cts >= min_cts)
    {
      // Update the manager on what is buffered
      postMessage({'type': "buffered",
                   'ranges': this._bufferedRegions._buffer,
                   'timestampOffset': timestampOffset}); 
    }
    //console.info(`${this._name}: ${this._current_cursor} ${this._current_cursor*this._timescale} ${muted}: Finished mp4 samples, count=${samples.length}`);
    if (this._pendingSeek > 0)
    {
      for (let idx = 0; idx < this._bufferedRegions.length; idx++)
      {
        //console.info(`${this._name}: Pending Seek to ${this._pendingSeek} ${this._bufferedRegions.start(idx)} to ${this._bufferedRegions.end(idx)}`);
        if (this._pendingSeek > this._bufferedRegions.start(idx) && this._pendingSeek <= this._bufferedRegions.end(idx))
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
    this._pendingEncodedFrames = [];
    this._framesOut = 0;
    this._playing = false;
    this._frameInfoMap = new Map(); // clear on pause
    this.activeMp4File.stop();
  }

  play()
  {
    this._pendingSeek = null;
    //console.info(`PLAYING VIDEO ${this._current_cursor}`);
    if (this._videoDecoder.state == 'closed')
    {
      this._videoDecoder = new VideoDecoder({
        output: this._frameReady.bind(this),
        error: this._frameError.bind(this)});
    }
    this._videoDecoder.reset();
    this._videoDecoder.configure(this.activeCodecConfig);
    const timestampOffset = this.currentTimestampOffset;
    const relative_cursor = this._current_cursor - timestampOffset;
    let keyframe_info = this.activeKeyframeFile.closest_keyframe(relative_cursor*this.activeTimescale);
    let nearest_keyframe = keyframe_info.thisSegment;
    this._pendingEncodedFrames = [];
    this._framesOut = 0;
    this._playing = true;
    this.activeMp4File.stop();
    //console.info(`${performance.now()}: COMMANDING MP4 SEEK ${video_time} ${nearest_keyframe/this._timescale}`);
    this.activeMp4File.seek(nearest_keyframe/this.activeTimescale);
    this._frameInfoMap = new Map();
    this.activeMp4File.start();
    
  }

  // Find the nearest object without going over
  _barkerSearch(mapObject, key)
  {
    let keys = [...mapObject.keys()].sort((a,b)=>{return a-b;});
    let idx = 0;
    for (idx = 0; idx < keys.length; idx++)
    {
      if (keys[idx] > key)
      {
        break;
      }
    }

    let found_idx = Math.max(0, idx-1);

    return {obj: mapObject.get(keys[found_idx]),
            key: keys[found_idx]};
  }

  get currentTimestampOffset()
  {
    return this._barkerSearch(this._timescaleMap, this._current_cursor).key;
  }
  get activeCodecConfig()
  {
    return this._barkerSearch(this._encoderConfig, this._current_cursor).obj;
  }
  get activeMp4File()
  {
    return this._barkerSearch(this._mp4FileMap, this._current_cursor).obj;
  }

  get activeKeyframeFile()
  {
    return this._barkerSearch(this._keyframeMap, this._current_cursor).obj;
  }

  get activeTimescale()
  {
    return this._barkerSearch(this._timescaleMap, this._current_cursor).obj;
  }

  nextTimestampOffset(thisOffset)
  {
    let keys = [...this._timescaleMap.keys()].sort((a,b)=>{a-b});
    for (let idx = 0; idx < keys.length; idx++)
    {
      if (keys[idx] > thisOffset)
      {
        return keys[idx];
      }
    }
    return null;
  }

  _frameReturn()
  {
    this._framesOut--;
    let pending = this._pendingEncodedFrames.shift();
    if (this._playing && pending)
    {
      pending();
    }
  }

  _frameReady(frame)
  {
    if (this._frameInfoMap.has(frame.timestamp) == false)
    {
      // Frames came in past the reset
      //console.warn(`IGNORING unknown frame ${frame.timestamp}`);
      frame.close();
      this._frameReturn();
      return;
    }
    const timestampOffset = this._frameInfoMap.get(frame.timestamp);
    this._frameInfoMap.delete(frame.timestamp);
    //console.info(`INFO MAP = ${this._frameInfoMap.size}`);
    const timeScale = this._timescaleMap.get(timestampOffset);
    const frameDelta = this._frameDeltaMap.get(timestampOffset);
    //console.info(`${this._name} TS=${timestampOffset} FD=${frameDelta}`);
    if (this._playing == true)
    {      
      const cursor_in_ctx = (this._current_cursor)*timeScale;
      if (frame.timestamp + frameDelta < cursor_in_ctx)
      {
        frame.close();
        this._frameReturn();
        return;
      }
      this._current_cursor = (frame.timestamp / timeScale);
      //console.info(`${performance.now()}: Sending ${this._ready_frames.length}`);
      postMessage({"type": "frame",  
                  "data": frame,
                  "cursor": this._current_cursor,
                  "timescale": timeScale,
                  "timestampOffset": timestampOffset},
                  [frame]
                  ); // transfer frame copy to primary UI thread
      if (this._switchTape)
      {
        this._mp4FileMap.get(this._oldTape).stop();
        this._videoDecoder.flush().then(() =>
        {
          console.info("RESETTING DECODER TO NEXT TAPE");
          this._videoDecoder.reset();
          this._videoDecoder.configure(this._encoderConfig.get(this._switchTape));
          this._mp4FileMap.get(this._switchTape).seek(0);
          this._frameInfoMap = new Map();
          this._mp4FileMap.get(this._switchTape).start();
          this._switchTape = null;
        });
      }
    }
    else
    {
      const cursor_in_ctx = (this._current_cursor)*timeScale;
      const timestamp = frame.timestamp;
      // Make an ImageBitmap from the frame and release the memory
      // Send all decoded frames to draw UI
      this._canvasCtx.drawImage(frame,0,0);
      let image = this._canvas.transferToImageBitmap(); //GPU copy of frame
      //console.info(`${this._name}@${this._current_cursor}: Publishing @ ${frame.timestamp/timeScale}-${(frame.timestamp+frameDelta)/timeScale} KFO=${this.keyframeOnly}`);
      frame.close();
      this._framesOut--;
      postMessage({"type": "image",
                  "data": image,
                  "timestamp": timestamp,
                  "timescale": timeScale,
                  "frameDelta": frameDelta,
                  "seconds": timestamp/timeScale},
                  image);
    }
  }

  _frameError(error)
  {
    console.warn(`${this._name} DECODER ERROR ${error}`);
    postMessage({"type": "error",
                 "message": error});
    if (error.message.indexOf("Codec reclaimed due to inactivity.") > 0)
    {
      console.info(`${this._name} Resetting decoder`);
      this._videoDecoder = new VideoDecoder({
        output: this._frameReady.bind(this),
        error: this._frameError.bind(this)});
    }
  }

  // Set the current video time
  //
  // Timing considerations:
  // - This will either grab from pre-decoded frames and run very quickly or
  //   jump to the nearest preceding keyframe and decode new frames (slightly slower)
  _setCurrentTime(video_time, informational, raw_video_time)
  {
    this._current_cursor = video_time;
    //console.info(`${this._name} now @ ${this._current_cursor}: ${informational}`);
    if (informational)
    {
      return;
    }
    let timescale = null;
    if (raw_video_time)
    {
      timescale = this._barkerSearch(this._timescaleMap,raw_video_time).obj;
    }
    else
    {
      timescale = this._barkerSearch(this._timescaleMap,video_time).obj;
    }
    for (let idx = 0; idx < this._bufferedRegions.length; idx++)
    {
      if (video_time >= this._bufferedRegions.start(idx) && video_time <= this._bufferedRegions.end(idx))
      {
        //console.info(`Found it, going in ${video_time} ${seek_timestamp} ${this._bufferedRegions.start(idx)} ${this._bufferedRegions.end(idx)}!`);
        this._lastSeek = performance.now();
        let search = null;
        if (raw_video_time)
        {
          search = this._barkerSearch(this._keyframeMap, raw_video_time);
        }
        else
        {
          search = this._barkerSearch(this._keyframeMap, video_time);
        }
        let keyframe_info = search.obj.closest_keyframe((video_time-search.key)*timescale);
        let mp4File = this._barkerSearch(this._mp4FileMap, search.key).obj;
        // If the codec closed on us, opportunistically reopen it
        if (this._videoDecoder.state == 'closed')
        {
          this._videoDecoder = new VideoDecoder({
            output: this._frameReady.bind(this),
            error: this._frameError.bind(this)});
          
        }
        this._videoDecoder.reset();
        this._videoDecoder.configure(this.activeCodecConfig);
        let nearest_keyframe = keyframe_info.thisSegment;
        mp4File.stop();
        //console.info(`${this._name}: COMMANDING MP4 SEEK ${search.key} ${video_time} ${nearest_keyframe/timescale}`);
        mp4File.seek(nearest_keyframe/timescale);
        mp4File.start();
        return;
      }
    }

    // Wait for the data async to come in
    this._pendingSeek = video_time;
  }

  // Append data to the mp4 file
  // - This data should either be sequentially added or added on a segment boundary
  // - Prior to adding video segments the mp4 header must be supplied first.
  appendBuffer(data, timestampOffset)
  {
    
    //console.info(`${this._name}: Appending Data ${data.fileStart} ${data.byteLength} ${data.frameStart}`);
    if (data.fileStart == 0)
    {
      this._initForOffset(timestampOffset, data);
    }

    let appendDataFunctor = (mp4File) => {
      if (data.frameStart != undefined && data.fileStart != mp4File.nextParsePosition)
      {
        const timescale=this._timescaleMap.get(timestampOffset);
        console.info(`Setting dts bias to SF=${data.frameStart} FS=${data.fileStart} (was ${mp4File.nextParsePosition}) BIAS=${mp4File.dtsBias} ${mp4File.dtsBias/timescale}`);
        mp4File.lastBoxStartPosition = data.fileStart;
        mp4File.nextParsePosition = data.fileStart;
        mp4File.dtsBias = Math.round(data.frameStart * timescale);
        mp4File.stop();
        mp4File.appendBuffer(data);
        mp4File.seek(0); // Always go to 0 for this
        mp4File.start();
      }
      else
      {
        mp4File.dtsBias = null;
        mp4File.appendBuffer(data);
      }
    }

    let thisFile = this._fileForOffset(timestampOffset);
    if (thisFile == null && this._initForOffset(timestampOffset) == null)
    {
      console.error("NULL File and NULL Config");
    }
    else if (thisFile == null)
    {
      this._setupFile(timestampOffset).then(() => {
        appendDataFunctor(this._fileForOffset(timestampOffset));
      });
    }
    else
    {
      appendDataFunctor(this._fileForOffset(timestampOffset));
    }
  }

  _setupFile(timestampOffset)
  {
    let mp4File = MP4Box.createFile();
    mp4File.onError = this._mp4OnError.bind(this);
    mp4File.onSamples = this._mp4Samples.bind(this);
    this._keyframeMap.set(timestampOffset, new KeyHeap());
    this._mp4FileMap.set(timestampOffset, mp4File);

    let p = new Promise((resolve) => {
      mp4File.onReady = (info) => {
        this._mp4OnReady(info, timestampOffset);
        mp4File.setExtractionOptions(info.tracks[0].id, timestampOffset, { nbSamples: 100 });
        mp4File.start();
        resolve();
      };
    });
    return p;
  }

  reset(limit)
  {
    //console.info(`RESETTING LIMIT=${limit}`);
    let all = [];

    let timestamps = [...this._mp4FileMap.keys()];
    for (let idx = 0; idx < timestamps.length; idx++)
    {
      const timestamp = timestamps[idx];
      if (timestamp >= limit)
      {
        //console.info(`LIMIT HIT ${timestamp} > ${limit}`);
        break;
      }
      all.push(new Promise((resolve) => 
      {
        this._setupFile(timestamp).then(() => 
        {
          let mp4File = this._fileForOffset(timestamp);
          mp4File.seek(0);
          mp4File.start();
          this._pendingSeek = this._current_cursor;
          resolve();
        });
      }));
      this.appendBuffer(this._initForOffset(timestamp), timestamp); // re-init buffer
    }
    
    // If it is a partial delete don't clear buffered knowledge.
    if (limit == undefined)
    {
      this._bufferedRegions = new TatorTimeRanges();
      postMessage({'type': "buffered",
                  'ranges': this._bufferedRegions._buffer});
    }
    //console.info(`Resetting ${all.length} subfiles.`);
    return Promise.all(all);
  }

  // Make a new container to do seek operations
  appendSeekBuffer(data, timestampOffset)
  {
    if (data.fileStart == 0)
    {
      this._initForOffset(timestampOffset, data);
    }
  
    let seekDecoder = new VideoDecoder({
      output: this._frameReady.bind(this),
      error: this._frameError.bind(this)});
    let tempFile = MP4Box.createFile();
    tempFile.onError = this._mp4OnError.bind(this);
    tempFile.onSamples = (track, user, samples) => {

      if (this._frameDeltaMap.has(timestampOffset) == false)
      {
        if (samples.length > 2)
        {
          let times = [];
          for (let idx=0; idx < Math.min(10,samples.length); idx++)
          {
            times.push(samples[idx].dts); // NOT CTS fix bug with frames more than 10 out of order
          }
          times.sort((a,b)=>a-b);
          const frame_delta = times[times.length-1]-times[times.length-2];
          this._frameDeltaMap.set(timestampOffset, frame_delta);
          //console.info(`${this._name}: Setting TS=${timestampOffset} FD=${frame_delta}`);
          postMessage({"type": "frameDelta",
                      "frameDelta": frame_delta,
                      "timestampOffset": timestampOffset});
        }
      }

      for (let idx = 0; idx < samples.length; idx++)
      {
        //console.info(`TEMP FILE GOT ${samples[idx].cts}`);
        const timestampOffsetCtx = timestampOffset * this._timescaleMap.get(timestampOffset);
        const chunk = new EncodedVideoChunk({
          type: (samples[idx].is_sync ? 'key' : 'delta'),
          timestamp: timestampOffsetCtx + samples[idx].cts,
          data: samples[idx].data
        });
        try
        {
          //console.info(`SEEK SUPPLYING ${timestampOffsetCtx + samples[idx].cts}`)
          this._frameInfoMap.set(Math.floor(timestampOffsetCtx + samples[idx].cts), timestampOffset);
          seekDecoder.decode(chunk);
        }
        catch(e)
        {
          //console.warn(`${e}`);
        }
      }
      seekDecoder.flush().then(
        ()=>{
          setTimeout(() => {seekDecoder.close();},500);
        });
    };

    tempFile.onReady = (info) => {
      this._mp4OnReady(info, timestampOffset);
      tempFile.setExtractionOptions(info.tracks[0].id, 'temp');
      seekDecoder.reset();
      seekDecoder.configure(this._encoderConfig.get(timestampOffset));
      tempFile.lastBoxStartPosition = data.fileStart;
      tempFile.nextParsePosition = data.fileStart;
      tempFile.dtsBias = Math.round(data.frameStart * this._timescaleMap.get(timestampOffset));
      console.info(`${this._name} TEMP Setting dts bias to FS=${data.fileStart} BIAS=${tempFile.dtsBias} ${tempFile.dtsBias/this._timescaleMap.get(timestampOffset)}`);
      tempFile.stop();
      tempFile.appendBuffer(data);
      tempFile.seek(0); // Always go to 0 for this
      tempFile.start();
      };

    // Only process the seek if we have been initialized
    let this_init = this._initForOffset(timestampOffset);
    if (this_init)
    {
      tempFile.appendBuffer(this_init);
    }
    
  }

  _fileForOffset(offset)
  {
    return this._mp4FileMap.get(offset);
  }

  // Supply or fetch init data for a given timestamp offset
  _initForOffset(timestampOffset, init_data)
  {
    if (init_data)
    {
      this._initDataMap.set(timestampOffset, init_data);
      return init_data;
    }
    else if (this._initDataMap.has(timestampOffset))
    {
      return this._initDataMap.get(timestampOffset);
    }
    else
    {
      return null;
    }
  }

  deleteUpTo(seconds)
  {
    let search = this._barkerSearch(this._keyframeMap, seconds);
    let mp4File = this._barkerSearch(this._mp4FileMap, search.key).obj;
    const keyframe_info = search.obj.closest_keyframe(seconds*this._timescaleMap.get(search.key));
    const delete_val = keyframe_info.thisSegment;
    let trak = mp4File.getTrackById(1);
    let idx = 0;
    let found_it = false;
    for (idx; idx < trak.samples.length; idx++)
    {
      if (trak.samples[idx].cts > delete_val)
      {
        found_it = true;
        break;
      }
    }
    if (found_it == false)
    {
      console.warning("Ignoring bad delete");
      return;
    }
    //console.info(`Requested delete up to ${delete_val} ${idx-1}`);

    // This resets temp files up to this point and the partial file as the logic
    // above
    mp4File.releaseUsedSamples(1, idx-1);
    this.reset(search.key).then(() => {
      this._bufferedRegions.remove(null, delete_val/this._timescaleMap.get(search.key));
      postMessage({'type': "buffered",
                  'ranges': this._bufferedRegions._buffer});
    });
    //this._bufferedRegions.print(`${this._name}: Post delete`);   
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
    if (msg.reset)
    {
      ref.reset().then(() => {
        ref.appendBuffer(msg.data, msg.timestampOffset);
      });
    }
    else
    {
      ref.appendBuffer(msg.data, msg.timestampOffset);
    }
  }
  else if (msg.type == "appendSeekBuffer")
  {
    msg.data.fileStart = msg.fileStart;
    msg.data.frameStart = msg.frameStart;
    ref.appendSeekBuffer(msg.data, msg.timestampOffset);
  }
  else if (msg.type == "currentTime")
  {
    ref._setCurrentTime(msg.currentTime, msg.informational, msg.videoTime);
  }
  else if (msg.type == "pause")
  {
    ref.pause();
  }
  else if (msg.type == "play")
  {
    ref.play();
  }
  else if (msg.type == "reset")
  {
    ref.reset().then(() => {
      postMessage({"type": "onReset"});
    });
  }
  else if (msg.type == "deleteUpTo")
  {
    ref.deleteUpTo(msg.seconds);
  }
  else if (msg.type == "keyframeOnly")
  {
    ref.keyframeOnly = msg.value;
  }
  else if (msg.type == "frameReturn")
  {
    ref._frameReturn();
  }
}
