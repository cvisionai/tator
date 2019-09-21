importScripts("/static/js/util/fetch-retry.js");

// How much media to fetch at a time for a section.
const mediaFetchSize = 100;

self.addEventListener("message", async evt => {
  const msg = evt.data;
  if (msg.command == "processUpdate") {
    // New process update from websocket
  } else if (msg.command == "sectionInView") {
    // Section moved into or out of view
  } else if (msg.command == "sectionPage") {
    // Section changed pages
  } else if (msg.command == "sectionFilter") {
    // Applies filter to section
  } else if (msg.command == "projectFilter") {
    // Applies filter to whole project
  } else if (msg.command == "init") {
    // Sets token, project.
    self.projectId = msg.projectId;
    self.headers = {
      "Authorization": "Token " + msg.token,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    const url = "/rest/EntityMedias/" + msg.projectId +
      "?operation=attribute_ids::tator_user_sections";
    fetchRetry(url, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    })
    .then(response => response.json())
    .then(data => setupSections(data))
    .catch(err => console.log("Error initializing web worker: " + err));
  }
});

class SectionData {
  constructor(name, numMedia) {
    // Map of UIDs to process objects.
    this._processById = new Map();

    // Sorted list of process UIDs.
    this._sortedIds = [];

    // Sorted list of process progress.
    this._sortedProgress = [];

    // Map of media ID to media, sorted by REST API.
    this._mediaById = new Map();

    // Map of media ID to processed media, populated upon process completion.
    this._processedMediaById = new Map();

    // Number of media
    this._numMedia = numMedia;

    // Whether this section is high priority
    this._priority = false;

    // Whether this section has fetched all media
    this._ready = false;

    // Start index of current page.
    this._start = 0;

    // Stop index of current page.
    this._stop = 0;
  }

  fetchMedia() {
    // Fetches next batch of data
    start = this._mediaById.size();
    stop = start + mediaFetchSize;
    const url = "/rest/EntityMedias/" + self.projectId +
      "?start=" + start + "&stop=" + stop;
    fetchRetry(url, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    })
    .then(response => response.json())
    .then(data => {
      for (const media of data) {
        this._mediaById.set(media.id, media);
      }
      if (this._mediaById.size() >= this._numMedia) {
        this._ready = true;
      }
    })
    .catch(err => console.error("Error retrieving media info: " + err));
  }

  setPage(start, stop) {
    this._start = start;
    this._stop = stop;
    this._emitUpdate();
  }

  updateProcess(process) {
    // Updates an existing process or adds a new one
    this._processById.set(process.uid, process);
    const currentIndex = this._sortedIds.indexOf(process.uid);
    if (currentIndex > -1) {
      this._sortedIds.splice(currentIndex, 1);
      this._sortedProgress.splice(currentIndex, 1);
    }
    const sortedIndex = findSortedIndex(this._sortedProgress, process.percent);
    this._sortedIds.splice(sortedIndex, 0, process.uid);
    this._sortedProgress.splice(sortedIndex, 0, process.percent);
    if (sortedIndex
  }

  _emitUpdate() {
    const numProc = this._processById.size();
    self.prototype.postMessage(
  }
}

setupSections(sectionCounts) {
  self.sections = [];
  for (const section in sectionCounts) {
    self.sections.push(new SectionData(section, sectionCounts[section]));
  }
}

findSortedIndex(arr, val) {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = low + high >>> 1;
    if (arr[mid] < val) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}
      fetchRetry("/rest/UploadProgress/" + projectId, {
        method: "POST",
        headers: {
          "Authorization": "Token " + token,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(messages.slice(start, start + maxMessages)),
        credentials: "omit",

    // Get media ids by attribute.
    var url = 
    if (projectFilter)
    {
      url += "&search=" + projectFilter;
    }
    const mediaPromise = fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    }).then(response => response.json());

