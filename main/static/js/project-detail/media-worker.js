importScripts("/static/js/util/fetch-retry.js");

self.addEventListener("message", async evt => {
  const msg = evt.data;
  if (msg.command == "algorithmProgress") {
    // New algorithm process update from websocket
    const sectionNames = msg.sections.split(",");
    const mediaIds = msg.media_ids.split(",");
    for (let index = 0; index < mediaIds.length; index++) {
      const sectionName = sectionNames[index];
      const mediaId = mediaIds[index];
      if (self.sections.has(sectionName)) {
        const section = self.sections.get(sectionName);
        section.algorithmProgress(mediaId, msg);
      }
    }
  } else if (msg.command == "uploadProgress") {
    // New upload process update from websocket
    let section;
    if (self.sections.has(msg.section)) {
      section = self.sections.get(msg.section);
    } else {
      section = addSection(msg.section, 0, 0);
    }
    section.uploadProgress(msg);
  } else if (msg.command == "sectionPage") {
    // Section changed pages
    const section = self.sections.get(msg.section);
    section.setPage(msg.start, msg.stop);
  } else if (msg.command == "sectionFilter") {
    // Applies filter to section
    // TODO: Implement
  } else if (msg.command == "projectFilter") {
    // Applies filter to whole project
    // TODO: Implement
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
      addSection(name, 1, msg.fromSection);
      section.removeMedia(msg.mediaId);
    });
  } else if (msg.command == "moveFile") {
    saveMediaSection(msg.mediaId, msg.toSection)
    .then(() => {
      const fromSection = self.sections.get(msg.fromSection);
      const toSection = self.sections.get(msg.toSection);
      const media = fromSection.removeMedia(msg.mediaId);
      toSection.addMedia(media);
    });
  } else if (msg.command == "renameSection") {
    const section = self.sections.get(msg.fromName);
    self.sections.set(msg.toName, section);
    const index = self.sectionOrder.indexOf(msg.fromName);
    self.sectionOrder[index] = msg.toName;
    saveSectionOrder();
    self.postMessage({
      command: "updateSectionNames",
      allSections: self.sectionOrder,
    });
  } else if (msg.command == "removeSection") {
    removeSection(msg.sectionName);
  } else if (msg.command == "removeFile") {
    for (const section of self.sections.values()) {
      section.removeMedia(msg.mediaId);
    }
  } else if (msg.command == "requestNewUploadSection") {
    const sectionName = newSectionName();
    const section = addSection(sectionName, 0, 0);
    self.postMessage({
      command: "newUploadSection",
      sectionName: sectionName,
    });
  } else if (msg.command == "requestMoreSections") {
    loadSections();
  }
});

