// Manages an upload.
class SingleUpload {

  constructor(uploadData) {
    this.last_progress = Date.now();
    this.file = uploadData.file;
    this.validationType = typeof uploadData.validationType != undefined ? uploadData.validationType : "image";
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
    this.controller = new AbortController();
 }

  // Starts the upload, chaining together all promises.
  start() {
    // Compute number of parts.
    return this.getUploadInfo()
    .then(info => this.uploadSingle(info))
    .then(key => key)
    //.then(url => this.createMedia(url))
    //.catch(error => this.handleError(error));
  }

  // Returns promise resolving to upload.
  getUploadInfo() {
    return fetch(`/rest/UploadInfo/${this.projectId}?num_parts=${this.numParts}`, {
      method: "GET",
      signal: this.controller.signal,
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => response.json());
  }

  // Uploads using a single request.
  uploadSingle(info) {
    return fetch(info.urls[0], {
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
    return fetch(`/rest/DownloadInfo/${this.projectId}?expiration=86400`, {
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
    .then(data => {
      return data[0].url
    });
  }

  handleError(error) {
    console.error("Error during upload: " + error);
    //this.removeFromActive(this.upload_uid);
    // this.uploadData.retries++;
    // if (this.uploadData.retries > 2) {
    //   self.postMessage({command: "uploadFailed",
    //                     filename: this.uploadData.file.name});
    // } else {
    //   uploadBuffer.push(this.uploadData);
    // //  startUpload();
    // }
  }

  removeFromActive(uid) {
    // if (uid in activeUploads) {
    //   const key = [activeUploads[uid].projectId, activeUploads[uid].token].join();
    //   delete activeUploads[uid];
    // }
    //startUpload();
  }

  // Cancels an upload.
  cancel() {
    this.aborted = true;
    this.controller.abort();
    //removeFromActive(this.upload_uid);
  }

  validateImage(data) {
    return true;
  }
  validateYaml(data) {
    return true;
  }
}


