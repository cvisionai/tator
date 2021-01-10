importScripts("/static/js/util/fetch-retry.js");

class VideoDownloader
{
  constructor(media_files, blockSize, offsite_config)
  {
    this._media_files = media_files;
    this._blockSize = blockSize;
    this._offsite_config = offsite_config;
    this._headers = {};
    if (this._offsite_config && this._offsite_config.method)
    {
      const auth_str = `${this._offsite_config.method} ${this._offsite_config.value}`;
      this._headers["Authorization"] = auth_str;
    }
    this._num_res = media_files.length;
    this._currentPacket=[];
    this._numPackets=[];
    this._info=[];
    this._initialSent = false;
    for (var idx = 0; idx < this._num_res; idx++)
    {
      this._currentPacket[idx] = 0;
      this._numPackets[idx] = 0;
    }

    this.initializeInfoObjects();
  }

  initializeInfoObjects()
  {
    let init_promises = [];
    for (let buf_idx = 0; buf_idx < this._media_files.length; buf_idx++)
    {
      let info_url = this._media_files[buf_idx].segment_info;
      const info = new Request(info_url, {headers:this._headers});
      init_promises.push(fetch(info));
    }
    Promise.all(init_promises).then((responses) => {
      for (let buf_idx = 0; buf_idx < responses.length; buf_idx++)
      {
        this.processInitResponses(buf_idx,responses[buf_idx]);
      }
    });
  }

  processInitResponses(buf_idx,info)
  {
    var that = this;
    if (info.status == 200)
    {
      console.log("Fetched info");
      info.json().then(data => {
        that._info[buf_idx] = data
        that._numPackets[buf_idx]=data["segments"].length
        var version = 1;
        try
        {
          version = data["file"]["version"];
        }
        catch(error)
        {

        }
        var startBias = 0.0;
        if ('file' in data)
        {
          startBias = data.file.start;
        }
        postMessage({"type": "ready",
                     "startBias": startBias,
                     "version": version,
                     "buf_idx": buf_idx});
      });
    }
    else
    {
      postMessage({"type": "error", "status": info.status});
      console.warn(`Couldn't fetch '${info.url}'`);
    }
  }

  verifyInitialDownload()
  {
    if (this._initialSent == true)
    {
      return true;
    }
    for (let buf_idx = 0; buf_idx < this._media_files.length; buf_idx++)
    {
      // Download the initial fragment info into each buffer
      this.downloadNextSegment(buf_idx, 2);
    }
    this._initialSent = true;
    return false;
  }

  downloadForFrame(buf_idx, frame, time)
  {
    var version = 1;
    try
    {
      version = this._info[buf_idx]["file"]["version"];
    }
    catch(error)
    {

    }
    if (version < 2 || version == undefined)
    {
      console.warn("Old version of segment file doesn't support seek operation");
      return;
    }
    var matchIdx = -1;
    var boundary = false;
    for (var idx = 0; idx < this._numPackets[buf_idx]; idx++)
    {
      if (this._info[buf_idx]["segments"][idx]["name"] == "moof")
      {
        var frame_start = parseInt(this._info[buf_idx]["segments"][idx]["frame_start"]);
        var frame_samples = parseInt(this._info[buf_idx]["segments"][idx]["frame_samples"]);
        if (frame >= frame_start && frame < frame_start+frame_samples)
        {
          matchIdx = idx;
          if (frame - frame_start > frame_samples-5)
          {
            boundary = true;
          }
          break;
        }
        else if (idx == 2 && frame < frame_start)
        {
          // Handle beginning of videos
          matchIdx = idx;
        }
      }
    }
    // No match
    if (matchIdx == -1)
    {
      console.warn(`Couldn't fetch video for ${time}(${frame})`)
      return;
    }

    // Calculate which section of the file to get, default
    // is the segment (moof+mdat)
    let start = matchIdx;
    let end = matchIdx + 1;

    // If we are at a boundary get the next segment
    if (boundary == true)
    {
      end = Math.min(matchIdx + 3, this._numPackets[buf_idx]-1);
    }

    const start_packet = this._info[buf_idx]["segments"][matchIdx];
    var startByte = parseInt(start_packet["offset"]);
    var offset = 0;

    // Add up the size of any included packets
    for (let idx = matchIdx; idx <= end; idx++)
    {
      offset += this._info[buf_idx]["segments"][idx]["size"];
    }

    let headers = {'range':`bytes=${startByte}-${startByte+offset-1}`,
                   ...self._headers};
    fetchRetry(this._media_files[buf_idx].path,
          {headers: headers}
         ).then(
           function(response)
           {
             response.arrayBuffer().then(
               function(buffer)
               {
                 // Transfer the buffer to the
                 var data={"type": "seek_result",
                           "time": time,
                           "buffer": buffer,
                           "frame": frame};
                 postMessage(data, [data.buffer]);
               });
           });

  }

  downloadNextSegment(buf_idx, packet_limit)
  {
    var currentSize=0;
    var idx = this._currentPacket[buf_idx];

    // Temp code one can use to force network seeking
    //if (idx > 0)
    // {
    //  console.log("Force seeking to test it out");
    //  postMessage({"type": "finished"});
    //  return;
    // }

    if (packet_limit == undefined)
    {
      packet_limit = Infinity;
    }

    if (idx >= this._numPackets[buf_idx])
    {
      console.log("Done downloading..");
      postMessage({"type": "finished"});
      return;
    }

    var startByte=parseInt(this._info[buf_idx]["segments"][idx]["offset"]);
    if (idx == 0)
    {
      startByte = 0;
    }

    // Use 1 Mb blocks if in the first 5 packets
    var iterBlockSize=this._blockSize;
    if (idx < 5)
    {
        iterBlockSize=1024*1024;
    }
    var offsets=[];
    while (currentSize < iterBlockSize && idx < this._numPackets[buf_idx] && offsets.length < packet_limit)
    {
      const packet = this._info[buf_idx]["segments"][idx];
      const pos=parseInt(packet["offset"]);
      const size=parseInt(packet["size"]);
      offsets.push([pos-startByte,size, packet["name"]]);
      currentSize=pos+size-startByte;
      idx++;
    }

    //console.log(`Downloading '${currentSize}' at '${startByte}' (${idx})`);
    this._currentPacket[buf_idx] = idx;
    var percent_complete=idx/this._numPackets[buf_idx];
    let headers = {'range':`bytes=${startByte}-${startByte+currentSize-1}`,
                   ...self._headers};
    fetch(this._media_files[buf_idx].path,
          {headers: headers}
         ).then(
           (response) =>
           {
             response.arrayBuffer().then(
               (buffer) =>
               {
                 // Transfer the buffer to the
                 var data={"type": "buffer",
                           "buf_idx" : buf_idx,
                           "pts_start": 0,
                           "pts_end": 0,
                           "percent_complete": percent_complete,
                           "offsets": offsets,
                           "buffer": buffer};
                 postMessage(data, [data.buffer]);
               });
           });
  }

}

var ref = null;
onmessage = function(e)
{
  msg = e.data;
  var type = msg['type'];
  // Download in 5 MB chunks
  if (type == 'start')
  {
    if (ref == null)
    {
      ref = new VideoDownloader(msg.media_files,
                                5*1024*1024,
                                msg.offsite_config);
    }
  }
  else if (type == 'download')
  {
    if (ref.verifyInitialDownload() == true)
    {
      ref.downloadNextSegment(msg.buf_idx);
    }
  }
  else if (type == 'seek')
  {
    ref.downloadForFrame(msg.buf_idx, msg['frame'], msg['time']);
  }
}
