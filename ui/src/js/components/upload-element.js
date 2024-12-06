import { TatorElement } from "./tator-element.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";
import { uploadMedia } from "../../../../scripts/packages/tator-js/src/utils/upload-media.js";

export class UploadElement extends TatorElement {
  constructor() {
    super();
    this._fileSelectCallback = this._fileSelectCallback.bind(this);
    this._haveNewSection = false;
    this._abortController = new AbortController();
    this._cancel = false;
    this._chosenSection = null;
    this._chosenImageType = null;
    this._chosenVideoType = null;
    this._videoAttr = {};
    this._imageAttr = {};
  }

  init(store) {
    this._store = store;
    store.subscribe(
      (state) => state.uploadCancelled,
      (cancelled) => {
        if (cancelled) {
          // Cancel next uploads.
          this._cancel = true;
          // Abort uploads in progress.
          this._abortController.abort();
        } else {
          this._cancel = false;
        }
      }
    );
  }

  _checkFile(file, gid) {
    // File extension can have multiple components in archives
    let comps = file.name.split(".").slice(-1);
    let ext = comps.join("."); // rejoin extension

    const isImage = ext.match(
      /(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i
    );
    const isVideo = ext.match(
      /(mp4|avi|3gp|ogg|wmv|webm|flv|mkv|mov|mts|m4v|mpg|mp2|mpeg|mpe|mpv|m4p|qt|swf|avchd|ts)$/i
    );
    const isArchive = ext.match(/^(zip|tar)/i);

    let mediaType = null,
      fileOk = false,
      attributes = null;

    if (
      isImage &&
      this._chosenImageType !== null &&
      this._chosenImageType?.file_format === null
    ) {
      mediaType = this._chosenImageType;
    } else if (
      isVideo &&
      this._chosenVideoType !== null &&
      this._chosenVideoType?.file_format === null
    ) {
      mediaType = this._chosenVideoType;
    }

    const mediaTypes = this._store.getState().mediaTypes;
    for (let currentType of mediaTypes) {
      if (mediaType === null) {
        if (currentType.file_format === null) {
          if (currentType.dtype == "image" && isImage) {
            fileOk = true;
            mediaType = currentType;
            attributes = this._imageAttr;
          } else if (currentType.dtype == "video" && isVideo) {
            fileOk = true;
            mediaType = currentType;
            attributes = this._videoAttr;
          }
        } else {
          fileOk = ext.toLowerCase() === currentType.file_format.toLowerCase();
          mediaType = currentType;

          if (isArchive) {
            fileOk = true;
          }
        }
      } else {
        if (Number(mediaType) === currentType.id) {
          mediaType = currentType;
        }
      }
    }

    if (fileOk) {
      function progressCallback(progress) {
        this._store.setState({ uploadChunkProgress: progress });
      }
      const fileInfo = {
        file: file,
        gid: gid,
        mediaType: isArchive ? -1 : mediaType,
        section:
          this._section && !this._chosenSection
            ? this._section
            : this._chosenSection,
        isImage: isImage,
        isArchive: isArchive,
        progressCallback: progressCallback.bind(this),
        abortController: this._abortController,
        attributes: attributes ? attributes : {},
      };
      // console.log("File is OK", fileInfo);
      return fileInfo;
    }

    this._store.setState({
      uploadError: `${file.name} is not a valid file type for this project!`,
    });
    return false;
  }

  // Iterates through items from drag and drop or file select
  // event and sends them to the upload worker.
  async _fileSelectCallback(ev) {
    // Prevent browser default behavior.
    ev.preventDefault();

    // Send immediate notification of adding files.
    this.dispatchEvent(new Event("addingfiles", { composed: true }));

    // Messages to send to store.
    this._uploads = [];

    // Set a group ID on the upload.
    const gid = uuidv1();

    // Get main page.
    const page = document.getElementsByTagName("project-detail")[0];

    // Show loading gif.
    const loading = document.createElement("img");
    loading.setAttribute("class", "loading");
    loading.setAttribute(
      "src",
      `${STATIC_PATH}/ui/src/images/tator_loading.gif`
    );
    page._projects.appendChild(loading);
    page.setAttribute("has-open-modal", "");

    let numSkipped = 0;
    let numStarted = 0;
    let totalFiles = 0;
    let totalSize = 0;
    this._abortController = new AbortController();
    if (typeof ev.dataTransfer === "undefined") {
      const files = ev.target.files;
      totalFiles = files.length;
      for (const file of files) {
        const added = this._checkFile(file, gid);
        if (added) {
          this._uploads.push(added);
          numStarted++;
          totalSize += file.size;
        } else {
          numSkipped++;
        }
      }
    } else {
      const items = await getAllFileEntries(ev.dataTransfer.items);
      for (const item of items) {
        if (item.isFile) {
          totalFiles++;
          item.file((file) => {
            const added = this._checkFile(file, gid);
            if (added) {
              this._uploads.push(added);
              numStarted++;
              totalSize += file.size;
            } else {
              numSkipped++;
            }
          });
        }
      }
    }
    while (numSkipped + numStarted < totalFiles) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Remove loading gif.
    page._projects.removeChild(loading);
    page.removeAttribute("has-open-modal", "");

    // If upload is big throw up a warning.
    if (totalSize > 60000000000 || numStarted > 5000) {
      const bigUpload = document.createElement("big-upload-form");
      const page = document.getElementsByTagName("project-detail")[0];
      page._projects.appendChild(bigUpload);
      bigUpload.setAttribute("is-open", "");
      page.setAttribute("has-open-modal", "");
      bigUpload.addEventListener("close", (evt) => {
        page.removeAttribute("has-open-modal", "");
        page._projects.removeChild(bigUpload);
      });
      while (bigUpload.hasAttribute("is-open")) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!bigUpload._confirm) {
        page._leaveConfirmOk = false;
        return;
      }
    }

    // If no files were started, notify the user.
    if (numStarted == 0 && totalFiles > 0) {
      page._notify(
        "Invalid files!",
        "No files were added! Make sure selected files are valid for this project.",
        "error"
      );
    } else if (numStarted > 0) {
      this.dispatchEvent(
        new CustomEvent("filesadded", {
          detail: { numSkipped: numSkipped, numStarted: numStarted },
          composed: true,
        })
      );
      let promise = new Promise((resolve) => resolve(true));
      this._store.setState({
        uploadTotalFiles: this._uploads.length,
        uploadCancelled: false,
      });
      for (const [idx, msg] of this._uploads.entries()) {
        promise = promise
          .then(() => {
            if (this._cancel) {
              throw `Upload of ${msg.file.name} cancelled!`;
            }
            this._store.setState({
              uploadFilesComplete: idx,
              uploadChunkProgress: 0,
              uploadFilename: msg.file.name,
            });
            return uploadMedia(msg.mediaType, msg.file, msg);
          })
          .then(() => {
            this._store.setState({
              uploadFilesComplete: idx + 1,
            });
          });
      }
      promise.catch((error) => {
        this._store.setState({ uploadError: error.message });
      });
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
      queue.push(...(await readAllDirectoryEntries(reader)));
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
    console.error(err);
  }
}
