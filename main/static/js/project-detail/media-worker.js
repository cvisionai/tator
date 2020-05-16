importScripts("/static/js/util/fetch-retry.js");

const _fetchBufferSize = 100; // Additional media to fetch past last displayed

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
  } else if (msg.command == "filterSection") {
    // Applies filter to section
    let url = "/rest/MediaSections/" + self.projectId +
      "?attribute=tator_user_sections::" + msg.sectionName;
    if (msg.query) {
      url += "&search=" + msg.query;
    }
    fetchRetry(url, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    })
    .then(response => response.json())
    .then(attrs => updateSection(attrs, msg.query))
    .catch(err => console.log("Error applying filter: " + err));
  } else if (msg.command == "filterProject") {
    // Applies filter to whole project
    let url = "/rest/MediaSections/" + self.projectId;
    if (msg.query) {
      url += "?search=" + msg.query;
    }
    fetchRetry(url, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    })
    .then(response => response.json())
    .then(attrs => updateSections(attrs, msg.query))
    .catch(err => console.log("Error applying filter: " + err));
    self.projectFilter = msg.query;
  } else if (msg.command == "init") {
    // Sets token, project.
    self.projectId = msg.projectId;
    self.projectFilter = msg.projectFilter;
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
    const url = "/rest/MediaSections/" + msg.projectId;
    const attributePromise = fetchRetry(url, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    });
    let filterUrl = url;
    if (msg.projectFilter) {
      filterUrl += "?search=" + msg.projectFilter;
    }
    const filterPromise = fetchRetry(filterUrl, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    });
    const algUrl = "/rest/Algorithms/" + msg.projectId;
    const algorithmPromise = fetchRetry(algUrl, {
      method: "GET",
      credentials: "omit",
      headers: self.headers,
    });
    Promise.all([attributePromise, filterPromise, algorithmPromise])
    .then(responses => Promise.all(responses.map(resp => resp.json())))
    .then(([attrs, filtAttrs, algs]) => {
      self.postMessage({
        command: "algorithms",
        algorithms: algs,
      });
      setupSections(attrs, filtAttrs, msg.projectFilter);
    })
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
  constructor(name, numMedia, search) {
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
    this._numMedia = this._getNumMedia(numMedia);

    // Search string
    this._search = search 

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

  _getNumMedia(sectionResponse) {
    let count = 0;
    if (typeof sectionResponse.num_videos !== "undefined") {
      count += sectionResponse.num_videos;
    }
    if (typeof sectionResponse.num_images !== "undefined") {
      count += sectionResponse.num_images;
    }
    return count;
  }

  getSectionFilter() {
    let url = "?attribute=tator_user_sections::" + this._name;
    if (this._search !== null) {
      url += "&search=" + this._search;
    }
    return url;
  }

  fetchMedia() {
    // Fetches next batch of data
    const start = this._mediaById.size;
    const stop = Number(this._stop) + Number(_fetchBufferSize);
    const needData = start < this._stop;
    if (!needData) {
      this._emitUpdate();
    }
    if (start < stop) {
      const url = "/rest/Medias/" + self.projectId + 
        this.getSectionFilter() +
        "&start=" + start + "&stop=" + stop;
      console.log("Fetching media " + start + " to " + stop);
      fetchRetry(url, {
        method: "GET",
        credentials: "omit",
        headers: self.headers,
      })
      .then(response => response.json())
      .then(data => {
        for (const media of data) {
          if (this._mediaIds.includes(media.id)) {
            // TODO figure out why this is happening
            console.error("Media with ID " + media.id + " was fetched more than once!");
          } else {
            this._mediaById.set(media.id, media);
            this._mediaIds.push(media.id);
          }
        }
        if (needData) {
          this._emitUpdate();
        }
      })
      .catch(err => console.error("Error retrieving media info: " + err));
    }
  }

  setFilter(numMedia, search) {
    this._mediaById = new Map();
    this._mediaIds = [];
    this._search = search;
    this._numMedia = this._getNumMedia(numMedia);
    this.fetchMedia();
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
    // If the process already exists, update it instead of rewriting it,
    // since it may contain thumbnail info.
    if (this._uploadProcesses.has(process.uid)) {
      const existing = this._uploadProcesses.get(process.uid);
      this._uploadProcesses.set(process.uid, {...existing, ...process});
    } else {
      this._uploadProcesses.set(process.uid, process);
    }
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
    self.postMessage({
      command: "updateOverview",
      sectionName: this._name,
    });
    return media;
  }

  addMedia(media) {
    // Add media to top of list so user can see it was added, this ordering
    // is not preserved on reload.
    this._mediaIds.unshift(media.id);
    this._mediaById.set(media.id, media);
    this._numMedia++;
    this.fetchMedia();
    self.postMessage({
      command: "updateOverview",
      sectionName: this._name,
    });
  }

  _emitUpdateUnthrottled() {
    if (this.drawn) {
      const uploadIds = this._uploadIds.filter(procId => {
        let keep = true;
        if (this._search !== null) {
          const proc = this._uploadProcesses.get(procId);
          keep = proc.name.includes(this._search);
        }
        return keep;
      });
      const numUploads = uploadIds.length;
      const stopUploads = Math.min(numUploads, this._stop);
      const procIds = uploadIds.slice(this._start, stopUploads);
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
        sectionFilter: this.getSectionFilter(),
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
  const data = new SectionData(sectionName, count, self.projectFilter);
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

function setupSections(sectionCounts, filteredCounts, projectFilter) {
  for (const section of Object.keys(sectionCounts)) {
    if (!self.sectionOrder.includes(section)) {
      self.sectionOrder.push(section);
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
  self.sectionOrder.sort((left, right) => {
    return left.toLowerCase().localeCompare(right.toLowerCase());
  });
  saveSectionOrder();
  self.sections = new Map();
  for (const section in sectionCounts) {
    let data;
    if (section in filteredCounts) {
      data = new SectionData(section, filteredCounts[section], projectFilter);
    } else {
      data = new SectionData(section, 0, projectFilter);
    }
    self.sections.set(section, data);
  }
  self.postMessage({
    command: "workerReady"
  });
  loadSections();
}

function updateSections(sectionCounts, projectFilter) {
  for (const sectionName of self.sectionOrder) {
    if (self.sections.has(sectionName)) {
      const section = self.sections.get(sectionName);
      if (sectionName in sectionCounts) {
        section.setFilter(sectionCounts[sectionName], projectFilter);
      } else {
        section.setFilter(0, projectFilter);
      }
    }
  }
}

function updateSection(sectionCounts, sectionFilter) {
  for (const sectionName in sectionCounts) {
    const section = self.sections.get(sectionName);
    section.setFilter(sectionCounts[sectionName], sectionFilter);
  }
}

function loadSections() {
  const maxSections = 4;
  let numLoaded = 0;

  // This function gets called multiple times, and section order
  // may not be known yet.
  if (self.sectionOrder == undefined || self.sectionOrder == null)
  {
    return;
  }
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
          setTimeout(() => {
            self.postMessage({
              command: "checkVisibility",
            });
          }, 1000);
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
  return fetchRetry("/rest/Media/" + mediaId, {
    method: "PATCH",
    credentials: "omit",
    headers: self.headers,
    body: JSON.stringify({
      attributes: {tator_user_sections: sectionName}
    }),
  });
}

