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
        }
        else {
          this._nameText.nodeValue = newValue;
          this._sectionName = newValue;
        }
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

  set permission(val) {
    this._files.permission = val;
  }

  get overview() {
    return this._overview;
  }

  set numMedia(val) {
    this._updateNumFiles(val);
    if (val == 0) {
      this._overview.style.display = "none";
      this._files.style.display = "none";
    } else {
      this._overview.style.display = "block";
      this._files.style.display = "block";
      if (val != this._files.numMedia) {
        this._files.numMedia = val;
      }
    }
  }

  set sectionFilter(val) {
    this._attributeFilter = val;
    this._overview.updateForAll();
  }

  get sectionFilter() {
    return this._sectionFilter();
  }

  set worker(val) {
    this._worker = val;
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

  _updateNumFiles(numFiles) {
    let fileText = " Files";
    if (numFiles == 1) {
      fileText = " File";
    }
    this._numFiles.nodeValue = numFiles + fileText;
  }

  _sectionFilter() {
    return this._attributeFilter;
  }

  _setCallbacks() {
    const projectDefined = this.getAttribute("project-id") !== null;
    const nameDefined = this.getAttribute("name") !== null;
    if (projectDefined && nameDefined) {
      this._files.addEventListener("algorithm", evt => {
        let body = {"algorithm_name": evt.detail.algorithmName};
        if ('mediaIds' in evt.detail)
        {
          body["media_ids"] = evt.detail.mediaIds;
        }
        else
        {
          body["media_query"] = this._sectionFilter();
        }
        const projectId = this.getAttribute("project-id");
        fetch("/rest/AlgorithmLaunch/" + projectId, {
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
      });

      this._files.addEventListener("download", evt => {
        const projectId = this.getAttribute("project-id");
        let mediaFilter = "";
        if (evt.detail.mediaIds) {
          mediaFilter = "&media_id=" + evt.detail.mediaIds;
        }
        const getUrl = endpoint => {
          return "/rest/" + endpoint + "/" + projectId + this._sectionFilter() + mediaFilter;
        };
        const headers = {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        };
        fetchRetry(getUrl("MediaSections"), {
          method: "GET",
          credentials: "same-origin",
          headers: headers,
        })
        .then(response => response.json())
        .then(mediaCount => {
          let lastFilename = null;
          let numImages = 0;
          let numVideos = 0;
          for (const key in mediaCount) {
            numImages += mediaCount[key]["num_images"];
            numVideos += mediaCount[key]["num_videos"];
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
        })
      });

      Number.prototype.pad = function(size) {
        var s = String(this);
        while (s.length < (size || 2)) {s = "0" + s;}
        return s;
      }

      this._files.addEventListener("downloadAnnotations", evt => {
        const projectId = this.getAttribute("project-id");
        let mediaFilter = "";
        if (evt.detail.mediaIds) {
          mediaFilter = "&media_id=" + evt.detail.mediaIds;
        }
        const getUrl = endpoint => {
          return "/rest/" + endpoint + "/" + projectId + "?media_query="
                 + this._sectionFilter() + mediaFilter;
        };
        const mediaUrl = "/rest/Medias/" + projectId + this._sectionFilter() + mediaFilter;
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
        const readableZipStream = new ZIP({
          async pull(ctrl) {
  
            // Function for dumping types to file.
            const getTypes = (endpoint, fname) => {
              return fetchRetry("/rest/" + endpoint + "/" + projectId, {
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
              let url = baseUrl + "&type=" + type.type.id + "&stop=" + batchSize;
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
                const name = baseFilename + type.type.name + batch_str + ".csv";
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
                const name = baseFilename + type.type.name + batch_str + ".json";
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
                // Whether all metadata has been fetched.
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
              this._worker.postMessage({
                command: "renameSection",
                fromName: this._sectionName,
                toName: evt.target.value,
              });
              this._sectionName = evt.target.value;
            }
            const projectId = this.getAttribute("project-id");
            fetch("/rest/Medias/" + projectId + this._sectionFilter(), {
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
