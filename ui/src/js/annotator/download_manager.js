
import guiFPS from "./video.js";

// Manages the interactions to a download worker for a single video
// Companion class to VideoCanvas in video.js
export class DownloadManager
{
  // Construct a download manager object associated with a video player
  constructor(parent)
  {
    this._parent = parent;
    this._worker = new Worker(new URL("./vid_downloader.js", import.meta.url),
    {'name': 'Video Download Worker'});
    this._worker.onmessage = this._onMessage.bind(this);
    this._startBias = new Map();
  }

  // Forward a message to the underlying worker
  postMessage(msg)
  {
    this._worker.postMessage(msg);
  }

  // Forward a termination
  terminate()
  {
    this._worker.terminate();
  }

  biasForTime(time, idx)
  {
    return this._startBias.get(idx)
  }

  _onMessage(msg)
  {
    const type = msg.data["type"];
    if (type == "finished")
    {
      console.info("Stopping download worker.");
    }
    else if (type == "seek_result")
    {
      if (this._parent._seekFrame != msg.data["frame"])
      {
        console.warn(`Out of order seek operations detected. Expected=${this.seekFrame}, Got=${msg.data["frame"]}`);
        return;
      }
      msg.data["buffer"].fileStart = msg.data["startByte"];
      console.info(`Converting ${msg.data["frameStart"]} to ${msg.data["frameStart"]/this._parent._fps}`);
      msg.data["buffer"].frameStart = (msg.data["frameStart"]/this._parent._fps);
      this._parent._videoElement[this._parent._seek_idx].appendSeekBuffer(msg.data["buffer"], msg.data['time']);
      let seek_time = performance.now() - this._parent._seekStart;
      let seek_msg = `Seek time = ${seek_time} ms`;
      console.info(seek_msg);
      //if (this._parent._diagnosticMode == true)
      //{
      //  Utilities.sendNotification(seek_msg);
      //}
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
            video_buffer.appendAllBuffers(bufferToSend, callback);
            video_buffer.appendOnDemandBuffer(bufferToSend, () => {});
            idx+=2;
          }
          else
          {
            // Rest of the fragmented mp4 segment info in one chunk
            var begin=offsets[idx][0];
            var end = offsets[idx][0];
            for (let b_idx = idx; b_idx < offsets.length; b_idx++)
            {
              end += offsets[b_idx][1];
            }
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
              video_buffer.appendLatestBuffer(bufferToSend, callback);
            }
            idx = offsets.length;
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
            this._parent.dispatchEvent(new CustomEvent("bufferLoaded",
                                              {composed: true,
                                                detail: {"percent_complete":msg.data["percent_complete"]}
                                              }));

            if (this._parent._disableAutoDownloads && this._parent._scrubDownloadCount >= 2) {
              return;
            }
            this._parent._scrubDownloadCount += 1
            this._parent._dlWorker.postMessage({"type": "download",
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
      this._startBias.set(msg.data["buf_idx"], msg.data["startBias"]);
      if (msg.data["buf_idx"] == this._parent._scrub_idx)
      {
        const buf_idx = msg.data["buf_idx"];
        this._parent._firstFrame = msg.data.firstFrame;
        if (msg.data.firstFrame != 0)
        {
          this._parent.dispatchEvent(new CustomEvent("firstFrame",
                                          {composed: true,
                                          detail: {"value" : msg.data.firstFrame}
                                          }));
        }
        this._parent._videoVersion = msg.data["version"];
        console.info(`Video buf${buf_idx} has start bias of ${this._startBias.get(buf_idx)} - buffer: ${this._parent._scrub_idx}`);
        console.info("Setting hi performance mode");
        guiFPS = 60;
      }
    }
    else if (type == "error")
    {
      // Go to compatibility mode
      console.warn("In video compatibility mode");
      this._parent._videoElement[0].compat(this._parent._videoObject.media_files.streaming[0].path);
      this._parent.seekFrame(0, this._parent.drawFrame);
      this._parent.dispatchEvent(new CustomEvent("bufferLoaded",
                                          {composed: true,
                                          detail: {"percent_complete":1.00}
                                          }));
      this._parent.dispatchEvent(new CustomEvent("playbackReady",
                                        {composed: true,
                                          detail: {playbackReadyId: this._waitId},
                                          }));
      this._parent._onDemandPlaybackReady = true; // fake it
      this._parent.sendPlaybackReady();
      this._parent.dispatchEvent(new Event("canvasReady", {
        composed: true
      }));
    }
    else if (type == "onDemandInit")
    {
      // Download worker's onDemand mode is ready
      this._parent._onDemandInit = true;
    }
    else if (type == "onDemandFinished")
    {
      console.log("onDemand finished downloading. Reached end of video.");
      this._parent._onDemandFinished = true;
      this._parent._onDemandPlaybackReady = true; //if we reached the end, we are done.
      this._parent.sendPlaybackReady();
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
          video.appendOnDemandBuffer(bufferToSend, playCallback);
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
            video_buffer.appendOnDemandBuffer(bufferToSend, callback);
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
            var bufferToSend = data;//.slice(begin, end);
            bufferToSend.fileStart = data.fileStart + begin;
            if (sentOffset == false)
            {
              bufferToSend.frameStart = msg.data['frameStart'] / this._parent._fps;
              sentOffset = true;
            }
            try {
              if (!this._parent._makeVideoError) {
                video_buffer.appendOnDemandBuffer(bufferToSend, callback);
              }
              else {
                // #DEBUG path - Used to induce a decoding error
                this._parent._makeVideoError = false;
                bufferToSend = data.slice(begin, end-5);
                bufferToSend.fileStart = data.fileStart + begin;
                video_buffer.appendOnDemandBuffer(bufferToSend, callback);
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
          // console.log(`Requesting more onDemand data: done.`);
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
