
class VideoDownloader
{
  constructor(url, blockSize)
  {
    this._currentPacket=0;
    this._numPackets=0;
    this._url=url;
    this._blockSize = blockSize;

    this._info_url=url.substring(0,url.indexOf('.mp4'))+"_segments.json";

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
        var startBias = 0.0;
        if ('file' in data)
        {
          startBias = data.file.start;
        }
        postMessage({"type": "ready",
                     "startBias": startBias});
      });
    }
    else
    {
      postMessage({"type": "error", "status": info.status});
      console.warn(`Couldn't fetch '${this._info_url}'`);
    }
  }

  downloadForTime(timeInSeconds)
  {
    var matchIdx = 0;
    for (var idx = 0; idx < this._numPackets; idx++)
    {
      if (this._info["segments"]['name'] == 'moof')
      {
        var decode_time = parseInt(this._info["segments"][idx]["decode_time"]);
        if (decode_time > timeInSeconds * 1000)
        {
          // Found the packet after which we seek
          // moof / mdat / moof / mdat(HERE)
          matchIdx = idx - 2
        }
      }
    }
    // No match
    if (idx == this._numPackets)
    {
      console.warning(`Couldn't fetch video for ${time}`)
      return;
    }

    matchIdx = Math.min(0,matchIdx);

    const moof_packet = this._info["segments"][matchIdx];
    const mdat_packet = this._info["segments"][matchIdx+1];
    var startByte = parseInt(moof_packet["offset"]);
    var offset = parseInt(moof_packet["size"]) + parseInt(moof_packet["size"]);

    fetch(this._url,
          {headers: {'range':`bytes=${startByte}-${startByte+offset-1}`}}
         ).then(
           function(response)
           {
             response.arrayBuffer().then(
               function(buffer)
               {
                 // Transfer the buffer to the
                 var data={"type": "seek_result",
                           "pts_start": 0,
                           "pts_end": 0,
                           "offsets": offsets,
                           "buffer": buffer};
                 postMessage(data, [data.buffer]);
               });
           });

  }

  downloadNextSegment()
  {
    var currentSize=0;
    var idx = this._currentPacket;

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

    // Use quarter blocks for the first 5% of the video.
    var iterBlockSize=this._blockSize;
    //if (pts_start/duration < 0.05)
    //{
    //    var iterBlockSize=this._blockSize*0.25;
    //}
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
           function(response)
           {
             response.arrayBuffer().then(
               function(buffer)
               {
                 // Transfer the buffer to the
                 var data={"type": "buffer",
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
  // Download in 1 MB chunks
  if (type == 'start')
  {
    ref = new VideoDownloader(msg['url'], 0.5*1024*1024);
  }
  else if (type == 'download')
  {
    ref.downloadNextSegment();
  }
}
