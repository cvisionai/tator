
import guiFPS from "./video.js";

// Manages the interactions to a download worker for a concat video
// Companion class to VideoCanvas in video.js
export class ConcatDownloadManager
{
  // Construct a download manager object associated with a video player
  constructor(parent, media_objects, insertion_detail)
  {
    this._parent = parent;
    this._workerMap = new Map();
    this._mediaMap = new Map();
    this._startBiasMap = new Map();
    for (let idx = 0; idx < media_objects.length; idx++)
    {
      // @TODO sort media by res, take out extras, etc. 
      // Could handle math for different FPSes per video
      const timestampOffset = insertion_detail[idx].timestampOffset;
      const webWorkerName = `MEDIA_${media_objects[idx].id}_TS_${timestampOffset}`;
      let this_worker = new Worker(new URL("./vid_downloader.js", import.meta.url),
                                   {'name': webWorkerName});
      this._fps = media_objects[0].fps;

      // Dispatch the worker with the right timestamp offset
      this_worker.onmessage = (msg) => {
        this._onMessage(timestampOffset, msg);
      }

      this._workerMap.set(timestampOffset, 
                          this_worker);
      this._mediaMap.set(timestampOffset,
                         media_objects[idx]);
    }
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

  biasForTime(time)
  {
    let biasSum = 0.0;
    let keys = [...this._startBiasMap.keys()].sort((a,b)=>{return a-b;});
    for (let idx = 0; idx < keys.length && keys[idx] < time; idx++)
    {
      biasSum += this._startBiasMap.get(keys[idx]);
    }
    return biasSum;
  }

  // Forward a message to the underlying worker
  postMessage(msg)
  {
    if (msg.type == 'start')
    {
      let keys = [...this._workerMap.keys()].sort((a,b)=>{return a-b;});
      for (let idx = 0; idx < keys.length; idx++)
      {
        msg['media_files'] = this._mediaMap.get(keys[idx]).media_files.streaming;
        console.info(`Sending ${JSON.stringify(msg)} to ${keys[idx]}`);
        this._workerMap.get(keys[idx]).postMessage(msg);
      }
    }
    else if (msg.type == "seek")
    {
      let search = this._barkerSearch(this._workerMap, msg.time);
      let fps = this._mediaMap.get(search.key).fps;
      msg["time"] -= search.key; // subtract timestamp offset
      msg["frame"] -= Math.floor((fps * search.key));
      // This assumes all the videos are the same FPS.
      search.obj.postMessage(msg);
    }
    else if (msg.type == "onDemandInit")
    {
      const time = msg.frame/this._fps;
      let search = this._barkerSearch(this._workerMap, time);
      this._activeTimestamp = search.key;
      msg["frame"] -= Math.floor((this._fps * search.key));
      // This assumes all the videos are the same FPS.
      this._lastInit = msg;
      search.obj.postMessage(msg);
    }
    else if (msg.type == "onDemandDownload")
    {
      if (this._activeTimestamp != undefined)
      {
        this._lastDl = msg;
        this._workerMap.get(this._activeTimestamp).postMessage(msg);
      }
    }
    else if (msg.type == "onDemandPaused")
    {
      if (this._activeTimestamp != undefined)
      {
        this._workerMap.get(this._activeTimestamp).postMessage(msg);
      }
      this._activeTimestamp = null;
    }
    else
    {
      console.error(`Ignoring ${JSON.stringify(msg)}`);
      // Do nothing.
    }
  }

  // Forward a termination
  terminate()
  {
    console.error("TODO - Implement me");
  }

  _onMessage(timestampOffset, msg)
  {
    // TODO: Refactor this so it isn't as much copy pasta between buffer and on-demand returns
    const type = msg.data["type"];
    if (type == "finished")
    {
      console.info("Stopping download worker.");
    }
    else if (type == "seek_result")
    {
      msg.data.frame += timestampOffset*this._fps;
      msg.data.frame = Math.round(msg.data.frame);
      if (this._parent._seekFrame != msg.data["frame"])
      {
        console.warn(`Out of order seek operations detected. Expected=${this._parent._seekFrame}, Got=${msg.data["frame"]}`);
        return;
      }
      msg.data["buffer"].fileStart = msg.data["startByte"];
      console.info(`Converting ${msg.data["frameStart"]} to ${msg.data["frameStart"]/this._parent._fps}`);
      msg.data["buffer"].frameStart = (msg.data["frameStart"]/this._parent._fps);
      this._parent._videoElement[this._parent._seek_idx].appendSeekBuffer(msg.data["buffer"], msg.data['time'], timestampOffset);
      document.body.style.cursor = null;
      let seek_time = performance.now() - this._parent._seekStart;
      let seek_msg = `Seek time = ${seek_time} ms`;
      console.info(seek_msg);
      //if (this._parent._diagnosticMode == true)
      //{
      //  Utilities.sendNotification(seek_msg);
      //}
    }
    else if (type == "onDemandFinished")
    {
      let search = this._barkerSearch(this._workerMap, this._activeTimestamp + 0.1);
      let keys = [...this._workerMap.keys()].sort((a,b)=>{return a-b});
      const next_idx = keys.findIndex(element => {return element == search.key}) + 1;
      if (next_idx < keys.length)
      {
        let next_obj = this._workerMap.get(keys[next_idx]);
        this._activeTimestamp = next_obj.key;
        this._lastInit.frame = 0;
        next_obj.postMessage(this._lastInit);
        next_obj.postMessage(this._lastDl);
      }
      else
      {
        console.log("onDemand finished downloading. Reached end of video.");
        this._parent._onDemandFinished = true;
        this._parent._onDemandPlaybackReady = true; //if we reached the end, we are done.
        this._parent.sendPlaybackReady();
      }
    }
    else if (type == "buffer")
    {
      let totalMediaElementCount = 0;
      if (this._parent._audioPlayer) {
        totalMediaElementCount += 1;
      }
      for (let vidBuffIdx=0; vidBuffIdx < this._parent._videoElement.length; vidBuffIdx++) {
        totalMediaElementCount += this._parent._videoElement[vidBuffIdx].getMediaElementCount();
      }

      if (this._parent._lastMediaElementCount != totalMediaElementCount) {
        console.log(`(Media ID: ${this._parent._videoObject.id}) mediaElementCount = ${totalMediaElementCount}`);
        this._parent._lastMediaElementCount = totalMediaElementCount;
      }

      //console.log(`....downloaded: ${parseInt(100*e.data["percent_complete"])} (buf_idx: ${e.data["buf_idx"]})`)
      let video_buffer = this._parent._videoElement[msg.data["buf_idx"]];
      var error = video_buffer.error();
      if (error)
      {
        console.error("dlWorker thread - video decode error");
        updateStatus("Video decode error", "danger", "-1");
        return;
      }

      // recursive lamdba function to update source buffer
      var idx = 0;
      var offsets = msg.data["offsets"];
      var data = msg.data["buffer"];
      var sentOffset = false;
      // Stores the downloaded data in the appropriate local buffer
      var appendBuffer=(callback)=>
      {
        var offsets = msg.data["offsets"];
        if (idx < offsets.length)
        {
          if (offsets[idx][2] == 'ftyp')
          {
            // Save the file info in case we need to reinitialize again
            var ftypInfo = {};
            for(let key in msg.data) {
              ftypInfo[key] = msg.data[key];
            }
            this._parent._ftypInfo[msg.data["buf_idx"]] = ftypInfo;

            // First part of the fragmented mp4 segment info. Need this and the subsequent
            // "moov" atom to define the file information
            console.log(`Video init of: ${msg.data["buf_idx"]}`);
            var begin=offsets[idx][0];
            var end=offsets[idx+1][0]+offsets[idx+1][1];
            var bufferToSend = data.slice(begin, end);
            bufferToSend.fileStart = msg.data["startByte"]+begin;
            video_buffer.saveBufferInitData(data.slice(begin, end));
            video_buffer.appendAllBuffers(bufferToSend, callback, true, timestampOffset);
            video_buffer.appendOnDemandBuffer(bufferToSend, () => {}, true, timestampOffset);
            idx+=2;
          }
          else
          {
            // Rest of the fragmented mp4 segment info
            var begin=offsets[idx][0];
            var end=offsets[idx][0] + offsets[idx][1];
            var bufferToSend = data.slice(begin, end);
            bufferToSend.fileStart = msg.data["startByte"]+begin;
            if (sentOffset == false)
            {
              bufferToSend.frameStart = msg.data['frameStart'] / this._parent._fps;
              sentOffset = true;
            }
            if (typeof video_buffer._dataLag != "undefined" && video_buffer._dataLag.length > 0) {
              console.log("dataLag has data: " + video_buffer._dataLag.length);
              video_buffer._dataLag.push({data: bufferToSend, callback: callback});
            }
            else {
              video_buffer.appendLatestBuffer(bufferToSend, callback, timestampOffset);
            }
            idx++;
          }
        }
      };

      var afterUpdate = ()=>
      {
        var error = video_buffer.error();
        if (error)
        {
          console.error("Error " + error.code + "; details: " + error.message);
          updateStatus("Video Decode Error", "danger", -1);
          return;
        }

        if (idx == offsets.length)
        {
          if (msg.data["buf_idx"] == this._parent._scrub_idx)
          {
            // Report overall percentage given total video length of current selected region.
            let ranges = video_buffer._buffer.buffered;
            const video_time = video_buffer._buffer.currentTime;
            for (let idx = 0; idx < ranges.length; idx++)
            {
              if (video_time <= ranges.end(idx))
              {
                const overall_percentage = ranges.end(idx)/this._parent._numSeconds;
                this._parent.dispatchEvent(new CustomEvent("bufferLoaded",
                                              {composed: true,
                                                detail: {"percent_complete":overall_percentage}
                                              }));
              }
            }
            if (this._parent._disableAutoDownloads && this._parent._scrubDownloadCount >= 2) {
              return;
            }
            this._parent._scrubDownloadCount += 1
            this._workerMap.get(timestampOffset).postMessage({"type": "download",
                                                 "buf_idx": msg.data["buf_idx"]});;
          }
        }
        else
        {
          // Can't call append in this event handler + avoid a deep recursion stack
          setTimeout(()=>
                      {
                        appendBuffer(afterUpdate);
                      },0);
        }
      };

      appendBuffer(afterUpdate);

    }
    else if (type == "ready")
    {
      if (msg.data["buf_idx"] == this._parent._scrub_idx)
      {
        const bias = msg.data["startBias"];
        this._startBiasMap.set(timestampOffset,bias);
        this._parent._videoVersion = msg.data["version"];
        console.info(`Video has start bias of ${this._startBias} - buffer: ${this._scrub_idx}`);
        console.info("Setting hi performance mode");
        guiFPS = 60;
      }
    }
    else if (type == "error")
    {
      console.error(`${timestampOffset} Video Download Error`);
    }
    else if (type == "onDemandInit")
    {
      // Download worker's onDemand mode is ready
      this._parent._onDemandInit = true;
    }
    else if (type == "onDemand")
    {
      // Received the onDemand downloaded segments
      if (this._parent._onDemandId != msg.data['id'])
      {
        console.warn(`On-Demand: Expected ${this._parent._onDemandId} but got ${msg.data['id']}`);
        this._onDemandPendingDownloads -= 1;
        return;
      }
      var idx = 0;
      var offsets = msg.data["offsets"];
      var data = msg.data["buffer"];
      data.fileStart = msg.data.startByte;
      var video_buffer = this._parent._videoElement[msg.data["buf_idx"]];
      var error = video_buffer.error();
      var sentOffset = false;
      if (error)
      {
        updateStatus("Video decode error", "danger", "-1");
        return;
      }

      var restartOnDemand = () => {

        console.log("******* restarting onDemand: Clearing old buffer");
        this._parent.stopPlayerThread();

        var video = this._parent._videoElement[this._parent._play_idx];

        var setupCallback = () => {
          console.log("******* restarting onDemand: Setting up new buffer");
          clearTimeout(this._parent._onDemandDownloadTimeout);
          this._parent._onDemandDownloadTimeout = null;
          if (this._parent._ftypInfo[this._parent._play_idx] == null) {
            // It's possible to get into a restart loop where this occurs before getting
            // the ftypInfo. Eventually the video download system will fill this in and
            // restart the onDemand appropriately.
            return;
          }
          var offsets2 = this._parent._ftypInfo[this._parent._play_idx]["offsets"];
          var data2 = this._parent._ftypInfo[this._parent._play_idx]["buffer"];
          var begin2 = offsets2[0][0];
          var end2 = offsets2[1][0]+offsets2[1][1];
          var bufferToSend = data2.slice(begin2, end2);
          bufferToSend.fileStart = 0;
          video.appendOnDemandBuffer(bufferToSend, playCallback, true,timestampOffset);
        }

        var playCallback = () => {
          console.log("******* restarting onDemand: Playing");
          this._parent.onDemandDownloadPrefetch(-1);
          this._parent._playGenericOnDemand(this._parent._direction)
        };

        video.resetOnDemandBuffer().then(() => {(playCallback);});
      }

      // Function used to apply the frame data to the onDemand buffer
      // Callback is called after the data has been applied
      var appendBuffer = (callback)=>
      {
        if (idx < offsets.length)
        {
          if (offsets[idx][2] == 'ftyp')
          {
            // First part of the fragmented mp4 segment info. Need this and the subsequent
            // "moov" atom to define the file information
            var begin = offsets[idx][0];
            var end = offsets[idx+1][0] + offsets[idx+1][1];
            var bufferToSend = data2.slice(begin2, end2);
            bufferToSend.fileStart = 0;
            // Note: There is only one buffer for the onDemand buffer, unlike the other
            //       scrub buffers. So, we only need to initialize a single buffer
            //       with this video information.
            video_buffer.appendOnDemandBuffer(bufferToSend, callback, true, timestampOffset);
            idx += 2;
          }
          else
          {
            // Rest of the video segment information (moof / mdat / mfra)
            var begin = offsets[idx][0];
            var end = offsets[idx][0];
            for (let b_idx = idx; b_idx < offsets.length; b_idx++)
            {
              end += offsets[b_idx][1];
            }
            var bufferToSend = data.slice(begin, end);
            bufferToSend.fileStart = data.fileStart + begin;
            if (sentOffset == false)
            {
              bufferToSend.frameStart = msg.data['frameStart'] / this._parent._fps;
              sentOffset = true;
            }
            try {
              if (!this._parent._makeVideoError) {
                video_buffer.appendOnDemandBuffer(bufferToSend, callback, true, timestampOffset);
              }
              else {
                // #DEBUG path - Used to induce a decoding error
                this._parent._makeVideoError = false;
                bufferToSend = data.slice(begin, end-5);
                bufferToSend.fileStart = data.fileStart + begin;
                video_buffer.appendOnDemandBuffer(bufferToSend, callback, true, timestampOffset);
              }
            }
            catch {
              setTimeout(() => {
                restartOnDemand();
              },100);
            }
            idx = offsets.length;
          }
        }
      }

      // Function called after frame data has been applied to the onDemand buffer
      var afterUpdate = ()=>
      {
        var error = video_buffer.error();
        if (error)
        {
          // Something catastrophic happened with the video.
          console.error("Error " + error.code + "; details: " + error.message);
          updateStatus("Video Decode Error", "danger", -1);
          setTimeout(()=>{
            restartOnDemand();
          },100);
          return;
        }

        if (idx == offsets.length && msg.data["buf_idx"] == this._parent._play_idx && this._parent._onDemandInit)
        {
          // Done processing the downloaded segment.
          // Watchdog will kick off the next segment to download.
          console.log(`Requesting more onDemand data: done.`);
          this._parent._onDemandPendingDownloads -= 1;
          this._parent._onDemandCompletedDownloads += 1;
          return;
        }
        else
        {
          // Haven't finished processing thd downloaded data. Move to the next segment
          // in the downloaded block and append this._parent to the buffer
          setTimeout(()=>
                      {
                        appendBuffer(afterUpdate);
                      },0);
        }
        const ranges = this._parent._videoElement[this._parent._play_idx].playBuffer().buffered;
        let ranges_list = [];
        for (let idx = 0; idx < ranges.length; idx++)
        {
          let startFrame = this._parent.timeToFrame(ranges.start(idx));
          let endFrame = this._parent.timeToFrame(ranges.end(idx));
          if (this._parent.currentFrame() >= startFrame && this._parent.currentFrame() <= endFrame)
          {
            ranges_list.push([startFrame, endFrame]);
          }
        }
        this._parent.dispatchEvent(new CustomEvent("onDemandDetail",
                                            {composed: true,
                                            detail: {"ranges": ranges_list}
                                            }));
      }

      if (msg.data["id"] == this._parent._onDemandId) {
        appendBuffer(afterUpdate);
      }
    }
  }

}