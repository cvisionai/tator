importScripts("/static/js/util/fetch-retry.js");

self.addEventListener("message", async evt => {
  const msg = evt.data;
  if (msg.command == "processUpdate") {
    // New process update from websocket
  } else if (msg.command == "sectionInView") {
    // Section moved into or out of view
  } else if (msg.command == "sectionPage") {
    // Section changed pages
    const section = self.sections.get(msg.section);
    section.setPage(msg.start, msg.stop);
  } else if (msg.command == "sectionFilter") {
    // Applies filter to section
  } else if (msg.command == "projectFilter") {
    // Applies filter to whole project
  } else if (msg.command == "init") {
    // Sets token, project.
    self.projectId = msg.projectId;
    if (typeof msg.sectionOrder == "undefined") {
      self.sectionOrder = [];
    } else {
      self.sectionOrder = msg.sectionOrder;
    }
    self.headers = {
      "Authorization": "Token " + msg.token,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    const url = "/rest/EntityMedias/" + msg.projectId +
      "?operation=attribute_count::tator_user_sections";
    fetchRetry(url, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    })
    .then(response => response.json())
    .then(data => setupSections(data))
    .catch(err => console.log("Error initializing web worker: " + err));
  } else if (msg.command == "moveFileToNew") {
    // Moves media to new section
    const name = newSectionName();
    saveMediaSection(msg.mediaId, name)
    .then(() => {
      const section = self.sections.get(msg.fromSection);
      section.removeMedia(msg.mediaId);
      const data = new SectionData(name, 1);
      self.sections.set(name, data);
      console.log("SETTING SECTION WITH NAME: " + name);
      const index = self.sectionOrder.indexOf(msg.fromSection) + 1;
      self.sectionOrder.splice(index, 0, name);
      saveSectionOrder();
      self.postMessage({
        command: "addSection",
        name: name,
        count: 1,
        afterSection: msg.fromSection,
      });
    });
  }
});

class SectionData {
  constructor(name, numMedia) {
    // Section name.
    this._name = name;
    
    // Map of UIDs to process objects.
    this._processById = new Map();

    // Sorted list of process UIDs.
    this._sortedIds = [];

    // Sorted list of process progress.
    this._sortedProgress = [];

    // Map of media ID to media, sorted by REST API.
    this._mediaById = new Map();

    // List of media IDs.
    this._mediaIds = [];

    // Map of media ID to processed media, populated upon process completion.
    this._processedMediaById = new Map();

    // Number of media
    this._numMedia = numMedia;

    // Whether this section is high priority
    this._priority = false;

    // Start index of current page.
    this._start = 0;

    // Stop index of current page.
    this._stop = 6;
  }

  fetchMedia() {
    // Fetches next batch of data
    const start = this._mediaById.size;
    if (start < this._stop) {
      const url = "/rest/EntityMedias/" + self.projectId +
        "?attribute=tator_user_sections::" + this._name + 
        "&start=" + start + "&stop=" + this._stop;
      fetchRetry(url, {
        method: "GET",
        credentials: "omit",
        headers: self.headers,
      })
      .then(response => response.json())
      .then(data => {
        for (const media of data) {
          this._mediaById.set(media.id, media);
          this._mediaIds.push(media.id);
        }
        this._emitUpdate();
      })
      .catch(err => console.error("Error retrieving media info: " + err));
    } else {
      this._emitUpdate();
    }
  }

  setPage(start, stop) {
    this._start = start;
    this._stop = stop;
    this.fetchMedia();
  }

  updateProcess(process) {
    // Updates an existing process or adds a new one
    this._processById.set(process.uid, process);
    const currentIndex = this._sortedIds.indexOf(process.uid);
    const currentInRange = currentIndex >= this._start && currentIndex < this._stop;
    if (currentIndex > -1) {
      this._sortedIds.splice(currentIndex, 1);
      this._sortedProgress.splice(currentIndex, 1);
    }
    const sortedIndex = findSortedIndex(this._sortedProgress, process.percent);
    this._sortedIds.splice(sortedIndex, 0, process.uid);
    this._sortedProgress.splice(sortedIndex, 0, process.percent);
    const sortedInRange = sortedIndex >= this._start && sortedIndex < this._stop;
    if (currentInRange || sortedInRange) {
      this._emitUpdate();
    }
  }

  removeMedia(mediaId) {
    mediaId = Number(mediaId);
    const media = this._mediaById.get(mediaId);
    console.log("MEDIA: " + media);
    console.log("TYPE OF MEDIA ID: " + typeof mediaId);
    const currentIndex = this._mediaIds.indexOf(mediaId);
    console.log("CURRENT INDEX: " + currentIndex);
    this._mediaIds.splice(currentIndex, 1);
    console.log("MEDIA IDS 1 TO 6: " + this._mediaIds.slice(0, 6));
    this._mediaById.delete(mediaId);
    if (currentIndex >= this._start && currentIndex < this._stop) {
      console.log("EMITTING UPDATE");
      this._emitUpdate();
    }
    return media;
  }

  _emitUpdate() {
    const numProc = this._processById.size;
    const stop = Math.min(numProc, this._stop);
    const procIds = this._sortedIds.slice(this._start, stop);
    const procs = Array.from(
      procIds,
      procId => this._processById.get(procId)
    );
    const start = Math.max(numProc, this._start);
    const mediaIds = this._mediaIds.slice(start, this._stop);
    const media = Array.from(
      mediaIds,
      mediaId => this._mediaById.get(mediaId)
    );
    self.postMessage({
      command: "updateSection",
      name: this._name,
      data: procs.concat(media),
    });
  }
}

function saveSectionOrder() {
  const url = "/rest/Project/" + self.projectId;
  fetchRetry(url, {
    method: "PATCH",
    credentials: "omit",
    headers: self.headers,
    body: JSON.stringify({
      section_order: self.sectionOrder
    }),
  });
}

function setupSections(sectionCounts) {
  let missingOrder = false;
  for (const section of Object.keys(sectionCounts)) {
    if (!self.sectionOrder.includes(section)) {
      self.sectionOrder.push(section);
      missingOrder = true;
    }
  }
  if (missingOrder) {
    saveSectionOrder();
  }
  self.postMessage({
    command: "setupSections",
    data: sectionCounts,
    order: self.sectionOrder,
  });
  self.sections = new Map();
  for (const section in sectionCounts) {
    const data = new SectionData(section, sectionCounts[section]);
    self.sections.set(section, data);
  }
}

function findSortedIndex(arr, val) {
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

function newSectionName() {
  let newName = "Unnamed Section";
  let increment = 1;
  while (self.sections.has(newName)) {
    newName = "Unnamed Section (" + increment + ")";
    increment++;
  }
  return newName;
}

function saveMediaSection(mediaId, sectionName) {
  return fetch("/rest/EntityMedia/" + mediaId, {
    method: "PATCH",
    credentials: "omit",
    headers: self.headers,
    body: JSON.stringify({
      attributes: {tator_user_sections: sectionName}
    }),
  });
}

