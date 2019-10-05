class ProjectDetail extends TatorPage {
  constructor() {
    super();

    this._worker = new Worker("/static/js/project-detail/media-worker.js");

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const div = document.createElement("div");
    div.setAttribute("class", "py-6");
    main.appendChild(div);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-justify-between");
    div.appendChild(header);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    header.appendChild(h1);

    this._projectText = document.createTextNode("");
    h1.appendChild(this._projectText);

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex");
    header.appendChild(buttons);

    this._algorithmButton = document.createElement("algorithm-button");
    buttons.appendChild(this._algorithmButton);

    this._uploadButton = document.createElement("upload-button");
    this._uploadButton.worker = this._worker;
    buttons.appendChild(this._uploadButton);

    this._description = document.createElement("project-text");
    div.appendChild(this._description);

    const subheader = document.createElement("div");
    subheader.setAttribute("class", "d-flex flex-justify-between");
    main.appendChild(subheader);

    this._search = document.createElement("project-search");
    subheader.appendChild(this._search);

    this._collaborators = document.createElement("project-collaborators");
    subheader.appendChild(this._collaborators);

    this._projects = document.createElement("div");
    main.appendChild(this._projects);

    this._newSection = document.createElement("new-section");
    this._newSection.worker = this._worker;
    this._projects.appendChild(this._newSection);

    const deleteSection = document.createElement("delete-section-form");
    this._projects.appendChild(deleteSection);

    const deleteFile = document.createElement("delete-file-form");
    this._projects.appendChild(deleteFile);

    this._progress = document.createElement("progress-summary");
    this._shadow.insertBefore(this._progress, main);

    this._leaveConfirmOk = false;

    window.addEventListener("beforeunload", evt => {
      if (this._leaveConfirmOk) {
        evt.preventDefault();
        evt.returnValue = '';
        window.alert("Uploads are in progress. Still leave?");
      }
    });

    window.addEventListener("scroll", this._checkSectionVisibility.bind(this));

    this._worker.addEventListener("message", evt => {
      const msg = evt.data;
      if (msg.command == "updateSection") {
        const section = this._shadow.querySelector("media-section[id='" + msg.name + "']");
        if (section) {
          section.numMedia = msg.count;
          section.cardInfo = msg.data;
        }
        this._updateSectionNames(msg.allSections);
      } else if (msg.command == "removeSection") {
        const section = this._shadow.querySelector("media-section[id='" + msg.name + "']");
        if (section) {
          this._projects.removeChild(section);
          this._checkSectionVisibility();
        }
        this._updateSectionNames(msg.allSections);
      } else if (msg.command == "addSection") {
        const projectId = this.getAttribute("project-id");
        this._createNewSection(msg.name, projectId, msg.count, msg.afterSection);
        this._updateSectionNames(msg.allSections);
      } else if (msg.command == "updateSectionNames") {
        this._updateSectionNames(msg.allSections);
      } else if (msg.command == "workerReady") {
        window.dispatchEvent(new Event("readyForWebsocket"));
      } else if (msg.command == "algorithms") {
        this._algorithms = msg.algorithms;
        this._algorithmButton.algorithms = msg.algorithms;
      }
    });

    this._removeCallback = evt => {
      deleteSection.setAttribute("section-filter", evt.detail.sectionFilter);
      deleteSection.setAttribute("section-name", evt.detail.sectionName);
      deleteSection.setAttribute("project-id", evt.detail.projectId);
      deleteSection.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    deleteSection.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    deleteSection.addEventListener("confirmDelete", evt => {
      this._worker.postMessage({
        command: "removeSection",
        sectionName: evt.detail.sectionName,
      });
      deleteSection.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });

    this._deleteFileCallback = evt => {
      deleteFile.setAttribute("media-id", evt.detail.mediaId);
      deleteFile.setAttribute("media-name", evt.detail.mediaName);
      deleteFile.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    deleteFile.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    deleteFile.addEventListener("confirmFileDelete", evt => {
      this._worker.postMessage({
        command: "removeFile",
        mediaId: evt.detail.mediaId,
      });
      deleteFile.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });

    this._newAlgorithmCallback = evt => {
      const newAlgorithm = document.createElement("new-algorithm-form");
      this._projects.appendChild(newAlgorithm);
      newAlgorithm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      newAlgorithm.addEventListener("close", evt => {
        this.removeAttribute("has-open-modal", "");
        this._projects.removeChild(evt.target);
      });
    };

    this._algorithmButton.addEventListener("newAlgorithm", this._newAlgorithmCallback);

    this._progress.addEventListener("uploadProgress", evt => {
      const msg = evt.detail.message;
      if (msg.project_id == this.getAttribute("project-id")) {
        this._worker.postMessage({
          command: "uploadProgress",
          ...msg
        });
      }
    });

    this._progress.addEventListener("algorithmProgress", evt => {
      const msg = evt.detail.message;
      if (msg.project_id == this.getAttribute("project-id")) {
        this._worker.postMessage({
          command: "algorithmProgress",
          ...msg
        });
      }
    });

    this._newSection.addEventListener("addingfiles", this._addingFilesCallback.bind(this));
    this._newSection.addEventListener("filesadded", this._filesAddedCallback.bind(this));
    this._newSection.addEventListener("allset", this._allSetCallback.bind(this));

    this._uploadButton.addEventListener("addingfiles", this._addingFilesCallback.bind(this));
    this._uploadButton.addEventListener("filesadded", this._filesAddedCallback.bind(this));
    this._uploadButton.addEventListener("allset", this._allSetCallback.bind(this));

    this._loaded = 0;
    this._needScroll = true;

    this._lastQuery = (this._search.value == "" ? null : this._search.value);
    this._search.addEventListener("filterProject", evt => {
      const query = evt.detail.query;
      if (query != this._lastQuery) {
        if (query.length >= 3) {
          this._lastQuery = query;
        } else if (query == "") {
          this._lastQuery = null;
        }
        this._worker.postMessage({
          command: "filterProject",
          query: this._lastQuery,
        });
      }
    });
  }

  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
  }

  _checkSectionVisibility() {
    const rect = this._projects.getBoundingClientRect();
    if (rect.bottom < window.innerHeight + 300) {
      this._worker.postMessage({command: "requestMoreSections"});
    }
  }

  _updateMedia(projectFilter) {
    const projectId = this.getAttribute("project-id");
    // Get info about the project.
    fetch("/rest/Project/" + projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(data => {
      this._projectText.nodeValue = data.name;
      this._search.setAttribute("project-name", data.name);
      this._description.setAttribute("text", data.summary);
      this._collaborators.usernames = data.usernames;
      this._search.autocomplete = data.filter_autocomplete;
      let projectFilter = null;
      let params = new URLSearchParams(document.location.search.substring(1));
      if (params.has("search")) {
        projectFilter = params.get("search");
      }
      this._worker.postMessage({
        command: "init",
        projectId: projectId,
        sectionOrder: data.section_order,
        projectFilter: projectFilter,
        token: this.getAttribute("token"),
      });
    })
    .catch(err => console.log("Failed to retrieve project data: " + err));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "username":
        this._uploadButton.setAttribute("username", newValue);
        this._newSection.setAttribute("username", newValue);
        break;
      case "project-id":
        this._uploadButton.setAttribute("project-id", newValue);
        this._algorithmButton.setAttribute("project-id", newValue);
        this._newSection.setAttribute("project-id", newValue);
        this._updateMedia();
        break;
      case "token":
        this._uploadButton.setAttribute("token", newValue);
        this._newSection.setAttribute("token", newValue);
        break;
    }
  }

  _updateSections() {
    // Update media sections
    const names = Object.keys(this._sections);
    for (const name of names) {
      var update=[]
      if (name in this._mediaIds) {
        update = this._mediaIds[name];
      }
      this._sections[name].mediaIds = update;
      if (this._lastQuery) {
        this._sections[name].overview.updateForSearch(update);
      } else {
        this._sections[name].overview.updateForAllSoft();
      }
    }
  }

  _createNewSection(sectionName, projectId, numMedia, afterSection) {
    const newSection = document.createElement("media-section");
    newSection.setAttribute("project-id", projectId);
    newSection.setAttribute("name", sectionName);
    newSection.setAttribute("id", sectionName);
    newSection.setAttribute("username", this._uploadButton.getAttribute("username"));
    newSection.setAttribute("token", this._uploadButton.getAttribute("token"));
    newSection.worker = this._worker;
    newSection.numMedia = numMedia;
    newSection.algorithms = this._algorithms;
    newSection.addEventListener("addingfiles", this._addingFilesCallback.bind(this));
    newSection.addEventListener("filesadded", this._filesAddedCallback.bind(this));
    newSection.addEventListener("allset", this._allSetCallback.bind(this));
    newSection.addEventListener("remove", this._removeCallback);
    newSection.addEventListener("deleteFile", this._deleteFileCallback);
    newSection.addEventListener("newAlgorithm", this._newAlgorithmCallback);
    newSection.addEventListener("moveFileToNew", evt => {
      this._worker.postMessage({
        command: "moveFileToNew",
        fromSection: sectionName,
        mediaId: evt.detail.mediaId,
      });
    });
    newSection.addEventListener("moveFile", evt => {
      this._worker.postMessage({
        command: "moveFile",
        fromSection: sectionName,
        toSection: evt.detail.to,
        mediaId: evt.detail.mediaId,
      });
    });
    newSection.addEventListener("cancelUpload", evt => {
      window._serviceWorker.postMessage({
        "command": "cancelUpload",
        "uid": evt.detail.uid,
      });
    });
    newSection.addEventListener("sectionLoaded", this._scrollToHash.bind(this));
    if (typeof afterSection == "string") {
      const refSection = this._shadow.querySelector("media-section[id='" + afterSection + "']");
      if (refSection === null) {
        this._projects.appendChild(newSection);
      } else {
        this._projects.insertBefore(newSection, refSection.nextSibling);
      }
    } else if (typeof afterSection === "number") {
      if (afterSection == -1) {
        this._projects.appendChild(newSection);
      } else if (afterSection == 0) {
        this._projects.insertBefore(newSection, this._newSection.nextSibling);
      }
    }
    return newSection;
  }

  _updateSectionNames(allSections) {
    const sections = [...this._shadow.querySelectorAll("media-section")];
    for (const section of sections) {
      section.sections = allSections;
    }
  }

  async _scrollToHash() {
    if (this._needScroll) {
      this._loaded += 1;
      const sections = [...this._shadow.querySelectorAll("media-section")];
      if (this._loaded >= sections.length) {
        const hashName = decodeURI(window.location.hash.slice(1));
        for (const section of sections) {
          if (section.getAttribute("name") == hashName) {
            await new Promise(resolve => setTimeout(resolve, 100));
            section.scrollIntoView(true);
            window.scrollBy(0, -62); // adjust for header height
            this._needScroll = false;
          }
        }
      }
    }
  }

  _addingFilesCallback(evt) {
    this._progress.notify("Adding files...", false);
    this._leaveConfirmOk = true;
  };

  _filesAddedCallback(evt) {
    const numFiles = evt.detail.numStarted;
    const numSkipped = evt.detail.numSkipped;
    if (numFiles > 0) {
      this._progress.notify("Preparing " + numFiles + " files for upload...", false);
      this._leaveConfirmOk = true;
    } else {
      this._progress.notify("Skipped " + numSkipped + " files with invalid extension!", false);
      this._leaveConfirmOk = false;
    }
    this._newSection.close();
  };

  _allSetCallback() {
    this._progress.notify("Upload started!", true);
    this._leaveConfirmOk = false;
  }

}

customElements.define("project-detail", ProjectDetail);
