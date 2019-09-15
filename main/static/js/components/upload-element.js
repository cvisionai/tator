// Base class for elements that can initiate an upload.
// @emits {filesadded} emitted when files have been listed and filtered.
// Call _fileSelectCallback with an <input> element 'change' event or <div> element 'drop' event.
// Listen to navigator.serviceWorker's message, with msg.data=allset when uploads have been copied over.
class UploadElement extends TatorElement {
  constructor() {
    super();

    this._fileSelectCallback = this._fileSelectCallback.bind(this);
  }
      
  static get observedAttributes() {
    return ["project-id", "username", "token"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "project-id") {
      // Get all media types for this project.
      fetch("/rest/EntityTypeMedias/" + newValue, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      })
      .then(response => response.json())
      .then(data => {
        this._mediaTypes = data;
      });
    }
    else if (name === "username") {
      this._username = newValue;
    }
    else if (name === "token") {
      this._token = newValue;
    }
  }

  // Iterates through items from drag and drop or file select 
  // event and sends them to the upload worker.
  async _fileSelectCallback(ev) {
    // Prevent browser default behavior.
    ev.preventDefault();

    // Messages to send to service worker.
    let messages = [];

    // Set a group ID on the upload.
    const gid = uuidv1();

    // Get section name for this element.
    const section = this._uploadSection();

    // Define a function for checking extension of a file. Returns true if 
    // extension ok, false if skipped.
    const checkFile = file => {
      let ext = file.name.split(".").pop();
      for (let idx = 0; idx < this._mediaTypes.length; idx++) {
        // TODO: It is possible for users to define two media types with
        // the same extension, in which case we might be uploading to the
        // wrong media type.
        const mediaType = this._mediaTypes[idx];
        if (ext.toLowerCase() === mediaType.file_format.toLowerCase()) {
          messages.push({
            "command": "addUpload",
            "file": file,
            "gid": gid,
            "section": section,
            "username": this._username,
            "projectId": this.getAttribute("project-id"),
            "mediaTypeId": mediaType.id,
            "token": this._token,
          });
          return true;
        }
      }
      return false;
    };

    let numSkipped = 0;
    let numStarted = 0;
    let totalFiles = 0;
    if (typeof ev.dataTransfer === "undefined") {
      const files = ev.target.files;
      totalFiles = files.length;
      for (const file of files) {
        const added = checkFile(file);
        if (added) { numStarted++; } else { numSkipped++; }
      }
    } else {
      const items = await getAllFileEntries(ev.dataTransfer.items);
      for (const item of items) {
        if (item.isFile) {
          totalFiles++;
          item.file(file => {
            const added = checkFile(file);
            if (added) { numStarted++; } else { numSkipped++; }
          });
        }
      }
    }
    while (numSkipped + numStarted < totalFiles) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.dispatchEvent(new CustomEvent("filesadded", {
      detail: {numSkipped: numSkipped, numStarted: numStarted},
      composed: true
    }));
    for (const msg of messages) {
      window._serviceWorker.postMessage(msg);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    if (numStarted > 0) {
      this.dispatchEvent(new Event("allset", {composed: true}));
    }
  }
}

// Drop handler function to get all files
async function getAllFileEntries(dataTransferItemList) {
  let fileEntries = [];
  // Use BFS to traverse entire directory/file structure
  let queue = [];
  // Unfortunately dataTransferItemList is not iterable i.e. no forEach
  for (let i = 0; i < dataTransferItemList.length; i++) {
    queue.push(dataTransferItemList[i].webkitGetAsEntry());
  }
  while (queue.length > 0) {
    let entry = queue.shift();
    if (entry.isFile) {
      fileEntries.push(entry);
    } else if (entry.isDirectory) {
      let reader = entry.createReader();
      queue.push(...await readAllDirectoryEntries(reader));
    }
  }
  return fileEntries;
}

// Get all the entries (files or sub-directories) in a directory by calling
// readEntries until it returns empty array
async function readAllDirectoryEntries(directoryReader) {
  let entries = [];
  let readEntries = await readEntriesPromise(directoryReader);
  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await readEntriesPromise(directoryReader);
  }
  return entries;
}

// Wrap readEntries in a promise to make working with readEntries easier
async function readEntriesPromise(directoryReader) {
  try {
    return await new Promise((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
  } catch (err) {
    console.log(err);
  }
}

