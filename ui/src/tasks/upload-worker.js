let window = self;

// Import sparkmd5.
importScripts("/static/js/md5.min.js");

// Import uuid.
importScripts("/static/js/node-uuid.js");

// Import fetch retry.
importScripts("/static/js/util/fetch-retry.js");

// List of uploads in progress.
let activeUploads = {};
const maxUploads = 1;

// Buffer of uploads.
let uploadBuffer = [];

// Define function to remove a queued upload.
const removeQueued = index => {
  const record = uploadBuffer.splice(index, 1)[0];
}

// Add an event listener that saves the upload info in the buffer.
self.addEventListener("message", async msgEvent => {
  let msg = msgEvent.data;
  if (msg.command == "addUpload") {
    const upload_uid = SparkMD5.hash(msg.file.name + msg.file.type + msg.username + msg.file.size);
    uploadBuffer.push({...msg, uid: upload_uid, retries: 0});
    startUpload();
  } else if (msg.command == "cancelUploads") {
    uploadBuffer = [];
    for (const key of Object.keys(activeUploads)) {
      activeUploads[key].cancel();
    }
  }
});

// Define function for starting an upload.
async function startUpload() {
  // Begin uploading the files.
  const belowMax = Object.keys(activeUploads).length < maxUploads;
  const haveUploads = uploadBuffer.length > 0;
  if (belowMax && haveUploads) {
    // Grab uploads from buffer.
    const upload = uploadBuffer.shift();
    if (!(upload.uid in activeUploads)) {
      // Start the upload.
      activeUploads[upload.uid] = new Upload(upload);
      activeUploads[upload.uid].computeMd5();
    }
  }
  if (!haveUploads) {
    self.postMessage({command: "allUploadsDone"});
  }
}

// Removes upload from list of active uploads.
function removeFromActive(uid) {
  if (uid in activeUploads) {
    const key = [activeUploads[uid].projectId, activeUploads[uid].token].join();
    delete activeUploads[uid];
  }
  startUpload();
}

// Manages an upload.
class Upload {

  constructor(uploadData) {
    this.last_progress = Date.now();
    this.file = uploadData.file;
    this.projectId = uploadData.projectId;
    this.gid = uploadData.gid;
    this.section = uploadData.section;
    this.mediaTypeId = uploadData.mediaTypeId;
    this.username = uploadData.username;
    this.token = uploadData.token;
    this.uploadData = uploadData;
    this.isImage = uploadData.isImage;
    this.aborted = false;
    this.numParts = 1;
    this.chunkSize = 10 * 1024 * 1024; // 10MB; must be a multiple of 256KB for GCP
    this.numParts = Math.ceil(this.file.size / this.chunkSize);
    this.parts = [];
    this.controller = new AbortController();

    // If number of parts is >100, increase chunk size.
    if (this.numParts > 100) {
      // Make sure the new chunk size is a multiple of 256KB for GCP
      this.chunkSize = Math.ceil(Math.ceil(this.file.size / 100) / (256 * 1024)) * 256 * 1024;
      this.numParts = Math.ceil(this.file.size / this.chunkSize);
    }

    // Fingerprint function for TUS client required (also needs to return a promise).
    // It'll use the same upload UID used elsewhere by this class.
    this.upload_uid = SparkMD5.hash(this.file.name + this.file.type + uploadData.username + this.file.size)
  }

  // Starts the upload, chaining together all promises.
  start() {
    // Compute number of parts.
    this.getUploadInfo()
    .then(info => this.numParts > 1 ? this.uploadMulti(info) : this.uploadSingle(info))
    .then(key => this.getDownloadInfo(key))
    .then(url => this.createMedia(url))
    .catch(error => this.handleError(error));
  }

