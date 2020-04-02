importScripts("/static/js/util/fetch-retry.js");

class VideoDownloader
{
  constructor(media_files, blockSize)
  {
    this._media_files = media_files;
    this._blockSize = blockSize;
  }

  startLinearDownload(idx)
  {
    this._currentPacket=0;
    this._numPackets=0;
    this._res_idx = idx;
    this._url=this._media_files[idx].path;
    this._info_url=this._url.substring(0,
                                       this._url.indexOf('.mp4'))+"_segments.json";

    const info = new Request(this._info_url);
    fetch(info).then(
      this.processInitResponses.bind(this));
  }

  processInitResponses(info)
  {
    var that = this;
    if (info.status == 200)
    {
      console.log("Fetched info");
      info.json().then(data => {
        that._info = data
        that._numPackets=data["segments"].length
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
                     "version": version});
      });
    }
    else
    {
      postMessage({"type": "error", "status": info.status});
      console.warn(`Couldn't fetch '${this._info_url}'`);
    }
  }

  downloadForFrame(frame, time)
  {
    var version = 1;
    try
    {
      version = this._info["file"]["version"];
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
    for (var idx = 0; idx < this._numPackets; idx++)
    {
      if (this._info["segments"][idx]["name"] == "moof")
      {
        var frame_start = parseInt(this._info["segments"][idx]["frame_start"]);
        var frame_samples = parseInt(this._info["segments"][idx]["frame_samples"]);
        if (frame >= frame_start && frame < frame_start+frame_samples)
        {
          // Found the packet after which we seek
          matchIdx = idx;
          break;
        }
      }
    }
    // No match
    if (matchIdx == -1)
    {
      console.warn(`Couldn't fetch video for ${time}`)
      return;
    }

    const moof_packet = this._info["segments"][matchIdx];
    const mdat_packet = this._info["segments"][matchIdx+1];
    var startByte = parseInt(moof_packet["offset"]);
    var offset = parseInt(moof_packet["size"]) + parseInt(mdat_packet["size"]);

    fetchRetry(this._url,
          {headers: {'range':`bytes=${startByte}-${startByte+offset-1}`}}
         ).then(
           function(response)
           {
             response.arrayBuffer().then(
               function(buffer)
               {
                 // Transfer the buffer to the
                 var data={"type": "seek_result",
                           "time": time,
                           "buffer": buffer};
                 postMessage(data, [data.buffer]);
               });
           });

  }

  downloadNextSegment()
  {
    var currentSize=0;
    var idx = this._currentPacket;

    // Temp code one can use to force network seeking
    //if (idx > 0)
    // {
    //  console.log("Force seeking to test it out");
    //  postMessage({"type": "finished"});
    //  return;
    // }

    if (idx >= this._numPackets)
    {
      console.log("Done downloading..");
      postMessage({"type": "finished"});
      return;
    }

    var startByte=parseInt(this._info["segments"][idx]["offset"]);
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
    while (currentSize < iterBlockSize && idx < this._numPackets)
    {
      const packet = this._info["segments"][idx];
      const pos=parseInt(packet["offset"]);
      const size=parseInt(packet["size"]);
      offsets.push([pos-startByte,size, packet["name"]]);
      currentSize=pos+size-startByte;
      idx++;
    }

    //console.log(`Downloading '${currentSize}' at '${startByte}' (${idx})`);
    this._currentPacket = idx;
    var percent_complete=idx/this._numPackets;

    fetch(this._url,
          {headers: {'range':`bytes=${startByte}-${startByte+currentSize-1}`}}
         ).then(
           (response) =>
           {
             response.arrayBuffer().then(
               (buffer) =>
               {
                 // Transfer the buffer to the
                 var data={"type": "buffer",
                           "buf_idx" : this._res_idx,
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
                                5*1024*1024);
    }
    ref.startLinearDownload(msg["play_idx"]);
  }
  else if (type == 'download')
  {
    ref.downloadNextSegment();
  }
  else if (type == 'seek')
  {
    ref.downloadForFrame(msg['frame'], msg['time']);
  }
}
