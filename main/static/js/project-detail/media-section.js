class MediaSection extends TatorElement {
  constructor() {
    super();

    const section = document.createElement("div");
    section.setAttribute("class", "project__section py-3");
    this._shadow.appendChild(section);

    const header = document.createElement("div");
    header.setAttribute("class", "project__header d-flex flex-items-center flex-justify-between col-12 row-actions-hover");
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

    const actions = document.createElement("div");
    actions.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(actions);

    this._upload = document.createElement("section-upload");
    this._upload.setAttribute("class", "px-2");
    actions.appendChild(this._upload);

    this._more = document.createElement("section-more");
    this._more.setAttribute("class", "px-2");
    actions.appendChild(this._more);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex");
    section.appendChild(div);

    this._files = document.createElement("section-files");
    this._files.setAttribute("class", "col-12");
    this._files.mediaParams = this._sectionParams.bind(this);
    div.appendChild(this._files);

    this._searchParams = new URLSearchParams();
  }

  init(project, section, username, token) {
    if (section === null) {
      this._sectionName = "All Media";
    } else {
      this._sectionName = section.name;
    }
    this._project = project;
    this._section = section;
    this._sectionName = this._sectionName;
    this._files.setAttribute("project-id", project);
    this._nameText.nodeValue = this._sectionName;
    this._setCallbacks();
    this._upload.setAttribute("project-id", project);
    this._upload.setAttribute("username", username);
    this._upload.setAttribute("token", token);
    this._upload.setAttribute("section", this._sectionName);
    this._more.section = section;
    this.reload();
  }

  set permission(val) {
    this._files.permission = val;
    if (!hasPermission(val, "Can Edit")) {
      this._more.style.display = "none";
    }
    if (!hasPermission(val, "Can Transfer")) {
      this._upload.style.display = "none";
    }
    this._more.permission = val;
    this._permission = val;
  }

  set numMedia(val) {
    this._updateNumFiles(val);
    if (val == 0) {
      this._files.style.display = "none";
    } else {
      this._files.style.display = "block";
    }
  }

  set searchString(val) {
    if (val) {
      this._searchParams.set("search", val);
    } else {
      this._searchParams = new URLSearchParams();
    }
  }

  get sectionParams() {
    return this._sectionParams();
  }

  set cardInfo(val) {
    this._files.cardInfo = val;
  }

  set mediaIds(val) {
    this._updateNumFiles(val.length);
    this._files.mediaIds = val;
  }

  set algorithms(val) {
    this._more.algorithms = val;
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
    for (const mediaCard of this._files._main.children) {
      if (mediaCard.getAttribute("media-id") == mediaId) {
        mediaCard.parentNode.removeChild(mediaCard);
        const numFiles = Number(this._numFiles.textContent.split(' ')[0]) - 1;
        this._numFiles.textContent = `${numFiles} Files`;
      }
    }
  }

  _updateNumFiles(numFiles) {
    let fileText = " Files";
    if (numFiles == 1) {
      fileText = " File";
    }
    this._numFiles.nodeValue = numFiles + fileText;
  }

  _sectionParams() {
    const sectionParams = new URLSearchParams();
    if (this._section !== null) {
      sectionParams.append("section", this._section.id);
    }
    return joinParams(sectionParams, this._searchParams);
  }

  reload() {
    const start = 0;
    const stop = 100;
    const sectionQuery = this._sectionParams();
    const countPromise = fetch(`/rest/MediaCount/${this._project}?${sectionQuery.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(count => this.numMedia = count);
    sectionQuery.append("start", start);
    sectionQuery.append("stop", stop);
    const mediaPromise = fetch(`/rest/Medias/${this._project}?${sectionQuery.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(media => this._files.cardInfo = media);
  }

  _launchAlgorithm(evt) {
    let body = {"algorithm_name": evt.detail.algorithmName};
    if ('mediaIds' in evt.detail)
    {
      body["media_ids"] = evt.detail.mediaIds;
    }
    else
    {
      body["media_query"] = `?${this._sectionParams().toString()}`;
    }
    fetch(`/rest/AlgorithmLaunch/${this._project}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
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
  }

  _downloadFiles(evt) {
    let mediaParams = URLSearchParams();
    if (evt.detail) {
      if (evt.detail.mediaIds) {
        mediaParams.append("media_id", evt.detail.mediaIds);
      }
    }
    const getUrl = endpoint => {
      const params = joinParams(this._sectionParams(), mediaParams);
      return `/rest/${endpoint}/${this._project}?${params.toString()}`;
    };
    const headers = {
      "X-CSRFToken": getCookie("csrftoken"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    fetchRetry(getUrl("MediaStats"), {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
    })
    .then(response => response.json())
    .then(async mediaStats => {
      let lastFilename = null;
      let numImages = 0;
      let numVideos = 0;
      let size = 0;
      console.log("Download size: " + mediaStats.download_size);
      console.log("Download num files: " + mediaStats.count);
      if ((mediaStats.downloadSize > 60000000000) || (mediaStats.count > 5000)) {
        const bigDownload = document.createElement("big-download-form");
        const page = document.getElementsByTagName("project-detail")[0];
        page._projects.appendChild(bigDownload);
        bigDownload.setAttribute("is-open", "");
        page.setAttribute("has-open-modal", "");
        bigDownload.addEventListener("close", evt => {
          page.removeAttribute("has-open-modal", "");
          page._projects.removeChild(bigDownload);
        });
        while (bigDownload.hasAttribute("is-open")) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!bigDownload._confirm) {
          page._leaveConfirmOk = false;
          return;
        }
      }

      const batchSize = numImages > numVideos ? 20 : 2;
      const filenames = new Set();
      const re = /(?:\.([^.]+))?$/;
      const fileStream = streamSaver.createWriteStream(this._sectionName + ".zip");
      const readableZipStream = new ZIP({
        async pull(ctrl) {
          let url = getUrl("Medias") + "&stop=" + batchSize;
          if (lastFilename != null) {
            url += "&after=" + lastFilename;
          }
          await fetchRetry(url, {
            method: "GET",
            credentials: "same-origin",
            headers: headers,
          })
          .then(response => response.json())
          .then(async medias => {
            if (medias.length == 0) {
              ctrl.close();
            }
            for (const media of medias) {
              lastFilename = media.name;
              const basenameOrig = media.name.replace(/\.[^/.]+$/, "");
              const ext = re.exec(media.name)[0];
              let basename = basenameOrig;
              let vers = 1;
              while (filenames.has(basename)) {
                basename = basenameOrig + " (" + vers + ")";
                vers++;
              }
              filenames.add(basename);

              let request = Utilities.getDownloadRequest(media, headers);

              // Download media file.
              console.log("Downloading " + media.name + " from " + request.url + "...");
              await fetchRetry(request)
              .then(response => {
                const stream = () => response.body;
                const name = basename + ext;
                ctrl.enqueue({name, stream});
              });
            }
          });
        }
      });
      if (window.WritableStream && readableZipStream.pipeTo) {
        readableZipStream.pipeTo(fileStream);
      } else {
        const writer = fileStream.getWriter();
        const reader = readableZipStream.getReader();
        const pump = () => reader.read()
          .then(res => res.done ? writer.close() : writer.write(res.value).then(pump));
        pump();
      }
    });
  }

  _downloadAnnotations(evt) {
    if (evt.detail) {
      if (evt.detail.mediaIds) {
        mediaParams = new URLSearchParams({"media_id": evt.detail.mediaIds});
      }
    }
    params = joinParams(mediaParams, this._sectionParams());
    const getUrl = endpoint => {
      return `/rest/${endpoint}/${this._project}?media_query=?${params.toString()}`;
    };
    const mediaUrl = `/rest/Medias/${this._project}?${params.toString()}`;
    const fileStream = streamSaver.createWriteStream(this._sectionName + ".zip");
    let mediaTypes = null;
    let mediaFetcher = null;
    let mediaDone = false;
    let localizationTypes = null;
    let localizationFetcher = null;
    let localizationsDone = false;
    let stateTypes = null;
    let stateFetcher = null;
    let statesDone = false;
    const headers = {
      "X-CSRFToken": getCookie("csrftoken"),
      "Content-Type": "application/json"
    };
    Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
    }
    const project = this._project;
    const readableZipStream = new ZIP({
      async pull(ctrl) {

        // Function for dumping types to file.
        const getTypes = (endpoint, fname) => {
          return fetchRetry(`/rest/${endpoint}/${project}`, {
            method: "GET",
            credentials: "same-origin",
            headers: headers,
          })
          .then(response => {
            const clone = response.clone();
            const stream = () => response.body;
            const name = fname;
            ctrl.enqueue({name, stream});
            return clone.json();
          });
        };

        // Function for dumping single batch of metadata to file.
        const getMetadataBatch = async (baseUrl, type, batchSize, batchNum,
                                        baseFilename, lastId) => {
          let url = baseUrl + "&type=" + type.id + "&stop=" + batchSize;
          if (lastId != null) {
            url += "&after=" + lastId;
          }

          // Fetch csv data first.
          await fetchRetry(url + "&format=csv", {
            method: "GET",
            credentials: "same-origin",
            headers: headers,
          })
          .then(response => {
            const stream = () => response.body;
            const batch_str = "__batch_" + Number(batchNum).pad(5);
            const name = baseFilename + type.name + batch_str + ".csv";
            ctrl.enqueue({name, stream});
          });

          // Fetch and return json data.
          return fetchRetry(url, {
            method: "GET",
            credentials: "same-origin",
            headers: headers,
          })
          .then(response => {
            const clone = response.clone();
            const stream = () => response.body;
            const batch_str = "__batch_" + Number(batchNum).pad(5);
            const name = baseFilename + type.name + batch_str + ".json";
            ctrl.enqueue({name, stream});
            return clone.json();
          });
        };

        // Class for fetching batches of metadata.
        class MetadataFetcher {
          constructor(types, baseUrl, baseFilename, lastField) {
            this._types = types;
            this._baseUrl = baseUrl;
            this._baseFilename = baseFilename;
            this._lastField = lastField;
            this._batchNum = 0;
            this._lastId = null;
            this._typeIndex = 0;
            this._batchSize = 1000;
          }

          async next() {
            // Fetches next batch of metadata, iterating over types. Returns
            // whether all metadata has been fetched.
            let done = false;
            if (this._types.length == 0) {
              done = true;
            } else {
              const entities = await getMetadataBatch(
                this._baseUrl,
                this._types[this._typeIndex],
                this._batchSize,
                this._batchNum,
                this._baseFilename,
                this._lastId,
              )
              this._batchNum++;
              if (entities.length == 0) {
                this._typeIndex++;
                if (this._typeIndex == this._types.length) {
                  done = true;
                } else {
                  this._batchNum = 0;
                  this._lastId = null;
                }
              } else {
                this._lastId = entities[entities.length - 1][this._lastField];
              }
            }
            return done;
          }
        }

        if (mediaTypes == null) {
          // Get media types.
          mediaTypes = await getTypes("MediaTypes", "media_types.json");
          mediaFetcher = new MetadataFetcher(mediaTypes, mediaUrl, "medias__", "name");
        }
        else if (localizationTypes == null) {
          // Get localization types.
          const localizationsUrl = getUrl("Localizations");
          localizationTypes = await getTypes("LocalizationTypes", "localization_types.json");
          localizationFetcher = new MetadataFetcher(localizationTypes, localizationsUrl,
                                                    "localizations__", "id");
        }
        else if (stateTypes == null) {
          // Get state types.
          const statesUrl = getUrl("States");
          stateTypes = await getTypes("StateTypes", "state_types.json");
          stateFetcher = new MetadataFetcher(stateTypes, statesUrl, "states__", "id");
        }
        else if (mediaDone == false) {
          // Get next batch of media metadata.
          mediaDone = await mediaFetcher.next();
        }
        else if (localizationsDone == false) {
          // Get next batch of localization metadata.
          localizationsDone = await localizationFetcher.next();
        }
        else if (statesDone == false) {
          // Get next batch of state metadata.
          statesDone = await stateFetcher.next();
        }
        else {
          // Close the zip file.
          ctrl.close();
        }
      }
    });
    if (window.WritableStream && readableZipStream.pipeTo) {
      readableZipStream.pipeTo(fileStream);
    } else {
      const writer = fileStream.getWriter();
      const reader = readableZipStream.getReader();
      const pump = () => reader.read()
        .then(res => res.done ? writer.close() : writer.write(res.value).then(pump));
      pump();
    }
  }

  _rename(evt) {
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
          //this._worker.postMessage({
          //  command: "renameSection",
          //  fromName: this._sectionName,
          //  toName: evt.target.value,
          //});
          this._sectionName = evt.target.value;
        }
        fetch("/rest/Section/" + this._section.id, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "name": this._sectionName
          }),
        });
        this._nameText.textContent = this._sectionName;
        this._section.name = this._sectionName;
        this._name.replaceChild(this._nameText, evt.target);
        this.dispatchEvent(new CustomEvent("newName", {
          detail: {
            id: this._section.id,
            sectionName: this._sectionName,
          },
        }));
      });
      input.focus();
    }
  }

  _setCallbacks() {
    this._more.addEventListener("algorithm", this._launchAlgorithm.bind(this));
    this._files.addEventListener("algorithm", this._launchAlgorithm.bind(this));

    this._more.addEventListener("download", this._downloadFiles.bind(this));

    this._more.addEventListener("downloadAnnotations", this._downloadAnnotations.bind(this));
    this._files.addEventListener("downloadAnnotations", this._downloadAnnotations.bind(this));

    this._more.addEventListener("rename", this._rename.bind(this));

    this._more.addEventListener("delete", evt => {
      this.dispatchEvent(new CustomEvent("remove", {
        detail: {
          sectionParams: this._sectionParams(),
          section: this._section,
          projectId: this._project,
        }
      }));
    });
  }
}

customElements.define("media-section", MediaSection);
