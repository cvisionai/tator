class ProjectDetail extends TatorPage {
  constructor() {
    super();

    this._worker = new Worker("/static/js/project-detail/media-worker.js");

    window._uploader = new Worker("/static/js/tasks/upload-worker.js");

    const main = document.createElement("main");
    main.setAttribute("class", "d-flex");
    this._shadow.appendChild(main);

    const section = document.createElement("section");
    section.setAttribute("class", "sections-wrap py-6 px-5 col-3 text-gray");
    main.appendChild(section);

    const folderHeader = document.createElement("div");
    folderHeader.setAttribute("class", "d-flex flex-justify-between flex-items-center py-4");
    section.appendChild(folderHeader);

    const folderText = document.createElement("h2");
    folderText.setAttribute("class", "h3 text-semibold");
    folderText.textContent = "Library";
    folderHeader.appendChild(folderText);

    const addFolderButton = document.createElement("button");
    addFolderButton.setAttribute("class", "px-0 f2 btn-clear text-gray hover-text-white");
    folderHeader.appendChild(addFolderButton);

    const addFolderSpan = document.createElement("span");
    addFolderSpan.setAttribute("class", "f1 px-1");
    addFolderSpan.textContent = "+";
    addFolderButton.appendChild(addFolderSpan);

    const addFolderText = document.createTextNode("Add folder");
    addFolderButton.appendChild(addFolderText);

    this._folders = document.createElement("ul");
    this._folders.setAttribute("class", "sections");
    section.appendChild(this._folders);

    //const savedSearchesHeader = document.createElement("h2");
    //savedSearchesHeader.setAttribute("class", "py-4 h3 text-semibold");
    //savedSearchesHeader.textContent = "Saved Searches";
    //section.appendChild(savedSearchesHeader);

    //this._savedSearches = document.createElement("ul");
    //this._savedSearches.setAttribute("class", "sections");
    //section.appendChild(this._savedSearches);

    const mainSection = document.createElement("section");
    mainSection.setAttribute("class", "project__main py-3 px-6 flex-grow");
    main.appendChild(mainSection);

    const div = document.createElement("div");
    div.setAttribute("class", "py-6");
    mainSection.appendChild(div);

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
    mainSection.appendChild(subheader);

    this._search = document.createElement("project-search");
    subheader.appendChild(this._search);

    this._collaborators = document.createElement("project-collaborators");
    subheader.appendChild(this._collaborators);

    this._projects = document.createElement("div");
    mainSection.appendChild(this._projects);

    this._mediaSection = document.createElement("media-section");
    this._projects.appendChild(this._mediaSection);

    const deleteSection = document.createElement("delete-section-form");
    this._projects.appendChild(deleteSection);

    const deleteFile = document.createElement("delete-file-form");
    this._projects.appendChild(deleteFile);

    this._progress = document.createElement("progress-summary");
    this._shadow.insertBefore(this._progress, main);

    const cancelJob = document.createElement("cancel-confirm");
    this._shadow.appendChild(cancelJob);

    this._leaveConfirmOk = false;

    window.addEventListener("beforeunload", evt => {
      if (this._leaveConfirmOk) {
        evt.preventDefault();
        evt.returnValue = '';
        window.alert("Uploads are in progress. Still leave?");
      }
    });

    window.addEventListener("scroll", this._checkSectionVisibility.bind(this));

    this._mediaSection.addEventListener("newName", evt => {
      for (const sectionCard of this._folders.children) {
        if (sectionCard._section) {
          if (sectionCard._section.id == evt.detail.id) {
            sectionCard.rename(evt.detail.sectionName);
          }
        }
      }
    });

    window._uploader.addEventListener("message", evt => {
      const msg = evt.data;
      if (msg.command == "uploadsDone") {
        this._leaveConfirmOk = false;
      }
    });

    this._removeCallback = evt => {
      deleteSection.init(evt.detail.projectId, evt.detail.section, evt.detail.sectionFilter);
      deleteSection.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    deleteSection.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    deleteSection.addEventListener("confirmDelete", evt => {
      for (const sectionCard of this._folders.children) {
        if (sectionCard._section) {
          if (sectionCard._section.id == evt.detail.id) {
            sectionCard.parentNode.removeChild(sectionCard);
            this._folders.children[0].click();
          }
        }
      }
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
      this._mediaSection.removeMedia(evt.detail.mediaId);
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

    this._progress.addEventListener("groupCancel", evt => {
      cancelJob.init(evt.detail.gid, this.getAttribute("project-id"));
      cancelJob.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    cancelJob.addEventListener("confirmGroupCancel", () => {
      this.removeAttribute("has-open-modal");
      cancelJob.removeAttribute("is-open");
    });

    cancelJob.addEventListener("close", () => {
      this.removeAttribute("has-open-modal");
    });

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

  _init() {
    const projectId = this.getAttribute("project-id");
    // Get info about the project.
    const projectPromise = fetch("/rest/Project/" + projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const sectionPromise = fetch("/rest/Sections/" + projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const algoPromise = fetch("/rest/Algorithms/" + projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    Promise.all([
      projectPromise,
      sectionPromise,
      algoPromise,
    ])
    .then(([projectResponse, sectionResponse, algoResponse]) => {
      const projectData = projectResponse.json();
      const sectionData = sectionResponse.json();
      const algoData = algoResponse.json();
      Promise.all([projectData, sectionData, algoData])
      .then(([project, sections, algos]) => {
        this._algorithms = algos;
        this._permission = project.permission;
        this._mediaSection.permission = this._permission;
        this._mediaSection.algorithms = this._algorithms;
        if (!hasPermission(project.permission, "Can Execute")) {
          this._algorithmButton.style.display = "none";
        }
        if (!hasPermission(project.permission, "Can Transfer")) {
          this._uploadButton.style.display = "none";
          //this._newSection.style.display = "none";
        }
        this._projectText.nodeValue = project.name;
        this._search.setAttribute("project-name", project.name);
        this._description.setAttribute("text", project.summary);
        this._collaborators.usernames = project.usernames;
        this._search.autocomplete = project.filter_autocomplete;
        let projectFilter = null;
        let params = new URLSearchParams(document.location.search.substring(1));
        if (params.has("search")) {
          projectFilter = params.get("search");
        }
        const home = document.createElement("section-card");
        home.init(null, false);
        home.addEventListener("click", () => {
          this._selectSection(null, projectId);
          for (const child of this._folders.children) {
            child.active = false;
          }
          home.active = true;
        });
        this._folders.appendChild(home);
        for (const section of sections) {
          const hasSection = Boolean(section.tator_user_sections);
          const hasSearch = (Boolean(section.lucene_search)
                             || Boolean(section.media_bools)
                             || Boolean(section.annotation_bools));
          const isFolder = hasSection && !hasSearch;
          const card = document.createElement("section-card");
          card.init(section, isFolder);
          if (isFolder) {
            this._folders.appendChild(card);
          } else {
            this._savedSearches.appendChild(card);
          }
          card.addEventListener("click", () => {
            this._selectSection(section, projectId);
            for (const child of this._folders.children) {
              child.active = false;
            }
            card.active = true;
          });
        }
        home.click();
      });
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "username":
        this._uploadButton.setAttribute("username", newValue);
        break;
      case "project-id":
        this._uploadButton.setAttribute("project-id", newValue);
        this._algorithmButton.setAttribute("project-id", newValue);
        this._init();
        break;
      case "token":
        this._uploadButton.setAttribute("token", newValue);
        break;
    }
  }

  _selectSection(section, projectId) {
    this._mediaSection.init(projectId, section, this.getAttribute("username"),
                                        this.getAttribute("token"));
    this._mediaSection.addEventListener("addingfiles", this._addingFilesCallback.bind(this));
    this._mediaSection.addEventListener("filesadded", this._filesAddedCallback.bind(this));
    this._mediaSection.addEventListener("allset", this._allSetCallback.bind(this));
    this._mediaSection.addEventListener("remove", this._removeCallback);
    this._mediaSection.addEventListener("deleteFile", this._deleteFileCallback);
    this._mediaSection.addEventListener("newAlgorithm", this._newAlgorithmCallback);
    this._mediaSection.addEventListener("sectionLoaded", this._scrollToHash.bind(this));
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
  };

  async _allSetCallback() {
    this._progress.notify("Please wait, uploads starting...", true);
    await new Promise(resolve => setTimeout(resolve, 7000));
    if (this._leaveConfirmOk) {
      this._progress.notify("To keep working, open a new tab...", true);
    }
  }

}

customElements.define("project-detail", ProjectDetail);