class SectionData {
  constructor(name, numMedia) {
    // Section name.
    this._name = name;

    // Media processes.
    this._mediaProcesses = new Map();

    // Upload processes.
    this._uploadProcesses = new Map();
    
    // Sorted list of upload UIDs.
    this._uploadIds = [];

    // Sorted list of upload progress.
    this._uploadProgress = [];

    // Map of media ID to media, sorted by REST API.
    this._mediaById = new Map();

    // List of media IDs.
    this._mediaIds = [];

    // Number of media
    this._numMedia = numMedia;

    // Start index of current page.
    this._start = 0;

    // Stop index of current page.
    this._stop = 6;

    // Last time a UI update was emitted.
    this._lastEmit = Date.now();

    // Timeout for emit function.
    this._emitTimeout = null;

    // Whether this section has been drawn by the UI.
    this.drawn = false;
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

  algorithmProgress(mediaId, process) {
    mediaId = Number(mediaId);
    this._mediaProcesses.set(mediaId, process);
    if (this._mediaById.has(mediaId)) {
      this._emitUpdate();
    }
  }

  uploadProgress(process) {
    // Updates an existing process or adds a new one
    if (!this._uploadProcesses.has(process.uid)) {
      this._numMedia++;
    }
    this._uploadProcesses.set(process.uid, process);
    const currentIndex = this._uploadIds.indexOf(process.uid);
    const currentInRange = currentIndex >= this._start && currentIndex < this._stop;
    if (currentIndex > -1) {
      this._uploadIds.splice(currentIndex, 1);
      this._uploadProgress.splice(currentIndex, 1);
    }
    let sortMetric = process.progress;
    if (process.state == "finished") {
      sortMetric = -1;
    } else if (process.state == "failed") { // Failures bubble to top
      sortMetric = 100;
    }
    const sortedIndex = findSortedIndex(this._uploadProgress, sortMetric);
    this._uploadIds.splice(sortedIndex, 0, process.uid);
    this._uploadProgress.splice(sortedIndex, 0, sortMetric);
    const sortedInRange = sortedIndex >= this._start && sortedIndex < this._stop;
    this._emitUpdate();
  }

  removeMedia(mediaId) {
    mediaId = Number(mediaId);
    let media = null;
    if (this._mediaById.has(mediaId)) {
      media = this._mediaById.get(mediaId);
      const currentIndex = this._mediaIds.indexOf(mediaId);
      this._mediaIds.splice(currentIndex, 1)[0];
      this._mediaById.delete(mediaId);
      this._numMedia--;
      if (this._numMedia <= 0) {
        removeSection(this._name);
      } else if (currentIndex >= this._start && currentIndex < this._stop) {
        this.fetchMedia();
      }
    }
    return media;
  }

  addMedia(media) {
    // Add media to top of list so user can see it was added, this ordering
    // is not preserved on reload.
    this._mediaIds.unshift(media.id);
    this._mediaById.set(media.id, media);
    this._numMedia++;
    this.fetchMedia();
  }

  _emitUpdateUnthrottled() {
    if (this.drawn) {
      const numUploads = this._uploadProcesses.size;
      const stopUploads = Math.min(numUploads, this._stop);
      const procIds = this._uploadIds.slice(this._start, stopUploads);
      const procs = Array.from(
        procIds,
        procId => this._uploadProcesses.get(procId)
      );
      const start = Math.max(0, this._start - numUploads);
      const stop = Math.max(0, this._stop - numUploads);
      const mediaIds = this._mediaIds.slice(start, stop);
      const media = Array.from(
        mediaIds,
        mediaId => {
          mediaId = Number(mediaId);
          let media = this._mediaById.get(mediaId);
          if (this._mediaProcesses.has(mediaId)) {
            const process = this._mediaProcesses.get(mediaId);
            media = {
              ...media,
              uid: process.uid,
              progress: process.progress,
              state: process.state,
              message: process.message,
            };
          }
          return media;
        }
      );
      self.postMessage({
        command: "updateSection",
        name: this._name,
        count: this._numMedia,
        data: procs.concat(media),
        allSections: self.sectionOrder,
      });
    }
  }

  _emitUpdate() {
    clearTimeout(this._emitTimeout);
    this._emitTimeout = setTimeout(() => {
      if ((Date.now() - this._lastEmit) >= 250) {
        this._emitUpdateUnthrottled();
        this._lastEmit = Date.now();
      }
    }, 250 - (Date.now() - this._lastEmit));
  }
}

function addSection(sectionName, count, afterSection) {
  const data = new SectionData(sectionName, count);
  data.drawn = true;
  self.sections.set(sectionName, data);
  let index = 0;
  if (typeof afterSection === "string") {
    index = self.sectionOrder.indexOf(afterSection) + 1;
  }
  self.sectionOrder.splice(index, 0, sectionName);
  saveSectionOrder();
  self.postMessage({
    command: "addSection",
    name: sectionName,
    count: count,
    afterSection: afterSection,
    allSections: self.sectionOrder,
  });
  return data;
}

function removeSection(sectionName) {
  const index = self.sectionOrder.indexOf(sectionName);
  self.sectionOrder.splice(index, 1);
  saveSectionOrder();
  self.sections.delete(sectionName);
  self.postMessage({
    command: "removeSection",
    name: sectionName,
    allSections: self.sectionOrder,
  });
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
  const invalidSections = [];
  for (const section of self.sectionOrder) {
    if (!(section in sectionCounts)) {
      invalidSections.push(section);
    }
  }
  for (const section of invalidSections) {
    const removeIndex = self.sectionOrder.indexOf(section);
    self.sectionOrder.splice(removeIndex, 1);
  }
  if (missingOrder) {
    saveSectionOrder();
  }
  self.sections = new Map();
  for (const section in sectionCounts) {
    const data = new SectionData(section, sectionCounts[section]);
    self.sections.set(section, data);
  }
  self.postMessage({
    command: "workerReady"
  });
  loadSections();
}

function loadSections() {
  const maxSections = 4;
  let numLoaded = 0;
  for (const sectionName of self.sectionOrder) {
    if (self.sections.has(sectionName)) {
      const section = self.sections.get(sectionName);
      if (!section.drawn) {
        section.drawn = true;
        self.postMessage({
          command: "addSection",
          name: sectionName,
          count: section._numMedia,
          afterSection: -1, // Append to end
          allSections: self.sectionOrder,
        });
        numLoaded++;
        if (numLoaded >= maxSections) {
          return;
        }
      }
    }
  }
}

function findSortedIndex(arr, val) {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = low + high >>> 1;
    if (arr[mid] >= val) {
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

