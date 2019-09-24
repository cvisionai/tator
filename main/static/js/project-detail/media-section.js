class MediaSection extends TatorElement {
  constructor() {
    super();

    const section = document.createElement("div");
    section.setAttribute("class", "project__section py-3");
    this._shadow.appendChild(section);

    const header = document.createElement("div");
    header.setAttribute("class", "project__header d-flex flex-items-center flex-justify-between col-9 row-actions-hover");
    section.appendChild(header);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3"); //not a typo
    header.appendChild(this._name);

    this._nameText = document.createTextNode("");
    this._name.appendChild(this._nameText);

    const numFiles = document.createElement("span");
    numFiles.setAttribute("class", "text-gray px-2");
    this._name.appendChild(numFiles);

    this._numFiles = document.createTextNode("");
    numFiles.appendChild(this._numFiles);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex");
    section.appendChild(div);

    this._files = document.createElement("section-files");
    this._files.setAttribute("class", "col-9");
    this._files.mediaFilter = this._sectionFilter.bind(this);
    div.appendChild(this._files);

    this._overview = document.createElement("section-overview");
    this._overview.setAttribute("class", "col-3");
    this._overview.mediaFilter = this._sectionFilter.bind(this);
    div.appendChild(this._overview);

    this._files.addEventListener("annotation", evt => {
      const projectId = this.getAttribute("project-id");
      const mediaId = evt.detail.mediaId;
      const url = "/" + projectId + "/annotation/" + mediaId;

      //Merge section + search params
      var section_params =
          new URLSearchParams(this._sectionFilter().substring(1));
      var search_params =
          new URLSearchParams(document.location.search.substring(1));
      if (search_params.has('search'))
      {
        section_params.set('search', search_params.get('search'));
      }
      window.location.href = url + '?' + section_params.toString();
    });

    this._files.addEventListener("cardMouseover", evt => {
      this._latestMouse = "enter";
      this._overview.updateForMedia(evt.detail.media);
    });

    this._files.addEventListener("cardMouseexit", () => {
      this._latestMouse = "exit";
      new Promise(resolve => setTimeout(() => {
        if (this._latestMouse === "exit") {
          this._overview.updateForAllSoft();
        }
        resolve();
      }, 200));
    });
  }

  static get observedAttributes() {
    return ["project-id", "name", "username", "token"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-id":
        this._files.setAttribute("project-id", newValue);
        this._overview.setAttribute("project-id", newValue);
        this._setCallbacks();
        break;
      case "name":
        if (newValue === "null") {
          this._nameText.nodeValue = "Unnamed Section";
          this._sectionName = "Unnamed Section";
          this._attributeFilter = "attribute_null=tator_user_sections::true";
        }
        else {
          this._nameText.nodeValue = newValue;
          this._sectionName = newValue;
          this._attributeFilter = "attribute=tator_user_sections::" + newValue;
        }
        this._overview.updateForAll();
        this._files.setAttribute("section", this._sectionName);
        this._setCallbacks();
        break;
      case "username":
        this._files.setAttribute("username", newValue);
        break;
      case "token":
        this._files.setAttribute("token", newValue);
        break;
    }
  }

  get overview() {
    return this._overview;
  }

  set numMedia(val) {
    this._updateNumFiles(val);
    if (val != this._files.numMedia) {
      this._files.numMedia = val;
      this._overview.updateForAll();
    }
  }

  set worker(val) {
    this._files.worker = val;
  }

  set cardInfo(val) {
    this._files.cardInfo = val;
  }

  set mediaIds(val) {
    this._updateNumFiles(val.length);
    this._files.mediaIds = val;
  }

  set algorithms(val) {
    this._files.algorithms = val;
  }

  set sections(val) {
    let sections = val.slice();
    const index = sections.indexOf(this._sectionName);
    if (index > -1) {
      sections.splice(index, 1);
    }
    this._files.sections = sections;
  }

  removeMedia(mediaId) {
    const media = this._files._media;
    const mediaIds = media.map(elem => elem.id);
    const index = mediaIds.indexOf(Number(mediaId));
    let elem = null;
    if (index > -1) {
      elem = media.splice(index, 1)[0];
      if (media.length == 0) {
        this.parentNode.removeChild(this);
        this.dispatchEvent(new Event("newName"));
      } else {
        this._updateNumFiles(media.length);
        this._files._updateNumCards();
        this._overview.updateForAll();
      }
    }
    return elem;
  }

  addMedia(val) {
    this._files.addMedia(val);
    this._updateNumFiles(this._files._media.length);
    this._overview.updateForAll();
  }

  hasMedia(mediaId) {
    const media = this._files._media;
    const mediaIds = media.map(elem => elem.id);
    if (mediaIds.includes(mediaId)) {
      return media[mediaIds.indexOf(mediaId)];
    }
    return null;
  }

  addProcess(val, mediaId) {
    this._files.addProcess(val, mediaId);
  }

  removeProcess(processId, mediaId) {
    const processes = this._files._processes;
    let index;
    if (mediaId === null) {
      const processIds = processes.map(elem => elem.uid);
      index = processIds.indexOf(processId);
    } else {
      const processIds = processes.map(elem => elem.uid + "," + elem.id);
      index = processIds.indexOf(processId + "," + mediaId);
    }
    if (index > -1) {
      processes.splice(index, 1);
      this._files._updateNumCards();
    }
  }

  hasProcess(processId, mediaId) {
    const processes = this._files._processes;
    let index;
    if (mediaId === null) {
      const processIds = processes.map(elem => elem.uid);
      index = processIds.indexOf(processId);
    } else {
      const processIds = processes.map(elem => elem.uid + "," + elem.id);
      index = processIds.indexOf(processId + "," + mediaId);
    }
    if (index > -1) {
      return processes[index];
    }
    return null;
  }

  updateProgress(processId, mediaId, state, percent, msg) {
    this._files.updateProgress(processId, mediaId, state, percent, msg);
  }

  _updateNumFiles(numFiles) {
    let fileText = " Files";
    if (numFiles == 1) {
      fileText = " File";
    }
    this._numFiles.nodeValue = numFiles + fileText;
  }

  _sectionFilter() {
    return "?" + this._attributeFilter;
  }

  _setCallbacks() {
    const projectDefined = this.getAttribute("project-id") !== null;
    const nameDefined = this.getAttribute("name") !== null;
    if (projectDefined && nameDefined) {
      this._files.addEventListener("algorithm", evt => {
        const projectId = this.getAttribute("project-id");
        fetch("/rest/AlgorithmLaunch/" + projectId + this._sectionFilter(), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "algorithm_name": evt.detail.algorithmName,
            "media_ids": evt.detail.mediaIds,
          }),
        })
        .then(response => {
          const page = document.querySelector("project-detail");
          if (response.status == 201) {
            page._progress.notify("Algorithm launched!", true);
          } else {
            page._progress.error("Error launching algorithm!");
          }
          return response.json();
        })
        .then(data => console.log(data));
      });

      this._files.addEventListener("download", evt => {
        const projectId = this.getAttribute("project-id");
        fetch("/rest/PackageCreate/" + projectId, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "package_name": this._sectionName,
            "media_query": this._sectionFilter(),
            "use_originals": true,
            "annotations": evt.detail.annotations,
          }),
        })
        .then(response => {
          const page = document.querySelector("project-detail");
          if (response.status == 201) {
            page._progress.enableDownloads();
            page._progress.notify("Creating zip file!", true);
          } else {
            //page._progress.error("Error launching algorithm!");
          }
          return response.json();
        })
        .then(data => console.log(data));
      });

      this._files.addEventListener("rename", evt => {
        if (this._name.contains(this._nameText)) {
          const input = document.createElement("input");
          input.setAttribute("class", "form-control input-sm f1");
          input.setAttribute("value", this._sectionName);
          this._name.replaceChild(input, this._nameText);
          input.addEventListener("focus", evt => {
            evt.target.select();
          });
          input.addEventListener("keydown", evt => {
            if (evt.keyCode == 13) {
              evt.preventDefault();
              input.blur();
            }
          });
          input.addEventListener("blur", evt => {
            if (evt.target.value !== "") {
              this._sectionName = evt.target.value;
            }
            const projectId = this.getAttribute("project-id");
            fetch("/rest/EntityMedias/" + projectId + this._sectionFilter(), {
              method: "PATCH",
              credentials: "same-origin",
              headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "attributes": {"tator_user_sections": this._sectionName}
              }),
            });
            this.setAttribute("name", this._sectionName);
            this._files.setAttribute("section", this._sectionName);
            this._name.replaceChild(this._nameText, evt.target);
            this.dispatchEvent(new Event("newName"));
          });
          input.focus();
        }
      });

      this._files.addEventListener("delete", evt => {
        this.dispatchEvent(new CustomEvent("remove", {
          detail: {
            sectionFilter: this._sectionFilter(),
            sectionName: this._sectionName,
            projectId: this.getAttribute("project-id")
          }
        }));
      });
    }
  }
}

customElements.define("media-section", MediaSection);
