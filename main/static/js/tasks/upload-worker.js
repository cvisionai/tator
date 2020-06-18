let window = self;

// Import tus.
importScripts("/static/js/tus.min.js");

// Import sparkmd5.
importScripts("/static/js/md5.min.js");

// Import uuid.
importScripts("/static/js/node-uuid.js");

// Import fetch retry.
importScripts("/static/js/util/fetch-retry.js");

// UID for this service worker.
const serviceWorkerId = uuidv1();
console.log("This service worker's UID: " + serviceWorkerId);

// List of uploads in progress.
let activeUploads = {};
const maxUploads = 1;

// Buffer of uploads.
let uploadBuffer = [];

// Buffer of progress messages.
let progressBuffer = {};

// Define function for sending message to client.
const emitMessage = msg => {
  self.clients.matchAll({includeUncontrolled: true})
  .then(clients => {
    for (const client of clients) {
      client.postMessage(msg);
    }
  });
};

// Set up periodic function to send progress messages.
self.setInterval(() => {
  const maxMessages = 1000;
  for (const key in progressBuffer) {
    const [projectId, token] = key.split(",");
    const messages = Object.values(progressBuffer[key]);
    let start = 0;
    while (start < messages.length) {
      const sendMe = messages.slice(start, start + maxMessages);
      fetchRetry("/rest/Progress/" + projectId, {
        method: "POST",
        headers: {
          "Authorization": "Token " + token,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(sendMe),
        credentials: "omit",
      })
      .catch(err => console.error("Error while broadcasting progress:" + err));
      start += sendMe.length;
    }
  }
  progressBuffer = {};
}, 50);

// Define function to add message to progress buffer.
const bufferMessage = (projectId, token, uid, msg) => {
  const key = [projectId, token].join();
  if (!(key in progressBuffer)) {
    progressBuffer[key] = {};
  }
  progressBuffer[key][uid] = msg;
}

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
  } else if (msg.command == "getNumUploads") {
    console.log("Received get num uploads request.");
    const numActive = Object.keys(activeUploads).length;
    const numBuffered = uploadBuffer.length;
    const numUploads = numActive + numBuffered;
    console.log("Responding with " + numUploads + " uploads.");
    emitMessage({msg: "numUploads", count: numUploads});
  } else if (msg.command == "startUpload") {
    startUpload();
  } else if (msg.command == "cancelUpload") {
    if (msg.uid in activeUploads) {
      activeUploads[msg.uid].cancel();
    } else {
      // Get the record and use it to send failure message.
      const index = uploadBuffer.findIndex(elem => elem.uid == msg.uid);
      if (index != -1) {
        removeQueued(index);
      }
    }
  } else if (msg.command == "cancelGroupUpload") {
    // Cancel queued uploads
    while (true) {
      const index = uploadBuffer.findIndex(elem => elem.gid == msg.gid);
      if (index == -1) {
        break;
      } else {
        removeQueued(index);
      }
    }
    // Cancel active uploads
    while (true) {
      let found = false;
      for (const uid in activeUploads) {
        const upload = activeUploads[uid];
        if (upload.gid == msg.gid) {
          found = true;
          upload.cancel();
          break;
        }
      }
      if (!found) {
        break;
      }
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
    self.postMessage({command: "uploadsDone"});
  }
}

// Removes upload from list of active uploads.
function removeFromActive(uid) {
  if (uid in activeUploads) {
    const key = [activeUploads[uid].projectId, activeUploads[uid].token].join();
    if (key in progressBuffer) {
      if (uid in progressBuffer) {
        delete progressBuffer[key][uid];
      }
    }
    delete activeUploads[uid];
  }
  startUpload();
}

// Manages an upload.
class Upload {

  constructor(uploadData) {
    this.start_time = Date.now();
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

    // Fingerprint function for TUS client required (also needs to return a promise).
    // It'll use the same upload UID used elsewhere by this class.
    this.upload_uid = SparkMD5.hash(this.file.name + this.file.type + uploadData.username + this.file.size)
    this.fingerprint = function(uid) {
      return function(file, options) {
        return Promise.resolve(uid)
      }
    }(this.upload_uid)

    // Create a list item with progress bar.
    this.md5 = "";
    this.fname = uploadData.file.name;

    // Create a tus upload.
    this.tus_ep = self.location.origin + "/files/";
    this.tus = new tus.Upload(this.file, {
      endpoint: this.tus_ep,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      fingerprint: this.fingerprint,
      metadata: {
        filename: this.file.name,
        filetype: this.file.type
      },
      chunkSize: 5*1024*1024, // 5MB
      onProgress: (bytesSent, bytesTotal) => {
        let percent = 100.0 * bytesSent / bytesTotal
        if (percent < 100) {
          let message = "Uploading...";
          let progressPercent = Math.max(percent, 10);
          progressPercent = progressPercent.toFixed(2)
          this.progress("started", message, progressPercent);
        }
      },
      onError: error => {
        console.log("Error during upload: " + error);
        removeFromActive(this.upload_uid);
        this.uploadData.retries++;
        if (this.uploadData.retries > 2) {
          this.progress("failed", error, 100);
        } else {
          uploadBuffer.push(this.uploadData);
          startUpload();
        }
      },
      onSuccess: () => {
        let endpoint;

        if (this.isImage) {
          endpoint = "SaveImage";
        } else {
          endpoint = "Transcode";
        }
        // REST call initiating transcode.
        fetchRetry("/rest/" + endpoint + "/" + this.projectId, {
          method: "POST",
          headers: {
            "Authorization": "Token " + this.token,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: this.mediaTypeId,
            gid: this.gid,
            uid: this.upload_uid,
            url: this.tus.url,
            section: this.section,
            name: this.tus.file.name,
            md5: this.md5,
          }),
          credentials: "omit",
        })
        .catch(err => console.error("Error attempting to initiate transcode:" + err));
        removeFromActive(this.upload_uid);
      }
    });

  }

  // Sends progress messages.
  progress(state, msg, pct) {
    bufferMessage(this.projectId, this.token, this.upload_uid, {
      job_type: "upload",
      gid: this.gid,
      uid: this.upload_uid,
      swid: serviceWorkerId,
      section: this.section,
      name: this.fname,
      state: state,
      message: msg,
      progress: pct,
    });
  }

  // Calculates md5 hash.
  computeMd5() {
    if (this.mediaTypeId == -1)
    {
      // if this is a tarball, short circuit and always allow the upload
      this.tus.start();
      return;
    }
    let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    const chunkSize = 100*1024*1024; // 100MB
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
        if (currentChunk % 20 === 0) {
          this.progress("started", "Checking...", percentage);
        }
      } else {
        let md5 = spark.end();

        // Salt in the file size
        this.md5 = SparkMD5.hash(md5 + this.file.size);
        this.tus.start();
      }
    };
    reader.onerror = error => {
      console.error("Error processing MD5");
      removeFromActive(this.upload_uid);
      this.progress("failed", error, 0);
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
    if (this.tus._source) {
      this.tus.abort();
    }
    removeFromActive(this.upload_uid);
    this.progress("failed", "Upload was aborted!", 0);
  }
}