  // Returns promise resolving to upload.
  getUploadInfo() {
    return fetchRetry(`/rest/UploadInfo/${this.projectId}?num_parts=${this.numParts}`, {
      method: "GET",
      signal: this.controller.signal,
      credentials: "omit",
      headers: {
        "Authorization": "Token " + this.token,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json());
  }

  // Multipart upload.
  uploadMulti(info) {
    const gcpUpload = info.upload_id === info.urls[0]
    let promise = new Promise(resolve => resolve(true));
    for (let idx=0; idx < this.numParts; idx++) {
      const startByte = this.chunkSize * idx;
      const stopByte = Math.min(startByte + this.chunkSize, this.file.size);
      let options = {
        method: "PUT",
        signal: this.controller.signal,
        credentials: "omit",
        body: this.file.slice(startByte, stopByte),
      };
      if (gcpUpload) {
        const lastByte = stopByte - 1;
        const contentLength = lastByte - startByte;
        options.headers = {
          "Content-Length": contentLength.toString(),
          "Content-Range": "bytes " + startByte + "-" + lastByte + "/" + this.file.size,
        };
      }
      promise = promise.then(() => {return fetchRetry(info.urls[idx], options);})
      .then(response => {
        this.parts.push({ETag: response.headers.get("ETag") ? response.headers.get("ETag") : "ETag", PartNumber: idx + 1});
        return this.parts;
      })
      .then(parts => {
        self.postMessage({command: "uploadProgress",
                          percent: Math.floor(100 * idx / (this.numParts - 1)),
                          filename: this.file.name});
        return parts;
      });
    }
    promise = promise.then(parts => fetchRetry(`/rest/UploadCompletion/${this.projectId}`, {
      method: "POST",
      signal: this.controller.signal,
      credentials: "omit",
      headers: {
        "Authorization": "Token " + this.token,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: info.key,
        upload_id: info.upload_id,
        parts: parts,
      }),
    }))
    .then(response => response.json())
    .then(() => {return info.key});
    return promise;
  }

  // Uploads using a single request.
  uploadSingle(info) {
    return fetchRetry(info.urls[0], {
      method: "PUT",
      signal: this.controller.signal,
      credentials: "omit",
      body: this.file.slice(0, this.file.size),
    })
    .then(() => {
      self.postMessage({command: "uploadProgress",
                        percent: 100,
                        filename: this.file.name});
      return info.key;
    });
  }

  // Create presigned url for transcode/media create.
  getDownloadInfo(key) {
    return fetchRetry(`/rest/DownloadInfo/${this.projectId}?expiration=86400`, {
      method: "POST",
      signal: this.controller.signal,
      credentials: "omit",
      headers: {
        "Authorization": "Token " + this.token,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({keys: [key]}),
    })
    .then(response => response.json())
    .then(data => {return data[0].url});
  }

  // Creates media using the uploaded file.
  createMedia(url) {
    let endpoint;
    if (this.isImage) {
      endpoint = "Medias";
    } else {
      endpoint = "Transcode";
    }
    return fetchRetry(`/rest/${endpoint}/${this.projectId}`, {
      method: "POST",
      signal: this.controller.signal,
      headers: {
        "Authorization": "Token " + this.token,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: this.mediaTypeId,
        gid: this.gid,
        uid: this.upload_uid,
        url: url,
        section: this.section,
        name: this.file.name,
        md5: this.md5,
      }),
      credentials: "omit",
    })
    .then(response => response.json())
    .then(() => {
      removeFromActive(this.upload_uid);
      self.postMessage({command: "uploadDone",
                        filename: this.file.name});
    });
  }

  handleError(error) {
    console.log("Error during upload: " + error);
    removeFromActive(this.upload_uid);
    this.uploadData.retries++;
    if (this.uploadData.retries > 2) {
      self.postMessage({command: "uploadFailed",
                        filename: this.uploadData.file.name});
    } else {
      uploadBuffer.push(this.uploadData);
      startUpload();
    }
  }

  // Calculates md5 hash.
  computeMd5() {
    if (this.mediaTypeId == -1)
    {
      // if this is a tarball, short circuit and always allow the upload
      this.start();
      return;
    }
    let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    const chunkSize = 10*1024*1024; // 10MB
    const chunks = 1; //Math.ceil(this.file.size / chunkSize);
    let currentChunk = 0;
    let spark = new SparkMD5.ArrayBuffer();
    let reader = new FileReader();
    reader.onload = async (e) => {
      spark.append(e.target.result);
      currentChunk++;
      const percentage = (currentChunk / chunks * 10).toFixed(2);
      if (currentChunk < chunks) {
        loadNext();
      } else {
        let md5 = spark.end();

        // Salt in the file size
        this.md5 = SparkMD5.hash(md5 + this.file.size);
        this.start();
      }
    };
    reader.onerror = error => {
      console.error("Error processing MD5");
      removeFromActive(this.upload_uid);
    };
    const loadNext = () => {
      if (this.aborted) {
        console.log("Caught abort in md5 check!");
        return;
      }
      var start = currentChunk * chunkSize;
      var end = ((start + chunkSize) >= this.file.size) ? this.file.size : start + chunkSize;
      reader.readAsArrayBuffer(blobSlice.call(this.file, start, end));
    }
    loadNext();
  }

  // Cancels an upload.
  cancel() {
    this.aborted = true;
    this.controller.abort();
    removeFromActive(this.upload_uid);
  }
}
